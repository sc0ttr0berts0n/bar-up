import type { Ticker } from "pixi.js";
import type { Level } from "../Level";

export class Camera {
  private _level: Level;

  constructor(level: Level) {
    this._level = level;
  }

  update(_delta: Ticker) {
    // Fixed camera for prototype — whole bar fits on screen
    // Future: track local player, smooth panning
  }
}
