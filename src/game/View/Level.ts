import { Container, Graphics, Text, Ticker } from "pixi.js";
import GameSettings from "../Shared/GameSettings";
import { ITEM_DISPLAY } from "../Shared/ItemTypes";
import Communicator from "../Network/Communicator/Communicator";
import { TileGridView } from "./TileGridView";
import { ApplianceView } from "./ApplianceView";
import { DEFAULT_BAR_LAYOUT } from "../Shared/BarLayout";
import { EApplianceType, APPLIANCE_CONFIGS, SEAT_OFFSETS, type IApplianceStateData } from "../Shared/ApplianceTypes";

export class Level extends Container {
  private _scaleContainer = new Container();
  private _entityContainer = new Container();
  private _messLayer = new Graphics();
  private _itemLayer = new Container();
  private _itemPool: { bg: Graphics; label: Text }[] = [];
  private _capacityPool: Text[] = [];
  private _tileGridView: TileGridView;
  private _lightOverlay = new Graphics();
  private _lightTarget: number = 0;
  private _flashOverlay = new Graphics();
  private _flashAlpha = 0;
  private _shakeTimer = 0;
  private _baseCenterX = 0;
  private _baseCenterY = 0;

  // ── Dynamic appliance rendering ──
  private _applianceLayer = new Container();
  private _applianceViewMap = new Map<string, ApplianceView>();
  private _chairLayer = new Graphics();
  // Ghost preview for edit mode
  private _ghostView: ApplianceView | null = null;
  private _ghostType: EApplianceType | null = null;

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

    // Appliance layer (dynamic — synced from server state)
    this._scaleContainer.addChild(this._applianceLayer);

    // Chair layer (redrawn when appliances change)
    this._scaleContainer.addChild(this._chairLayer);

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

  // ── Dynamic appliance sync ─────────────────────────────────────

  private _syncAppliances(appliances: IApplianceStateData[]) {
    const ts = GameSettings.tileSize;
    const activeIds = new Set<string>();
    let chairsDirty = false;

    for (const a of appliances) {
      activeIds.add(a.id);
      const existing = this._applianceViewMap.get(a.id);

      if (existing) {
        // Check if position changed
        const expectedX = a.gridX * ts + 2;
        const expectedY = a.gridY * ts + 2;
        if (existing.x !== expectedX || existing.y !== expectedY) {
          existing.reposition(a.gridX, a.gridY);
          chairsDirty = true;
        }
      } else {
        // Create new ApplianceView
        const config = APPLIANCE_CONFIGS[a.type];
        if (!config) continue;
        const view = new ApplianceView(config, a.gridX, a.gridY, ts);
        this._applianceLayer.addChild(view);
        this._applianceViewMap.set(a.id, view);
        chairsDirty = true;
      }
    }

    // Remove views for appliances no longer in server state
    for (const [id, view] of this._applianceViewMap) {
      if (!activeIds.has(id)) {
        this._applianceLayer.removeChild(view);
        view.destroy();
        this._applianceViewMap.delete(id);
        chairsDirty = true;
      }
    }

    // Redraw chair markers if anything moved
    if (chairsDirty) {
      this._redrawChairs(appliances);
    }
  }

  private _redrawChairs(appliances: IApplianceStateData[]) {
    this._chairLayer.clear();
    const ts = GameSettings.tileSize;
    const chairW = ts * 0.35;
    const chairH = ts * 0.3;
    const chairR = 4;

    for (const a of appliances) {
      const offsets = SEAT_OFFSETS[a.type];
      if (!offsets) continue;
      const cx = a.gridX * ts + ts / 2;
      const cy = a.gridY * ts + ts / 2;
      for (const [dx, dy] of offsets) {
        const sx = cx + dx * ts - chairW / 2;
        const sy = cy + dy * ts - chairH / 2;
        this._chairLayer.roundRect(sx, sy, chairW, chairH, chairR).fill(0x5c3a1e);
        this._chairLayer.roundRect(sx, sy, chairW, chairH, chairR).stroke({ color: 0x3a2412, width: 1 });
      }
    }
  }

  // ── Edit mode ghost preview ────────────────────────────────────

  /**
   * Show a ghost appliance preview at the given grid position.
   * Pass null type to clear.
   */
  showGhostPreview(type: EApplianceType | null, gridX: number, gridY: number, valid: boolean) {
    const ts = GameSettings.tileSize;

    if (type === null) {
      if (this._ghostView) {
        this._applianceLayer.removeChild(this._ghostView);
        this._ghostView.destroy();
        this._ghostView = null;
        this._ghostType = null;
      }
      return;
    }

    const config = APPLIANCE_CONFIGS[type];
    if (!config) return;

    // Recreate if type changed
    if (this._ghostType !== type) {
      if (this._ghostView) {
        this._applianceLayer.removeChild(this._ghostView);
        this._ghostView.destroy();
      }
      this._ghostView = new ApplianceView(config, gridX, gridY, ts);
      this._ghostView.setGhost(0.5);
      this._applianceLayer.addChild(this._ghostView);
      this._ghostType = type;
    }

    this._ghostView!.reposition(gridX, gridY);
    this._ghostView!.setHighlight(valid ? 0x44ff44 : 0xff4444);
  }

  /** Highlight an appliance by ID (for edit mode selection). Pass null to clear all. */
  highlightAppliance(id: string | null) {
    for (const [viewId, view] of this._applianceViewMap) {
      view.setHighlight(viewId === id ? 0x44aaff : null);
    }
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

    // Sync appliance views from server state
    const data = Communicator.state?.data;
    if (data) {
      this._syncAppliances(data.appliances);
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

      // Capacity labels for appliances with slots (BIN/SINK) or stock
      const capacityAppliances = data.appliances.filter(
        (a) => (a.maxSlots > 0 || a.maxStock > 0) && a.type !== EApplianceType.COUNTER,
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
          const cx = app.gridX * ts + ts / 2;
          const cy = app.gridY * ts + ts + 2; // below the appliance tile

          if (app.maxStock > 0) {
            // Stock-based (Glass, Draft, Wine, Liquor, ICE)
            capLabel.text = `${app.currentStock}/${app.maxStock}`;
            capLabel.style.fill = app.currentStock === 0 ? 0xff4444 : app.currentStock <= Math.ceil(app.maxStock * 0.25) ? 0xffaa44 : 0xaaaaaa;
          } else {
            // Slot-based (BIN, SINK)
            const filled = app.slots.filter((s) => s !== null).length;
            capLabel.text = `${filled}/${app.maxSlots}`;
            capLabel.style.fill = filled >= app.maxSlots ? 0xff4444 : 0xaaaaaa;
          }

          capLabel.x = cx;
          capLabel.y = cy;
          capLabel.visible = true;
        } else {
          capLabel.visible = false;
        }
      }
    }
  }
}
