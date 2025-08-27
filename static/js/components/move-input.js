import { themeSheet } from "../ui-theme.js";

customElements.define("move-input", class extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [themeSheet];
    this.shadowRoot.innerHTML = `
      <form id="form" class="row" novalidate>
        <input
          id="move"
          class="input mono"
          type="text"
          placeholder="e.g. g1f3 or Nf3"
          aria-label="Enter move (UCI like e2e4 or SAN like Nf3)"
          autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"
          inputmode="text"
        />
        <button id="submit" class="btn btn-primary" type="submit">Play</button>
      </form>
      <div id="err" class="muted status" aria-live="polite"></div>
    `;

    this.form = this.shadowRoot.querySelector("#form");
    this.inputEl = this.shadowRoot.querySelector("#move");
    this.errEl = this.shadowRoot.querySelector("#err");

    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      const move = (this.inputEl.value || "").trim();

      if (!move) {
        // only validation left: non-empty
        this.inputEl.setAttribute("aria-invalid", "true");
        this.errEl.textContent = "Please enter a move (UCI like e2e4 or SAN like Nf3).";
        this.dispatchEvent(new CustomEvent("invalid-input", { detail: move, bubbles: true }));
        return;
      }

      // clear any previous error and emit
      this.inputEl.removeAttribute("aria-invalid");
      this.errEl.textContent = "";

      // Do NOT lowercase; SAN is case-sensitive for piece letters and O-O
      this.dispatchEvent(new CustomEvent("play-move", { detail: move, bubbles: true }));

      this.inputEl.value = "";
      if (!this.hasAttribute("data-no-autofocus")) {
        try { this.inputEl.focus({ preventScroll: true }); } catch { this.inputEl.focus(); }
      }
    });
  }
});
