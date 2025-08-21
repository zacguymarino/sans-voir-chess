export default class Engine {
  constructor(onBestMove) {
    this.onBestMove = onBestMove;
    this.worker = new Worker("/static/js/stockfish.worker.js");

    // Queue of pending "isready" resolvers
    this._readyResolvers = [];

    this.worker.onmessage = (e) => {
      const raw = typeof e.data === "string" ? e.data : "";
      const data = raw.trim();
      if (!data) return;

      // Resolve isready
      if (data === "readyok") {
        const r = this._readyResolvers.shift();
        if (r) r();
        return;
      }

      // bestmove handler
      if (data.startsWith("bestmove")) {
        const parts = data.split(/\s+/);
        const best = parts[1];
        if (best && best !== "(none)" && typeof this.onBestMove === "function") {
          this.onBestMove(best);
        }
      }
      // You can console.log(data) here if you want all engine lines.
      // else if (data.startsWith('info')) { ... }
    };

    // Initialize UCI
    this.worker.postMessage("uci");
    this.worker.postMessage("isready");
  }

  send(cmd) {
    this.worker.postMessage(cmd);
  }

  stop() {
    this.worker.postMessage("stop");
  }

  isReady() {
    return new Promise((resolve) => {
      this._readyResolvers.push(resolve);
      this.worker.postMessage("isready");
    });
  }

  async resetForNewGame(skillLevel) {
    this.stop();
    this.send("ucinewgame");
    this.send("setoption name Clear Hash");
    if (typeof skillLevel === "number") {
      this.send(`setoption name Skill Level value ${skillLevel}`);
    }
    await this.isReady();
    // Fresh base position
    this.send("position startpos");
  }

  setSkillLevel(level) {
    this.worker.postMessage(`setoption name Skill Level value ${level}`);
  }

  sendMoves(moves) {
    let cmd = "position startpos";
    if (moves && moves.length) cmd += " moves " + moves.join(" ");
    this.worker.postMessage(cmd);
  }

  calculateMove() {
    this.worker.postMessage("go depth 15");
  }
}
