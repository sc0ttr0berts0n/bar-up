import { Container, Graphics, Text, Ticker } from "pixi.js";
import GameSettings from "../Shared/GameSettings";
import { ITEM_DISPLAY } from "../Shared/ItemTypes";
import Communicator from "../Network/Communicator/Communicator";
import { TileGridView } from "./TileGridView";
import { ApplianceView } from "./ApplianceView";
import { DEFAULT_BAR_LAYOUT } from "../Shared/BarLayout";
import { EApplianceType, APPLIANCE_CONFIGS, SEAT_OFFSETS } from "../Shared/ApplianceTypes";

export class Level extends Container {
  private _scaleContainer = new Container();
  private _entityContainer = new Container();
  private _messLayer = new Graphics();
  private _itemLayer = new Container();
  private _itemPool: { bg: Graphics; label: Text }[] = [];
  private _capacityPool: Text[] = [];
  private _tileGridView: TileGridView;
  private _applianceViews: ApplianceView[] = [];
  private _lightOverlay = new Graphics();
  private _lightTarget: number = 0;
  private _flashOverlay = new Graphics();
  private _flashAlpha = 0;
  private _shakeTimer = 0;
  private _baseCenterX = 0;
  private _baseCenterY = 0;

  public get entityContainer() {
    return this._entityContainer;
  }

  constructor() {
    super();

    this._scaleContainer.label = "Scale Container";
    this._entityContainer.label = "Entity Container";

    this.addChild(this._scaleContainer);

    // Create tile grid
    const layout = DEFAULT_BAR_LAYOUT;
    this._tileGridView = new TileGridView(
      layout.width,
      layout.height,
      GameSettings.tileSize,
      layout.zones,
    );
    this._scaleContainer.addChild(this._tileGridView);

    // Light overlay — sits on top of tiles, brightens during last call
    const totalW = layout.width * GameSettings.tileSize;
    const totalH = layout.height * GameSettings.tileSize;
    this._lightOverlay.rect(0, 0, totalW, totalH).fill(0xffffff);
    this._lightOverlay.alpha = 0;
    this._scaleContainer.addChild(this._lightOverlay);

    // Create appliance visuals
    for (const placement of layout.appliances) {
      const config = APPLIANCE_CONFIGS[placement.type];
      const view = new ApplianceView(
        config,
        placement.gridX,
        placement.gridY,
        GameSettings.tileSize,
      );
      this._scaleContainer.addChild(view);
      this._applianceViews.push(view);
    }

    // Chair markers at seating appliances
    const chairLayer = new Graphics();
    const ts = GameSettings.tileSize;
    const chairW = ts * 0.35;
    const chairH = ts * 0.3;
    const chairR = 4;
    for (const placement of layout.appliances) {
      const offsets = SEAT_OFFSETS[placement.type];
      if (!offsets) continue;
      const cx = placement.gridX * ts + ts / 2;
      const cy = placement.gridY * ts + ts / 2;
      for (const [dx, dy] of offsets) {
        const sx = cx + dx * ts - chairW / 2;
        const sy = cy + dy * ts - chairH / 2;
        chairLayer.roundRect(sx, sy, chairW, chairH, chairR).fill(0x5c3a1e);
        chairLayer.roundRect(sx, sy, chairW, chairH, chairR).stroke({ color: 0x3a2412, width: 1 });
      }
    }
    this._scaleContainer.addChild(chairLayer);

    // Mess layer between appliances and entities
    this._scaleContainer.addChild(this._messLayer);

    // Item layer for items sitting on appliances
    this._scaleContainer.addChild(this._itemLayer);

    // Entity container goes on top
    this._scaleContainer.addChild(this._entityContainer);

    // Overserve flash overlay — full-screen red, on top of everything
    this._flashOverlay.rect(0, 0, totalW, totalH).fill(0xff0000);
    this._flashOverlay.alpha = 0;
    this._scaleContainer.addChild(this._flashOverlay);

    // Center the level in the viewport
    this._centerLevel();
  }

  private _centerLevel() {
    const totalWidth = DEFAULT_BAR_LAYOUT.width * GameSettings.tileSize;
    const totalHeight = DEFAULT_BAR_LAYOUT.height * GameSettings.tileSize;

    // Scale to fit window with some padding
    const padding = 40;
    const scaleX = (window.innerWidth - padding * 2) / totalWidth;
    const scaleY = (window.innerHeight - padding * 2) / totalHeight;
    const scale = Math.min(scaleX, scaleY, 1.5);

    this._scaleContainer.scale.set(scale);

    // Center
    const scaledWidth = totalWidth * scale;
    const scaledHeight = totalHeight * scale;
    this._baseCenterX = (window.innerWidth - scaledWidth) / 2;
    this._baseCenterY = (window.innerHeight - scaledHeight) / 2;
    this._scaleContainer.x = this._baseCenterX;
    this._scaleContainer.y = this._baseCenterY;
  }

