export class World {
  static get width() {
    const Game = (globalThis as any).__PIXI_APP__;
    return Game?.renderer?.width ?? window.innerWidth;
  }
  static get height() {
    const Game = (globalThis as any).__PIXI_APP__;
    return Game?.renderer?.height ?? window.innerHeight;
  }
}
