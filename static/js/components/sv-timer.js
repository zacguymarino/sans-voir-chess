// Headless, reusable timer for countdown/countup.
// Emits:
//  - "sv-timer-start"
//  - "sv-timer-tick"         detail: { seconds, elapsedMs, remainingMs, mode }
//  - "sv-timer-complete"     detail: { elapsedMs, overshootMs, mode }
//  - <custom event>          (optional, name via attribute complete-event)
//
// Attributes / properties:
//  - mode: "countdown" | "countup" (default: "countdown")
//  - duration: number (ms). Required for countdown. Ignored for pure countup.
//  - max: number (ms). Optional upper bound for countup; if reached, completes.
//  - auto-start: boolean. If present/truthy, timer starts when connected.
//  - complete-event: string. If set, an additional CustomEvent with that name
//                      is dispatched on completion.
//
// Public methods:
//  - start()
//  - pause()
//  - resume()
//  - stop(reset = false)
//  - reset(configOverride?)
//  - getTime() -> { elapsedMs, remainingMs, running, mode }
//
// Notes:
//  - No visual output. Host component renders any UI.
//  - Tick cadence is 1s (static event name). Internally we keep ms precision.

customElements.define("sv-timer", class extends HTMLElement {
  static get observedAttributes() {
    return ["mode", "duration", "max", "auto-start", "complete-event"];
  }

  constructor() {
    super();
    // Internal state
    this._mode = "countdown";
    this._durationMs = 0;         // for countdown
    this._maxMs = null;           // for countup
    this._autoStart = false;
    this._completeEvent = null;

    this._running = false;
    this._paused = false;

    this._tStart = 0;             // performance.now() when (re)started
    this._tPausedAt = 0;          // performance.now() when paused
    this._pausedAccum = 0;        // total paused ms within current run

    this._rafId = 0;
    this._lastEmittedSecond = null;

    // Bind loop once
    this._loop = this._loop.bind(this);
  }

  // --- attribute <-> property syncing ---
  attributeChangedCallback(name, _old, value) {
    switch (name) {
      case "mode":
        this.mode = value;
        break;
      case "duration":
        this.duration = value != null ? Number(value) : 0;
        break;
      case "max":
        this.max = value != null && value !== "" ? Number(value) : null;
        break;
      case "auto-start":
        this.autoStart = this.hasAttribute("auto-start") && value !== "false";
        break;
      case "complete-event":
        this.completeEvent = value || null;
        break;
    }
  }

  connectedCallback() {
    // Auto-start if requested (but only once per connection)
    if (this._autoStart && !this._running) {
      this.start();
    }
  }

  disconnectedCallback() {
    this._cancelLoop();
  }

  // --- public properties ---
  get mode() { return this._mode; }
  set mode(v) {
    const val = (v === "countup") ? "countup" : "countdown";
    this._mode = val;
    this.setAttribute("mode", val);
  }

  get duration() { return this._durationMs; }
  set duration(ms) {
    const n = Number(ms) || 0;
    this._durationMs = Math.max(0, n);
    if (this._durationMs && this._mode === "countdown") {
      this.setAttribute("duration", String(this._durationMs));
    } else {
      this.removeAttribute("duration");
    }
  }

  get max() { return this._maxMs; }
  set max(ms) {
    if (ms == null || ms === "" || isNaN(Number(ms))) {
      this._maxMs = null;
      this.removeAttribute("max");
      return;
    }
    this._maxMs = Math.max(0, Number(ms));
    this.setAttribute("max", String(this._maxMs));
  }

  get autoStart() { return this._autoStart; }
  set autoStart(b) {
    const on = Boolean(b);
    this._autoStart = on;
    if (on) this.setAttribute("auto-start", "");
    else this.removeAttribute("auto-start");
  }

  get completeEvent() { return this._completeEvent; }
  set completeEvent(name) {
    this._completeEvent = name || null;
    if (this._completeEvent) this.setAttribute("complete-event", this._completeEvent);
    else this.removeAttribute("complete-event");
  }

  // --- public API ---
  start() {
    if (this._running) {
      // Restart
      this.stop(/*reset*/true);
    }
    if (this._mode === "countdown" && !this._durationMs) {
      console.warn("<sv-timer>: countdown requires a non-zero duration.");
    }

    this._running = true;
    this._paused = false;
    this._pausedAccum = 0;
    this._tStart = performance.now();
    this._lastEmittedSecond = null;

    this.dispatchEvent(new CustomEvent("sv-timer-start", {
      bubbles: true,
      composed: true,
      detail: this.getTime()
    }));

    this._scheduleLoop();
  }

  pause() {
    if (!this._running || this._paused) return;
    this._paused = true;
    this._tPausedAt = performance.now();
    this._cancelLoop();
    this.dispatchEvent(new CustomEvent("sv-timer-pause", { bubbles: true, composed: true }));
  }

  resume() {
    if (!this._running || !this._paused) return;
    const now = performance.now();
    this._pausedAccum += now - this._tPausedAt;
    this._paused = false;
    this._tPausedAt = 0;
    this._scheduleLoop();
    this.dispatchEvent(new CustomEvent("sv-timer-resume", { bubbles: true, composed: true }));
  }

  stop(reset = false) {
    if (!this._running && !this._paused) return;
    this._cancelLoop();
    this._running = false;
    this._paused = false;
    this._tPausedAt = 0;
    this._pausedAccum = 0;
    this._lastEmittedSecond = null;
    if (reset) {
      // No additional state to reset; duration/max/mode remain as configured
    }
    this.dispatchEvent(new CustomEvent("sv-timer-stop", { bubbles: true, composed: true }));
  }

  reset(configOverride = null) {
    if (configOverride && typeof configOverride === "object") {
      if ("mode" in configOverride) this.mode = configOverride.mode;
      if ("duration" in configOverride) this.duration = configOverride.duration;
      if ("max" in configOverride) this.max = configOverride.max;
      if ("completeEvent" in configOverride) this.completeEvent = configOverride.completeEvent;
      if ("autoStart" in configOverride) this.autoStart = !!configOverride.autoStart;
    }
    this.stop(/*reset*/true);
  }

  getTime() {
    const now = performance.now();
    const baseElapsed = (this._running ? now : (this._paused ? this._tPausedAt : now)) - this._tStart - this._pausedAccum;
    const elapsedMs = Math.max(0, this._running || this._paused ? baseElapsed : 0);

    let remainingMs = null;
    if (this._mode === "countdown") {
      remainingMs = Math.max(0, this._durationMs - elapsedMs);
    } else if (this._mode === "countup" && this._maxMs != null) {
      remainingMs = Math.max(0, this._maxMs - elapsedMs);
    }

    return {
      elapsedMs,
      remainingMs,
      running: this._running && !this._paused,
      mode: this._mode
    };
  }

  // --- internals ---
  _scheduleLoop() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame(this._loop);
  }

  _cancelLoop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
  }

  _loop() {
    this._rafId = 0;
    if (!this._running || this._paused) return;

    const now = performance.now();
    const elapsedMs = now - this._tStart - this._pausedAccum;

    let remainingMs = null;
    let done = false;

    if (this._mode === "countdown") {
      remainingMs = Math.max(0, this._durationMs - elapsedMs);
      done = remainingMs <= 0;
    } else {
      // countup
      if (this._maxMs != null) {
        remainingMs = Math.max(0, this._maxMs - elapsedMs);
        done = remainingMs <= 0;
      } else {
        // pure countup with no cap never "completes"
        remainingMs = null;
        done = false;
      }
    }

    // Emit per-second tick (static event name)
    const secondsForTick = this._mode === "countdown"
      ? Math.max(0, Math.floor(remainingMs !== null ? remainingMs / 1000 : 0))
      : Math.floor(elapsedMs / 1000);

    if (secondsForTick !== this._lastEmittedSecond) {
      this._lastEmittedSecond = secondsForTick;
      this.dispatchEvent(new CustomEvent("sv-timer-tick", {
        bubbles: true,
        composed: true,
        detail: {
          seconds: secondsForTick,
          elapsedMs,
          remainingMs,
          mode: this._mode
        }
      }));
    }

    if (done) {
      // One last precise completion event
      const overshootMs = Math.max(0, elapsedMs - (this._mode === "countdown" ? this._durationMs : (this._maxMs ?? elapsedMs)));
      this._running = false;
      this._paused = false;
      this._cancelLoop();

      const detail = { elapsedMs, overshootMs, mode: this._mode };
      this.dispatchEvent(new CustomEvent("sv-timer-complete", { bubbles: true, composed: true, detail }));

      if (this._completeEvent) {
        this.dispatchEvent(new CustomEvent(this._completeEvent, { bubbles: true, composed: true, detail }));
      }
      return;
    }

    // Continue loop
    this._scheduleLoop();
  }
});
