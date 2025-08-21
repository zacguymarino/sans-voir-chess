import { themeSheet } from "../ui-theme.js";

customElements.define("move-history", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.collapsed = true;
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [themeSheet];
    this.shadowRoot.innerHTML = `
      <section class="card tile-medium" role="region" aria-label="Move history">
        <h2 class="title">Move History</h2>

        <div id="latest" class="status" aria-live="polite">Last move: (none)</div>

        <div class="row">
          <button class="btn btn-primary" id="toggle" type="button" aria-expanded="false" aria-controls="log">Toggle History</button>
          <button class="btn btn-secondary" id="clearBtn" type="button">Clear</button>
        </div>

        <pre id="log" class="log" role="log" aria-live="polite" style="display:none"></pre>
      </section>
    `;

    this.log = this.shadowRoot.querySelector("#log");
    this.latest = this.shadowRoot.querySelector("#latest");
    this.toggleBtn = this.shadowRoot.querySelector("#toggle");
    this.clearBtn = this.shadowRoot.querySelector("#clearBtn");

    this.toggleBtn.addEventListener("click", () => this.toggle());
    this.clearBtn.addEventListener("click", () => this.clear());
  }

  toggle() {
    this.collapsed = !this.collapsed;
    this.log.style.display = this.collapsed ? "none" : "block";
    this.toggleBtn.setAttribute("aria-expanded", String(!this.collapsed));
  }

  addLine(text) {
    if (!this.log || !this.latest) return;
    this.log.textContent += text + "\n";
    this.log.scrollTop = this.log.scrollHeight;
    this.latest.textContent = "Last move: " + text;
  }

  clear() {
    if (this.log) this.log.textContent = "";
    if (this.latest) this.latest.textContent = "Last move: (none)";
  }
});
