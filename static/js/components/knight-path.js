// Knight shortest-path trainer (blindfold-friendly).
// Usage: <knight-path></knight-path>

import { themeSheet } from "../ui-theme.js";
import { Chess } from "../chess.js";
import { hardenTextInputs } from "../utils/mobile-tweaks.js";

customElements.define("knight-path", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.start = null;
    this.target = null;
    this.userPath = [];
    this.optimalPath = [];
    this.game = new Chess(); // reused for move generation
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [themeSheet];
    this.shadowRoot.innerHTML = `
      <section class="card component-container" role="region" aria-label="Knight path trainer">
        <tile-title title="Knight Path"></tile-title>
        <div class="content-narrow">
            <div class="row">
            <div class="muted">Start:</div><div id="start" class="mono"></div>
            <div class="muted">Target:</div><div id="target" class="mono"></div>
            </div>

            <div class="divider"></div>

            <div class="stack" aria-label="Input controls">
            <label class="muted" for="sq">Enter next square (e.g. c3):</label>
            <div class="row">
                <input id="sq" class="input mono" type="text" placeholder="c3" maxlength="2" aria-label="Next knight square (e.g., c3)" />
                <button id="add" class="btn btn-primary" type="button">Add</button>
                <button id="undo" class="btn btn-primary" type="button">Undo</button>
                <button id="reset" class="btn btn-primary" type="button">Reset</button>
            </div>
            </div>

            <div class="row" style="margin-top: var(--space-2);">
            <div class="muted">Your path:</div>
            <div id="path" class="mono"></div>
            <div class="muted" style="margin-left:auto;">Length:</div>
            <div id="len" class="mono">0</div>
            </div>

            <div id="msg" class="status" aria-live="polite"></div>

            <div class="row" style="margin-top: var(--space-2);">
            <button id="revealLen"  class="btn btn-secondary" type="button">Reveal # Moves</button>
            <button id="revealPath" class="btn btn-secondary" type="button">Reveal Path</button>
            <button id="next"       class="btn btn-primary" type="button">Next Puzzle</button>
            </div>

            <div id="revealBox" class="mono muted" style="margin-top: var(--space-2);"></div>
        </div>
      </section>
    `;
    hardenTextInputs(this.shadowRoot);

    this.ui = {
      start: this.shadowRoot.querySelector("#start"),
      target: this.shadowRoot.querySelector("#target"),
      sq: this.shadowRoot.querySelector("#sq"),
      add: this.shadowRoot.querySelector("#add"),
      undo: this.shadowRoot.querySelector("#undo"),
      reset: this.shadowRoot.querySelector("#reset"),
      path: this.shadowRoot.querySelector("#path"),
      len: this.shadowRoot.querySelector("#len"),
      msg: this.shadowRoot.querySelector("#msg"),
      revealLen: this.shadowRoot.querySelector("#revealLen"),
      revealPath: this.shadowRoot.querySelector("#revealPath"),
      next: this.shadowRoot.querySelector("#next"),
      revealBox: this.shadowRoot.querySelector("#revealBox"),
    };

    this.ui.add.addEventListener("click", () => this.onAdd());
    this.ui.undo.addEventListener("click", () => this.onUndo());
    this.ui.reset.addEventListener("click", () => this.resetUserPath());
    this.ui.revealLen.addEventListener("click", () => this.revealMinimal());
    this.ui.revealPath.addEventListener("click", () => this.revealOptimal());
    this.ui.next.addEventListener("click", () => this.newPuzzle());
    this.ui.sq.addEventListener("keydown", (e) => { if (e.key === "Enter") this.onAdd(); });

    this.newPuzzle();
  }

  // ===== Puzzle lifecycle =====

  newPuzzle() {
    this.userPath = [];
    this.ui.revealBox.textContent = "";
    this.clearMsg();

    const files = "abcdefgh", ranks = "12345678";
    const randSquare = () => files[Math.floor(Math.random()*8)] + ranks[Math.floor(Math.random()*8)];
    let a = randSquare(), b = randSquare();
    while (b === a) b = randSquare();

    this.start = a;
    this.target = b;

    // Precompute (cheap) but keep hidden until revealed
    this.optimalPath = this.bfsKnightShortest(a, b);

    this.ui.start.textContent = this.start;
    this.ui.target.textContent = this.target;
    this.renderPath();
    this.ui.sq.value = "";
    if (!this.hasAttribute("data-no-autofocus")) {
      try { this.ui.sq.focus({ preventScroll: true }); } catch { this.ui.sq.focus(); }
    }

    if ((this.optimalPath.length - 1) === 0) {
      this.info(`Already there. Hit “Next Puzzle”.`);
    }
  }

  resetUserPath() {
    this.userPath = [];
    this.clearMsg();
    this.renderPath();
    if (!this.hasAttribute("data-no-autofocus")) {
      try { this.ui.sq.focus({ preventScroll: true }); } catch { this.ui.sq.focus(); }
    }
  }

  // ===== User interactions =====

  onAdd() {
    const raw = this.ui.sq.value.trim().toLowerCase();
    this.ui.sq.value = "";
    if (!/^[a-h][1-8]$/.test(raw)) {
      this.warn(`Enter a square like “c3”.`);
      return;
    }

    const from = this.userPath.length === 0 ? this.start : this.userPath[this.userPath.length - 1];
    const to = raw;

    if (!this.isKnightHop(from, to)) {
      this.warn(`Illegal knight move: ${from} → ${to}`);
      return;
    }

    this.userPath.push(to);
    this.renderPath();

    if (to === this.target) {
      const used = this.userPath.length;
      const optimal = this.optimalPath.length - 1;
      if (used === optimal) {
        this.ok(`Perfect! Reached ${this.target} in the minimal ${optimal} move${optimal===1?"":"s"}.`);
      } else if (used > optimal) {
        this.info(`Nice! You reached the target in ${used}. Optimal is ${optimal}.`);
      } else {
        this.info(`You reached the target in fewer than computed optimal? (Edge-case)`);
      }
    } else {
      this.clearMsg();
    }

    this.ui.sq.focus();
  }

  onUndo() {
    if (this.userPath.length > 0) {
      this.userPath.pop();
      this.renderPath();
      this.clearMsg();
    }
    this.ui.sq.focus();
  }

  // ===== Rendering & messages =====

  renderPath() {
    const seq = [this.start, ...this.userPath];
    this.ui.path.textContent = seq.join(" → ");
    this.ui.len.textContent = String(this.userPath.length);
  }

  ok(text)   { this.ui.msg.innerHTML = `<span class="ok">✅ ${text}</span>`; }
  warn(text) { this.ui.msg.innerHTML = `<span class="warn">⚠️ ${text}</span>`; }
  info(text) { this.ui.msg.textContent = text; }
  clearMsg() { this.ui.msg.textContent = ""; }

  // Revealers
  revealMinimal() {
    const moves = this.optimalPath.length - 1;
    this.ui.revealBox.textContent = `Minimal moves: ${moves}`;
  }

  revealOptimal() {
    const line = this.optimalPath.join(" → ");
    const moves = this.optimalPath.length - 1;
    this.ui.revealBox.textContent = `Optimal path (${moves}): ${line}`;
  }

  // ===== Core logic =====

  knightNeighbors(square) {
    this.game.clear();
    this.game.put({ type: "n", color: "w" }, square);
    const moves = this.game.moves({ square, verbose: true });
    return moves.map(m => m.to);
  }

  bfsKnightShortest(start, target) {
    if (start === target) return [start];

    const queue = [[start, [start]]];
    const visited = new Set([start]);

    while (queue.length) {
      const [sq, path] = queue.shift();
      for (const nb of this.knightNeighbors(sq)) {
        if (visited.has(nb)) continue;
        const nextPath = [...path, nb];
        if (nb === target) return nextPath;
        visited.add(nb);
        queue.push([nb, nextPath]);
      }
    }
    return [start];
  }

  isKnightHop(from, to) {
    return this.knightNeighbors(from).includes(to);
  }
});
