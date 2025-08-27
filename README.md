# Sans Voir Chess (Blindfold Chess Trainer)

A lightweight, offline-friendly **blindfold chess** trainer. Built as a static PWA with vanilla JS + Web Components. No backend required.

https://www.sansvoirchess.com

---

## Features

- **Modular widgets** you can add/remove via sidebar (layout saved to `localStorage`):
  - **About** (credits + PWA install help)
  - **Blindfold vs Stockfish** (WASM) — type SAN *or* UCI, logs/output in UCI
  - **Square Color** — light/dark coordinate drill
  - **Knight Path** — shortest-path visualization practice
  - **Bishop Path** — diagonal path practice (same-color squares)
  - **Coordinate Trainer** — click the called square on a reversible board with a timer
  - **Mate/Best Move Trainer** — small curated puzzles (external JSON/JS file)
- **PWA**: installable, offline cache of assets, cache-first strategy
- **Dark/Light** theme with a manual toggle + design tokens (`tokens.css`)

---

## Tech Stack

- **Frontend:** Vanilla JS, Web Components (Custom Elements)
- **Board:** `<sv-board>` canvas renderer (spritesheet)
- **Engine:** Stockfish WASM (web worker)
- **Rules/validation:** `chess.js` (SAN/“sloppy” parsing supported)
- **Styling:** CSS variables in `tokens.css` + shared `ui-theme.js`
- **Build:** None required (fully static)

---

## Quick Start (Local)

```bash
# 1) Clone
git clone https://github.com/<you>/sans-voir-chess.git
cd sans-voir-chess

# 2) (Optional) Use Wrangler for a zero-config static dev server
npm install
npm run dev
# -> serves at http://localhost:8787 with proper CORS/MIME for WASM

# Alternative: any static server that serves / as index and correct MIME for .wasm
# e.g. npx serve .   (may require headers tweaks)
