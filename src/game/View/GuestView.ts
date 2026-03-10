import { Container, Graphics, Text, type Ticker } from "pixi.js";
import type { IGuestStateData } from "../Shared/GuestTypes";
import { EGuestStatus } from "../Shared/GuestTypes";
import { ITEM_DISPLAY } from "../Shared/ItemTypes";
import GameSettings from "../Shared/GameSettings";
import { lerp } from "../Utils/Lerp";

const STATUS_ICONS: Record<EGuestStatus, string> = {
  [EGuestStatus.WALKING_TO_SEAT]: "🚶",
  [EGuestStatus.DECIDING]: "🤔",
  [EGuestStatus.READY_TO_ORDER]: "❗",
  [EGuestStatus.WAITING_FOR_ORDER]: "⏳",
  [EGuestStatus.DRINKING]: "🍻",
  [EGuestStatus.LEAVING]: "👋",
};

export class GuestView extends Container {
  private _body: Graphics;
  private _statusIcon: Text;
  private _happinessBar: Graphics;
  private _drinkProgressBar: Graphics;
  private _orderBubbleBg: Graphics;
  private _orderBubbleText: Text;

  constructor() {
    super();

    const size = GameSettings.tileSize * 0.75;
    const r = size / 2;

    // Guest body (circle, 75% of tile)
    this._body = new Graphics()
      .circle(0, 0, r)
      .fill(0xd4a574);
    this._body.stroke({ color: 0x333333, width: 1 });
    this.addChild(this._body);

    // Status icon above head
    this._statusIcon = new Text({
      text: "",
      style: { fontSize: 16 },
    });
    this._statusIcon.anchor.set(0.5);
    this._statusIcon.y = -r - 14;
    this.addChild(this._statusIcon);

    // Order bubble background
    this._orderBubbleBg = new Graphics();
    this._orderBubbleBg.visible = false;
    this.addChild(this._orderBubbleBg);

    // Order bubble text
    this._orderBubbleText = new Text({
      text: "",
      style: {
        fontFamily: "monospace",
        fontSize: 12,
        fill: 0xffffff,
        fontWeight: "bold",
      },
    });
    this._orderBubbleText.anchor.set(0.5);
    this._orderBubbleText.y = -r - 30;
    this._orderBubbleText.visible = false;
    this.addChild(this._orderBubbleText);

    // Happiness bar
    this._happinessBar = new Graphics();
    this._happinessBar.y = r + 4;
    this.addChild(this._happinessBar);

    // Drink progress bar
    this._drinkProgressBar = new Graphics();
    this._drinkProgressBar.y = r + 11;
    this._drinkProgressBar.visible = false;
    this.addChild(this._drinkProgressBar);
  }

  update(_delta: Ticker, state: IGuestStateData) {
    const tileSize = GameSettings.tileSize;
    const size = tileSize * 0.75;
    const r = size / 2;

    // Interpolate position
    const pixelX = lerp(state.gridX, state.targetX, state.moveProgress) * tileSize + tileSize / 2;
    const pixelY = lerp(state.gridY, state.targetY, state.moveProgress) * tileSize + tileSize / 2;

    // Offset seated guests so they don't stack on the same tile
    let seatOffX = 0;
    let seatOffY = 0;
    const isSeated = state.status !== EGuestStatus.WALKING_TO_SEAT && state.status !== EGuestStatus.LEAVING;
    if (isSeated && state.seatIndex >= 0) {
      const off = tileSize * 0.3;
      const offsets = [[-off, -off], [off, -off], [-off, off], [off, off]];
      const [ox, oy] = offsets[state.seatIndex % offsets.length];
      seatOffX = ox;
      seatOffY = oy;
    }

    this.x = pixelX + seatOffX;
    this.y = pixelY + seatOffY;

    // Tint body based on drunkenness (sober → flushed red)
    const drunk = Math.min(1, state.drunkenness);
    const soberR = 0xd4, soberG = 0xa5, soberB = 0x74;
    const flushR = 0xd4, flushG = 0x74, flushB = 0x74;
    const tintR = Math.round(soberR + (flushR - soberR) * drunk);
    const tintG = Math.round(soberG + (flushG - soberG) * drunk);
    const tintB = Math.round(soberB + (flushB - soberB) * drunk);
    const tintColor = (tintR << 16) | (tintG << 8) | tintB;
    this._body.clear();
    this._body.circle(0, 0, r).fill(tintColor);
    this._body.stroke({ color: 0x333333, width: 1 });

    // Status icon
    this._statusIcon.text = STATUS_ICONS[state.status] ?? "";

    // Order bubble — show during READY_TO_ORDER and WAITING_FOR_ORDER
    const showOrder =
      state.status === EGuestStatus.READY_TO_ORDER ||
      state.status === EGuestStatus.WAITING_FOR_ORDER;

    if (showOrder) {
      let label: string;
      let pillColor: number;
      if (state.status === EGuestStatus.READY_TO_ORDER) {
        label = "Order?";
        pillColor = 0x888888;
      } else {
        const drinkKey = state.order?.drinkKey ?? "";
        label = drinkKey ? drinkKey.toUpperCase() : "?";
        pillColor = ITEM_DISPLAY[drinkKey]?.color ?? 0x888888;
      }

      this._orderBubbleText.text = label;
      this._orderBubbleText.visible = true;

      // Background pill (color-coded by drink)
      const pillW = Math.max(40, this._orderBubbleText.width + 10);
      const pillH = 18;
      const pillY = -r - 39;
      this._orderBubbleBg.clear();
      this._orderBubbleBg.roundRect(-pillW / 2, pillY, pillW, pillH, 4).fill(pillColor);
      this._orderBubbleBg.visible = true;

      this._orderBubbleText.y = pillY + pillH / 2;
    } else {
      this._orderBubbleText.visible = false;
      this._orderBubbleBg.visible = false;
    }

    // Happiness bar
    this._happinessBar.clear();
    const barWidth = 30;
    const barHeight = 5;
    const happinessRatio = state.happiness / GameSettings.happinessMax;
    const barColor =
      happinessRatio > 0.6 ? 0x00cc00 : happinessRatio > 0.3 ? 0xcccc00 : 0xcc0000;
    this._happinessBar
      .rect(-barWidth / 2, 0, barWidth, barHeight)
      .fill(0x333333);
    this._happinessBar
      .rect(-barWidth / 2, 0, barWidth * happinessRatio, barHeight)
      .fill(barColor);

    // Drink progress bar (while drinking, color-coded by drink)
    if (state.status === EGuestStatus.DRINKING && state.drinkProgress > 0) {
      const drinkBarColor = ITEM_DISPLAY[state.order?.drinkKey ?? ""]?.color ?? 0x4ecdc4;
      this._drinkProgressBar.visible = true;
      this._drinkProgressBar.clear();
      this._drinkProgressBar
        .rect(-barWidth / 2, 0, barWidth, 3)
        .fill(0x333333);
      this._drinkProgressBar
        .rect(-barWidth / 2, 0, barWidth * state.drinkProgress, 3)
        .fill(drinkBarColor);
    } else {
      this._drinkProgressBar.visible = false;
    }
  }
}
