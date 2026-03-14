import { DEFAULT_BAR_LAYOUT, UPGRADE_APPLIANCE_POSITIONS, type IBarLayout } from "../../Shared/BarLayout";
import { getActiveLayout } from "../../Shared/LayoutPersistence";
import { EApplianceType, SEAT_OFFSETS } from "../../Shared/ApplianceTypes";
import { EItemType } from "../../Shared/ItemTypes";
import { EDirection, ETileZone } from "../../Shared/TileTypes";
import { RECIPES, getMenuDrinkKeys, APPLIANCE_VARIANTS, GRAB_VARIANTS } from "../../Shared/DrinkRecipes";
import { EGuestStatus, EGuestTrait } from "../../Shared/GuestTypes";
import { EUpgradeId, UPGRADE_CONFIGS, type IUpgradeStateData } from "../../Shared/UpgradeTypes";
import GameSettings from "../../Shared/GameSettings";
import { Random } from "../../Utils/Random";
import type { Vec2 } from "../../../types/Vec2";
import { type IEngineEvent, EEngineEventType } from "../Communicator/PacketTypes";
import { TileGrid } from "./TileGrid";
import { Pathfinding } from "./Pathfinding";
import { Bartender } from "./GameObjects/Bartender";
import { Guest } from "./GameObjects/Guest";
import { Appliance } from "./GameObjects/Appliance";
import { Widget, type IWidgetContext } from "./GameObjects/Widget";
import { Item } from "./GameObjects/Item";

import { GuestSpawner } from "./GameObjects/GuestSpawner";
import { ShiftManager } from "./GameObjects/ShiftManager";
import { EditModeManager } from "./GameObjects/EditModeManager";
import {
  WIDGET_BIN, WIDGET_CARD_HOLDER, WIDGET_GLASS_SHELF, WIDGET_SERVICE_BAR,
  WIDGET_COUNTER, WIDGET_HIGHTOP, WIDGET_TABLE, WIDGET_BAR_QUEUE,
  WIDGET_DRAFT_SYSTEM, WIDGET_WINE_RACK, WIDGET_LIQUOR_RAIL,
  WIDGET_ICE_WELL, WIDGET_SINK,
  WIDGET_KITCHEN, WIDGET_GARNISH_STATION, WIDGET_SHAKER, WIDGET_JUKEBOX,
  type IWidgetConfig,
} from "../../Shared/WidgetTypes";
import type { Game } from "./Game";

/** Widget configs keyed by appliance type — all 13 types are now Widgets */
const WIDGET_CONFIGS: Partial<Record<EApplianceType, IWidgetConfig>> = {
  [EApplianceType.BIN]: WIDGET_BIN,
  [EApplianceType.CARD_HOLDER]: WIDGET_CARD_HOLDER,
  [EApplianceType.GLASS_SHELF]: WIDGET_GLASS_SHELF,
  [EApplianceType.SERVICE_BAR]: WIDGET_SERVICE_BAR,
  [EApplianceType.COUNTER]: WIDGET_COUNTER,
  [EApplianceType.HIGHTOP]: WIDGET_HIGHTOP,
  [EApplianceType.TABLE]: WIDGET_TABLE,
  [EApplianceType.BAR_QUEUE]: WIDGET_BAR_QUEUE,
  [EApplianceType.DRAFT_SYSTEM]: WIDGET_DRAFT_SYSTEM,
  [EApplianceType.WINE_RACK]: WIDGET_WINE_RACK,
  [EApplianceType.LIQUOR_RAIL]: WIDGET_LIQUOR_RAIL,
  [EApplianceType.ICE_WELL]: WIDGET_ICE_WELL,
  [EApplianceType.SINK]: WIDGET_SINK,
  [EApplianceType.KITCHEN]: WIDGET_KITCHEN,
  [EApplianceType.GARNISH_STATION]: WIDGET_GARNISH_STATION,
  [EApplianceType.SHAKER]: WIDGET_SHAKER,
  [EApplianceType.JUKEBOX]: WIDGET_JUKEBOX,
};

export class Engine {
  private _game: Game;
  private _tileGrid: TileGrid;
  private _layout: IBarLayout;
  private _bartenders: Bartender[] = [];
  private _guests: Map<string, Guest> = new Map();
  private _appliances: Map<string, Appliance> = new Map();
  private _items: Map<string, Item> = new Map();
  private _guestSpawner: GuestSpawner;
  private _shiftManager: ShiftManager;
  private _money: number;
  private _messes: Set<string> = new Set();
  private _events: IEngineEvent[] = [];
  private _eventCounter: number = 0;
  private _policeAttention: number = 0;
  private _policeWarningTriggered: boolean = false;
  private _policeRaidTimer: number = 0;
  private _reputation: number = 0;
  private _atmosphere: number = 50;
  private _shiftStats = { guestsServed: 0, guestsTotal: 0, moneyEarned: 0, tipsEarned: 0, reputationChange: 0, fights: 0, slips: 0, overserves: 0, policeRaids: 0, restockCost: 0, breakageCost: 0, wasteCost: 0, totalExpenses: 0 };
  private _menuConfig: Map<string, { enabled: boolean; price: number }> = new Map();
  private _barQueue: Appliance | null = null;
  private _queueSlots: { position: Vec2; guestId: string | null }[] = [];
  private _occupiedTiles: Set<string> = new Set();
  private _pendingWash: Map<number, { itemId: string; callback?: () => void }> = new Map();
  private _editModeManager!: EditModeManager;
  private _upgradeLevels: Map<EUpgradeId, number> = new Map();
  private _widgetContext: IWidgetContext = {
    createItem: (type: EItemType) => {
      const item = new Item(type);
      this._items.set(item.id, item);
      return item;
    },
    deleteItem: (id: string) => {
      this._items.delete(id);
    },
    getItem: (id: string) => {
      return this._items.get(id) ?? null;
    },
    startTimedInteract: (bartender, duration, onComplete) => {
      bartender.startInteract(duration);
      this._pendingWash.set(bartender.number, { itemId: "widget", callback: onComplete });
    },
    pushEvent: (type, data) => {
      this._pushEvent(type as unknown as EEngineEventType, data);
    },
  };

  constructor(game: Game) {
    this._game = game;
    // Load layout: use saved placements if available, otherwise default
    this._layout = { ...DEFAULT_BAR_LAYOUT, appliances: getActiveLayout() };
    this._tileGrid = new TileGrid(this._layout);
    this._money = GameSettings.startingMoney;

    // Create appliances from layout (Widget-backed types use Widget, others use Appliance)
    for (const placement of this._layout.appliances) {
      const widgetConfig = WIDGET_CONFIGS[placement.type];
      const appliance = widgetConfig
        ? new Widget(widgetConfig, placement.gridX, placement.gridY)
        : new Appliance(placement.type, placement.gridX, placement.gridY);
      this._appliances.set(appliance.id, appliance);
      // Mark tiles as occupied by this appliance
      for (let dy = 0; dy < appliance.sizeY; dy++) {
        for (let dx = 0; dx < appliance.sizeX; dx++) {
          this._tileGrid.setApplianceId(
            placement.gridX + dx,
            placement.gridY + dy,
            appliance.id,
          );
        }
      }
    }

    // Find bar queue appliance and initialize queue slots
    for (const a of this._appliances.values()) {
      if (a.type === EApplianceType.BAR_QUEUE) {
        this._barQueue = a;
        break;
      }
    }
    this._queueSlots = this._layout.queueSlots.map((pos) => ({
      position: { ...pos },
      guestId: null,
    }));

    // Create edit mode manager
    this._editModeManager = new EditModeManager(this._tileGrid, this._appliances, this._layout);

    // Create bartender slots
    for (let i = 0; i < GameSettings.maxPlayers; i++) {
      const spawn = this._layout.playerSpawns[i];
      this._bartenders.push(new Bartender(i, spawn.x, spawn.y));
    }

    // Initialize menu config from recipes (all enabled at default price)
    for (const [key, recipe] of Object.entries(RECIPES)) {
      this._menuConfig.set(key, { enabled: true, price: recipe.menuPrice });
    }

    // Set up spawner and shift manager
    this._guestSpawner = new GuestSpawner(this);
    this._shiftManager = new ShiftManager();
    this._shiftManager.onPhaseChange = (phase) => {
      // Reset all bartender interact states and pending washes on phase change
      for (const b of this._bartenders) {
        b.cancelInteract();
      }
      this._pendingWash.clear();

      // Auto-commit edit mode on any phase change away from prep
      if (this._editModeManager.active) {
        this._editModeManager.commit();
        this._rebuildQueueSlots();
      }

      this._guestSpawner.enabled = phase === "service";
      if (phase === "service") {
        this._shiftStats = { guestsServed: 0, guestsTotal: 0, moneyEarned: 0, tipsEarned: 0, reputationChange: 0, fights: 0, slips: 0, overserves: 0, policeRaids: 0, restockCost: 0, breakageCost: 0, wasteCost: 0, totalExpenses: 0 };
      }
      if (phase === "closing") {
        // Closing transition — force guest state changes
        this._handleClosingTransition();
      }
      if (phase === "prep") {
        // Check if guests remain — if so, start overtime instead
        if (this._guests.size > 0) {
          this._shiftManager.startOvertime();
          return; // don't fire shift summary yet
        }
        this._calculateShiftExpenses();
        this._pushEvent(EEngineEventType.SHIFT_SUMMARY, { ...this._shiftStats });
      }
      this._pushEvent(EEngineEventType.SHIFT_CHANGE, { phase });
    };
    this._shiftManager.onLastCall = () => {
      this._pushEvent(EEngineEventType.LAST_CALL, {});
      for (const guest of this._guests.values()) {
        this._guestLastCallDecision(guest);
      }
    };
    // Start with service phase active
    this._guestSpawner.enabled = true;
  }

