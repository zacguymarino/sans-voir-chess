// Blindfold "Best Move / Mate" trainer
// Usage: <mate-trainer></mate-trainer>
//
// - Puzzles are defined at the bottom in PUZZLES[] (add your own!)
// - Each puzzle stores a FEN + full solution line in UCI (both sides).
// - The widget renders N inputs where N = # of *user* moves needed (hint).
// - After each correct user move, we auto-play the opponent reply (from solution).
//
// Dependencies: themeSheet, chess.js, sv-board (for rendering piece icons) & peekBoard overlay.

import { themeSheet } from "../ui-theme.js";
import { Chess } from "../chess.js";
import { peekBoard } from "../peek-board.js";
import { PUZZLES } from "../puzzles/mate_bestmove_puzzles.js";
import { hardenTextInputs } from "../utils/mobile-tweaks.js";

const PIECE_SPRITE = "/static/img/ChessPiecesArray.png"; // Q K R N B P (cols), Black row top, White row bottom
const SPRITE_COL = { q:0, k:1, r:2, n:3, b:4, p:5 };     // column mapping

// --------- Puzzles data ---------
// Add your own here. Each puzzle:
// - fen: starting position
// - solutionUci: full principal variation in UCI (both sides). We'll
//   ask the user for only *their* moves (we auto-play the replies).
//
// NOTE: These are simple "best-move" demo puzzles for UI testing.

