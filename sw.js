// sw.js
const CACHE_VERSION = "sv-v6"; // bump whenever you change APP_SHELL
const APP_SHELL = [
  "/", // index is served at '/', not '/index.html'

  // CSS
  "/static/css/tokens.css",
  "/static/css/global.css",

  // Core JS entry + libs
  "/static/js/app.js",
  "/static/js/ui-theme.js",
  "/static/js/chess.js",
  "/static/js/engine.js",
  "/static/js/game.js",

  // Workers / WASM
  "/static/js/stockfish.worker.js",
  "/static/js/stockfish.worker.wasm",

  // Components
  "/static/js/components/app-shell.js",
  "/static/js/components/tile-title.js",
  "/static/js/components/about-widget.js",
  "/static/js/components/blindfold-app.js",
  "/static/js/components/mate-trainer.js",
  "/static/js/components/move-input.js",
  "/static/js/components/move-history.js",
  "/static/js/components/square-color.js",
  "/static/js/components/knight-path.js",
  "/static/js/components/bishop-path.js",
  "/static/js/components/sv-board.js",
  "/static/js/components/sv-timer.js",
  "/static/js/peek-board.js",
  "/static/js/components/coord-trainer.js",

  // Puzzles
  "/static/js/puzzles/mate_bestmove_puzzles.js",

  // Images & manifest
  "/static/img/ChessPiecesArray.png",
  "/static/img/icon-192.png",
  "/static/img/icon-512.png",
  "/static/manifest.webmanifest",

  // Utils
  "/static/js/utils/mobile-tweaks.js",
  "/static/js/utils/move-parse.js",
];

// Helper: add each asset individually so one 404 doesn't nuke the whole install.
async function precacheAll(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        await cache.put(url, res);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[SW] Skipped caching", url, "→", String(err));
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAll(CACHE_VERSION, APP_SHELL));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_VERSION ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Navigations → serve network first with offline fallback to cached "/"
// - Same-origin static assets under /static → cache-first (offline-friendly)
// - Everything else → cache or network
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  // 1) App navigations
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/"))
    );
    return;
  }

  // 2) Static assets under /static → cache-first
  if (req.method === "GET" && url.pathname.startsWith("/static/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // 3) Default: try cache, else network
  event.respondWith(caches.match(req).then((c) => c || fetch(req)));
});