  get layout() {
    return this._layout;
  }
  get tileGrid() {
    return this._tileGrid;
  }
  get appliances() {
    return this._appliances;
  }
  get guests() {
    return this._guests;
  }
  get items() {
    return this._items;
  }
  get bartenders() {
    return this._bartenders;
  }
  get activePlayerCount(): number {
    return this._bartenders.filter((b) => b.id !== null).length || 1; // minimum 1
  }
  get money() {
    return this._money;
  }
  get messes(): { x: number; y: number }[] {
    return [...this._messes].map((key) => {
      const [x, y] = key.split(",").map(Number);
      return { x, y };
    });
  }
  get shiftManager() {
    return this._shiftManager;
  }
  get reputation() {
    return this._reputation;
  }
  get policeAttention() {
    return this._policeAttention;
  }
  get atmosphere() {
    return this._atmosphere;
  }
  get isRaided() {
    return this._policeRaidTimer > 0;
  }
  get shiftStats() {
    return this._shiftStats;
  }
  get menuConfig(): { drinkKey: string; enabled: boolean; price: number }[] {
    return [...this._menuConfig.entries()].map(([drinkKey, cfg]) => ({
      drinkKey,
      enabled: cfg.enabled,
      price: cfg.price,
    }));
  }
  get events() {
    return this._events;
  }
  set events(val: IEngineEvent[]) {
    this._events = val;
  }

  // ── Edit Mode API ────────────────────────────────────────────

  get editModeState() {
    return this._editModeManager.stateData;
  }

  editModeEnter(): void {
    if (this._shiftManager.phase !== "prep") return;
    if (this._guests.size > 0) return;
    this._editModeManager.enter();
  }

  editModeExit(commit: boolean): void {
    if (!this._editModeManager.active) return;
    if (commit) {
      this._editModeManager.commit();
      this._rebuildQueueSlots();
    } else {
      this._editModeManager.rollback();
    }
  }

  editModePickUp(applianceId: string, byUuid?: string): void {
    if (!this._editModeManager.active) return;
    this._editModeManager.pickUp(applianceId, byUuid);
  }

  editModePlace(gridX: number, gridY: number): void {
    if (!this._editModeManager.active) return;
    if (this._editModeManager.place(gridX, gridY)) {
      // Update queue slots if we moved the BAR_QUEUE
      // (deferred to commit, not per-place)
    }
  }

  editModeCancel(): void {
    if (!this._editModeManager.active) return;
    this._editModeManager.cancelHold();
  }

  /** Update the ghost preview position based on a bartender's facing tile. */
  editModeUpdatePreview(bartenderUuid: string): void {
    if (!this._editModeManager.active || !this._editModeManager.heldApplianceId) return;
    const bartender = this.getBartenderById(bartenderUuid);
    if (!bartender) return;
    let fx = bartender.gridX;
    let fy = bartender.gridY;
    switch (bartender.facing) {
      case EDirection.UP: fy--; break;
      case EDirection.DOWN: fy++; break;
      case EDirection.LEFT: fx--; break;
      case EDirection.RIGHT: fx++; break;
    }
    this._editModeManager.updatePreview(fx, fy);
  }

  // ── Upgrade API ─────────────────────────────────────────────

  getUpgradeLevel(id: EUpgradeId): number {
    return this._upgradeLevels.get(id) ?? 0;
  }

  get upgradeState(): IUpgradeStateData {
    const levels: Record<string, number> = {};
    for (const [id, level] of this._upgradeLevels) {
      levels[id] = level;
    }
    return { levels };
  }

  purchaseUpgrade(upgradeId: string): boolean {
    if (this._shiftManager.phase !== "prep") return false;

    const config = UPGRADE_CONFIGS.find(c => c.id === upgradeId);
    if (!config) return false;

    const currentLevel = this.getUpgradeLevel(config.id);
    if (currentLevel >= config.maxLevel) return false;

    const cost = config.levels[currentLevel].cost;
    if (this._money < cost) return false;

    this._money -= cost;
    this._upgradeLevels.set(config.id, currentLevel + 1);
    this._applyUpgrade(config.id);
    return true;
  }

  /** Get the carry capacity for bartenders based on Tray Stand upgrade level. */
  get carryCapacity(): number {
    const level = this.getUpgradeLevel(EUpgradeId.TRAY_STAND);
    return 1 + level; // base 1, +1 per level (2 at lv1, 3 at lv2)
  }

  /** Get the atmosphere bonus from the Jukebox upgrade. */
  get atmosphereBonus(): number {
    const level = this.getUpgradeLevel(EUpgradeId.JUKEBOX);
    return level * 5; // +5 per level
  }

  private _applyUpgrade(id: EUpgradeId): void {
    const level = this.getUpgradeLevel(id);
    switch (id) {
      case EUpgradeId.FAST_SINK: {
        // Mutate shared WIDGET_SINK config — all sinks share this reference
        const sinkConfig = WIDGET_CONFIGS[EApplianceType.SINK];
        if (sinkConfig && sinkConfig.transforms && sinkConfig.transforms.length > 0) {
          sinkConfig.transforms[0].duration = GameSettings.washDuration - level * 0.2;
        }
        break;
      }
      case EUpgradeId.STOCK_CAPACITY: {
        // Apply new bonus to all stocked appliances (absolute, not incremental)
        for (const app of this._appliances.values()) {
          const widgetConfig = WIDGET_CONFIGS[app.type];
          if (widgetConfig && widgetConfig.stockCapacity > 0) {
            app.setMaxStock(widgetConfig.stockCapacity + level * 5);
          }
        }
        break;
      }
      case EUpgradeId.EXTRA_QUEUE: {
        this._rebuildQueueSlots();
        break;
      }
      case EUpgradeId.TRAY_STAND: {
        // Passive effect — carryCapacity getter reads upgrade level directly
        break;
      }
      case EUpgradeId.KITCHEN: {
        this._placeUpgradeAppliance("kitchen");
        if (level === 2) {
          // +50% food stock for kitchen appliances
          for (const app of this._appliances.values()) {
            if (app.type === EApplianceType.KITCHEN) {
              const baseStock = WIDGET_KITCHEN.stockCapacity;
              const stockBonus = this.getUpgradeLevel(EUpgradeId.STOCK_CAPACITY) * 5;
              app.setMaxStock(Math.round(baseStock * 1.5) + stockBonus);
            }
          }
        }
        break;
      }
      case EUpgradeId.GARNISH_STATION: {
        this._placeUpgradeAppliance("garnish_station");
        break;
      }
      case EUpgradeId.SHAKER: {
        this._placeUpgradeAppliance("shaker");
        break;
      }
      case EUpgradeId.JUKEBOX: {
        this._placeUpgradeAppliance("jukebox");
        // Passive effect — atmosphereBonus getter reads upgrade level directly
        break;
      }
    }
  }

  /** Place an upgrade-unlocked appliance at its predetermined position (only on first purchase). */
  private _placeUpgradeAppliance(key: string): void {
    const placement = UPGRADE_APPLIANCE_POSITIONS[key];
    if (!placement) return;

    // Check if already placed (don't duplicate on level 2 purchase)
    for (const app of this._appliances.values()) {
      if (app.type === placement.type) return;
    }

    const widgetConfig = WIDGET_CONFIGS[placement.type];
    const appliance = widgetConfig
      ? new Widget(widgetConfig, placement.gridX, placement.gridY)
      : new Appliance(placement.type, placement.gridX, placement.gridY);
    this._appliances.set(appliance.id, appliance);

    // Mark tiles as occupied
    for (let dy = 0; dy < appliance.sizeY; dy++) {
      for (let dx = 0; dx < appliance.sizeX; dx++) {
        this._tileGrid.setApplianceId(
          placement.gridX + dx,
          placement.gridY + dy,
          appliance.id,
        );
      }
    }

    // Apply stock capacity upgrade to newly placed appliance if applicable
    const stockLevel = this.getUpgradeLevel(EUpgradeId.STOCK_CAPACITY);
    if (stockLevel > 0 && widgetConfig && widgetConfig.stockCapacity > 0) {
      appliance.setMaxStock(widgetConfig.stockCapacity + stockLevel * 5);
    }
  }

