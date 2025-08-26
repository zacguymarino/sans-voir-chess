import { themeSheet } from "../ui-theme.js";

customElements.define("move-input", class extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [themeSheet];
    this.shadowRoot.innerHTML = `
      <form id="form" class="row" novalidate>
        <input id="move" class="input mono" type="text" placeholder="e2e4" aria-label="Enter move in UCI (e.g., e2e4 or g7g8q)" />
        <button id="submit" class="btn btn-primary" type="submit">Play</button>
      </form>
      <div id="err" class="muted status" aria-live="polite"></div>
    `;

    this.form = this.shadowRoot.querySelector("#form");
    this.inputEl = this.shadowRoot.querySelector("#move");
    this.errEl = this.shadowRoot.querySelector("#err");

    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      const move = (this.inputEl.value || "").trim().toLowerCase();
      const ok = /^[a-h][1-8][a-h][1-8][qnrb]?$/i.test(move);
      if (!ok) {
        this.inputEl.setAttribute("aria-invalid", "true");
        this.errEl.textContent = "Invalid move. Use UCI like e2e4 or g7g8q.";
        this.dispatchEvent(new CustomEvent("invalid-input", { detail: move, bubbles: true }));
        return;
      }
      this.inputEl.removeAttribute("aria-invalid");
      this.errEl.textContent = "";
      this.dispatchEvent(new CustomEvent("play-move", { detail: move, bubbles: true }));
      this.inputEl.value = "";
      if (!this.hasAttribute("data-no-autofocus")) {
        try { this.inputEl.focus({ preventScroll: true }); } catch { this.inputEl.focus(); }
      }
    });
  }
});
