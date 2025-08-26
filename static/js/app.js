
import "./components/app-shell.js";
import "./components/tile-title.js";
import "./components/blindfold-app.js";
import "./components/square-color.js";
import "./components/knight-path.js";
import "./components/bishop-path.js";
import "./components/sv-board.js";
import "./components/mate-trainer.js";
import "./components/about-widget.js";
import "./components/coord-trainer.js";

// PWA service worker registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(console.error);
  });
}