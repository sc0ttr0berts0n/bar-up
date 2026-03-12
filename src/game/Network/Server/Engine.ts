import { DEFAULT_BAR_LAYOUT, type IBarLayout } from "../../Shared/BarLayout";
import { EApplianceType, SEAT_OFFSETS } from "../../Shared/ApplianceTypes";
import { EItemType, GLASS_TYPES } from "../../Shared/ItemTypes";
import { EDirection, ETileZone } from "../../Shared/TileTypes";
import { RECIPES, getMenuDrinkKeys, APPLIANCE_VARIANTS, GRAB_VARIANTS } from "../../Shared/DrinkRecipes";
import { EGuestStatus, EGuestTrait } from "../../Shared/GuestTypes";
import GameSettings from "../../Shared/GameSettings";
import { Random } from "../../Utils/Random";
import type { Vec2 } from "../../../types/Vec2";
import { type IEngineEvent, EEngineEventType } from "../Communicator/PacketTypes";
import { TileGrid } from "./TileGrid";
import { Pathfinding } from "./Pathfinding";
import { Bartender } from "./GameObjects/Bartender";
import { Guest } from "./GameObjects/Guest";
import { Appliance } from "./GameObjects/Appliance";
import { Item } from "./GameObjects/Item";
import { DrinkCrafter } from "./GameObjects/DrinkCrafter";
import { GuestSpawner } from "./GameObjects/GuestSpawner";
import { ShiftManager } from "./GameObjects/ShiftManager";
import type { Game } from "./Game";

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
  private _shiftStats = { guestsServed: 0, guestsTotal: 0, moneyEarned: 0, reputationChange: 0, fights: 0, slips: 0, overserves: 0, policeRaids: 0 };
  private _menuConfig: Map<string, { enabled: boolean; price: number }> = new Map();
  private _barQueue: Appliance | null = null;
  private _queueSlots: { position: Vec2; guestId: string | null }[] = [];
  private _occupiedTiles: Set<string> = new Set();
  private _pendingWash: Map<number, { itemId: string }> = new Map(); // keyed by bartender number

  constructor(game: Game) {
    this._game = game;
    this._layout = DEFAULT_BAR_LAYOUT;
    this._tileGrid = new TileGrid(this._layout);
    this._money = GameSettings.startingMoney;

    // Create appliances from layout
    for (const placement of this._layout.appliances) {
      const appliance = new Appliance(placement.type, placement.gridX, placement.gridY);
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

      this._guestSpawner.enabled = phase === "service";
      if (phase === "service") {
        this._shiftStats = { guestsServed: 0, guestsTotal: 0, moneyEarned: 0, reputationChange: 0, fights: 0, slips: 0, overserves: 0, policeRaids: 0 };
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
        guest.adjustPatience(GameSettings.patienceServeBonus);
        guest.adjustHappiness(GameSettings.happinessServeBonus);

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

        // IMPATIENT fast-serve bonus (served within 10 seconds of ordering)
        if (guest.hasTrait(EGuestTrait.IMPATIENT) && guest.state.statusTimer < 10) {
          guest.adjustPatience(GameSettings.impatientFastServeBonus);
        }

        // Earn money (use configured price, HIGHROLLER tips more)
        const menuEntry = this._menuConfig.get(guest.order.drinkKey);
        let earnings = menuEntry?.price ?? recipe.menuPrice;
        if (guest.hasTrait(EGuestTrait.HIGHROLLER)) {
          earnings = Math.round(earnings * GameSettings.highrollerTipMultiplier);
        }
        this._money += earnings;
        this._shiftStats.moneyEarned += earnings;
        this._shiftStats.guestsServed++;
        this._pushEvent(EEngineEventType.DRINK_SERVED, {
          guestId: guest.id,
          drinkKey: guest.order.drinkKey,
          money: earnings,
        });
        this._pushEvent(EEngineEventType.MONEY_EARNED, {
          amount: earnings,
          x: guest.gridX,
          y: guest.gridY,
        });
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

    // Crafting only works when holding something
    if (!heldItem) return;

    const result = DrinkCrafter.resolveInteraction(heldItem, appliance);

    if (result.consumed) {
      // Delayed wash — start interact animation and consume when it finishes
      this._pendingWash.set(bartender.number, { itemId: heldItem.id });
      bartender.startInteract(GameSettings.washDuration);
      return;
    } else if (result.newItemType !== null) {
      if (!appliance.hasStock()) return; // out of stock
      // Transform the held item
      heldItem.setType(result.newItemType);
      bartender.setHeldItem(heldItem.id, heldItem.type);
      appliance.depleteStock();
      this._pushEvent(EEngineEventType.ITEM_CRAFTED, {
        itemType: result.newItemType,
        playerId: bartender.id,
      });
    }
  }

  /** Grab button — pick up / put down / bin / source appliances */
  private _handleGrabInteraction(bartender: Bartender, appliance: Appliance, heldItem: Item | null) {
    const appType = appliance.type;

    // Bin handling
    if (appType === EApplianceType.BIN) {
      if (heldItem && heldItem.type !== EItemType.TRASH_BAG) {
        // Toss held item into bin (if room)
        if (appliance.hasOpenSlot()) {
          const slot = appliance.getFirstOpenSlotIndex();
          this._items.delete(heldItem.id);
          appliance.setSlot(slot, "trash");
          bartender.setHeldItem(null, null);
        }
      } else if (!heldItem && appliance.hasAnyItem()) {
        // Pick up trash bag
        appliance.clearSlots();
        const bag = new Item(EItemType.TRASH_BAG);
        bag.pickUp(bartender.id!);
        this._items.set(bag.id, bag);
        bartender.setHeldItem(bag.id, bag.type);
      }
      return;
    }

    // Source appliances — pick up new items (empty-handed only)
    if (!heldItem) {
      // Glass shelf — direct grab (single glass type, no sub-menu)
      if (appType === EApplianceType.GLASS_SHELF) {
        if (!appliance.hasStock()) return; // out of stock
        const item = new Item(EItemType.GLASS);
        item.pickUp(bartender.id!);
        this._items.set(item.id, item);
        bartender.setHeldItem(item.id, item.type);
        appliance.depleteStock();
        return;
      }
      if (appType === EApplianceType.CARD_HOLDER) {
        const item = new Item(EItemType.CUT_OFF_CARD);
        item.pickUp(bartender.id!);
        this._items.set(item.id, item);
        bartender.setHeldItem(item.id, item.type);
        return;
      }
      // Pick up first item from a surface with items (counter, service bar)
      if (appliance.hasAnyItem()) {
        // Find the first occupied slot
        const slots = appliance.state.slots;
        for (let i = 0; i < slots.length; i++) {
          if (slots[i] !== null) {
            const existingItem = this._items.get(slots[i]!);
            if (existingItem) {
              existingItem.pickUp(bartender.id!);
              appliance.setSlot(i, null);
              bartender.setHeldItem(existingItem.id, existingItem.type);
              return;
            }
          }
        }
      }
      return;
    }

    // Holding an item — put down on surfaces
    // Return to source: any glass → glass shelf, card → card holder
    if (GLASS_TYPES.has(heldItem.type) && appType === EApplianceType.GLASS_SHELF) {
      this._items.delete(heldItem.id);
      bartender.setHeldItem(null, null);
      return;
    }
    if (heldItem.type === EItemType.CUT_OFF_CARD && appType === EApplianceType.CARD_HOLDER) {
      this._items.delete(heldItem.id);
      bartender.setHeldItem(null, null);
      return;
    }

    // Put down on any surface with open slots (counter, service bar, bar queue)
    if (
      (appType === EApplianceType.COUNTER || appType === EApplianceType.SERVICE_BAR || appType === EApplianceType.BAR_QUEUE) &&
      appliance.hasOpenSlot()
    ) {
      const slot = appliance.getFirstOpenSlotIndex();
      heldItem.placeOnAppliance(appliance.id, slot);
      appliance.setSlot(slot, heldItem.id);
      bartender.setHeldItem(null, null);
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

      // Check pending wash completion
      const wash = this._pendingWash.get(bartender.number);
      if (wash) {
        if (wasInteracting && !bartender.isInteracting) {
          // Wash completed — consume the item
          this._items.delete(wash.itemId);
          bartender.setHeldItem(null, null);
          this._pendingWash.delete(bartender.number);
        } else if (bartender.isMoving) {
          // Bartender moved — cancel wash
          this._pendingWash.delete(bartender.number);
        }
      }
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

    // Slip detection: leaving guests walking through mess tiles while drunk
    for (const guest of this._guests.values()) {
      if (guest.status !== EGuestStatus.LEAVING) continue;
      if (!guest.isMoving) continue;
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

      // Chance to create mess based on drunkenness + traits
      if (!guest.hasTrait(EGuestTrait.CLEANLY)) {
        let messChance = GameSettings.messChanceBase + guest.drunkenness * GameSettings.messChanceDrunkBonus;
        if (guest.hasTrait(EGuestTrait.MESSY)) messChance *= GameSettings.messyMessMultiplier;
        if (Random.range(0, 1) < messChance) {
          this._messes.add(`${guest.gridX},${guest.gridY}`);
        }
      }
    }

    // Remove departed guests + reputation tracking
    for (const id of toRemove) {
      const guest = this._guests.get(id);
      if (guest) {
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
}
