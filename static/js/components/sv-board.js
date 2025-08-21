// <sv-board> — simple, correct, and oriented at draw time only.
//
// Assumptions (per your PNG):
// - Sprite is 320x120, laid out as 2 rows x 6 columns.
// - TOP row = BLACK pieces, BOTTOM row = WHITE pieces.
// - Columns (left→right) = Q K R N B P  (QKRNBP).
//
// Internal board storage:
// - 64-length array, index 0 = a8, then a8..h8, a7..h7, ... , a1..h1.
//
// Attributes: size, orientation ("white"|"black"), fen, pieces-src, show-coords, peek.
// Methods: setFEN(fen), setOrientation(side), refresh(), peekStart(ms?), peekStop().
// Events: sv-board-ready, sv-board-peek-start, sv-board-peek-end.

const DEFAULT_SIZE = 320;
const DEFAULT_SRC  = "/static/img/ChessPiecesArray.png";

// column order in the spritesheet (Q K R N B P)
const SPRITE_COL = { q:0, k:1, r:2, n:3, b:4, p:5 };

customElements.define("sv-board", class extends HTMLElement {
  static get observedAttributes() {
    return ["size","orientation","fen","pieces-src","show-coords","peek"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // State
    this._size = DEFAULT_SIZE;
    this._orientation = "white"; // or "black"
    this._fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    this._piecesSrc = DEFAULT_SRC;
    this._showCoords = false;
    this._peek = false;  // hidden by default
    this._peekTimer = null;

    this._img = new Image();
    this._imgLoaded = false;

    // Internal board: index 0=a8, row-major
    this._board = this._fenToArray(this._fen);

    // DOM
    const style = document.createElement("style");
    style.textContent = `
      :host { display: inline-block; }
      .wrap { position: relative; width:${DEFAULT_SIZE}px; height:${DEFAULT_SIZE}px; user-select:none; touch-action:none; }
      canvas { width:100%; height:100%; display:block; border-radius:8px; }
      .cover { position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.65)); border-radius:8px; display:none; }
      :host([peek="false"]) .cover, :host(:not([peek])) .cover { display:block; }
      .coords { position:absolute; inset:0; pointer-events:none; font:600 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color:rgba(255,255,255,.9); text-shadow:0 1px 2px rgba(0,0,0,.8); }
    `;

    const wrap = document.createElement("div");
    wrap.className = "wrap";

    this._canvas = document.createElement("canvas");
    this._ctx = this._canvas.getContext("2d", { alpha: true });

    this._cover = document.createElement("div");
    this._cover.className = "cover";

    this._coordsLayer = document.createElement("div");
    this._coordsLayer.className = "coords";
    this._coordsLayer.hidden = !this._showCoords;

    wrap.append(this._canvas, this._cover, this._coordsLayer);
    this.shadowRoot.append(style, wrap);

    this._ro = new ResizeObserver(() => this._resizeAndRender());
  }

  connectedCallback() {
    if (!this.hasAttribute("size")) this.setAttribute("size", String(this._size));
    if (!this.hasAttribute("orientation")) this.setAttribute("orientation", this._orientation);
    if (!this.hasAttribute("fen")) this.setAttribute("fen", this._fen);
    if (!this.hasAttribute("pieces-src")) this.setAttribute("pieces-src", this._piecesSrc);
    if (!this.hasAttribute("peek")) this.setAttribute("peek", "false");

    this._loadSprite().then(() => {
      this._imgLoaded = true;
      this._resizeAndRender();
      this.dispatchEvent(new CustomEvent("sv-board-ready", { bubbles:true, composed:true }));
    });

    this._ro.observe(this.shadowRoot.querySelector(".wrap"));
  }

  disconnectedCallback() {
    this._ro.disconnect();
    this._clearPeekTimer();
  }

  attributeChangedCallback(name, _old, value) {
    switch (name) {
        case "size": {
        const n = Math.max(160, Math.round(Number(value) || DEFAULT_SIZE));
        if (n !== this._size) {
            this._size = n;
            const wrap = this.shadowRoot.querySelector(".wrap");
            if (wrap) { wrap.style.width = n + "px"; wrap.style.height = n + "px"; }
            this._resizeAndRender();
        }
        break;
        }

        case "orientation": {
        const o = (value === "black") ? "black" : "white";
        if (o !== this._orientation) {
            this._orientation = o;
            this._render();
        }
        break;
        }

        case "fen": {
        const fen = (value || "").trim();
        if (fen && fen !== this._fen) {
            this._fen = fen;
            this._board = this._fenToArray(this._fen);
            this._render();
        }
        break;
        }

        case "pieces-src": {
        const src = value || DEFAULT_SRC;
        if (src !== this._piecesSrc) {
            this._piecesSrc = src;
            this._loadSprite().then(() => { this._imgLoaded = true; this._render(); }).catch(() => {});
        }
        break;
        }

        case "show-coords": {
        const show = value !== null && value !== "false";
        if (show !== this._showCoords) {
            this._showCoords = show;
            if (this._coordsLayer) this._coordsLayer.hidden = !this._showCoords;
            this._render();
        }
        break;
        }

        case "peek": {
        const peek = (value === "true");
        if (peek !== this._peek) {
            this._peek = peek;
            this._render();
        }
        break;
        }
    }
  }


  _reflectAttr(name, value) {
    if (this.getAttribute(name) !== value) this.setAttribute(name, value);
  }

  get size() { return this._size; }
  set size(px) {
    const n = Math.max(160, Math.round(px));
    this._size = n;
    const wrap = this.shadowRoot.querySelector(".wrap");
    wrap.style.width = n + "px";
    wrap.style.height = n + "px";
    this._resizeAndRender();
  }

  // public API
  setFEN(fen, { reflect = false } = {}) {
    if (!fen || typeof fen !== "string") return;
    const normalized = fen.trim();
    if (normalized === this._fen) return;
    this._fen = normalized;
    if (reflect) this._reflectAttr("fen", this._fen);
    this._board = this._fenToArray(this._fen);
    this._render();
  }

  setOrientation(side, { reflect = false } = {}) {
    const o = side === "black" ? "black" : "white";
    if (o === this._orientation) return;
    this._orientation = o;
    if (reflect) this._reflectAttr("orientation", o);
    this._render();
  }

  refresh() { this._render(); }

  peekStart(ms) {
    this._clearPeekTimer();
    this.setAttribute("peek", "true");
    this.dispatchEvent(new CustomEvent("sv-board-peek-start", { bubbles:true, composed:true }));
    if (typeof ms === "number" && ms > 0) {
      this._peekTimer = setTimeout(() => this.peekStop(), ms);
    }
  }
  peekStop() {
    this._clearPeekTimer();
    this.setAttribute("peek", "false");
    this.dispatchEvent(new CustomEvent("sv-board-peek-end", { bubbles:true, composed:true }));
  }

  // internals
  async _loadSprite() {
    this._imgLoaded = false;
    this._img = new Image();
    // If you ever host cross-origin, set CORS headers and uncomment:
    // this._img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      this._img.onload = resolve;
      this._img.onerror = reject;
      this._img.src = this._piecesSrc;
    });
  }
  _setPiecesSrc(src) {
    if (!src || src === this._piecesSrc) return;
    this._piecesSrc = src;
    this._loadSprite().then(() => { this._imgLoaded = true; this._render(); }).catch(() => {});
  }

  _resizeAndRender() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = this._size;
    const cssH = this._size;
    this._canvas.width  = Math.round(cssW * dpr);
    this._canvas.height = Math.round(cssH * dpr);
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._render();
  }

  _render() {
    const ctx = this._ctx;
    if (!ctx) return;

    const N = 8;
    const W = this._size, H = this._size;
    const SQ = Math.min(W, H) / N;

    ctx.clearRect(0, 0, W, H);

    // board colors
    const light = getComputedStyle(this).getPropertyValue("--sv-board-light")?.trim() || "#f0d9b5";
    const dark  = getComputedStyle(this).getPropertyValue("--sv-board-dark")?.trim()  || "#b58863";

    // draw squares (indices are top-origin: file=0..7 (a..h), rank=0..7 (8..1))
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const isDark = ((file + rank) % 2) === 1; // a8 light, a1 dark, h1 light
        ctx.fillStyle = isDark ? dark : light;
        const { x, y } = this._squareToXY(file, rank, SQ);
        ctx.fillRect(x, y, SQ, SQ);
      }
    }

    // draw pieces
    if (this._imgLoaded) {
      const tileW = this._img.width / 6;
      const tileH = this._img.height / 2;

      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const idx = rank * 8 + file;         // 0=a8
          const p = this._board[idx];
          if (!p) continue;

          const isWhite = p === p.toUpperCase();
          const col = SPRITE_COL[p.toLowerCase()];
          if (col == null) continue;

          const sx = col * tileW;
          const sy = isWhite ? tileH : 0;      // BLACK top row(0), WHITE bottom row(1)

          const { x, y } = this._squareToXY(file, rank, SQ);
          this._ctx.drawImage(this._img, sx, sy, tileW, tileH, x, y, SQ, SQ);
        }
      }
    }

    // coords overlay (bottom files + left ranks)
    if (this._showCoords) {
        this._coordsLayer.innerHTML = "";
        const frag = document.createDocumentFragment();
        const files = ["a","b","c","d","e","f","g","h"];
        const ranks = ["8","7","6","5","4","3","2","1"]; // top→bottom in board space

        // Bottom file labels: a..h for white; h..a for black
        for (let i = 0; i < 8; i++) {
            const span = document.createElement("span");
            const labelIndex = (this._orientation === "white") ? i : (7 - i);
            span.textContent = files[labelIndex];
            span.style.position = "absolute";
            span.style.bottom = "2px";
            span.style.left = ((i + 0.05) * SQ) + "px"; // position is always 0..7
            frag.appendChild(span);
        }

        // Left rank labels: 8..1 for white; 1..8 for black
        for (let i = 0; i < 8; i++) {
            const span = document.createElement("span");
            const labelIndex = (this._orientation === "white") ? i : (7 - i);
            span.textContent = ranks[labelIndex];
            span.style.position = "absolute";
            span.style.left = "2px";
            span.style.top = ((i + 0.05) * SQ) + "px"; // position is always 0..7 from top
            frag.appendChild(span);
        }

        this._coordsLayer.appendChild(frag);
    }
  }

  // Convert board square (file,rank) in top-origin coordinates to canvas XY based on orientation.
  // file: 0..7 (a..h left→right), rank: 0..7 (8..1 top→bottom)
  _squareToXY(file, rank, SQ) {
    if (this._orientation === "white") {
      // a8 at (0,0), a1 at (0,7)
      return { x: file * SQ, y: rank * SQ };
    } else {
      // flip both axes for black orientation
      return { x: (7 - file) * SQ, y: (7 - rank) * SQ };
    }
  }

  // FEN → array with index 0 = a8, row-major (a8..h8, a7..h7, ... a1..h1)
  _fenToArray(fen) {
    const board = new Array(64).fill("");
    const [placement] = fen.split(/\s+/);
    const rows = placement.split("/");
    if (rows.length !== 8) return board;

    for (let rank = 0; rank < 8; rank++) {
      const row = rows[rank]; // rank=0 is FEN's first row (rank 8)
      let file = 0;
      for (const ch of row) {
        if (/[1-8]/.test(ch)) {
          file += Number(ch);
        } else {
          const idx = rank * 8 + file; // rank-major from the top
          board[idx] = ch;
          file++;
        }
      }
    }
    return board;
  }

  _clearPeekTimer() {
    if (this._peekTimer) {
      clearTimeout(this._peekTimer);
      this._peekTimer = null;
    }
  }
});
