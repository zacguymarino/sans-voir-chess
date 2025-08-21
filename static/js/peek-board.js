export function peekBoard(anchorEl, {
  fen,
  orientation = "white",
  durationMs = 5000,
  size,                // optional fixed size
  showCoords = false,
  dim = true,          // backdrop dimmer
  piecesSrc = "/static/img/ChessPiecesArray.png",
  margin               // optional; defaults to CSS var --space-2 or 8px
} = {}) {
  // Read margin from CSS tokens (fallback 8)
  let marginPx = 8;
  if (typeof margin === "number") {
    marginPx = Math.max(0, margin | 0);
  } else {
    const token = getComputedStyle(anchorEl).getPropertyValue("--space-2");
    const parsed = parseInt(token, 10);
    if (!isNaN(parsed)) marginPx = parsed;
  }

  // Build overlay container
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "10000";
  overlay.style.pointerEvents = "none";
  overlay.style.display = "block";

  if (dim) {
    const scrim = document.createElement("div");
    scrim.style.position = "absolute";
    scrim.style.inset = "0";
    scrim.style.background = "rgba(0,0,0,0.35)";
    scrim.style.backdropFilter = "blur(1px)";
    scrim.style.pointerEvents = "auto"; // block clicks while peeking
    overlay.appendChild(scrim);
  }

  // Board holder
  const holder = document.createElement("div");
  holder.style.position = "absolute";
  holder.style.pointerEvents = "auto";
  holder.style.transition = "transform 120ms ease-out, opacity 120ms ease-out";
  holder.style.opacity = "0";
  holder.style.transform = "scale(0.98)";
  overlay.appendChild(holder);

  // Compute size & position centered over anchor, with margin inside the blue border
  const rect = anchorEl.getBoundingClientRect();
  const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

  // Shrink the available area by margin on all sides
  const innerLeft   = rect.left   + marginPx;
  const innerTop    = rect.top    + marginPx;
  const innerWidth  = Math.max(0, rect.width  - marginPx * 2);
  const innerHeight = Math.max(0, rect.height - marginPx * 2);

  // Constrain by viewport too (leave 24px off the edges like before)
  const maxByViewport = Math.min(vw - 24, vh - 24);
  const maxByAnchor   = Math.min(innerWidth, innerHeight);

  const targetSize = size || Math.min(360, Math.max(220, Math.min(maxByAnchor, maxByViewport)));

  const centerX = innerLeft + innerWidth  / 2;
  const centerY = innerTop  + innerHeight / 2;

  holder.style.width = `${targetSize}px`;
  holder.style.height = `${targetSize}px`;
  holder.style.left = `${Math.round(centerX - targetSize / 2)}px`;
  holder.style.top  = `${Math.round(centerY - targetSize / 2)}px`;

  // Create the board
  const board = document.createElement("sv-board");
  board.setAttribute("size", String(targetSize));
  board.setAttribute("orientation", orientation === "black" ? "black" : "white");
  board.setAttribute("pieces-src", piecesSrc);
  board.setAttribute("peek", "true"); // show (no cover)
  if (showCoords) board.setAttribute("show-coords", "true");
  if (fen) board.setFEN(fen);

  holder.appendChild(board);
  document.body.appendChild(overlay);

  // small fade-in
  requestAnimationFrame(() => {
    holder.style.opacity = "1";
    holder.style.transform = "scale(1)";
  });

  // auto-remove
  const remove = () => {
    holder.style.opacity = "0";
    holder.style.transform = "scale(0.98)";
    setTimeout(() => overlay.remove(), 140);
  };
  const t = setTimeout(remove, Math.max(1, durationMs));

  // allow escape to cancel early
  const onKey = (e) => { if (e.key === "Escape") { clearTimeout(t); remove(); } };
  window.addEventListener("keydown", onKey, { once: true });

  return {
    close() { clearTimeout(t); remove(); },
    element: board
  };
}