  /** Re-apply all upgrades (e.g., after layout rebuild). */
  private _applyAllUpgrades(): void {
    const stockLevel = this.getUpgradeLevel(EUpgradeId.STOCK_CAPACITY);
    if (stockLevel > 0) {
      this._applyUpgrade(EUpgradeId.STOCK_CAPACITY);
    }
    // Queue slots are rebuilt via _rebuildQueueSlots which already accounts for upgrade

    // Re-place upgrade appliances if they were purchased
    const applianceUpgrades: { key: string; id: EUpgradeId }[] = [
      { key: "kitchen", id: EUpgradeId.KITCHEN },
      { key: "garnish_station", id: EUpgradeId.GARNISH_STATION },
      { key: "shaker", id: EUpgradeId.SHAKER },
      { key: "jukebox", id: EUpgradeId.JUKEBOX },
    ];
    for (const { key, id } of applianceUpgrades) {
      if (this.getUpgradeLevel(id) > 0) {
        this._placeUpgradeAppliance(key);
      }
    }

    // Re-apply kitchen level 2 bonus
    if (this.getUpgradeLevel(EUpgradeId.KITCHEN) >= 2) {
      this._applyUpgrade(EUpgradeId.KITCHEN);
    }
  }

  /** Rebuild queue slots from current BAR_QUEUE position. */
  private _rebuildQueueSlots(): void {
    // Find bar queue appliance
    this._barQueue = null;
    for (const a of this._appliances.values()) {
      if (a.type === EApplianceType.BAR_QUEUE) {
        this._barQueue = a;
        break;
      }
    }
    if (this._barQueue) {
      const bx = this._barQueue.gridX;
      const by = this._barQueue.gridY;
      // Base 7 queue slots
      this._queueSlots = [
        { position: { x: bx, y: by + 1 }, guestId: null },
        { position: { x: bx + 1, y: by + 1 }, guestId: null },
        { position: { x: bx + 2, y: by + 1 }, guestId: null },
        { position: { x: bx, y: by + 2 }, guestId: null },
        { position: { x: bx + 1, y: by + 2 }, guestId: null },
        { position: { x: bx + 2, y: by + 2 }, guestId: null },
        { position: { x: bx + 1, y: by + 3 }, guestId: null },
      ];
      // Extra queue upgrade: +3 slots per level
      const queueLevel = this.getUpgradeLevel(EUpgradeId.EXTRA_QUEUE);
      for (let lvl = 1; lvl <= queueLevel; lvl++) {
        const rowY = by + 3 + lvl;
        this._queueSlots.push(
          { position: { x: bx, y: rowY }, guestId: null },
          { position: { x: bx + 1, y: rowY }, guestId: null },
          { position: { x: bx + 2, y: rowY }, guestId: null },
        );
      }
    }
  }

  /** Called from ClientPacketHandler when a player updates menu settings */
  setMenuDrink(drinkKey: string, enabled: boolean, price: number) {
    if (!RECIPES[drinkKey]) return;
    this._menuConfig.set(drinkKey, { enabled, price: Math.max(1, Math.round(price)) });
  }

  /** Called from ClientPacketHandler when a player restocks an appliance */
  restockAppliance(applianceId: string) {
    const appliance = this._appliances.get(applianceId);
    if (!appliance) return;
    if (appliance.maxStock === 0) return;
    if (appliance.currentStock >= appliance.maxStock) return;
    if (this._money < appliance.restockCost) return;
    this._money -= appliance.restockCost;
    appliance.restock();
  }

  /** Get enabled drink keys for ordering */
  getEnabledDrinkKeys(): string[] {
    return [...this._menuConfig.entries()]
      .filter(([, cfg]) => cfg.enabled)
      .map(([key]) => key);
  }

  getBartenderByNumber(num: number): Bartender | undefined {
    return this._bartenders[num];
  }

  getBartenderById(uuid: string): Bartender | undefined {
    return this._bartenders.find((b) => b.id === uuid);
  }

  assignPlayerBartender(uuid: string, number: number) {
    const bartender = this._bartenders[number];
    if (bartender) {
      bartender.assign(uuid);
    }
  }

  /** Add money (used for extra player starting bonus) */
  addMoney(amount: number) {
    this._money += amount;
  }

  unassignPlayerBartender(number: number) {
    const bartender = this._bartenders[number];
    if (bartender) {
      bartender.unassign();
    }
  }

  /** Called from ClientPacketHandler when a player presses a direction key */
  moveBartender(uuid: string, direction: EDirection) {
    const bartender = this.getBartenderById(uuid);
    if (!bartender) return;
    bartender.setMoveDirection(direction);
  }

  /** Called from ClientPacketHandler when a player releases movement */
  stopBartender(uuid: string) {
    const bartender = this.getBartenderById(uuid);
    if (!bartender) return;
    bartender.setMoveDirection(null);
  }

  /** Called from ClientPacketHandler when a player presses Space (action) */
  bartenderInteract(uuid: string) {
    const bartender = this.getBartenderById(uuid);
    if (!bartender || bartender.isMoving || bartender.isInteracting) return;

    const facingTile = this._getFacingTile(bartender);
    if (!facingTile) return;

    // Guest interactions (order, serve, chat, cut-off)
    const guest = this._getGuestAtOrNear(facingTile.x, facingTile.y);
    if (guest) {
      this._handleGuestInteraction(bartender, guest);
      return;
    }

    // Appliance crafting (transform held item, NOT pickup)
    const applianceId = facingTile.applianceId;
    if (applianceId) {
      const appliance = this._appliances.get(applianceId);
      if (appliance) {
        this._handleCraftInteraction(bartender, appliance);
        return;
      }
    }

    // Mess cleanup
    const messKey = `${facingTile.x},${facingTile.y}`;
    if (this._messes.has(messKey)) {
      this._messes.delete(messKey);
      return;
    }

    // Also check standing tile for appliance crafting
    const standingTile = this._tileGrid.getTile(bartender.gridX, bartender.gridY);
    if (standingTile?.applianceId) {
      const appliance = this._appliances.get(standingTile.applianceId);
      if (appliance) {
        this._handleCraftInteraction(bartender, appliance);
      }
    }
  }

  /** Called from ClientPacketHandler when a player presses E (grab/drop) */
  bartenderGrab(uuid: string) {
    const bartender = this.getBartenderById(uuid);
    if (!bartender || bartender.isMoving || bartender.isInteracting) return;

    const facingTile = this._getFacingTile(bartender);
    if (!facingTile) return;

    const heldItem = bartender.heldItemId
      ? this._items.get(bartender.heldItemId) ?? null
      : null;

    // Trash bag dump at entrance
    if (facingTile.zone === ETileZone.ENTRANCE) {
      if (heldItem?.type === EItemType.TRASH_BAG) {
        this._items.delete(heldItem.id);
        bartender.setHeldItem(null, null);
        return;
      }
    }

    // Appliance grab/drop
    const applianceId = facingTile.applianceId;
    if (applianceId) {
      const appliance = this._appliances.get(applianceId);
      if (appliance) {
        this._handleGrabInteraction(bartender, appliance, heldItem);
        return;
      }
    }

    // Also check standing tile
    const standingTile = this._tileGrid.getTile(bartender.gridX, bartender.gridY);
    if (standingTile?.applianceId) {
      const appliance = this._appliances.get(standingTile.applianceId);
      if (appliance) {
        this._handleGrabInteraction(bartender, appliance, heldItem);
      }
    }
  }

  /** Called from ClientPacketHandler when a player selects a variant from the sub-menu */
  bartenderSelect(uuid: string, variantIndex: number) {
    const bartender = this.getBartenderById(uuid);
    if (!bartender || bartender.isMoving || bartender.isInteracting) return;

    const heldItem = bartender.heldItemId
      ? this._items.get(bartender.heldItemId) ?? null
      : null;
    const facingTile = this._getFacingTile(bartender);

    if (heldItem) {
      // Craft mode: transform held glass into a drink at a variant appliance
      const appliance = this._findApplianceWith(facingTile, bartender, APPLIANCE_VARIANTS);
      if (!appliance) return;
      if (!appliance.hasStock()) return; // out of stock
      const variantConfig = APPLIANCE_VARIANTS[appliance.type];
      if (!variantConfig) return;
      if (!variantConfig.requiredItems.includes(heldItem.type)) return;
      if (variantIndex < 0 || variantIndex >= variantConfig.variants.length) return;

      const variant = variantConfig.variants[variantIndex];
      heldItem.setType(variant.type);
      bartender.setHeldItem(heldItem.id, heldItem.type);
      appliance.depleteStock();
      this._pushEvent(EEngineEventType.ITEM_CRAFTED, {
        itemType: variant.type,
        playerId: bartender.id,
      });
    } else {
      // Grab mode: pick up a new item from a grab appliance (e.g. glass shelf)
      const appliance = this._findApplianceWith(facingTile, bartender, GRAB_VARIANTS);
      if (!appliance) return;
      if (!appliance.hasStock()) return; // out of stock
      const grabConfig = GRAB_VARIANTS[appliance.type];
      if (!grabConfig) return;
      if (variantIndex < 0 || variantIndex >= grabConfig.variants.length) return;

      const variant = grabConfig.variants[variantIndex];
      const item = new Item(variant.type);
      item.pickUp(bartender.id!);
      this._items.set(item.id, item);
      bartender.setHeldItem(item.id, item.type);
      appliance.depleteStock();
    }
  }

