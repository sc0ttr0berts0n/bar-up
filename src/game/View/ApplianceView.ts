import { Container, Graphics, Text } from "pixi.js";
import type { IApplianceConfig } from "../Shared/ApplianceTypes";

export class ApplianceView extends Container {
  private _body: Graphics;
  private _label: Text;
  private _highlight: Graphics | null = null;
  private _baseColor: number;
  private _sizeX: number;
  private _sizeY: number;
  private _tileSize: number;

  constructor(
    config: IApplianceConfig,
    gridX: number,
    gridY: number,
    tileSize: number,
  ) {
    super();

    this._baseColor = config.color;
    this._sizeX = config.sizeX;
    this._sizeY = config.sizeY;
    this._tileSize = tileSize;

    const w = config.sizeX * tileSize - 4;
    const h = config.sizeY * tileSize - 4;

    this._body = new Graphics()
      .rect(0, 0, w, h)
      .fill(config.color)
      .stroke({ color: 0x111111, width: 2 });
    this.addChild(this._body);

    this._label = new Text({
      text: config.label,
      style: {
        fontFamily: "monospace",
        fontSize: 12,
        fill: 0xffffff,
        fontWeight: "bold",
      },
    });
    this._label.anchor.set(0.5);
    this._label.x = w / 2;
    this._label.y = h / 2;
    this.addChild(this._label);

    this.x = gridX * tileSize + 2;
    this.y = gridY * tileSize + 2;
  }

  /** Move this view to a new grid position. */
  reposition(gridX: number, gridY: number) {
    this.x = gridX * this._tileSize + 2;
    this.y = gridY * this._tileSize + 2;
  }

  /** Show a colored highlight border (or null to clear). */
  setHighlight(color: number | null) {
    if (this._highlight) {
      this.removeChild(this._highlight);
      this._highlight.destroy();
      this._highlight = null;
    }
    if (color !== null) {
      const w = this._sizeX * this._tileSize - 4;
      const h = this._sizeY * this._tileSize - 4;
      this._highlight = new Graphics()
        .rect(-2, -2, w + 4, h + 4)
        .stroke({ color, width: 3 });
      this.addChildAt(this._highlight, 0);
    }
  }

  /** Set ghost opacity for edit mode preview. */
  setGhost(opacity: number) {
    this.alpha = opacity;
  }
}
