import { Chess } from "./chess.js"; // path relative to /static/js/

export default class Game {
  constructor(engine, onUpdate) {
    this.engine = engine;
    this.onUpdate = onUpdate;
    this.chess = new Chess(); // manages the real position
  }

  playUserMove(moveStr) {
    let move;
    try {
        move = this.chess.move(moveStr);
    } catch (err) {
        this.onUpdate("⚠️ Illegal move: " + moveStr);
        return;
    }

    if (!move) {
        this.onUpdate("⚠️ Illegal move: " + moveStr);
        return;
    }

    this.onUpdate("You ▶ " + moveStr);

    const moves = this.chess.history({ verbose: true }).map(m => m.from + m.to);
    console.log("Moves played so far:", moves);
    this.engine.sendMoves(moves);
    this.engine.calculateMove();
  }

  playEngineMove(moveStr) {
    let move;
    try {
        move = this.chess.move(moveStr);
    } catch (err) {
        this.onUpdate("⚠️ Engine made an illegal move?! " + moveStr);
        return;
    }

    if (!move) {
        this.onUpdate("⚠️ Engine made an illegal move?! " + moveStr);
        return;
    }

    this.onUpdate("Engine ▶ " + move.from + move.to);
  }

  reset() {
    this.chess.reset();
  }

  getPgn() {
    return this.chess.pgn();
  }

  getLastMove() {
    const history = this.chess.history({ verbose: false });
    return history.length > 0 ? history[history.length - 1] : null;
  }

  isGameOver() {
    return this.chess.isGameOver();
  }

  getResultMessage() {
    if (this.chess.isCheckmate()) return "Checkmate!";
    if (this.chess.isStalemate()) return "Stalemate.";
    if (this.chess.isDraw()) return "Draw.";
    return "Game over.";
  }
}
