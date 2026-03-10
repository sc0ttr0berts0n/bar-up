import type { Game } from "./Game";
import config from "./server.settings";

export class GameLoop {
  private _game: Game;
  private _interval: number | null = null;

  constructor(game: Game) {
    this._game = game;
    this.tick = this.tick.bind(this);
  }

  public tick() {
    this._game.engine.update();
  }

  startLoop() {
    this._interval = window.setInterval(this.tick, 1000 / config.tickRate);
  }

  stopLoop() {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = null;
    }
  }
}