customElements.define("mate-trainer", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.game = new Chess();             // internal validator / state
    this.current = null;                 // { id, fen, solutionUci[], title? }
    this.userPlyIndex = 0;               // index into solution where user's next move is expected
    this.userMovesNeeded = 0;            // N inputs (user moves only)
    this._peekHandle = null;

    // tiny icon cache: key = piece char ('K','q', etc), value = dataURL
    this._iconCache = new Map();
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [themeSheet];
    this.shadowRoot.innerHTML = `
      <section class="card component-container" role="region" aria-label="Blindfold mate/best-move trainer">
        <tile-title title="Checkmate Trainer"></tile-title>

        <div class="content-medium">
          <!-- Top bar: controls -->
          <div class="row" style="justify-content: space-between;">
            <div class="row">
              <button id="peekBtn" class="btn btn-primary" type="button" title="Peek at the board">Peek</button>
              <label class="field" style="width:100px">
                Peek (s)
                <input id="peekSeconds" class="input" type="number" min="1" max="30" value="3" />
              </label>
            </div>
            <div class="row">
              <button id="revealBtn" class="btn btn-secondary" type="button">Reveal Solution</button>
              <button id="nextBtn" class="btn btn-primary" type="button">Next Puzzle</button>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Position summary -->
          <div class="stack" aria-label="Position description">
            <div class="row">
              <div class="muted">Side to move:</div>
              <div id="sideToMove" class="mono"></div>
              <div class="muted" style="margin-left:auto;">Moves required:</div>
              <div id="movesNeeded" class="mono"></div>
            </div>

            <div class="row" style="align-items:flex-start;">
              <div style="flex:1; min-width:220px;">
                <div class="muted">White pieces</div>
                <div id="whiteList" class="piece-line"></div>
              </div>
              <div style="flex:1; min-width:220px;">
                <div class="muted">Black pieces</div>
                <div id="blackList" class="piece-line"></div>
              </div>
          </div>

          <div class="divider"></div>

          <!-- Inputs -->
          <div class="stack">
            <div class="muted">Enter your moves in UCI (e.g., <span class="mono">e2e4</span>, <span class="mono">g7g8q</span>)</div>
            <div id="inputsRow" class="row" style="flex-wrap:wrap;"></div>
          </div>

          <div id="status" class="status" aria-live="polite" style="margin-top: var(--space-2);"></div>
        </div>
      </section>
    `;
    const style = document.createElement("style");
    style.textContent = `
    .piece-line { 
        display: flex; 
        flex-wrap: wrap;         /* wrap on narrow screens */
        gap: 8px 12px;           /* “a few spaces” between entries */
        align-items: center; 
        margin-top: 4px;
    }
    .piece-chip {
        display: inline-flex; 
        align-items: center; 
        gap: 6px;               /* space between icon and square */
        white-space: nowrap;    /* keep icon+square together */
    }
    .piece-sep { opacity: .6; } /* commas look subtle */
    `;
    this.shadowRoot.appendChild(style);
    hardenTextInputs(this.shadowRoot);

    // refs
    this.ui = {
      peekBtn: this.shadowRoot.querySelector("#peekBtn"),
      peekSeconds: this.shadowRoot.querySelector("#peekSeconds"),
      revealBtn: this.shadowRoot.querySelector("#revealBtn"),
      nextBtn: this.shadowRoot.querySelector("#nextBtn"),
      sideToMove: this.shadowRoot.querySelector("#sideToMove"),
      movesNeeded: this.shadowRoot.querySelector("#movesNeeded"),
      whiteList: this.shadowRoot.querySelector("#whiteList"),
      blackList: this.shadowRoot.querySelector("#blackList"),
      inputsRow: this.shadowRoot.querySelector("#inputsRow"),
      status: this.shadowRoot.querySelector("#status"),
      card: this.shadowRoot.querySelector("section"),
    };

    // events
    this.ui.nextBtn.addEventListener("click", () => this.loadRandomPuzzle());
    this.ui.revealBtn.addEventListener("click", () => this.revealSolution());
    this.ui.peekBtn.addEventListener("click", () => this.onPeek());

    // init first
    this.loadRandomPuzzle();
  }

  // --------- Puzzle lifecycle ---------

  loadRandomPuzzle() {
    // pick one at random for now
    this.current = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    this.loadPuzzle(this.current);
  }

  loadPuzzle(pz) {
    try {
      this.game.load(pz.fen);
    } catch {
      this.setStatus("⚠️ Bad FEN in puzzle.", "warn");
      return;
    }

    // compute how many *user* moves are expected
    // If it's white to move, user moves are plies at even indices (0,2,4,...) in solution
    // If black to move, user moves are plies at odd indices (1,3,5,...) in solution
    const stm = this.game.turn(); // 'w' | 'b'
    const sol = pz.solutionUci.slice();
    const userStartsAt = (stm === "w") ? 0 : 1;
    this.userMovesNeeded = Math.ceil((sol.length - userStartsAt) / 2);
    this.userPlyIndex = userStartsAt;

    // UI
    this.ui.sideToMove.textContent = (stm === "w") ? "White" : "Black";
    this.ui.movesNeeded.textContent = String(this.userMovesNeeded);
    this.renderPieceListsFromFEN(pz.fen);
    this.renderInputs();

    // clear status
    this.setStatus("");
  }

  // Render N inputs and wire them to validate sequentially
  renderInputs() {
    this.ui.inputsRow.innerHTML = "";
    const inputs = [];
    for (let i = 0; i < this.userMovesNeeded; i++) {
      const wrap = document.createElement("div");
      wrap.style.display = "grid";
      wrap.style.gap = "4px";
      wrap.style.minWidth = "110px";

      const lab = document.createElement("label");
      lab.className = "muted";
      lab.textContent = `Move ${i+1}`;

      const inp = document.createElement("input");
      inp.className = "input mono";
      inp.type = "text";
      inp.placeholder = "e2e4";
      inp.maxLength = 5; // "e7e8q"
      inp.setAttribute("data-index", String(i));

      // submit on Enter
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.trySubmitInput(inp);
        }
      });

      wrap.append(lab, inp);
      this.ui.inputsRow.appendChild(wrap);
      inputs.push(inp);
    }

    // focus the first
    if (inputs[0] && !this.hasAttribute("data-no-autofocus")) {
      try { inputs[0].focus({ preventScroll: true }); } catch { inputs[0].focus(); }
    }

    // Keep a local reference
    this._inputs = inputs;

    // click outside submit helper - we also accept blur if they filled full UCI
    inputs.forEach(inp => {
      inp.addEventListener("blur", () => {
        const v = inp.value.trim();
        if (/^[a-h][1-8][a-h][1-8][qnrb]?$/i.test(v)) {
          this.trySubmitInput(inp);
        }
      });
    });
  }

  trySubmitInput(inpEl) {
    const raw = (inpEl.value || "").trim().toLowerCase();
    const okFormat = /^[a-h][1-8][a-h][1-8][qnrb]?$/i.test(raw);
    if (!okFormat) {
      this.setStatus(`⚠️ Invalid move. Use UCI like "e2e4" or "g7g8q".`, "warn");
      inpEl.focus();
      return;
    }

    // Check against the solution's expected move for the user
    const expectedUci = this.current.solutionUci[this.userPlyIndex];
    if (!expectedUci) {
      this.setStatus("⚠️ Unexpected input; puzzle already complete?", "warn");
      return;
    }

    if (raw.toLowerCase() !== expectedUci.toLowerCase()) {
      this.setStatus(`❌ Not the best move for this puzzle.`, "warn");
      inpEl.focus();
      return;
    }

    // Apply user's correct move
    try {
      this.game.move({ from: raw.slice(0,2), to: raw.slice(2,4), promotion: raw[4] || undefined });
    } catch {
      // In case solution & FEN don't align (while you're curating), fail gracefully
      this.setStatus("⚠️ Move doesn't apply to this position. Check puzzle data.", "warn");
      return;
    }

    // Lock this input and advance
    inpEl.setAttribute("readonly", "true");
    inpEl.style.opacity = "0.85";
    inpEl.style.cursor = "default";
    this.userPlyIndex += 2; // next expected user ply

    // Auto-play opponent reply if present
    const oppReplyIdx = this.userPlyIndex - 1;
    const reply = this.current.solutionUci[oppReplyIdx];
    if (reply) {
      try {
        this.game.move({ from: reply.slice(0,2), to: reply.slice(2,4), promotion: reply[4] || undefined });
        this.setStatus(`…Opponent plays ${reply}.`, "info");
      } catch {
        this.setStatus("⚠️ Opponent reply in data doesn't apply. Check puzzle.", "warn");
      }
    } else {
      this.setStatus(""); // clear if none
    }

    // Completed?
    const submitted = this._inputs.filter(x => x.hasAttribute("readonly")).length;
    if (submitted === this.userMovesNeeded) {
      this.setStatus("✅ Solved!", "ok");
    } else {
      // focus next input
      const next = this._inputs.find(x => !x.hasAttribute("readonly"));
      next?.focus();
    }
  }

  // --------- Peek ---------

  onPeek() {
    const secs = Math.max(1, Math.min(60, parseInt(this.ui.peekSeconds.value || "3", 10)));
    const fen = this.game.fen();
    const orientation = (fen.split(" ")[1] === "b") ? "black" : "white";

    if (this._peekHandle) this._peekHandle.close();
    this._peekHandle = peekBoard(this.ui.card, {
      fen,
      orientation,
      durationMs: secs * 1000,
      showCoords: true,
    });
  }

  // --------- Rendering helpers ---------

  setStatus(text, kind) {
    const el = this.ui.status;
    if (!text) { el.textContent = ""; return; }
    const wrap = (t) => kind === "ok" ? `✅ ${t}` : kind === "warn" ? `⚠️ ${t}` : t;
    el.innerHTML = `<span class="${kind === "ok" ? "ok" : kind === "warn" ? "warn" : ""}">${wrap(text)}</span>`;
  }

  // Parse FEN placement, produce two lists with icons + squares
  renderPieceListsFromFEN(fen) {
    const USE_COMMAS = true; // set to false for just spacing (no commas)

    const [placement] = fen.split(/\s+/);
    const rows = placement.split("/");
    const white = [], black = [];

    for (let r = 0; r < 8; r++) {
        let file = 0;
        for (const ch of rows[r]) {
        if (/[1-8]/.test(ch)) { file += Number(ch); continue; }
        const isWhite = ch === ch.toUpperCase();
        const square = this.idxToSquare(r * 8 + file);
        (isWhite ? white : black).push({ p: ch, square });
        file++;
        }
    }

    const order = ["K","Q","R","B","N","P","k","q","r","b","n","p"];
    white.sort((a,b) => order.indexOf(a.p) - order.indexOf(b.p) || a.square.localeCompare(b.square));
    black.sort((a,b) => order.indexOf(a.p) - order.indexOf(b.p) || a.square.localeCompare(b.square));

    const renderLine = (arr, container) => {
        container.innerHTML = "";
        arr.forEach((item, i) => {
        const chip = document.createElement("span");
        chip.className = "piece-chip";

        const img = document.createElement("img");
        img.width = 20; img.height = 20; img.alt = item.p;

        this.getPieceIconDataURL(item.p).then(url => { img.src = url; }).catch(() => {});

        const txt = document.createElement("span");
        txt.className = "mono";
        txt.textContent = item.square;

        chip.append(img, txt);
        container.appendChild(chip);

        if (USE_COMMAS && i < arr.length - 1) {
            const sep = document.createElement("span");
            sep.className = "piece-sep";
            sep.textContent = ",";
            container.appendChild(sep);
        }
        });
    };

    renderLine(white, this.ui.whiteList);
    renderLine(black, this.ui.blackList);
  }


  // make a small 20x20 icon from spritesheet; cache by piece char
  async getPieceIconDataURL(pieceChar) {
    const key = pieceChar;
    if (this._iconCache.has(key)) return this._iconCache.get(key);

    // ensure image is loaded
    const img = await this.loadSprite();

    const tileW = img.width / 6;
    const tileH = img.height / 2;
    const lower = pieceChar.toLowerCase();
    const col = SPRITE_COL[lower];
    if (col == null) return "";

    const sx = col * tileW;
    const sy = (pieceChar === pieceChar.toUpperCase()) ? tileH : 0;

    const canvas = document.createElement("canvas");
    canvas.width = 20; canvas.height = 20;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, sx, sy, tileW, tileH, 0, 0, 20, 20);

    const url = canvas.toDataURL("image/png");
    this._iconCache.set(key, url);
    return url;
  }

  loadSprite() {
    if (this._spritePromise) return this._spritePromise;
    this._spritePromise = new Promise((resolve, reject) => {
      const img = new Image();
      // If you host cross-origin, ensure CORS headers and uncomment:
      // img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = PIECE_SPRITE;
    });
    return this._spritePromise;
  }

  // index 0=a8 → "a8"
  idxToSquare(idx) {
    const file = idx % 8;
    const rank = Math.floor(idx / 8); // 0=top row (8th rank)
    const files = "abcdefgh";
    const ranks = "87654321"; // rank 0→'8'
    return files[file] + ranks[rank];
  }

  revealSolution() {
    const sol = this.current?.solutionUci || [];
    if (!sol.length) return;
    const parts = [];
    const fenSide = this.game.fen().split(" ")[1]; // after any moves we applied
    // format subscripts: pair into moves
    let moveNum = 1;
    let ptr = 0;
    // We don't rebuild SAN; just show the UCI sequence grouped by move number.
    while (ptr < sol.length) {
      const whiteMove = sol[ptr++] || "";
      const blackMove = sol[ptr++] || "";
      if (whiteMove && blackMove) {
        parts.push(`${moveNum}. ${whiteMove} ${blackMove}`);
      } else if (whiteMove) {
        parts.push(`${moveNum}. ${whiteMove}`);
      }
      moveNum++;
    }
    this.setStatus(`Solution: ${parts.join("  ")}`, "info");
  }
});
