import { themeSheet } from "../ui-theme.js";

customElements.define("square-color", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.square = null;
    this.correctColor = null;
    this._lastSquare = null;
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [themeSheet];
    this.shadowRoot.innerHTML = `
      <section class="card component-container" role="region" aria-label="Square color trainer">
        <tile-title title="Square Color"></tile-title>
        <div class="content-narrow" style="text-align: center;">
          <p class="muted">Choose the color of the square:</p>

          <div id="square" class="mono big-square"></div>

          <div class="row" style="justify-content: center;" aria-label="Answer controls">
            <button id="light" class="btn btn-white" type="button">Light</button>
            <button id="dark"  class="btn btn-black" type="button">Dark</button>
            <button id="next"  class="btn btn-primary" type="button" title="Next (Enter)">Next</button>
          </div>

          <div id="feedback" class="status" aria-live="polite"></div>
          <p class="muted shortcuts">Shortcuts: L / D or ← / →, Enter for Next</p>
        </div>
      </section>
    `;

    // Cache DOM refs
    this.squareEl = this.shadowRoot.querySelector("#square");
    this.feedbackEl = this.shadowRoot.querySelector("#feedback");
    this.lightBtn = this.shadowRoot.querySelector("#light");
    this.darkBtn = this.shadowRoot.querySelector("#dark");
    this.nextBtn = this.shadowRoot.querySelector("#next");

    // Event listeners
    this.lightBtn.addEventListener("click", () => this.checkAnswer("light"));
    this.darkBtn.addEventListener("click", () => this.checkAnswer("dark"));
    this.nextBtn.addEventListener("click", () => this.generateSquare());

    // Keyboard shortcuts
    this._keyHandler = (e) => {
      const k = e.key.toLowerCase();
      if (k === "l" || e.key === "ArrowLeft") {
        e.preventDefault();
        this.checkAnswer("light");
      } else if (k === "d" || e.key === "ArrowRight") {
        e.preventDefault();
        this.checkAnswer("dark");
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.generateSquare();
      }
    };
    this.addEventListener("keydown", this._keyHandler);
    this.tabIndex = 0; // focusable

    this.generateSquare();
  }

  disconnectedCallback() {
    this.removeEventListener("keydown", this._keyHandler);
  }

  generateSquare() {
    const files = "abcdefgh";
    const ranks = "12345678";
    let file, rank, square;

    // Avoid repeating last square
    do {
      file = files[Math.floor(Math.random() * 8)];
      rank = ranks[Math.floor(Math.random() * 8)];
      square = file + rank;
    } while (square === this._lastSquare);

    this.square = square;
    this._lastSquare = square;

    const fileIndex = file.charCodeAt(0) - 97; // 0–7
    const rankIndex = parseInt(rank, 10) - 1;  // 0–7
    const isDark = (fileIndex + rankIndex) % 2 === 0;

    this.correctColor = isDark ? "dark" : "light";

    this.squareEl.textContent = square;
    this.feedbackEl.textContent = "";
  }

  checkAnswer(answer) {
    if (answer === this.correctColor) {
      this.feedbackEl.textContent = "✅ Correct!";
    } else {
      this.feedbackEl.textContent = `❌ Incorrect. ${this.square} is ${this.correctColor}.`;
    }
  }
});