  private _findApplianceWith(
    facingTile: ReturnType<typeof this._getFacingTile>,
    bartender: Bartender,
    configMap: Partial<Record<EApplianceType, unknown>>,
  ): Appliance | null {
    if (facingTile?.applianceId) {
      const app = this._appliances.get(facingTile.applianceId);
      if (app && configMap[app.type]) return app;
    }
    const standingTile = this._tileGrid.getTile(bartender.gridX, bartender.gridY);
    if (standingTile?.applianceId) {
      const app = this._appliances.get(standingTile.applianceId);
      if (app && configMap[app.type]) return app;
    }
    return null;
  }

  private _getFacingTile(bartender: Bartender) {
    let dx = 0;
    let dy = 0;
    switch (bartender.facing) {
      case EDirection.UP:
        dy = -1;
        break;
      case EDirection.DOWN:
        dy = 1;
        break;
      case EDirection.LEFT:
        dx = -1;
        break;
      case EDirection.RIGHT:
        dx = 1;
        break;
    }
    return this._tileGrid.getTile(bartender.gridX + dx, bartender.gridY + dy);
  }

  private _getGuestAtOrNear(x: number, y: number): Guest | null {
    // Check all guests — are any seated at an appliance on this tile?
    for (const guest of this._guests.values()) {
      if (guest.gridX === x && guest.gridY === y) return guest;
      // Also check if guest is seated at an appliance that occupies this tile
      if (guest.seatApplianceId) {
        const appliance = this._appliances.get(guest.seatApplianceId);
        if (appliance && appliance.gridX === x && appliance.gridY === y) {
          // Return the first guest at this appliance that needs interaction
          if (
            guest.status === EGuestStatus.READY_TO_ORDER ||
            guest.status === EGuestStatus.WAITING_FOR_ORDER ||
            guest.status === EGuestStatus.DRINKING ||
            guest.status === EGuestStatus.FIGHTING ||
            guest.status === EGuestStatus.SLIPPED
          ) {
            return guest;
          }
        }
      }
    }

    // Check for queued guests at bar queue: if facing tile belongs to BAR_QUEUE,
    // look one tile south (y+1) for QUEUED or WAITING_FOR_ORDER guests
    const tile = this._tileGrid.getTile(x, y);
    if (tile?.applianceId && this._barQueue && tile.applianceId === this._barQueue.id) {
      for (const guest of this._guests.values()) {
        if (guest.gridX === x && guest.gridY === y + 1) {
          if (guest.status === EGuestStatus.QUEUED || guest.status === EGuestStatus.WAITING_FOR_ORDER) {
            return guest;
          }
        }
      }
    }

    return null;
  }

  private _handleGuestInteraction(bartender: Bartender, guest: Guest) {
    // Cut-off card: refuse service / kick out
    const heldForCutOff = bartender.heldItemId
      ? this._items.get(bartender.heldItemId)
      : null;
    if (heldForCutOff?.type === EItemType.CUT_OFF_CARD) {
      // Guest leaves with happiness penalty (less if very drunk)
      const penalty = Math.max(5, 15 - guest.drunkenness * 10);
      guest.adjustHappiness(-penalty);
      guest.setStatus(EGuestStatus.LEAVING);
      // Consume the card
      this._items.delete(heldForCutOff.id);
      bartender.setHeldItem(null, null);
      return;
    }

    if (guest.status === EGuestStatus.READY_TO_ORDER || guest.status === EGuestStatus.QUEUED) {
      // Block new orders during closing/overtime
      if (this._shiftManager.phase === "closing") return;
      // Take the order — only from enabled menu items
      const drinkKeys = this.getEnabledDrinkKeys();
      if (drinkKeys.length === 0) return; // nothing on menu
      let drinkKey: string;
      if (guest.preferredDrink && drinkKeys.includes(guest.preferredDrink)) {
        drinkKey = guest.preferredDrink;
      } else {
        drinkKey = Random.pickOne(drinkKeys);
      }
      guest.setOrder({ drinkKey });
      guest.setStatus(EGuestStatus.WAITING_FOR_ORDER);
      guest.adjustPatience(GameSettings.patienceOrderTakenBonus);
      return;
    }

    if (guest.status === EGuestStatus.WAITING_FOR_ORDER && guest.order) {
      // Try to serve the drink
      const heldItem = bartender.heldItemId
        ? this._items.get(bartender.heldItemId)
        : null;

      if (!heldItem) return;

      // Check if held item matches the order (exact type match)
      const recipe = RECIPES[guest.order.drinkKey];
      if (!recipe) return;

      if (heldItem.type === recipe.resultType) {
        // Serve the drink!
        const isTableGuest = !this.isCounterGuest(guest);
        const waitTime = guest.state.statusTimer; // capture before setStatus resets it
        guest.adjustPatience(GameSettings.patienceServeBonus);
        guest.adjustHappiness(GameSettings.happinessServeBonus);

        // Fill guest's first empty consumption slot with the drink
        guest.fillSlot(guest.getFirstEmptySlotIndex(), heldItem.type, false);

        // Bonus happiness if drink matches preference
        if (guest.preferredDrink === guest.order.drinkKey) {
          guest.adjustHappiness(GameSettings.preferredDrinkBonus);
        }

        // Overserve detection: serving a drink to a very drunk guest
        if (guest.drunkenness >= GameSettings.overserveDrunkennessThreshold) {
          guest.setOverserved();
          this._messes.add(`${guest.gridX},${guest.gridY}`);
          this._policeAttention += 1.0;
          this._shiftStats.overserves++;
          this._reputation += GameSettings.overserveReputationPenalty;
          this._shiftStats.reputationChange += GameSettings.overserveReputationPenalty;
          this._pushEvent(EEngineEventType.GUEST_OVERSERVED, {
            guestId: guest.id,
          });
        }

        if (isTableGuest) {
          // Table guest: send back to seat with drink, delete the item
          this._items.delete(heldItem.id);
          bartender.setHeldItem(null, null);
          this.sendGuestBackToSeat(guest);
        } else {
          // Counter guest: place drink on counter as before, start drinking
          guest.setStatus(EGuestStatus.DRINKING);
          const seatAppliance = guest.seatApplianceId
            ? this._appliances.get(guest.seatApplianceId)
            : null;
          if (seatAppliance && seatAppliance.hasOpenSlot()) {
            const slot = seatAppliance.getFirstOpenSlotIndex();
            heldItem.placeOnAppliance(seatAppliance.id, slot);
            seatAppliance.setSlot(slot, heldItem.id);
          } else {
            this._items.delete(heldItem.id);
          }
          bartender.setHeldItem(null, null);
        }

        // Wrath-scaled fast-serve patience bonus (wrathful guests appreciate quick service more)
        if (waitTime < 10) {
          const wrathBonus = Math.round(GameSettings.impatientFastServeBonus * guest.personality.wrath);
          if (wrathBonus > 0) guest.adjustPatience(wrathBonus);
        }

        // Earn money: base price + tip
        const menuEntry = this._menuConfig.get(guest.order.drinkKey);
        const basePrice = menuEntry?.price ?? recipe.menuPrice;

        // Calculate tip: base % scaled by happiness, with speed and preferred drink bonuses
        const happinessFactor = (guest.happiness / GameSettings.happinessMax) * GameSettings.tipHappinessScale;
        let tipPercent = GameSettings.tipBasePercent * happinessFactor;

        // Speed bonus: served within threshold seconds of ordering
        if (waitTime < GameSettings.tipSpeedBonusThreshold) {
          tipPercent += GameSettings.tipSpeedBonusPercent;
        }

        // Preferred drink bonus
        if (guest.preferredDrink === guest.order.drinkKey) {
          tipPercent += GameSettings.tipPreferredDrinkPercent;
        }

        let tip = Math.round(basePrice * tipPercent);

        // Tier-based tip multiplier
        const tierStats = GameSettings.guestTierStats[guest.tier];
        tip = Math.round(tip * tierStats.tipMultiplier);

        // Greed-based tip multiplier: tipMult = 1.8 - 1.3 * greed
        // Generous (greed=0) = 1.8x, greedy (greed=1) = 0.5x
        tip = Math.round(tip * (1.8 - 1.3 * guest.personality.greed));

        const totalEarnings = basePrice + tip;
        this._money += totalEarnings;
        this._shiftStats.moneyEarned += totalEarnings;
        this._shiftStats.tipsEarned += tip;
        this._shiftStats.guestsServed++;
        this._pushEvent(EEngineEventType.DRINK_SERVED, {
          guestId: guest.id,
          guestName: guest.name,
          drinkKey: guest.order.drinkKey,
          money: totalEarnings,
        });
        this._pushEvent(EEngineEventType.MONEY_EARNED, {
          amount: basePrice,
          x: guest.gridX,
          y: guest.gridY,
        });
        if (tip > 0) {
          this._pushEvent(EEngineEventType.TIP_EARNED, {
            amount: tip,
            x: guest.gridX,
            y: guest.gridY,
          });
        }
      }
      return;
    }

    if (guest.status === EGuestStatus.FIGHTING) {
      // Resolve the fight — guest leaves
      guest.setStatus(EGuestStatus.LEAVING);
      this._pushEvent(EEngineEventType.BAR_FIGHT_RESOLVED, { guestId: guest.id });
      return;
    }

    if (guest.status === EGuestStatus.SLIPPED) {
      // Help guest up — during closing/overtime just leave, otherwise walk back to seat
      if (this._shiftManager.phase === "closing" || this._shiftManager.isOvertime) {
        guest.setStatus(EGuestStatus.LEAVING);
      } else if (guest.seatApplianceId) {
        guest.setStatus(EGuestStatus.WALKING_TO_SEAT);
        const path = this.pathfindGuestToSeat(guest, guest.seatApplianceId, guest.seatIndex);
        guest.setPath(path);
      } else {
        guest.setStatus(EGuestStatus.LEAVING);
      }
      this._pushEvent(EEngineEventType.GUEST_HELPED_UP, { guestId: guest.id });
      return;
    }

    if (guest.status === EGuestStatus.DRINKING) {
      // Chat with guest (only if bartender is empty-handed and chat is available)
      if (!bartender.heldItemId && guest.chatAvailable) {
        guest.chat();
      }
    }
  }