  /** Convert world pixel coordinates to screen coordinates */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const s = this._scaleContainer.scale.x;
    return {
      x: this._scaleContainer.x + wx * s,
      y: this._scaleContainer.y + wy * s,
    };
  }

  /** Set whether lights are bright (last call / closing) */
  setLightLevel(bright: boolean) {
    this._lightTarget = bright ? 0.1 : 0;
  }

  /** Trigger red flash + screen shake for overserve */
  triggerOverserveFlash() {
    this._flashAlpha = 0.35;
    this._shakeTimer = 0.3;
  }

  update(_delta: Ticker) {
    const dt = 1 / 60; // approximate frame time

    // Lerp light overlay toward target
    const diff = this._lightTarget - this._lightOverlay.alpha;
    if (Math.abs(diff) > 0.001) {
      this._lightOverlay.alpha += diff * 0.05;
    } else {
      this._lightOverlay.alpha = this._lightTarget;
    }

    // Flash overlay decay
    if (this._flashAlpha > 0.001) {
      this._flashAlpha *= 0.92;
      this._flashOverlay.alpha = this._flashAlpha;
    } else if (this._flashOverlay.alpha > 0) {
      this._flashAlpha = 0;
      this._flashOverlay.alpha = 0;
    }

    // Screen shake
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      const intensity = 3 * (this._shakeTimer / 0.3); // decay intensity
      this._scaleContainer.x = this._baseCenterX + (Math.random() - 0.5) * 2 * intensity;
      this._scaleContainer.y = this._baseCenterY + (Math.random() - 0.5) * 2 * intensity;
    } else if (this._scaleContainer.x !== this._baseCenterX || this._scaleContainer.y !== this._baseCenterY) {
      this._scaleContainer.x = this._baseCenterX;
      this._scaleContainer.y = this._baseCenterY;
    }

    // Render messes
    this._messLayer.clear();
    const messes = Communicator.state?.data?.messes;
    if (messes) {
      const ts = GameSettings.tileSize;
      for (const mess of messes) {
        const cx = mess.x * ts + ts / 2;
        const cy = mess.y * ts + ts / 2;
        this._messLayer.circle(cx, cy, ts * 0.25).fill(0x6b4423);
        this._messLayer.circle(cx + 6, cy - 4, ts * 0.15).fill(0x7a5230);
        this._messLayer.circle(cx - 5, cy + 5, ts * 0.12).fill(0x5c3a1e);
      }
    }

    // Render items on appliances
    const data = Communicator.state?.data;
    if (data) {
      const ts = GameSettings.tileSize;
      // Build appliance lookup
      const applianceMap = new Map(data.appliances.map((a) => [a.id, a]));
      // Filter to items placed on appliances (not held by players)
      const surfaceItems = data.items.filter((i) => i.locationApplianceId && !i.heldByPlayerId);

      // Grow pool if needed
      while (this._itemPool.length < surfaceItems.length) {
        const bg = new Graphics();
        const label = new Text({
          text: "",
          style: { fontFamily: "monospace", fontSize: 9, fill: 0xffffff, fontWeight: "bold" },
        });
        label.anchor.set(0.5);
        this._itemLayer.addChild(bg);
        this._itemLayer.addChild(label);
        this._itemPool.push({ bg, label });
      }

      for (let i = 0; i < this._itemPool.length; i++) {
        const entry = this._itemPool[i];
        if (i < surfaceItems.length) {
          const item = surfaceItems[i];
          const appliance = applianceMap.get(item.locationApplianceId!);
          if (!appliance) { entry.bg.visible = false; entry.label.visible = false; continue; }

          const display = ITEM_DISPLAY[item.type] ?? { label: "?", color: 0x999999 };
          const cx = appliance.gridX * ts + ts / 2;
          const cy = appliance.gridY * ts + ts / 2;
          const pillW = 24;
          const pillH = 12;

          entry.bg.clear();
          entry.bg.roundRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, 3).fill(display.color);
          entry.bg.visible = true;

          entry.label.text = display.label;
          entry.label.x = cx;
          entry.label.y = cy;
          entry.label.visible = true;
        } else {
          entry.bg.visible = false;
          entry.label.visible = false;
        }
      }

      // Capacity labels for BIN and SINK appliances
      const capacityAppliances = data.appliances.filter(
        (a) => a.type === EApplianceType.BIN || a.type === EApplianceType.SINK,
      );

      // Grow pool if needed
      while (this._capacityPool.length < capacityAppliances.length) {
        const capLabel = new Text({
          text: "",
          style: { fontFamily: "monospace", fontSize: 10, fill: 0xaaaaaa, fontWeight: "bold" },
        });
        capLabel.anchor.set(0.5);
        this._itemLayer.addChild(capLabel);
        this._capacityPool.push(capLabel);
      }

      for (let i = 0; i < this._capacityPool.length; i++) {
        const capLabel = this._capacityPool[i];
        if (i < capacityAppliances.length) {
          const app = capacityAppliances[i];
          const filled = app.slots.filter((s) => s !== null).length;
          const cx = app.gridX * ts + ts / 2;
          const cy = app.gridY * ts + ts + 2; // below the appliance tile
          capLabel.text = `${filled}/${app.maxSlots}`;
          capLabel.x = cx;
          capLabel.y = cy;
          capLabel.style.fill = filled >= app.maxSlots ? 0xff4444 : 0xaaaaaa;
          capLabel.visible = true;
        } else {
          capLabel.visible = false;
        }
      }
    }
  }
}
