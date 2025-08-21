import { themeSheet } from "../ui-theme.js";

customElements.define("tile-title", class extends HTMLElement {
  static get observedAttributes() { return ["title"]; }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [themeSheet];
    this.render();
  }

  attributeChangedCallback() { this.render(); }

  render() {
    const title = this.getAttribute("title") ?? "";
    this.shadowRoot.innerHTML = `
      <style>
        .bar {
          display: flex; align-items: center;
          gap: var(--space-2);
          margin: 0 0 var(--space-2);
        }
        .title {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0;
          line-height: 1.2;
          flex: 1;
        }
        button.x {
          appearance: none; border: 1px solid var(--border);
          background: transparent; color: var(--fg);
          padding: 2px 8px; border-radius: 999px; cursor: pointer;
          line-height: 1; font-size: 0.9rem;
        }
        button.x:hover { filter: brightness(0.96); }
        button.x:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      </style>
      <div class="bar">
        <h2 class="title">${title}</h2>
        <button class="x" type="button" title="Remove this widget" aria-label="Remove">✕</button>
      </div>
    `;

    this.shadowRoot.querySelector("button.x").addEventListener("click", () => {
      // Ask the app shell to remove the top-level widget that contains this header
      this.dispatchEvent(new CustomEvent("svc:remove-me", {
        bubbles: true, composed: true, detail: {}
      }));
    });
  }
});
