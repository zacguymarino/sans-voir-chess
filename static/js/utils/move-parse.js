// utils/move-parse.js (or inside your Game class)
import { Chess } from "../chess.js";

const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;

export function parseMoveToUci(chess, text) {
  const raw = (text || "").trim();
  if (!raw) return null;

  // 1) UCI fast-path
  if (UCI_RE.test(raw)) {
    const from = raw.slice(0,2).toLowerCase();
    const to   = raw.slice(2,4).toLowerCase();
    const promotion = (raw[4] || "").toLowerCase() || undefined;

    // validate on a temp board
    const tmp = new Chess(chess.fen());
    const ok = tmp.move({ from, to, promotion });
    if (!ok) return null;

    return { uci: from + to + (promotion || ""), san: ok.san };
  }

  // 2) SAN (and friends). Normalize "0-0" -> "O-O"
  const sanGuess = raw.replace(/0/g, "O");

  const tmp = new Chess(chess.fen());
  const m = tmp.move(sanGuess, { sloppy: true }); // sloppy handles LAN-like forms too
  if (!m) return null;

  const uci = m.from + m.to + (m.promotion || "");
  return { uci, san: m.san };
}
