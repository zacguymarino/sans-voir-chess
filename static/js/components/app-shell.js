import { themeSheet } from "../ui-theme.js";

// Define the canonical list of widgets available in the app.
const AVAILABLE_WIDGETS = [
  { tag: "about-widget",   title: "About" },
  { tag: "blindfold-app",  title: "Blindfold Game" },
  { tag: "square-color",   title: "Square Color" },
  { tag: "knight-path",    title: "Knight Path" },
  { tag: "bishop-path",    title: "Bishop Path" },
  { tag: "mate-trainer",   title: "Mate Trainer" },
];

const LS_KEY = "svc.widgets";

customElements.define("app-shell", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.state = {
      widgets: this.loadState()
    };
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [themeSheet];
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; min-height: 100dvh; }
        .layout {
          display: grid;
          grid-template-columns: 260px 1fr;
        }
        /* Mobile: collapsible sidebar */
        @media (max-width: 640px) {
          .layout {
            grid-template-columns: 1fr;
          }
          aside {
            display: none;
          }
          aside.open {
            display: block;
            position: sticky; top: 58px; z-index: 10;
            background: var(--secondary);
            border-bottom: 2px solid var(--off-black);
          }
        }

        header.appbar {
          display: none;
        }
        @media (max-width: 640px) {
          header.appbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-3);
            border-bottom: 1px solid var(--border);
            position: sticky; top: 0; z-index: 11;
            background: var(--card);
          }

          header.appbar span {
            display: flex;
            align-items: center;
          }
        }

        aside {
          padding: var(--space-3);
          border-right: 1px solid var(--border);
        }

        .theme-toggle { display:flex; gap:6px; flex-wrap:wrap; }
        .theme-toggle .btn-sm[aria-pressed="true"] {
          background: var(--accent); color: var(--accent-contrast); border-color: transparent;
        }

        .side-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: var(--space-3);
        }
        .side-card + .side-card { margin-top: var(--space-3); }

        .section-title {
          font-weight: 700; margin: 0 0 var(--space-2);
        }
        .list { display: grid; gap: 6px; }
        .row {
          display: flex; align-items: center; justify-content: space-between;
          gap: var(--space-2);
          padding: 6px 0;
          border-bottom: 1px dashed var(--border);
        }
        .row:last-child { border-bottom: 0; }

        .btn-sm {
          appearance: none; border: 1px solid var(--border);
          background: transparent; color: var(--fg);
          padding: 4px 8px; border-radius: 7px; cursor: pointer; font-size: 0.9rem;
        }
        .btn-sm:hover { filter: brightness(0.98); }
        .btn-sm:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .btn-add { background: var(--accent); color: var(--accent-contrast); border-color: transparent; }
        .btn-danger { color: var(--danger); border-color: var(--border); }

        main { min-width: 0; }
        .app-grid {
          column-gap: var(--space-3, 12px);
          padding: var(--space-3, 12px);
        }
        .app-grid > * {
          break-inside: avoid;
          margin-bottom: var(--space-3, 12px);
          display: block;
        }
        @media (max-width: 640px) { .app-grid { column-count: 1; } }
        @media (min-width: 641px) and (max-width: 1024px) { .app-grid { column-count: 2; } }
        @media (min-width: 1025px) { .app-grid { column-count: 3; } }
      </style>

      <header class="appbar">
        <span>
          <img src="/static/img/icon-192.png" width="32" alt="Sans Voir Chess">
          <strong>&nbsp;Sans Voir Chess</strong>
        </span>
        <button class="btn btn-primary" id="toggleSidebar" type="button">Widgets</button>
      </header>

      <div class="layout">
        <aside id="sidebar">
          <div class="side-card">
            <h3 class="section-title">Current</h3>
            <div class="list" id="currentList"></div>
          </div>
          <div class="side-card">
            <h3 class="section-title">Available</h3>
            <div class="list" id="availableList"></div>
          </div>
          <div class="side-card">
            <h3 class="section-title">Appearance</h3>
            <div class="theme-toggle">
              <button type="button" class="btn-sm" data-mode="auto"  aria-pressed="false">Auto</button>
              <button type="button" class="btn-sm" data-mode="dark"  aria-pressed="false">Dark</button>
              <button type="button" class="btn-sm" data-mode="light" aria-pressed="false">Light</button>
            </div>
            <div id="themeNote" class="muted" style="margin-top:6px; font-size:.9rem;">Follows system theme.</div>
          </div>
        </aside>

        <main>
          <div class="app-grid" id="grid"></div>
        </main>
      </div>
    `;

    // THEME: setup
    this._themeBtns = this.shadowRoot.querySelectorAll('.theme-toggle .btn-sm');
    this._themeNote = this.shadowRoot.querySelector('#themeNote');
    this._systemMql = window.matchMedia?.('(prefers-color-scheme: dark)');

    this._themeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.applyTheme(btn.dataset.mode));
    });

    // Apply saved or default (auto)
    const saved = localStorage.getItem('svc.theme');
    const initial = (saved === 'light' || saved === 'dark' || saved === 'auto') ? saved : 'auto';
    this.applyTheme(initial, {silent:true});

    // If on Auto, update note when system theme changes
    this._systemMql?.addEventListener?.('change', () => {
      if ((localStorage.getItem('svc.theme') || 'auto') === 'auto') this._updateThemeUI('auto');
    });

    // Mobile toggle
    this.shadowRoot.querySelector("#toggleSidebar")?.addEventListener("click", () => {
      const aside = this.shadowRoot.querySelector("#sidebar");
      aside.classList.toggle("open");
    });

    // Listen for remove events coming from tile-title inside any widget
    this.shadowRoot.addEventListener("svc:remove-me", (e) => {
      const path = e.composedPath?.() ?? [];
      // Find the top-level custom element inside #grid
      const grid = this.shadowRoot.querySelector("#grid");
      const hostEl = path.find(el =>
        el instanceof HTMLElement &&
        el.parentElement === grid &&
        el.tagName?.includes("-")
      );
      if (!hostEl) return;

      const tag = hostEl.tagName.toLowerCase();
      this.removeWidget(tag);
    });

    this.renderSidebar();
    this.renderGrid();
  }

  loadState() {
    try {
      const json = localStorage.getItem(LS_KEY);
      if (!json) return ["about-widget"];
      const arr = JSON.parse(json);
      if (!Array.isArray(arr) || !arr.every(x => typeof x === "string")) throw 0;
      return arr;
    } catch { return ["about-widget"]; }
  }

  saveState() {
    localStorage.setItem(LS_KEY, JSON.stringify(this.state.widgets));
  }

  renderSidebar() {
    const currentList = this.shadowRoot.querySelector("#currentList");
    const availableList = this.shadowRoot.querySelector("#availableList");
    currentList.innerHTML = "";
    availableList.innerHTML = "";

    const currentSet = new Set(this.state.widgets);

    // Current
    this.state.widgets.forEach(tag => {
      const meta = AVAILABLE_WIDGETS.find(w => w.tag === tag) || { title: tag, tag };
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <span>${meta.title}</span>
        <button type="button" class="btn-sm btn-danger" data-tag="${tag}">Remove</button>
      `;
      row.querySelector("button").addEventListener("click", () => this.removeWidget(tag));
      currentList.appendChild(row);
    });

    // Available
    AVAILABLE_WIDGETS
      .filter(w => !currentSet.has(w.tag))
      .forEach(w => {
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `
          <span>${w.title}</span>
          <button type="button" class="btn-sm btn-add" data-tag="${w.tag}">Add</button>
        `;
        row.querySelector("button").addEventListener("click", () => this.addWidget(w.tag));
        availableList.appendChild(row);
      });
  }

  renderGrid() {
    const grid = this.shadowRoot.querySelector("#grid");
    grid.innerHTML = "";
    for (const tag of this.state.widgets) {
      const el = document.createElement(tag);
      el.setAttribute("data-no-autofocus", "");
      grid.appendChild(el);
      requestAnimationFrame(() => el.removeAttribute("data-no-autofocus"));
    }
  }

  addWidget(tag) {
    if (!AVAILABLE_WIDGETS.some(w => w.tag === tag)) return;
    if (this.state.widgets.includes(tag)) return;
    this.state.widgets.push(tag);
    this.saveState();
    this.renderSidebar();
    this.renderGrid();
  }

  removeWidget(tag) {
    const i = this.state.widgets.indexOf(tag);
    if (i === -1) return;
    this.state.widgets.splice(i, 1);
    this.saveState();
    this.renderSidebar();
    this.renderGrid();
  }

  applyTheme(mode, opts = {}) {
    const root = document.documentElement;
    if (mode === 'light') {
      root.setAttribute('data-theme', 'light');      // force-light
    } else if (mode === 'dark') {
      root.setAttribute('data-theme', 'dark');       // force-dark
    } else {
      root.removeAttribute('data-theme');            // auto (honor @media)
      mode = 'auto';
    }
    try { localStorage.setItem('svc.theme', mode); } catch {}
    if (!opts.silent) this._updateThemeUI(mode);
    // Ensure :root signals proper color-scheme to UA for form controls
    // (Handled by tokens block via color-scheme property)
  }

  _updateThemeUI(mode) {
    // Update pressed state
    this._themeBtns?.forEach(b => {
      const pressed = (b.dataset.mode === mode);
      b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    });
    // Update helper note
    const sysDark = !!this._systemMql?.matches;
    if (this._themeNote) {
      if (mode === 'auto') {
        this._themeNote.textContent = `Auto (system: ${sysDark ? 'dark' : 'light'})`;
      } else {
        this._themeNote.textContent = (mode === 'dark') ? 'Dark mode' : 'Light mode';
      }
    }
  }

});