  /** Action button — craft/transform items at appliances (no pickup) */
  private _handleCraftInteraction(bartender: Bartender, appliance: Appliance) {
    const heldItem = bartender.heldItemId
      ? this._items.get(bartender.heldItemId) ?? null
      : null;

    // All appliance types are now Widgets — config-driven behavior
    if (appliance instanceof Widget) {
      appliance.handleInteract(bartender, heldItem, this._widgetContext);
    }
  }

  /** Grab button — pick up / put down / bin / source appliances */
  private _handleGrabInteraction(bartender: Bartender, appliance: Appliance, heldItem: Item | null) {
    // All appliance types are now Widgets — config-driven behavior
    if (appliance instanceof Widget) {
      appliance.handleGrab(bartender, heldItem, this._widgetContext);
    }
  }

  /** Find group seating for a party of the given size.
   *  Returns array of seat assignments or null if no group seating available. */
  findGroupSeating(partySize: number): { applianceId: string; seatIndex: number }[] | null {
    if (partySize <= GameSettings.counterPreferMaxPartySize) {
      return this._tryCounterSeating(partySize) ?? this._tryTableSeating(partySize);
    }
    return this._tryTableSeating(partySize) ?? this._tryCounterSeating(partySize);
  }

  /** Try to find N contiguous open counter seats along the bar */
  private _tryCounterSeating(n: number): { applianceId: string; seatIndex: number }[] | null {
    const counters: Appliance[] = [];
    for (const a of this._appliances.values()) {
      if (a.type === EApplianceType.COUNTER && a.gridY === 3) {
        counters.push(a);
      }
    }
    counters.sort((a, b) => a.gridX - b.gridX);
    if (counters.length < n) return null;

    // Collect all valid contiguous windows, then pick one randomly
    const validWindows: number[] = [];
    for (let i = 0; i <= counters.length - n; i++) {
      let contiguous = true;
      for (let j = 1; j < n; j++) {
        if (counters[i + j].gridX !== counters[i].gridX + j) {
          contiguous = false;
          break;
        }
      }
      if (!contiguous) continue;

      let allOpen = true;
      for (let j = 0; j < n; j++) {
        if (!counters[i + j].hasOpenSeat()) {
          allOpen = false;
          break;
        }
      }
      if (!allOpen) continue;

      validWindows.push(i);
    }

    if (validWindows.length === 0) return null;
    const chosen = validWindows[Math.floor(Math.random() * validWindows.length)];
    return counters.slice(chosen, chosen + n).map((c) => ({
      applianceId: c.id,
      seatIndex: c.getFirstOpenSeatIndex(),
    }));
  }

  /** Try to find a table/hightop with enough open seats */
  private _tryTableSeating(n: number): { applianceId: string; seatIndex: number }[] | null {
    let bestAppliance: Appliance | null = null;
    let bestOpenCount = Infinity;

    for (const a of this._appliances.values()) {
      if (a.type !== EApplianceType.HIGHTOP && a.type !== EApplianceType.TABLE) continue;
      const openCount = a.getOpenSeatCount();
      if (openCount < n) continue;
      if (openCount < bestOpenCount) {
        bestAppliance = a;
        bestOpenCount = openCount;
      }
    }

    if (!bestAppliance) return null;
    const indices = bestAppliance.getOpenSeatIndices().slice(0, n);
    return indices.map((seatIndex) => ({
      applianceId: bestAppliance!.id,
      seatIndex,
    }));
  }

  /** Check if a guest is seated at the bar counter (vs table/hightop) */
  isCounterGuest(guest: Guest): boolean {
    if (!guest.seatApplianceId) return false;
    const appliance = this._appliances.get(guest.seatApplianceId);
    return appliance?.type === EApplianceType.COUNTER;
  }

  /** Assign a queue slot to a guest. Returns slot index or -1 if queue is full. */
  assignQueueSlot(guest: Guest): number {
    for (let i = 0; i < this._queueSlots.length; i++) {
      if (this._queueSlots[i].guestId === null) {
        this._queueSlots[i].guestId = guest.id;
        guest.setQueuePosition(i);
        // Pathfind guest to the queue slot position
        // (WALKING_TO_QUEUE guests phase through collision, so no blockedTiles needed)
        const pos = this._queueSlots[i].position;
        const path = Pathfinding.findPath(
          this._tileGrid,
          guest.gridX,
          guest.gridY,
          pos.x,
          pos.y,
          true,
        );
        guest.setPath(path);
        return i;
      }
    }
    return -1; // queue full
  }

  /** Free a queue slot and shift guests forward */
  freeQueueSlot(guestId: string) {
    const slotIdx = this._queueSlots.findIndex((s) => s.guestId === guestId);
    if (slotIdx < 0) return;
    this._queueSlots[slotIdx].guestId = null;

    // Find the guest and clear their queue position
    const guest = this._guests.get(guestId);
    if (guest) guest.setQueuePosition(-1);

    // Shift guests forward to fill gaps — move QUEUED and WAITING_FOR_ORDER guests
    for (let i = slotIdx + 1; i < this._queueSlots.length; i++) {
      const behindId = this._queueSlots[i].guestId;
      if (!behindId) continue;
      const behindGuest = this._guests.get(behindId);
      if (!behindGuest) continue;
      // Only shift guests already at their position, not still walking
      if (behindGuest.status !== EGuestStatus.QUEUED && behindGuest.status !== EGuestStatus.WAITING_FOR_ORDER) continue;

      // Find first open slot before this one
      for (let j = 0; j < i; j++) {
        if (this._queueSlots[j].guestId === null) {
          // Move guest to earlier slot
          this._queueSlots[j].guestId = behindId;
          this._queueSlots[i].guestId = null;
          behindGuest.setQueuePosition(j);
          const pos = this._queueSlots[j].position;
          const path = Pathfinding.findPath(
            this._tileGrid,
            behindGuest.gridX,
            behindGuest.gridY,
            pos.x,
            pos.y,
            true,
          );
          behindGuest.setPath(path);
          behindGuest.setStatus(EGuestStatus.WALKING_TO_QUEUE);
          break;
        }
      }
    }
  }

  /** Send a table guest to the bar queue to order */
  sendGuestToQueue(guest: Guest) {
    // Move dirty glass from table to bar queue
    if (guest.seatApplianceId) {
      const seatApp = this._appliances.get(guest.seatApplianceId);
      if (seatApp && this._barQueue) {
        const slots = seatApp.state.slots;
        for (let i = 0; i < slots.length; i++) {
          if (slots[i]) {
            const item = this._items.get(slots[i]!);
            if (item && item.type === EItemType.DIRTY_GLASS) {
              // Move dirty glass to bar queue
              seatApp.setSlot(i, null);
              if (this._barQueue.hasOpenSlot()) {
                const qSlot = this._barQueue.getFirstOpenSlotIndex();
                item.placeOnAppliance(this._barQueue.id, qSlot);
                this._barQueue.setSlot(qSlot, item.id);
              } else {
                this._items.delete(item.id);
              }
              guest.setCarryingDirtyGlass(true);
              break;
            }
          }
        }
      }
    }

    // Assign queue slot and pathfind
    const slotIdx = this.assignQueueSlot(guest);
    if (slotIdx >= 0) {
      guest.setStatus(EGuestStatus.WALKING_TO_QUEUE);
    } else {
      // Queue full — stay at table and wait (retry next tick)
      guest.setStatus(EGuestStatus.DECIDING);
    }
  }

