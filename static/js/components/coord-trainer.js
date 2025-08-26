import { themeSheet } from "../ui-theme.js";
import "./sv-board.js"; // ensure board is registered

const LS_LEN = "svc.coord.seconds";

customElements.define("coord-trainer", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // state
    this.running = false;
    this.endAt = 0;         // ms epoch
    this.timer = null;

    this.target = null;
    this.prevTarget = null;
    this.correct = 0;
    this.wrong = 0;

    this.roundSeconds = 30; // default

    // responsive board sizing
    this._ro = new ResizeObserver(() => this._resizeBoard());
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [themeSheet];
    this.shadowRoot.innerHTML = `
      <section class="card component-container" role="region" aria-label="Coordinate tap trainer">
        <tile-title title="Coordinate Trainer"></tile-title>

        <div class="row" style="justify-content:space-between; align-items:end;">
          <label class="field" for="orient">Orientation
            <select id="orient">
              <option value="white" selected>White</option>
              <option value="black">Black</option>
            </select>
          </label>

          <label class="field" for="coords">Coords overlay
            <select id="coords">
              <option value="off" selected>Off</option>
              <option value="on">On</option>
            </select>
          </label>

          <label class="field" for="length">Round length
            <select id="length">
              <option value="15">15s</option>
              <option value="30" selected>30s</option>
              <option value="60">60s</option>
            </select>
          </label>

          <div class="row" style="margin-left:auto;">
            <button id="start" class="btn btn-primary" type="button">Start (30s)</button>
            <button id="reset" class="btn btn-secondary" type="button" title="Reset stats and timer">Reset</button>
          </div>
        </div>

        <div class="divider"></div>

        <div class="row" style="justify-content:space-between;">
          <div class="muted">Tap square:</div>
          <div id="target" class="mono big-square" aria-live="polite">—</div>
          <div class="muted" style="margin-left:auto;">Time left:</div>
          <div id="clock" class="mono">30.0s</div>
        </div>

        <div class="stack" style="align-items:center; margin-top:var(--space-2);">
          <div id="boardWrap" style="width:100%; display:flex; justify-content:center;">
            <sv-board id="board" size="320" orientation="white" peek="true"></sv-board>
          </div>
          <div id="feedback" class="status" aria-live="polite"></div>
        </div>

        <div class="divider"></div>

        <div class="row">
          <div class="muted">Correct:</div><div id="ok"   class="mono">0</div>
          <div class="muted" style="margin-left:12px;">Wrong:</div><div id="bad"  class="mono">0</div>
          <div class="muted" style="margin-left:auto;">Total:</div><div id="tot"  class="mono">0</div>
        </div>
      </section>
    `;

    this.ui = {
      orient:   this.shadowRoot.querySelector("#orient"),
      coords:   this.shadowRoot.querySelector("#coords"),
      length:   this.shadowRoot.querySelector("#length"),
      start:    this.shadowRoot.querySelector("#start"),
      reset:    this.shadowRoot.querySelector("#reset"),
      target:   this.shadowRoot.querySelector("#target"),
      clock:    this.shadowRoot.querySelector("#clock"),
      board:    this.shadowRoot.querySelector("#board"),
      boardWrap:this.shadowRoot.querySelector("#boardWrap"),
      feedback: this.shadowRoot.querySelector("#feedback"),
      ok:       this.shadowRoot.querySelector("#ok"),
      bad:      this.shadowRoot.querySelector("#bad"),
      tot:      this.shadowRoot.querySelector("#tot"),
    };

    // actions
    this.ui.start.addEventListener("click", () => this.startRound());
    this.ui.reset.addEventListener("click", () => this.resetAll());
    this.ui.orient.addEventListener("change", () => {
      this.ui.board.setAttribute("orientation", this.ui.orient.value === "black" ? "black" : "white");
    });
    this.ui.coords.addEventListener("change", () => {
      const on = this.ui.coords.value === "on";
      if (on) this.ui.board.setAttribute("show-coords", "true");
      else    this.ui.board.removeAttribute("show-coords");
    });
    this.ui.length.addEventListener("change", () => {
      const sec = parseInt(this.ui.length.value || "30", 10);
      this._setRoundSeconds(sec, { updateClock: !this.running });
    });

    // board input
    this._onPointer = (e) => {
      if (!this.running) return;
      const sq = this._clientToSquare(e.clientX, e.clientY);
      if (!sq) return;
      this._judgeClick(sq);
    };
    this.ui.board.addEventListener("pointerdown", this._onPointer);

    // responsive size
    this._ro.observe(this.ui.boardWrap);
    this._resizeBoard();

    // init length from storage (or default)
    let saved = 30;
    try {
      const raw = localStorage.getItem(LS_LEN);
      const n = parseInt(raw || "30", 10);
      if ([15,30,60].includes(n)) saved = n;
    } catch {}
    this.ui.length.value = String(saved);
    this._setRoundSeconds(saved, { updateClock: true });
  }

  disconnectedCallback() {
    this._stopTimer();
    this.ui.board?.removeEventListener("pointerdown", this._onPointer);
    this._ro.disconnect();
  }

  // ===== Round lifecycle =====
  startRound() {
    this.correct = 0; this.wrong = 0;
    this._updateStats();
    this._setFeedback("");
    this.running = true;
    this.endAt = performance.now() + this.roundSeconds * 1000;
    this._tick();
    this._pickNextTarget();
    this.ui.start.disabled = true;
  }

  endRound() {
    this.running = false;
    this._stopTimer();
    this._setClock(0);
    const total = this.correct + this.wrong;
    const msg = total ? `Round over — ${this.correct} correct, ${this.wrong} wrong (${Math.round(this.correct*100/total)}%).`
                      : `Round over — no attempts.`;
    this._setFeedback(msg);
    this.ui.start.disabled = false;
    this.ui.target.textContent = "—";
  }

  resetAll() {
    this.running = false;
    this._stopTimer();
    this.correct = 0; this.wrong = 0;
    this._updateStats();
    this._setClock(this.roundSeconds * 1000);
    this._setFeedback("");
    this.ui.start.disabled = false;
    this.ui.target.textContent = "—";
  }

  // ===== Timer =====
  _tick() {
    this._stopTimer();
    const loop = () => {
      if (!this.running) return;
      const left = Math.max(0, this.endAt - performance.now());
      this._setClock(left);
      if (left <= 0) { this.endRound(); return; }
      this.timer = setTimeout(loop, 100); // 10fps is smooth enough
    };
    loop();
  }
  _stopTimer() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } }
  _setClock(ms) {
    const s = (ms / 1000);
    this.ui.clock.textContent = `${s.toFixed(1)}s`;
  }

  // ===== Target / scoring =====
  _pickNextTarget() {
    const files = "abcdefgh", ranks = "12345678";
    let next;
    do {
      next = files[Math.floor(Math.random()*8)] + ranks[Math.floor(Math.random()*8)];
    } while (next === this.prevTarget);
    this.prevTarget = next;
    this.target = next;
    this.ui.target.textContent = next;
  }

  _judgeClick(sq) {
    if (!this.running) return;
    if (sq === this.target) {
      this.correct++;
      this._setFeedback(`✅ ${sq} — correct`);
    } else {
      this.wrong++;
      this._setFeedback(`❌ ${sq} — wanted ${this.target}`);
    }
    this._updateStats();
    this._pickNextTarget();
  }

  _updateStats() {
    const total = this.correct + this.wrong;
    this.ui.ok.textContent = String(this.correct);
    this.ui.bad.textContent = String(this.wrong);
    this.ui.tot.textContent = String(total);
  }

  _setFeedback(text) { this.ui.feedback.textContent = text || ""; }

  // ===== Length control =====
  _setRoundSeconds(sec, { updateClock = false } = {}) {
    const allowed = [15, 30, 60];
    if (!allowed.includes(sec)) sec = 30;
    this.roundSeconds = sec;

    // update start label
    this.ui.start.textContent = `Start (${sec}s)`;

    // persist
    try { localStorage.setItem(LS_LEN, String(sec)); } catch {}

    // if not running, reflect on clock
    if (updateClock && !this.running) this._setClock(sec * 1000);
  }

  // ===== Hit-testing: client → algebraic =====
  _clientToSquare(clientX, clientY) {
    const rect = this.ui.board.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

    const fileIdx = Math.min(7, Math.max(0, Math.floor(x / (rect.width / 8))));
    const rankIdx = Math.min(7, Math.max(0, Math.floor(y / (rect.height / 8))));

    let f = fileIdx, r = rankIdx;
    const orient = this.ui.board.getAttribute("orientation") === "black" ? "black" : "white";
    if (orient === "black") { f = 7 - f; r = 7 - r; }

    const files = "abcdefgh";
    const ranks = "87654321"; // top row = '8'
    return files[f] + ranks[r];
  }

  // ===== Responsive board sizing =====
  _resizeBoard() {
    const wrapW = this.ui.boardWrap.clientWidth || 320;
    // leave some breathing room; cap size for sanity
    const size = Math.max(220, Math.min(480, Math.floor(wrapW * 0.9)));
    this.ui.board.setAttribute("size", String(size));
  }
});
