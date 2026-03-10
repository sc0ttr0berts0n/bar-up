import { DEFAULT_BAR_LAYOUT, type IBarLayout } from "../../Shared/BarLayout";
import { EApplianceType } from "../../Shared/ApplianceTypes";
import { EItemType } from "../../Shared/ItemTypes";
import { EDirection } from "../../Shared/TileTypes";
import { RECIPES, getMenuDrinkKeys } from "../../Shared/DrinkRecipes";
import { EGuestStatus } from "../../Shared/GuestTypes";
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
  private _events: IEngineEvent[] = [];
  private _eventCounter: number = 0;

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

    // Create bartender slots
    for (let i = 0; i < GameSettings.maxPlayers; i++) {
      const spawn = this._layout.playerSpawns[i];
      this._bartenders.push(new Bartender(i, spawn.x, spawn.y));
    }

    // Set up spawner and shift manager
    this._guestSpawner = new GuestSpawner(this);
    this._shiftManager = new ShiftManager();
    this._shiftManager.onPhaseChange = (phase) => {
      this._guestSpawner.enabled = phase === "service";
      this._pushEvent(EEngineEventType.SHIFT_CHANGE, { phase });
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
  get money() {
    return this._money;
  }
  get shiftManager() {
    return this._shiftManager;
  }
  get events() {
    return this._events;
  }
  set events(val: IEngineEvent[]) {
    this._events = val;
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

  /** Called from ClientPacketHandler when a player presses interact */
  bartenderInteract(uuid: string) {
    const bartender = this.getBartenderById(uuid);
    if (!bartender || bartender.isMoving || bartender.isInteracting) return;

    bartender.startInteract();

    // Determine what we're interacting with
    const facingTile = this._getFacingTile(bartender);
    if (!facingTile) return;

    // Check for guest interaction (take order / serve drink)
    const guest = this._getGuestAtOrNear(facingTile.x, facingTile.y);
    if (guest) {
      this._handleGuestInteraction(bartender, guest);
      return;
    }

    // Check for appliance interaction
    const applianceId = facingTile.applianceId;
    if (applianceId) {
      const appliance = this._appliances.get(applianceId);
      if (appliance) {
        this._handleApplianceInteraction(bartender, appliance);
        return;
      }
    }

    // Also check the tile the bartender is standing on (for counter interactions)
    const standingTile = this._tileGrid.getTile(bartender.gridX, bartender.gridY);
    if (standingTile?.applianceId) {
      const appliance = this._appliances.get(standingTile.applianceId);
      if (appliance) {
        this._handleApplianceInteraction(bartender, appliance);
      }
    }
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
          // Return the first guest at this appliance that needs service
          if (
            guest.status === EGuestStatus.READY_TO_ORDER ||
            guest.status === EGuestStatus.WAITING_FOR_ORDER
          ) {
            return guest;
          }
        }
      }
    }
    return null;
  }

  private _handleGuestInteraction(bartender: Bartender, guest: Guest) {
    if (guest.status === EGuestStatus.READY_TO_ORDER) {
      // Take the order
      const drinkKeys = getMenuDrinkKeys();
      const drinkKey = Random.pickOne(drinkKeys);
      guest.setOrder({ drinkKey });
      guest.setStatus(EGuestStatus.WAITING_FOR_ORDER);
      return;
    }

    if (guest.status === EGuestStatus.WAITING_FOR_ORDER && guest.order) {
      // Try to serve the drink
      const heldItem = bartender.heldItemId
        ? this._items.get(bartender.heldItemId)
        : null;

      if (!heldItem) return;

      // Check if held item matches the order
      const recipe = RECIPES[guest.order.drinkKey];
      if (!recipe) return;

      if (heldItem.type === recipe.resultType) {
        // Serve the drink!
        guest.setStatus(EGuestStatus.DRINKING);
        guest.adjustHappiness(GameSettings.happinessServeBonus);

        // Remove the item from player's hands, turn it into a dirty glass
        // (in real game the guest would hold it; for prototype just delete)
        this._items.delete(heldItem.id);
        bartender.setHeldItem(null, null);

        // Earn money
        this._money += recipe.menuPrice;
        this._pushEvent(EEngineEventType.DRINK_SERVED, {
          guestId: guest.id,
          drinkKey: guest.order.drinkKey,
          money: recipe.menuPrice,
        });
        this._pushEvent(EEngineEventType.MONEY_EARNED, {
          amount: recipe.menuPrice,
          x: guest.gridX,
          y: guest.gridY,
        });

        guest.clearOrder();
      }
    }
  }

  private _handleApplianceInteraction(bartender: Bartender, appliance: Appliance) {
    const heldItem = bartender.heldItemId
      ? this._items.get(bartender.heldItemId) ?? null
      : null;

    const result = DrinkCrafter.resolveInteraction(heldItem, appliance);

    if (result.pickUpNewItem && result.newItemType !== null) {
      // Create new item and give to player
      const item = new Item(result.newItemType);
      item.pickUp(bartender.id!);
      this._items.set(item.id, item);
      bartender.setHeldItem(item.id, item.type);
      this._pushEvent(EEngineEventType.ITEM_PICKED_UP, {
        itemType: result.newItemType,
        playerId: bartender.id,
      });
    } else if (result.newItemType !== null && heldItem) {
      // Transform the held item
      heldItem.setType(result.newItemType);
      bartender.setHeldItem(heldItem.id, heldItem.type);
      this._pushEvent(EEngineEventType.ITEM_CRAFTED, {
        itemType: result.newItemType,
        playerId: bartender.id,
      });
    } else if (result.consumed && heldItem) {
      // Destroy the held item
      this._items.delete(heldItem.id);
      bartender.setHeldItem(null, null);
    }
  }

  /** Find an available seat across all seating appliances */
  findAvailableSeat(): { applianceId: string; seatIndex: number } | null {
    for (const appliance of this._appliances.values()) {
      if (appliance.maxSeats > 0 && appliance.hasOpenSeat()) {
        return {
          applianceId: appliance.id,
          seatIndex: appliance.getFirstOpenSeatIndex(),
        };
      }
    }
    return null;
  }

  /** Pathfind a guest from entrance to near their seat appliance */
  pathfindGuestToSeat(guest: Guest, applianceId: string): Vec2[] {
    const appliance = this._appliances.get(applianceId);
    if (!appliance) return [];

    // Find a walkable tile adjacent to the appliance
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

    // Shift phase
    this._shiftManager.tick(dt);

    // Guest spawning
    this._guestSpawner.tick(dt);

    // Update bartenders
    for (const bartender of this._bartenders) {
      if (bartender.id === null) continue;
      bartender.tick(dt, (x, y) => this._tileGrid.isWalkableForPlayer(x, y));
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
        );
        guest.setLeavePath(path);
      }
    }

    // Update guests
    const toRemove: string[] = [];
    for (const guest of this._guests.values()) {
      const shouldRemove = guest.tick(dt);
      if (shouldRemove) {
        toRemove.push(guest.id);
      }
    }

    // Remove departed guests
    for (const id of toRemove) {
      const guest = this._guests.get(id);
      if (guest?.seatApplianceId) {
        const appliance = this._appliances.get(guest.seatApplianceId);
        appliance?.unseatGuest(guest.id);
      }
      this._guests.delete(id);
      this._pushEvent(EEngineEventType.GUEST_LEFT, { guestId: id });
    }
  }
}