  /** Send a queued guest back to their seat after being served */
  sendGuestBackToSeat(guest: Guest) {
    this.freeQueueSlot(guest.id);
    guest.setCarryingDirtyGlass(false);
    guest.setStatus(EGuestStatus.RETURNING_TO_SEAT);
    if (guest.seatApplianceId) {
      const path = this.pathfindGuestToSeat(guest, guest.seatApplianceId, guest.seatIndex);
      guest.setPath(path);
    }
  }

  /** Pathfind a guest from their current position to near their seat appliance.
   *  When seatIndex is provided, uses SEAT_OFFSETS to route to a unique tile per seat. */
  pathfindGuestToSeat(guest: Guest, applianceId: string, seatIndex: number = -1): Vec2[] {
    const appliance = this._appliances.get(applianceId);
    if (!appliance) return [];

    // Use seat offset to determine a unique target tile per seat
    if (seatIndex >= 0) {
      const offsets = SEAT_OFFSETS[appliance.type];
      if (offsets && seatIndex < offsets.length) {
        const [ox, oy] = offsets[seatIndex];
        const targetX = appliance.gridX + Math.round(ox);
        const targetY = appliance.gridY + Math.round(oy);
        if (this._tileGrid.isWalkableForGuest(targetX, targetY)) {
          return Pathfinding.findPath(
            this._tileGrid,
            guest.gridX,
            guest.gridY,
            targetX,
            targetY,
            true,
            undefined,
            this._occupiedTiles,
          );
        }
      }
    }

    // Fallback: find a walkable tile adjacent to the appliance
    const adjacent = this._tileGrid.getAdjacentTiles(
      appliance.gridX,
      appliance.gridY,
    );
    const walkableAdjacent = adjacent.filter((t) =>
      this._tileGrid.isWalkableForGuest(t.x, t.y),
    );

    if (walkableAdjacent.length === 0) {
      // Try the appliance tile itself (guest sits on it)
      return Pathfinding.findPath(
        this._tileGrid,
        guest.gridX,
        guest.gridY,
        appliance.gridX,
        appliance.gridY,
        true,
        undefined,
        this._occupiedTiles,
      );
    }

    // Pick the closest walkable adjacent tile
    let best = walkableAdjacent[0];
    let bestDist = Math.abs(best.x - guest.gridX) + Math.abs(best.y - guest.gridY);
    for (const t of walkableAdjacent) {
      const dist = Math.abs(t.x - guest.gridX) + Math.abs(t.y - guest.gridY);
      if (dist < bestDist) {
        best = t;
        bestDist = dist;
      }
    }

    return Pathfinding.findPath(
      this._tileGrid,
      guest.gridX,
      guest.gridY,
      best.x,
      best.y,
      true,
      undefined,
      this._occupiedTiles,
    );
  }

  addGuest(guest: Guest) {
    this._guests.set(guest.id, guest);
    this._pushEvent(EEngineEventType.GUEST_SEATED, { guestId: guest.id });
  }

  private _pushEvent(type: EEngineEventType, data: Record<string, unknown>) {
    this._events.push({
      type,
      data,
      ttl: 3,
      spawnId: ++this._eventCounter,
    });
  }

