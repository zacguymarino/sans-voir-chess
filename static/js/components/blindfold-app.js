import { themeSheet } from "../ui-theme.js";
import Engine from "../engine.js";
import Game from "../game.js";
import "./move-history.js";
import "./move-input.js";
import { peekBoard } from "../peek-board.js";
import { hardenTextInputs } from "../utils/mobile-tweaks.js";

customElements.define("blindfold-app", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.started = false;
    this.side = "white";
    this._peekHandle = null; // store overlay handle so Hide can close it
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [themeSheet];
    this.shadowRoot.innerHTML = `
      <section class="card component-container" role="region" aria-label="Blindfold game versus Stockfish">
        <tile-title title="Blindfold vs Stockfish"></tile-title>

        <div class="row">
          <label class="field" for="side">Play as
            <select id="side">
              <option value="white" selected>White</option>
              <option value="black">Black</option>
            </select>
          </label>

          <label class="field" for="difficulty">Difficulty
            <input id="difficulty" class="input" type="number" min="0" max="20" value="0" style="--input-width: 5ch;" />
          </label>

          <div class="row" style="margin-left:auto">
            <button id="startBtn" class="btn btn-primary" type="button">Start Game</button>
            <button id="downloadPGNBtn" class="btn btn-secondary" type="button" aria-disabled="true">Download PGN</button>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Peek controls (overlay-based board) -->
        <div class="row">
          <label class="field" for="peekSeconds">Peek (sec): 
          </label>
          <input id="peekSeconds" class="input" type="number" min="1" max="30" value="3" style="--input-width: 5ch;" />
          <button id="peekBtn" class="btn btn-primary" type="button" title="Reveal board temporarily">Peek</button>
        </div>

        <div class="divider"></div>

        <move-history></move-history>
        <div class="divider"></div>
        <move-input></move-input>
      </section>
    `;
    hardenTextInputs(this.shadowRoot);

    // refs
    this.historyEl = this.shadowRoot.querySelector("move-history");
    this.inputEl = this.shadowRoot.querySelector("move-input");
    this.sideSelect = this.shadowRoot.querySelector("#side");
    this.diffInput = this.shadowRoot.querySelector("#difficulty");
    this.startBtn = this.shadowRoot.querySelector("#startBtn");
    this.downloadPGNBtn = this.shadowRoot.querySelector("#downloadPGNBtn");
    this.peekInput = this.shadowRoot.querySelector("#peekSeconds");
    this.peekBtn = this.shadowRoot.querySelector("#peekBtn");

    this.inputEl.style.display = "none";
    this.downloadPGNBtn.disabled = true;

    // Engine & game
    this.engine = new Engine((engineMove) => {
      this.game.playEngineMove(engineMove);
      if (this.downloadPGNBtn.disabled) this.downloadPGNBtn.disabled = false;

      const uci = this.game.chess.history({ verbose: true }).map(m => m.from + m.to);
      this.engine.sendMoves(uci);
      // no board sync needed; peek renders from current FEN when invoked
    });

    this.game = new Game(this.engine, (line) => this.historyEl.addLine(line));

    // Move input handlers
    this.inputEl.addEventListener("play-move", (e) => {
      if (!this.started) return;
      const turn = this.game.chess.turn();
      if ((this.side === "white" && turn !== "w") || (this.side === "black" && turn !== "b")) {
        this.historyEl.addLine("Not your turn.");
        return;
      }
      this.game.playUserMove(e.detail);
      if (this.downloadPGNBtn.disabled) this.downloadPGNBtn.disabled = false;
    });

    this.inputEl.addEventListener("invalid-input", (e) => {
      this.historyEl.addLine(`⚠️ Invalid input: ${e.detail}`);
    });

    this.downloadPGNBtn.addEventListener("click", () => {
      const pgn = this.game.getPgn();
      const blob = new Blob([pgn], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "blindfold_game.pgn"; a.click();
      URL.revokeObjectURL(url);
    });

    this.startBtn.addEventListener("click", () => this.startGame());

    // Update side selection (affects peek orientation)
    this.sideSelect.addEventListener("change", () => {
      this.side = this.sideSelect.value === "black" ? "black" : "white";
    });

    // Peek buttons
    this.peekBtn.addEventListener("click", () => {
      const secs = Math.max(1, Math.min(60, parseInt(this.peekInput.value || "5", 10)));
      const fen = this.game.chess.fen();
      const anchor = this.shadowRoot.querySelector("section"); // center over the card

      // Close any previous overlay first
      if (this._peekHandle) this._peekHandle.close();

      this._peekHandle = peekBoard(anchor, {
        fen,
        orientation: this.side,     // "white" or "black"
        durationMs: secs * 1000,
        showCoords: true
      });
    });
  }

  async startGame() {
    const difficulty = parseInt(this.diffInput.value, 10);
    this.side = this.sideSelect.value;

    if (this.engine.resetForNewGame) {
      await this.engine.resetForNewGame(difficulty);
    } else {
      this.engine.setSkillLevel(difficulty);
    }

    this.inputEl.style.display = "block";
    this.downloadPGNBtn.disabled = true;
    this.historyEl.clear();
    this.game.reset();
    this.started = true;

    this.historyEl.addLine(`New game started (You are ${this.side}, Skill Level ${difficulty})`);
    this.inputEl.shadowRoot.querySelector('#move')?.focus();

    if (this.side === "black") {
      this.engine.calculateMove();
    }
  }
});
