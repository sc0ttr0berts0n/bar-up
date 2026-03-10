import { Container, Graphics, Text, type Ticker } from "pixi.js";
import type { IPlayerStateData } from "../../Shared/PlayerTypes";
import { EDirection } from "../../Shared/TileTypes";
import { ITEM_DISPLAY } from "../../Shared/ItemTypes";
import GameSettings from "../../Shared/GameSettings";
import { lerp } from "../../Utils/Lerp";

export class BartenderView extends Container {
  private _body: Graphics;
  private _facingArrow: Graphics;
  private _heldItemLabel: Text;
  private _heldItemBg: Graphics;
  private _playerLabel: Text;
  private _interactBar: Graphics;
  private _color: number;
  private _size: number;

  constructor(color: number) {
    super();
    this._color = color;
    this._size = GameSettings.tileSize - 8;
    const size = this._size;
    const r = size / 2;

    // Player body (circle)
    this._body = new Graphics().circle(0, 0, r).fill(color);
    this._body.stroke({ color: 0xffffff, width: 2 });
    this.addChild(this._body);

    // Facing direction arrow
    this._facingArrow = new Graphics();
    this.addChild(this._facingArrow);

    // Held item background pill
    this._heldItemBg = new Graphics();
    this._heldItemBg.visible = false;
    this.addChild(this._heldItemBg);

    // Held item text label
    this._heldItemLabel = new Text({
      text: "",
      style: {
        fontFamily: "monospace",
        fontSize: 11,
        fill: 0xffffff,
        fontWeight: "bold",
      },
    });
    this._heldItemLabel.anchor.set(0.5);
    this._heldItemLabel.y = -r - 12;
    this._heldItemLabel.visible = false;
    this.addChild(this._heldItemLabel);

    // Player number label
    this._playerLabel = new Text({
      text: "",
      style: {
        fontFamily: "monospace",
        fontSize: 9,
        fill: 0xaaaaaa,
      },
    });
    this._playerLabel.anchor.set(0.5);
    this._playerLabel.y = r + 8;
    this.addChild(this._playerLabel);

    // Interaction progress bar
    this._interactBar = new Graphics();
    this._interactBar.visible = false;
    this.addChild(this._interactBar);
  }

  update(_delta: Ticker, state: IPlayerStateData) {
    const tileSize = GameSettings.tileSize;
    const r = this._size / 2;

    // Interpolate position
    const pixelX = lerp(state.gridX, state.targetX, state.moveProgress) * tileSize + tileSize / 2;
    const pixelY = lerp(state.gridY, state.targetY, state.moveProgress) * tileSize + tileSize / 2;
    this.x = pixelX;
    this.y = pixelY;

    // Player number
    this._playerLabel.text = `P${state.number + 1}`;

    // Facing direction arrow
    this._facingArrow.clear();
    const arrowDist = r + 4;
    const arrowSize = 5;
    let ax = 0, ay = 0;
    switch (state.facing) {
      case EDirection.UP:
        ay = -arrowDist;
        this._facingArrow.poly([ax, ay - arrowSize, ax - arrowSize, ay + arrowSize, ax + arrowSize, ay + arrowSize]).fill(0xffffff);
        break;
      case EDirection.DOWN:
        ay = arrowDist;
        this._facingArrow.poly([ax, ay + arrowSize, ax - arrowSize, ay - arrowSize, ax + arrowSize, ay - arrowSize]).fill(0xffffff);
        break;
      case EDirection.LEFT:
        ax = -arrowDist;
        this._facingArrow.poly([ax - arrowSize, ay, ax + arrowSize, ay - arrowSize, ax + arrowSize, ay + arrowSize]).fill(0xffffff);
        break;
      case EDirection.RIGHT:
        ax = arrowDist;
        this._facingArrow.poly([ax + arrowSize, ay, ax - arrowSize, ay - arrowSize, ax - arrowSize, ay + arrowSize]).fill(0xffffff);
        break;
    }

    // Update held item display
    if (state.heldItemType) {
      const display = ITEM_DISPLAY[state.heldItemType] ?? { label: "?", color: 0x999999 };
      this._heldItemLabel.text = display.label;
      this._heldItemLabel.visible = true;

      // Background pill
      const pillW = Math.max(36, this._heldItemLabel.width + 8);
      const pillH = 16;
      const pillY = -r - 20;
      this._heldItemBg.clear();
      this._heldItemBg.roundRect(-pillW / 2, pillY, pillW, pillH, 4).fill(display.color);
      this._heldItemBg.visible = true;

      this._heldItemLabel.y = pillY + pillH / 2;
    } else {
      this._heldItemLabel.visible = false;
      this._heldItemBg.visible = false;
    }

    // Interaction progress
    if (state.isInteracting) {
      this._interactBar.visible = true;
      this._interactBar.clear();
      const barWidth = 30;
      const barHeight = 4;
      this._interactBar.rect(-barWidth / 2, -r - 26, barWidth, barHeight).fill(0x333333);
      this._interactBar
        .rect(-barWidth / 2, -r - 26, barWidth * state.interactProgress, barHeight)
        .fill(0x00ff00);
    } else {
      this._interactBar.visible = false;
    }
  }
}