  /** Main update tick — called at 60Hz */
  update() {
    const dt = 1 / GameSettings.tickRate;

    // Police attention decay
    if (this._policeAttention > 0) {
      this._policeAttention = Math.max(0, this._policeAttention - GameSettings.policeAttentionDecayRate * dt);
      // Reset warning trigger when attention drops below threshold
      if (this._policeAttention < GameSettings.policeWarningThreshold) {
        this._policeWarningTriggered = false;
      }
    }

    // Police warning check
    if (this._policeAttention >= GameSettings.policeWarningThreshold && !this._policeWarningTriggered) {
      this._policeWarningTriggered = true;
      this._pushEvent(EEngineEventType.POLICE_WARNING, {});
    }

    // Police raid check
    if (this._policeAttention >= GameSettings.policeRaidThreshold) {
      this._pushEvent(EEngineEventType.POLICE_RAID, { penalty: GameSettings.policeRaidMoneyPenalty });
      this._money -= GameSettings.policeRaidMoneyPenalty;
      this._reputation += GameSettings.policeRaidReputationPenalty;
      this._shiftStats.reputationChange += GameSettings.policeRaidReputationPenalty;
      this._shiftStats.policeRaids++;
      this._policeRaidTimer = GameSettings.policeRaidDuration;
      // Force-leave all guests over the overserve threshold
      for (const guest of this._guests.values()) {
        if (guest.drunkenness >= GameSettings.overserveDrunkennessThreshold &&
            guest.status !== EGuestStatus.LEAVING) {
          guest.setStatus(EGuestStatus.LEAVING);
        }
      }
      this._policeAttention = 0;
      this._policeWarningTriggered = false;
    }

    // Police raid timer — pause guest spawning during raid
    if (this._policeRaidTimer > 0) {
      this._policeRaidTimer -= dt;
    }

    // Shift phase
    this._shiftManager.tick(dt);

    // Early end of closing phase when all guests have left
    if (this._shiftManager.phase === "closing" && !this._shiftManager.isOvertime && this._guests.size === 0) {
      this._shiftManager.skipPhase(); // → prep, fires onPhaseChange
    }

    // Handle overtime
    if (this._shiftManager.isOvertime) {
      if (this._guests.size === 0) {
        this._shiftManager.endOvertime();
        this._calculateShiftExpenses();
        this._pushEvent(EEngineEventType.SHIFT_SUMMARY, { ...this._shiftStats });
        this._pushEvent(EEngineEventType.SHIFT_CHANGE, { phase: "prep" });
      } else if (this._shiftManager.overtimeTimer >= GameSettings.overtimeHardCap) {
        // Hard cap — force all remaining guests to leave
        for (const guest of this._guests.values()) {
          if (guest.status !== EGuestStatus.LEAVING) {
            guest.setStatus(EGuestStatus.LEAVING);
          }
        }
      }
    }

    // Guest spawning
    this._guestSpawner.tick(dt);

    // Rebuild occupied tiles for collision detection
    // Transient-movement guests phase through to avoid deadlocks:
    // LEAVING, RETURNING_TO_SEAT, WALKING_TO_QUEUE, WALKING_TO_SEAT
    const phaseThrough = (s: EGuestStatus) =>
      s === EGuestStatus.LEAVING ||
      s === EGuestStatus.RETURNING_TO_SEAT ||
      s === EGuestStatus.WALKING_TO_QUEUE ||
      s === EGuestStatus.WALKING_TO_SEAT;
    this._occupiedTiles.clear();
    for (const guest of this._guests.values()) {
      if (phaseThrough(guest.status)) continue;
      this._occupiedTiles.add(`${guest.gridX},${guest.gridY}`);
      if (guest.isMoving) {
        this._occupiedTiles.add(`${guest.state.targetX},${guest.state.targetY}`);
      }
    }

    // Set collision callbacks — transient-movement guests phase through
    for (const guest of this._guests.values()) {
      // Walkable terrain check (always set — used by drunk stumble)
      guest.setWalkableCheck((x, y) => this._tileGrid.isWalkableForGuest(x, y));
      if (phaseThrough(guest.status)) {
        guest.setTileBlockedCheck(null);
      } else {
        const guestId = guest.id;
        const gx = guest.gridX;
        const gy = guest.gridY;
        guest.setTileBlockedCheck((x, y) => {
          const key = `${x},${y}`;
          if (x === gx && y === gy) return false; // own tile is not blocked
          return this._occupiedTiles.has(key);
        });
      }
    }

    // Update bartenders
    for (const bartender of this._bartenders) {
      if (bartender.id === null) continue;
      const wasInteracting = bartender.isInteracting;
      bartender.tick(dt, (x, y) => this._tileGrid.isWalkableForPlayer(x, y));

      // Check pending wash/transform completion
      const wash = this._pendingWash.get(bartender.number);
      if (wash) {
        if (wasInteracting && !bartender.isInteracting) {
          // Completed — use callback if present (Widget), otherwise legacy delete
          if (wash.callback) {
            wash.callback();
          } else {
            this._items.delete(wash.itemId);
            bartender.setHeldItem(null, null);
          }
          this._pendingWash.delete(bartender.number);
        } else if (bartender.isMoving) {
          // Bartender moved — cancel
          this._pendingWash.delete(bartender.number);
        }
      }
    }

    // Update edit mode preview position based on the holder's bartender facing
    if (this._editModeManager.active && this._editModeManager.heldApplianceId && this._editModeManager.heldByUuid) {
      this.editModeUpdatePreview(this._editModeManager.heldByUuid);
    }

    // Set leave paths for guests that just started leaving
    for (const guest of this._guests.values()) {
      if (guest.needsLeavePath) {
        const entrance = this._layout.guestEntrance;
        const path = Pathfinding.findPath(
          this._tileGrid,
          guest.gridX,
          guest.gridY,
          entrance.x,
          entrance.y,
          true,
          undefined,
          this._occupiedTiles,
        );
        guest.setLeavePath(path);
      }
    }

    // Assign seats to WAITING_AT_DOOR guests (by party)
    const waitingParties = new Map<string, Guest[]>();
    for (const guest of this._guests.values()) {
      if (guest.status !== EGuestStatus.WAITING_AT_DOOR) continue;
      const arr = waitingParties.get(guest.partyId) ?? [];
      arr.push(guest);
      waitingParties.set(guest.partyId, arr);
    }
    for (const [, partyGuests] of waitingParties) {
      const seats = this.findGroupSeating(partyGuests.length);
      if (!seats) continue;
      for (let i = 0; i < partyGuests.length; i++) {
        const guest = partyGuests[i];
        const seat = seats[i];
        const appliance = this._appliances.get(seat.applianceId);
        guest.setSeat(seat.applianceId, seat.seatIndex, appliance?.gridX ?? 0, appliance?.gridY ?? 0);
        if (appliance) {
          appliance.seatGuest(seat.seatIndex, guest.id);
        }
        const path = this.pathfindGuestToSeat(guest, seat.applianceId, seat.seatIndex);
        guest.setPath(path);
        guest.setStatus(EGuestStatus.WALKING_TO_SEAT);
      }
    }

    // Table guests: redirect READY_TO_ORDER to bar queue
    for (const guest of this._guests.values()) {
      if (guest.status !== EGuestStatus.READY_TO_ORDER) continue;
      if (this.isCounterGuest(guest)) continue; // counter guests stay in place
      this.sendGuestToQueue(guest);
    }

    // Clean up queue slots for guests that started leaving
    for (const guest of this._guests.values()) {
      if (guest.status === EGuestStatus.LEAVING && guest.queuePosition >= 0) {
        this.freeQueueSlot(guest.id);
      }
    }

    // Update guests
    const prevStatuses = new Map<string, EGuestStatus>();
    for (const guest of this._guests.values()) {
      prevStatuses.set(guest.id, guest.status);
    }
    const toRemove: string[] = [];
    for (const guest of this._guests.values()) {
      const shouldRemove = guest.tick(dt);
      if (shouldRemove) {
        toRemove.push(guest.id);
      }
    }

    // Detect newly started fights (AOE happiness drop + events)
    for (const guest of this._guests.values()) {
      if (guest.status === EGuestStatus.FIGHTING && prevStatuses.get(guest.id) !== EGuestStatus.FIGHTING) {
        this._shiftStats.fights++;
        this._pushEvent(EEngineEventType.BAR_FIGHT_STARTED, { guestId: guest.id });
        // AOE happiness drop to nearby guests
        for (const other of this._guests.values()) {
          if (other.id === guest.id) continue;
          const dist = Math.abs(other.gridX - guest.gridX) + Math.abs(other.gridY - guest.gridY);
          if (dist <= GameSettings.fightAoeRadius) {
            other.adjustHappiness(-GameSettings.fightAoeHappinessDrop);
          }
        }
      }
    }

    // Group dynamics: mood sync between nearby guests
    this._tickMoodSync(dt);

    // Fight cascade: nearby wrathful guests may join active fights
    this._tickFightCascade(dt);

    // Recalculate bar atmosphere
    this._calculateAtmosphere();

    // Slip detection: leaving guests walking through mess tiles while drunk
    for (const guest of this._guests.values()) {
      if (guest.status !== EGuestStatus.LEAVING) continue;
      if (!guest.isMoving) continue;
      if (guest.slipImmune) continue;
      if (guest.drunkenness < GameSettings.slipDrunkThreshold) continue;
      const messKey = `${guest.gridX},${guest.gridY}`;
      if (this._messes.has(messKey) && Random.range(0, 1) < GameSettings.slipChance) {
        guest.adjustHappiness(-GameSettings.slipHappinessPenalty);
        guest.setStatus(EGuestStatus.SLIPPED);
        this._shiftStats.slips++;
        this._pushEvent(EEngineEventType.GUEST_SLIPPED, { guestId: guest.id });
      }
    }

    // Transform served drinks into dirty glasses when guests finish drinking
    for (const guest of this._guests.values()) {
      if (!guest.producedDirtyGlass) continue;
      guest.clearDirtyGlassFlag();

      // Try to transform the drink sitting on the guest's seat to a dirty glass
      let transformed = false;
      if (guest.seatApplianceId) {
        const seatApp = this._appliances.get(guest.seatApplianceId);
        if (seatApp) {
          const slots = seatApp.state.slots;
          for (let i = 0; i < slots.length; i++) {
            if (slots[i]) {
              const item = this._items.get(slots[i]!);
              if (item && item.type !== EItemType.DIRTY_GLASS) {
                item.setType(EItemType.DIRTY_GLASS);
                transformed = true;
                break;
              }
            }
          }
        }
      }
      if (!transformed) {
        this._spawnDirtyGlass();
      }

      // Mess chance driven by sloth: messChance = sloth * 0.3 + drunkenness bonus
      // Diligent guests (low sloth) barely make messes, slothful guests are messy
      const messChance = guest.personality.sloth * 0.3 + guest.drunkenness * GameSettings.messChanceDrunkBonus;
      if (Random.range(0, 1) < messChance) {
        this._messes.add(`${guest.gridX},${guest.gridY}`);
      }
    }

    // Remove departed guests + reputation tracking
    for (const id of toRemove) {
      const guest = this._guests.get(id);
      if (guest) {
        // Party leave penalty: angry guest leaving drags down party members
        this._applyPartyLeavePenalty(guest);
        this._shiftStats.guestsTotal++;
        // Reputation change based on happiness at departure
        if (guest.happiness >= 60) {
          const rep = GameSettings.reputationPerHappyGuest;
          this._reputation += rep;
          this._shiftStats.reputationChange += rep;
        } else if (guest.happiness < 30) {
          const rep = GameSettings.reputationPerSadGuest;
          this._reputation += rep;
          this._shiftStats.reputationChange += rep;
        }
        if (guest.seatApplianceId) {
          const appliance = this._appliances.get(guest.seatApplianceId);
          appliance?.unseatGuest(guest.id);
        }
      }
      this._guests.delete(id);
      this._pushEvent(EEngineEventType.GUEST_LEFT, { guestId: id, happiness: guest?.happiness ?? 0 });
    }
  }

  /** Assign a last-call decision to a guest based on their current status. */
  private _guestLastCallDecision(guest: Guest) {
    const skip = [
      EGuestStatus.LEAVING, EGuestStatus.FIGHTING, EGuestStatus.SLIPPED,
      EGuestStatus.WALKING_TO_SEAT, EGuestStatus.WAITING_AT_DOOR,
    ];
    if (skip.includes(guest.status)) return;

    if (guest.status === EGuestStatus.DRINKING) {
      // Start chugging current drink
      guest.setChugging(true);
      // Decide: order one more, or finish and leave
      if (
        guest.roundsRemaining > 0 &&
        Random.range(0, 1) < GameSettings.lastCallOrderChance &&
        guest.drunkenness < guest.state.drunkGoal
      ) {
        guest.setLastCallDecision("ordering");
      } else {
        guest.setLastCallDecision("finishing");
      }
    } else if (
      guest.status === EGuestStatus.DECIDING ||
      guest.status === EGuestStatus.READY_TO_ORDER
    ) {
      if (
        Random.range(0, 1) < GameSettings.lastCallOrderChance &&
        guest.drunkenness < guest.state.drunkGoal
      ) {
        guest.setLastCallDecision("ordering");
      } else {
        guest.setLastCallDecision("leaving");
      }
    } else if (guest.status === EGuestStatus.WAITING_FOR_ORDER) {
      // Wait for the drink they ordered, drink it, then leave
      guest.setLastCallDecision("finishing");
    } else if (
      guest.status === EGuestStatus.QUEUED ||
      guest.status === EGuestStatus.WALKING_TO_QUEUE
    ) {
      // Already committed to ordering
      guest.setLastCallDecision("ordering");
    } else if (guest.status === EGuestStatus.RETURNING_TO_SEAT) {
      guest.setLastCallDecision("finishing");
    }
  }

  /** Handle the transition from service to closing phase. */
  private _handleClosingTransition() {
    for (const guest of this._guests.values()) {
      switch (guest.status) {
        case EGuestStatus.DECIDING:
        case EGuestStatus.READY_TO_ORDER:
          // Too late to order — leave
          guest.setStatus(EGuestStatus.LEAVING);
          break;
        case EGuestStatus.QUEUED:
        case EGuestStatus.WALKING_TO_QUEUE:
          // Too late — leave
          this.freeQueueSlot(guest.id);
          guest.setStatus(EGuestStatus.LEAVING);
          break;
        case EGuestStatus.DRINKING:
          // Let them finish, then leave
          guest.setLastCallDecision("finishing");
          guest.setChugging(true);
          break;
        case EGuestStatus.WAITING_FOR_ORDER:
          // Let the player serve what's pending
          guest.setLastCallDecision("finishing");
          break;
        case EGuestStatus.RETURNING_TO_SEAT:
          // Let them sit and drink
          guest.setLastCallDecision("finishing");
          break;
        // LEAVING, FIGHTING, SLIPPED — leave as-is
      }
    }
  }

