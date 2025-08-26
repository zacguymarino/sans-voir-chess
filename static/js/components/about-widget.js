// About / Credits / PWA install / Donate
// Usage: <about-widget></about-widget>

import { themeSheet } from "../ui-theme.js";

customElements.define("about-widget", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._deferredPrompt = null; // for beforeinstallprompt
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [themeSheet];
    this.shadowRoot.innerHTML = `
      <style>
        .scrolly {
            max-height: 72vh;
            overflow-y: auto;
            padding-top: 0;
            padding-right: 0.5rem;
            -webkit-overflow-scrolling: touch; /* smooth iOS scroll */
        }

        /* optional: nicer scrollbar */
        .scrolly::-webkit-scrollbar {
            width: 8px;
        }
        .scrolly::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 8px;
        }
      </style>
      <section class="scrolly card component-container" role="region" aria-label="About Sans Voir Chess">
        <tile-title title="About Sans Voir Chess"></tile-title>
        <div class="content-medium stack">
          <p><strong>Sans Voir Chess</strong> is a blindfold chess trainer. 
          The goal is simple: help you build a durable mental board by drilling coordinate colors, knight and bishop paths, 
          quick mates/best moves, and playing fully blindfolded vs. Stockfish.</p>

          <div class="divider"></div>

          <h3 class="title" style="font-size:1rem;">Why the name?</h3>
          <p>“Sans Voir” historically nods to blindfold chess play, and translates from French as “without seeing”.</p>

          <div class="divider"></div>

          <h3 class="title" style="font-size:1rem;">Open Source</h3>
          <p>The app is fully FOSS so you can read, tinker, and contribute. 
          Core UI and training widgets are custom. External parts used are credited below.</p>
          <a href="https://github.com/zacguymarino/sans-voir-chess" target="_blank" rel="noopener">GitHub Repository</a>

          <div class="divider"></div>

          <h3 class="title" style="font-size:1rem;">Credits & Licenses</h3>
          <ul class="stack" style="margin:0; padding-left:1rem;">
            <li>
              <strong>Stockfish</strong> — chess engine. 
              © T. Romstad, M. Costalba, J. Kiiski, G. Linscott & contributors. 
              License: <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener">GPL-3.0</a>.
            </li>
            <li>
              <strong>chess.js</strong> — move generation &amp; validation. 
              © Jeff Hlywa &amp; contributors. 
              License: <a href="https://opensource.org/licenses/BSD-2-Clause" target="_blank" rel="noopener">BSD-2-Clause</a>. 
              Source: <a href="https://github.com/jhlywa/chess.js" target="_blank" rel="noopener">GitHub</a>.
            </li>
            <li>
              <strong>Chess piece sprites</strong> — “<a href="https://commons.wikimedia.org/wiki/File:ChessPiecesArray.png" target="_blank" rel="noopener">ChessPiecesArray.png</a>” by 
              <em><a href="https://commons.wikimedia.org/wiki/User:Cburnett" target="_blank" rel="noopener">Cburnett</a></em>, 
              licensed <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a>. 
              <span class="muted">(no changes made)</span>
            </li>
          </ul>

          <div class="divider"></div>

          <h3 class="title" style="font-size:1rem;">Install the App (PWA)</h3>
          <div id="pwaBox" class="stack">
            <p id="pwaStatus" class="muted">You can install this as a lightweight app on your device for offline use.</p>
            <div class="row">
              <button id="installBtn" class="btn btn-primary" type="button" style="display:none;">Install Sans Voir</button>
              <button id="howBtn" class="btn btn-secondary" type="button">How to install</button>
            </div>
            <details id="howDetails" style="margin-top:4px;">
              <summary class="muted">Manual install steps</summary>
              <div class="stack" style="margin-top:6px;">
                <div><strong>Desktop (Chrome/Edge):</strong> Look for “Install app” in the address bar menu.</div>
                <div><strong>iOS Safari:</strong> Share → “Add to Home Screen”.</div>
                <div><strong>Android Chrome:</strong> Menu → “Install app” (or “Add to Home Screen”).</div>
              </div>
            </details>
          </div>

          <div class="divider"></div>

          <h3 class="title" style="font-size:1rem;">Support the project</h3>
          <p>Hi, I'm Zac and I built this web app by myself for fun. If this helps your training, you can support development:</p>
          <p>
            <a class="btn btn-primary" href="https://buymeacoffee.com/zacguy" target="_blank" rel="noopener">
              Buy me a coffee ☕
            </a>
          </p>
        </div>
      </section>
    `;

    // refs
    this.ui = {
      installBtn: this.shadowRoot.querySelector("#installBtn"),
      howBtn: this.shadowRoot.querySelector("#howBtn"),
      howDetails: this.shadowRoot.querySelector("#howDetails"),
      pwaStatus: this.shadowRoot.querySelector("#pwaStatus"),
    };

    // PWA install flow
    window.addEventListener("beforeinstallprompt", (e) => {
      // Chrome/Edge PWA prompt
      e.preventDefault();
      this._deferredPrompt = e;
      if (!this.isStandalone()) {
        this.ui.installBtn.style.display = "inline-block";
        this.ui.pwaStatus.textContent = "Looks installable. Click Install Sans Voir to add it to your device.";
      }
    });

    // For cases where beforeinstallprompt already fired before this component mounted,
    // we still give manual steps via the “How to install” section.
    this.ui.howBtn.addEventListener("click", () => {
      this.ui.howDetails.open = !this.ui.howDetails.open;
    });

    this.ui.installBtn.addEventListener("click", async () => {
      if (!this._deferredPrompt) return;
      this.ui.installBtn.disabled = true;
      this._deferredPrompt.prompt();
      const choice = await this._deferredPrompt.userChoice.catch(()=>null);
      this._deferredPrompt = null;
      this.ui.installBtn.disabled = false;

      if (choice && choice.outcome === "accepted") {
        this.ui.installBtn.style.display = "none";
        this.ui.pwaStatus.textContent = "Installed! You can launch Sans Voir from your home screen/app list.";
      } else {
        this.ui.pwaStatus.textContent = "Install dismissed. You can try again later from the browser menu.";
      }
    });

    // If already installed, hide the install button and update message.
    if (this.isStandalone()) {
      this.ui.pwaStatus.textContent = "You're running the installed app. 🎉";
    }
  }

  isStandalone() {
    // iOS Safari
    const iosStandalone = window.navigator.standalone === true;
    // Modern browsers
    const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
    return iosStandalone || displayModeStandalone;
  }
});
