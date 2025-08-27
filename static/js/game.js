import { Chess } from "./chess.js"; // path relative to /static/js/

// Accept either UCI (e2e4, g7g8q) or SAN (Nf3, O-O, exd5, e8=Q).
// Return { uci, san, from, to, promotion } or null if invalid.
function parseMoveToUci(chess, text) {
  if (!text) return null;
  const raw = String(text).trim();

  // Fast path: UCI (len 4 or 5)
  const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;
  if (UCI_RE.test(raw)) {
    const from = raw.slice(0, 2).toLowerCase();
    const to = raw.slice(2, 4).toLowerCase();
    const promotion = (raw[4] || "").toLowerCase() || undefined;

    const tmp = new Chess(chess.fen());
    const ok = tmp.move({ from, to, promotion });
    if (!ok) return null;

    return { uci: from + to + (promotion || ""), san: ok.san, from, to, promotion };
  }

  // SAN (also tolerates O/0 mix and sloppy long forms)
  const sanGuess = raw.replace(/0/g, "O");
  const tmp = new Chess(chess.fen());
  const m = tmp.move(sanGuess, { sloppy: true });
  if (!m) return null;

  const from = m.from, to = m.to, promotion = m.promotion || undefined;
  const uci = from + to + (promotion || "");
  return { uci, san: m.san, from, to, promotion };
}

export default class Game {
  constructor(engine, onUpdate) {
    this.engine = engine;
    this.onUpdate = onUpdate;
    this.chess = new Chess(); // manages the real position
  }

  // User typed a move (SAN or UCI)
  playUserMove(input) {
    const parsed = parseMoveToUci(this.chess, input);
    if (!parsed) {
      this.onUpdate(`⚠️ Illegal/unknown move: ${input}`);
      return;
    }

    // Apply to the real game using the parsed object
    const applied = this.chess.move({
      from: parsed.from,
      to: parsed.to,
      promotion: parsed.promotion
    });

    if (!applied) {
      this.onUpdate(`⚠️ Move didn't apply: ${input}`);
      return;
    }

    // Always log UCI for clarity
    this.onUpdate(`You ▶ ${parsed.uci}`);

    // Send full UCI history (include promotion chars) to Stockfish
    const uciHistory = this.chess.history({ verbose: true })
      .map(m => m.from + m.to + (m.promotion || ""));
    this.engine.sendMoves(uciHistory);
    this.engine.calculateMove();
  }

  // Engine sends a move (usually UCI like "e2e4" or "e7e8q")
  playEngineMove(engineMoveStr) {
    // Try UCI first, then SAN as fallback
    const parsed = parseMoveToUci(this.chess, engineMoveStr);
    if (!parsed) {
      this.onUpdate(`⚠️ Engine produced an illegal move?! ${engineMoveStr}`);
      return;
    }

    const applied = this.chess.move({
      from: parsed.from,
      to: parsed.to,
      promotion: parsed.promotion
    });

    if (!applied) {
      this.onUpdate(`⚠️ Engine move couldn't be applied: ${engineMoveStr}`);
      return;
    }

    // Always log UCI
    this.onUpdate(`Engine ▶ ${parsed.uci}`);
  }

  reset() { this.chess.reset(); }
  getPgn() { return this.chess.pgn(); }
  getLastMove() {
    const history = this.chess.history({ verbose: false });
    return history.length > 0 ? history[history.length - 1] : null;
  }
  isGameOver() { return this.chess.isGameOver(); }
  getResultMessage() {
    if (this.chess.isCheckmate()) return "Checkmate!";
    if (this.chess.isStalemate()) return "Stalemate.";
    if (this.chess.isDraw()) return "Draw.";
    return "Game over.";
  }
}