  private _spawnDirtyGlass() {
    // Find an appliance with open slots to place the dirty glass
    for (const appliance of this._appliances.values()) {
      if (appliance.type === EApplianceType.SERVICE_BAR && appliance.hasOpenSlot()) {
        const item = new Item(EItemType.DIRTY_GLASS);
        const slot = appliance.getFirstOpenSlotIndex();
        item.placeOnAppliance(appliance.id, slot);
        appliance.setSlot(slot, item.id);
        this._items.set(item.id, item);
        return;
      }
    }
    // Fallback: place on any counter with open slot
    for (const appliance of this._appliances.values()) {
      if (appliance.type === EApplianceType.COUNTER && appliance.hasOpenSlot()) {
        const item = new Item(EItemType.DIRTY_GLASS);
        const slot = appliance.getFirstOpenSlotIndex();
        item.placeOnAppliance(appliance.id, slot);
        appliance.setSlot(slot, item.id);
        this._items.set(item.id, item);
        return;
      }
    }
    // No space — glass is lost (acceptable for prototype)
  }

  // ── Group Dynamics ──────────────────────────────────────────

  /** Mood sync: nearby guests influence each other's happiness. */
  private _tickMoodSync(dt: number) {
    const guests = [...this._guests.values()];
    // Only apply to seated/drinking/deciding guests (not walking, leaving, fighting, etc.)
    const eligible = guests.filter(g =>
      g.status === EGuestStatus.DECIDING ||
      g.status === EGuestStatus.READY_TO_ORDER ||
      g.status === EGuestStatus.WAITING_FOR_ORDER ||
      g.status === EGuestStatus.DRINKING
    );
    if (eligible.length < 2) return;

    // Pre-compute happiness for stable reads during influence pass
    const happinessSnapshot = new Map<string, number>();
    for (const g of eligible) {
      happinessSnapshot.set(g.id, g.happiness);
    }

    for (const guest of eligible) {
      const envy = guest.personality.envy;
      const radius = GameSettings.moodInfluenceRadiusBase + envy * GameSettings.moodInfluenceEnvyScale;
      const baseMult = GameSettings.moodInfluenceBaseMult + envy; // kind = negative (spread positive), envious = positive (drag down)

      let totalInfluence = 0;
      const guestHappiness = happinessSnapshot.get(guest.id)!;

      for (const other of eligible) {
        if (other.id === guest.id) continue;
        const dist = Math.abs(other.gridX - guest.gridX) + Math.abs(other.gridY - guest.gridY);
        if (dist > radius) continue;

        const otherHappiness = happinessSnapshot.get(other.id)!;
        const diff = otherHappiness - guestHappiness;
        let mult = baseMult;

        // Party members have amplified influence
        if (guest.partyId === other.partyId) {
          mult *= GameSettings.intraPartyInfluenceScale;
        }

        totalInfluence += diff * mult;
      }

      if (totalInfluence !== 0) {
        guest.applyMoodInfluence(totalInfluence * GameSettings.moodInfluenceRate * dt);
      }
    }
  }

  /** Fight cascade: nearby wrathful guests may join an active fight. */
  private _tickFightCascade(dt: number) {
    const fighters: Guest[] = [];
    for (const g of this._guests.values()) {
      if (g.status === EGuestStatus.FIGHTING) fighters.push(g);
    }
    if (fighters.length === 0) return;

    for (const guest of this._guests.values()) {
      if (guest.status === EGuestStatus.FIGHTING) continue;
      if (guest.status === EGuestStatus.LEAVING || guest.status === EGuestStatus.SLIPPED) continue;

      // Check if near any fighter
      let nearFighter = false;
      let isPartyFight = false;
      for (const fighter of fighters) {
        const dist = Math.abs(fighter.gridX - guest.gridX) + Math.abs(fighter.gridY - guest.gridY);
        if (dist <= GameSettings.fightAoeRadius) {
          nearFighter = true;
          if (guest.partyId === fighter.partyId) isPartyFight = true;
          break;
        }
      }
      if (!nearFighter) continue;

      // Party members join at lower wrath threshold
      const wrathThreshold = isPartyFight
        ? GameSettings.fightCascadePartyWrathThreshold
        : GameSettings.fightCascadeWrathThreshold;
      if (guest.personality.wrath <= wrathThreshold) continue;

      // Roll chance per tick
      let joinChance = (guest.personality.wrath - 0.5) * GameSettings.fightCascadeJoinBase * dt;
      if (isPartyFight) joinChance *= GameSettings.fightCascadePartyJoinScale;
      if (joinChance > 0 && Random.range(0, 1) < joinChance) {
        guest.setStatus(EGuestStatus.FIGHTING);
        this._shiftStats.fights++;
        this._pushEvent(EEngineEventType.BAR_FIGHT_STARTED, { guestId: guest.id, cascade: true });
      }
    }

    // Multi-person fights last longer: add extra time per participant beyond the first
    const fighterCount = [...this._guests.values()].filter(g => g.status === EGuestStatus.FIGHTING).length;
    if (fighterCount > 1) {
      // Extend fight timeout for all fighters by scaling — handled via breakage cost increase
      // (fight duration is per-guest via statusTimer in Guest.tick, no need to modify)
    }
  }

  /** Calculate bar atmosphere from 0-100 based on current state. */
  private _calculateAtmosphere() {
    const guests = [...this._guests.values()];
    if (guests.length === 0) {
      // No guests — atmosphere stays neutral
      this._atmosphere = 50;
      return;
    }

    // Average guest happiness (0-100)
    let totalHappiness = 0;
    for (const g of guests) {
      totalHappiness += g.happiness;
    }
    const avgHappiness = totalHappiness / guests.length;

    // Start from average happiness
    let atmosphere = avgHappiness;

    // Active fights penalty
    let fightCount = 0;
    for (const g of guests) {
      if (g.status === EGuestStatus.FIGHTING) fightCount++;
    }
    atmosphere -= fightCount * GameSettings.atmosphereFightPenalty;

    // Messes penalty
    atmosphere -= this._messes.size * GameSettings.atmosphereMessPenalty;

    // Lustful guest presence bonus
    for (const g of guests) {
      atmosphere += g.personality.lust * GameSettings.atmosphereLustBonus;
    }

    // Happy party bonus: count unique parties where avg happiness > 60
    const partyHappiness = new Map<string, { total: number; count: number }>();
    for (const g of guests) {
      const entry = partyHappiness.get(g.partyId) ?? { total: 0, count: 0 };
      entry.total += g.happiness;
      entry.count++;
      partyHappiness.set(g.partyId, entry);
    }
    for (const [, entry] of partyHappiness) {
      if (entry.count > 1 && entry.total / entry.count > 60) {
        atmosphere += GameSettings.atmosphereHappyPartyBonus;
      }
    }

    this._atmosphere = Math.max(GameSettings.atmosphereMin, Math.min(GameSettings.atmosphereMax, Math.round(atmosphere)));
  }

  /** Apply party-member-leave penalty: when a guest leaves angry, same-party members lose happiness. */
  private _applyPartyLeavePenalty(leavingGuest: Guest) {
    if (leavingGuest.happiness >= 30) return; // not angry
    for (const other of this._guests.values()) {
      if (other.id === leavingGuest.id) continue;
      if (other.partyId !== leavingGuest.partyId) continue;
      other.adjustHappiness(-GameSettings.partyMemberAngryLeavePenalty);
    }
  }

  /** Calculate and deduct shift-end expenses (restock, breakage, waste). Called before SHIFT_SUMMARY. */
  private _calculateShiftExpenses() {
    let restockCost = 0;
    let breakageCost = 0;
    let wasteCost = 0;

    // 1. Restock: proportional to depletion
    for (const app of this._appliances.values()) {
      if (app.maxStock > 0 && app.currentStock < app.maxStock) {
        const used = app.maxStock - app.currentStock;
        restockCost += Math.round(app.restockCost * used / app.maxStock);
        app.restock();
      }
    }

    // 2. Breakage: per fight
    breakageCost = this._shiftStats.fights * GameSettings.breakageCostPerFight;

    // 3. Waste: drink items left on surfaces
    for (const item of this._items.values()) {
      if (item.locationApplianceId) {
        const recipe = Object.values(RECIPES).find(r => r.resultType === item.type);
        if (recipe) wasteCost += recipe.baseCost;
      }
    }

    // Clear all remaining items, slots, and held items for next shift
    this._items.clear();
    for (const app of this._appliances.values()) {
      app.clearSlots();
    }
    for (const bt of this._bartenders) {
      bt.setHeldItem(null, null);
    }
    this._messes.clear();

    const totalExpenses = restockCost + breakageCost + wasteCost;
    this._money -= totalExpenses;

    this._shiftStats.restockCost = restockCost;
    this._shiftStats.breakageCost = breakageCost;
    this._shiftStats.wasteCost = wasteCost;
    this._shiftStats.totalExpenses = totalExpenses;

    if (totalExpenses > 0) {
      this._pushEvent(EEngineEventType.EXPENSE_DEDUCTED, { amount: totalExpenses });
    }
  }
}
