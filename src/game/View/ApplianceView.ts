import { Container, Graphics, Text } from "pixi.js";
import type { IApplianceConfig } from "../Shared/ApplianceTypes";

export class ApplianceView extends Container {
  private _body: Graphics;
  private _label: Text;

  constructor(
    config: IApplianceConfig,
    gridX: number,
    gridY: number,
    tileSize: number,
  ) {
    super();

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
}
