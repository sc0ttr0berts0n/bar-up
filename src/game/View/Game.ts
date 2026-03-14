import { Application, Container, Graphics, Text, Ticker } from "pixi.js";
import Singleton from "../Utils/Singleton";
import { World } from "../Utils/World";
import Communicator, {
  EHost,
  type UUID,
} from "../Network/Communicator/Communicator";
import {
  type INetworkPacketClientMove,
  type INetworkPacketClientStop,
  type INetworkPacketClientInteract,
  type INetworkPacketClientGrab,
  type INetworkPacketClientSelect,
  type INetworkPacketClientEditPickUp,
  type INetworkPacketClientEditPlace,
  type INetworkPacketClientEditExit,
  type INetworkPacketClientEditCancel,
  type INetworkPacketClientUpgradePurchase,
  PACKET_TYPE,
  EEngineEventType,
} from "../Network/Communicator/PacketTypes";
import type { IPlayerStateData } from "../Shared/PlayerTypes";
import type { IGuestStateData } from "../Shared/GuestTypes";
import { EApplianceType, type IApplianceStateData } from "../Shared/ApplianceTypes";
import { EDirection } from "../Shared/TileTypes";
import { APPLIANCE_VARIANTS, GRAB_VARIANTS } from "../Shared/DrinkRecipes";
import GameSettings from "../Shared/GameSettings";
import { lerp } from "../Utils/Lerp";
import { Level } from "./Level";
import { BartenderView } from "./Player/BartenderView";
import { GuestView } from "./GuestView";
import { store } from "../../store/global";
import { UPGRADE_CONFIGS } from "../Shared/UpgradeTypes";

type HostOrJoinResolver =
  | (({ choice, peerID }: { choice: EHost; peerID?: UUID }) => void)
  | null;

class Game extends Singleton<Game>() {
  public static app: Application | undefined;
  public canvas: HTMLCanvasElement | undefined;
  private _players = new Map<
    UUID,
    { packet: IPlayerStateData | null; entity: BartenderView }
  >();
  private _guests = new Map<
    string,
    { packet: IGuestStateData | null; entity: GuestView }
  >();
  private _seenEventIds = new Set<number>();
  private _keysDown = new Set<string>();

  public level: Level | null = null;
  public hostOrJoinResolver: HostOrJoinResolver | null = null;

  constructor() {
    super();
  }

  async init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    Game.app = new Application();
    await Game.app.init({
      canvas,
      resizeTo: window,
      antialias: true,
      backgroundColor: 0x1a1a2e,
    });
    (globalThis as any).__PIXI_APP__ = Game.app;
    canvas.classList.add("init");

    this._create();
    this._setupFocusHandling();

    const choice = await new Promise((resolve: HostOrJoinResolver) => {
      this.hostOrJoinResolver = resolve;
    });
    Communicator.connect(choice);
    store.visible.hud = true;
    store.visible.joinBar = true;
    store.visible.recipeGuide = true;

    Game.app.ticker.add((delta) => {
      this.update(delta);
    });
  }

  public focusCanvas() {
    this.canvas?.focus();
  }

  private _setupFocusHandling() {
    document.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "escape") {
        this.focusCanvas();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    });
  }

  private _create() {
    const backing = new Graphics()
      .rect(0, 0, World.width, World.height)
      .fill(0x1a1a2e);

    this.level = new Level();

    Game.app?.stage.addChild(backing);
    Game.app?.stage.addChild(this.level);

    // Keyboard input
    document.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      if (document.activeElement && document.activeElement !== document.body && document.activeElement !== this.canvas) return;

      const key = e.key.toLowerCase();

      // Sub-menu input takes priority
      if (store.submenu.visible) {
        this._handleSubMenuKey(key);
        return;
      }

      this._keysDown.add(key);

      // Upgrade panel input takes priority
      if (store.upgradePanel.visible) {
        this._handleUpgradePanelKey(key);
        return;
      }

      // Edit mode input takes priority over normal gameplay
      if (store.editMode.active) {
        this._handleEditModeKey(key);
        return;
      }

      switch (key) {
        case "w":
        case "arrowup":
          this._sendMove(EDirection.UP);
          break;
        case "s":
        case "arrowdown":
          this._sendMove(EDirection.DOWN);
          break;
        case "a":
        case "arrowleft":
          this._sendMove(EDirection.LEFT);
          break;
        case "d":
        case "arrowright":
          this._sendMove(EDirection.RIGHT);
          break;
        case "e":
          if (this._tryOpenGrabSubMenu()) break;
          Communicator.sendToServer<INetworkPacketClientGrab>({
            uuid: Communicator.uuid,
            type: PACKET_TYPE.CLIENT_GRAB,
          });
          break;
        case " ":
          if (this._tryOpenSubMenu()) break;
          Communicator.sendToServer<INetworkPacketClientInteract>({
            uuid: Communicator.uuid,
            type: PACKET_TYPE.CLIENT_INTERACT,
          });
          break;
      }
    });

    document.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      this._keysDown.delete(key);

      const movementKeys = ["w", "arrowup", "s", "arrowdown", "a", "arrowleft", "d", "arrowright"];
      if (movementKeys.includes(key)) {
        // Always send STOP first to ensure server halts
        Communicator.sendToServer<INetworkPacketClientStop>({
          uuid: Communicator.uuid,
          type: PACKET_TYPE.CLIENT_STOP,
        });
        // If another movement key is still held, re-send its direction
        for (const held of this._keysDown) {
          const dir = this._directionForKey(held);
          if (dir !== null) {
            this._sendMove(dir);
            break;
          }
        }
      }
    });
  }

  private _directionForKey(k: string): EDirection | null {
    switch (k) {
      case "w": case "arrowup": return EDirection.UP;
      case "s": case "arrowdown": return EDirection.DOWN;
      case "a": case "arrowleft": return EDirection.LEFT;
      case "d": case "arrowright": return EDirection.RIGHT;
      default: return null;
    }
  }

  private _sendMove(direction: EDirection) {
    Communicator.sendToServer<INetworkPacketClientMove>({
      uuid: Communicator.uuid,
      type: PACKET_TYPE.CLIENT_MOVE,
      data: { direction },
    });
  }

  /** Store the local player's screen position for sub-menu placement */
  private _updateSubmenuScreenPos(player: IPlayerStateData) {
    if (!this.level) return;
    const ts = GameSettings.tileSize;
    const wx = lerp(player.gridX, player.targetX, player.moveProgress) * ts + ts / 2;
    const wy = lerp(player.gridY, player.targetY, player.moveProgress) * ts + ts / 2;
    const screen = this.level.worldToScreen(wx, wy);
    store.submenu.screenX = screen.x;
    store.submenu.screenY = screen.y;
  }

  /** Check if facing a variant appliance with the right held item, and open the craft sub-menu */
  private _tryOpenSubMenu(): boolean {
    const data = Communicator.state?.data;
    if (!data) return false;
    const player = data.players.find((p) => p.id === Communicator.uuid);
    if (!player || player.moveProgress < 1 || !player.heldItemType) return false;

    const appliance = this._findNearbyAppliance(player, data.appliances, APPLIANCE_VARIANTS);
    if (!appliance) return false;

    const config = APPLIANCE_VARIANTS[appliance.type as EApplianceType];
    if (!config) return false;
    if (!config.requiredItems.includes(player.heldItemType as any)) return false;

    this._updateSubmenuScreenPos(player);
    store.submenu.options = config.variants.map((v) => ({
      label: v.label,
      color: v.color,
    }));
    store.submenu.selectedIndex = 0;
    store.submenu.visible = true;
    return true;
  }

  /** Check if facing a grab appliance while empty-handed, and open the grab sub-menu */
  private _tryOpenGrabSubMenu(): boolean {
    const data = Communicator.state?.data;
    if (!data) return false;
    const player = data.players.find((p) => p.id === Communicator.uuid);
    if (!player || player.moveProgress < 1 || player.heldItemType) return false;

    const appliance = this._findNearbyAppliance(player, data.appliances, GRAB_VARIANTS);
    if (!appliance) return false;

    const config = GRAB_VARIANTS[appliance.type as EApplianceType];
    if (!config) return false;

    this._updateSubmenuScreenPos(player);
    store.submenu.options = config.variants.map((v) => ({
      label: v.label,
      color: v.color,
    }));
    store.submenu.selectedIndex = 0;
    store.submenu.visible = true;
    return true;
  }

  /** Find an appliance on facing or standing tile that exists in the given config map */
  private _findNearbyAppliance(
    player: IPlayerStateData,
    appliances: IApplianceStateData[],
    configMap: Partial<Record<string, unknown>>,
  ): IApplianceStateData | undefined {
    let fx = player.gridX;
    let fy = player.gridY;
    switch (player.facing) {
      case EDirection.UP: fy--; break;
      case EDirection.DOWN: fy++; break;
      case EDirection.LEFT: fx--; break;
      case EDirection.RIGHT: fx++; break;
    }
    let app = appliances.find(
      (a) => a.gridX === fx && a.gridY === fy && configMap[a.type],
    );
    if (!app) {
      app = appliances.find(
        (a) => a.gridX === player.gridX && a.gridY === player.gridY && configMap[a.type],
      );
    }
    return app;
  }

  private _handleSubMenuKey(key: string) {
    const opts = store.submenu.options;
    switch (key) {
      case "arrowup":
      case "w":
      case "arrowleft":
      case "a":
        store.submenu.selectedIndex = Math.max(0, store.submenu.selectedIndex - 1);
        break;
      case "arrowdown":
      case "s":
      case "arrowright":
      case "d":
        store.submenu.selectedIndex = Math.min(opts.length - 1, store.submenu.selectedIndex + 1);
        break;
      case "1": case "2": case "3": case "4": {
        const idx = parseInt(key) - 1;
        if (idx < opts.length) this._selectSubMenuOption(idx);
        break;
      }
      case "enter":
      case " ":
      case "e":
        this._selectSubMenuOption(store.submenu.selectedIndex);
        break;
      case "escape":
        store.submenu.visible = false;
        break;
    }
  }

  private _selectSubMenuOption(index: number) {
    Communicator.sendToServer<INetworkPacketClientSelect>({
      uuid: Communicator.uuid,
      type: PACKET_TYPE.CLIENT_SELECT,
      data: { variantIndex: index },
    });
    store.submenu.visible = false;
  }

  // ── Edit mode input ──────────────────────────────────────────

  private _handleEditModeKey(key: string) {
    // Movement still works in edit mode (WASD/arrows)
    switch (key) {
      case "w":
      case "arrowup":
        this._sendMove(EDirection.UP);
        return;
      case "s":
      case "arrowdown":
        this._sendMove(EDirection.DOWN);
        return;
      case "a":
      case "arrowleft":
        this._sendMove(EDirection.LEFT);
        return;
      case "d":
      case "arrowright":
        this._sendMove(EDirection.RIGHT);
        return;
    }

    const data = Communicator.state?.data;
    if (!data?.editMode) return;
    const localPlayer = data.players.find((p) => p.id === Communicator.uuid);
    if (!localPlayer) return;

    const holding = data.editMode.heldApplianceId !== null && data.editMode.heldByUuid === Communicator.uuid;

    switch (key) {
      case "e":
      case " ":
        if (holding) {
          // Place held appliance at facing tile
          let fx = localPlayer.gridX;
          let fy = localPlayer.gridY;
          switch (localPlayer.facing) {
            case EDirection.UP: fy--; break;
            case EDirection.DOWN: fy++; break;
            case EDirection.LEFT: fx--; break;
            case EDirection.RIGHT: fx++; break;
          }
          Communicator.sendToServer<INetworkPacketClientEditPlace>({
            uuid: Communicator.uuid,
            type: PACKET_TYPE.CLIENT_EDIT_PLACE,
            data: { gridX: fx, gridY: fy },
          });
        } else {
          // Pick up appliance at facing tile
          const facingApp = this._findFacingAppliance(localPlayer, data.appliances);
          if (facingApp) {
            Communicator.sendToServer<INetworkPacketClientEditPickUp>({
              uuid: Communicator.uuid,
              type: PACKET_TYPE.CLIENT_EDIT_PICK_UP,
              data: { applianceId: facingApp.id },
            });
          }
        }
        break;
      case "escape":
        if (holding) {
          // Cancel current hold (return to original position)
          Communicator.sendToServer<INetworkPacketClientEditCancel>({
            uuid: Communicator.uuid,
            type: PACKET_TYPE.CLIENT_EDIT_CANCEL,
          });
        } else {
          // Exit edit mode without saving (rollback)
          Communicator.sendToServer<INetworkPacketClientEditExit>({
            uuid: Communicator.uuid,
            type: PACKET_TYPE.CLIENT_EDIT_EXIT,
            data: { commit: false },
          });
        }
        break;
      case "enter":
        // Commit and exit edit mode
        Communicator.sendToServer<INetworkPacketClientEditExit>({
          uuid: Communicator.uuid,
          type: PACKET_TYPE.CLIENT_EDIT_EXIT,
          data: { commit: true },
        });
        break;
    }
  }

  private _handleUpgradePanelKey(key: string) {
    // Count available upgrades (those not yet maxed)
    const available = UPGRADE_CONFIGS.filter(c => {
      const level = store.upgrades.levels[c.id] ?? 0;
      return level < c.maxLevel;
    });
    const maxIndex = available.length - 1;

    switch (key) {
      case "w":
      case "arrowup":
        store.upgradePanel.selectedIndex = Math.max(0, store.upgradePanel.selectedIndex - 1);
        break;
      case "s":
      case "arrowdown":
        store.upgradePanel.selectedIndex = Math.min(maxIndex, store.upgradePanel.selectedIndex + 1);
        break;
      case " ":
      case "enter": {
        const selected = available[store.upgradePanel.selectedIndex];
        if (selected) {
          Communicator.sendToServer<INetworkPacketClientUpgradePurchase>({
            uuid: Communicator.uuid,
            type: PACKET_TYPE.CLIENT_UPGRADE_PURCHASE,
            data: { upgradeId: selected.id },
          });
        }
        break;
      }
      case "escape":
        store.upgradePanel.visible = false;
        break;
      case "1":
      case "2":
      case "3": {
        const idx = parseInt(key) - 1;
        if (idx <= maxIndex) {
          store.upgradePanel.selectedIndex = idx;
          const selected = available[idx];
          if (selected) {
            Communicator.sendToServer<INetworkPacketClientUpgradePurchase>({
              uuid: Communicator.uuid,
              type: PACKET_TYPE.CLIENT_UPGRADE_PURCHASE,
              data: { upgradeId: selected.id },
            });
          }
        }
        break;
      }
    }
  }

  /** Find the appliance on the facing tile (for edit mode pick-up). */
  private _findFacingAppliance(
    player: IPlayerStateData,
    appliances: IApplianceStateData[],
  ): IApplianceStateData | undefined {
    let fx = player.gridX;
    let fy = player.gridY;
    switch (player.facing) {
      case EDirection.UP: fy--; break;
      case EDirection.DOWN: fy++; break;
      case EDirection.LEFT: fx--; break;
      case EDirection.RIGHT: fx++; break;
    }
    // Check if any appliance occupies the facing tile (including multi-tile appliances)
    return appliances.find((a) =>
      fx >= a.gridX && fx < a.gridX + a.sizeX &&
      fy >= a.gridY && fy < a.gridY + a.sizeY,
    );
  }

  update(delta: Ticker) {
    this._syncState();

    // Continuously re-send move direction while key is held (resets server timeout)
    if (this._keysDown.size > 0 && !store.submenu.visible) {
      for (const held of this._keysDown) {
        const dir = this._directionForKey(held);
        if (dir !== null) {
          this._sendMove(dir);
          break;
        }
      }
    }

    for (const [_uuid, player] of this._players) {
      if (!player.packet) continue;
      player.entity.update(delta, player.packet);
    }

    for (const [_id, guest] of this._guests) {
      if (!guest.packet) continue;
      guest.entity.update(delta, guest.packet);
    }

    this.level?.update(delta);
  }

  private _syncState() {
    if (!Communicator.state?.data) return;
    const data = Communicator.state.data;

    // Update store for HUD
    store.money = data.money;
    store.reputation = data.reputation;
    store.policeAttention = data.policeAttention;
    store.menuConfig = data.menuConfig;
    store.appliances = data.appliances;
    store.shiftPhase = data.shiftPhase as "prep" | "service" | "closing";
    store.shiftTimer = data.shiftTimer;
    store.isLastCall = data.isLastCall;
    store.isOvertime = data.isOvertime;

    // Sync edit mode state
    if (data.editMode) {
      store.editMode.active = data.editMode.active;
      store.editMode.heldType = data.editMode.heldApplianceType;
      store.editMode.placementValid = data.editMode.placementValid;

      // Ghost preview rendering
      if (data.editMode.heldApplianceId && data.editMode.heldApplianceType) {
        this.level?.showGhostPreview(
          data.editMode.heldApplianceType,
          data.editMode.previewX,
          data.editMode.previewY,
          data.editMode.placementValid,
        );
      } else {
        this.level?.showGhostPreview(null, 0, 0, false);
      }
    } else if (store.editMode.active) {
      // Edit mode was deactivated
      store.editMode.active = false;
      store.editMode.heldType = null;
      store.editMode.placementValid = false;
      this.level?.showGhostPreview(null, 0, 0, false);
    }

    // Sync upgrade state
    store.upgrades = data.upgrades;

    // Auto-hide upgrade panel when leaving prep
    if (store.upgradePanel.visible && data.shiftPhase !== "prep") {
      store.upgradePanel.visible = false;
    }

    // Lights brighten during last call and closing
    const lightsUp = (data.isLastCall && data.shiftPhase === "service") || data.shiftPhase === "closing";
    this.level?.setLightLevel(lightsUp);

    // Process events → toasts
    for (const event of data.events) {
      if (this._seenEventIds.has(event.spawnId)) continue;
      this._seenEventIds.add(event.spawnId);
      const toast = this._eventToToast(event.type, event.data);
      if (toast) {
        store.toasts.push({ id: ++store.toastCounter, ...toast, timer: 3 });
        // Critical events also get a center-screen flash
        if (this._isCriticalEvent(event.type)) {
          store.centerFlash = { id: store.toastCounter, ...toast, timer: 1.5 };
        }
      }
    }
    // Age toasts
    const dt = 1 / 20; // update rate
    store.toasts = store.toasts.filter((t) => { t.timer -= dt; return t.timer > 0; });
    // Age center flash
    if (store.centerFlash) {
      store.centerFlash.timer -= dt;
      if (store.centerFlash.timer <= 0) store.centerFlash = null;
    }

    // Find local player's held item and facing guest for HUD display
    const localPlayer = data.players.find((p) => p.id === Communicator.uuid);
    store.heldItemType = localPlayer?.heldItemType ?? null;

    // Detect which guest the local player is facing (for guest card HUD)
    store.facingGuest = null;
    if (localPlayer && localPlayer.moveProgress >= 1) {
      let fx = localPlayer.gridX;
      let fy = localPlayer.gridY;
      switch (localPlayer.facing) {
        case EDirection.UP: fy--; break;
        case EDirection.DOWN: fy++; break;
        case EDirection.LEFT: fx--; break;
        case EDirection.RIGHT: fx++; break;
      }
      // Check if any guest is at the facing tile or seated at an appliance on that tile
      for (const guestData of data.guests) {
        if (guestData.gridX === fx && guestData.gridY === fy) {
          store.facingGuest = guestData;
          break;
        }
        // Check if guest is seated at an appliance occupying the facing tile
        if (guestData.seatApplianceId) {
          const appliance = data.appliances.find((a) => a.id === guestData.seatApplianceId);
          if (appliance && appliance.gridX === fx && appliance.gridY === fy) {
            store.facingGuest = guestData;
            break;
          }
        }
      }
      // Also check for queued guests at bar queue (one tile south of facing)
      if (!store.facingGuest) {
        const facingAppliance = data.appliances.find((a) =>
          a.type === EApplianceType.BAR_QUEUE &&
          fx >= a.gridX && fx < a.gridX + a.sizeX &&
          fy === a.gridY
        );
        if (facingAppliance) {
          for (const guestData of data.guests) {
            if (guestData.gridX === fx && guestData.gridY === fy + 1) {
              if (guestData.status === "queued" || guestData.status === "waiting_for_order") {
                store.facingGuest = guestData;
                break;
              }
            }
          }
        }
      }
    }

    // Sync players
    const activePlayerIds = new Set<string>();
    for (const playerData of data.players) {
      if (!playerData.id) continue;
      activePlayerIds.add(playerData.id);

      if (this._players.has(playerData.id)) {
        this._players.get(playerData.id)!.packet = playerData;
      } else {
        const entity = new BartenderView(playerData.color);
        this.level?.entityContainer.addChild(entity);
        this._players.set(playerData.id, { packet: playerData, entity });
      }
    }

    // Remove departed players
    for (const [id, player] of this._players) {
      if (!activePlayerIds.has(id)) {
        player.entity.destroy();
        this._players.delete(id);
      }
    }

    // Sync guests
    const activeGuestIds = new Set<string>();
    for (const guestData of data.guests) {
      activeGuestIds.add(guestData.id);

      if (this._guests.has(guestData.id)) {
        this._guests.get(guestData.id)!.packet = guestData;
      } else {
        const entity = new GuestView();
        this.level?.entityContainer.addChild(entity);
        this._guests.set(guestData.id, { packet: guestData, entity });
      }
    }

    // Remove departed guests
    for (const [id, guest] of this._guests) {
      if (!activeGuestIds.has(id)) {
        guest.entity.destroy();
        this._guests.delete(id);
      }
    }
  }

  private _eventToToast(type: number, data: Record<string, unknown>): { message: string; color: string } | null {
    switch (type) {
      case EEngineEventType.MONEY_EARNED:
        return { message: `+$${data.amount}`, color: "#ffd93d" };
      case EEngineEventType.TIP_EARNED:
        return { message: `+$${data.amount} tip`, color: "#44cc44" };
      case EEngineEventType.GUEST_OVERSERVED:
        this.level?.triggerOverserveFlash();
        return { message: "Overserved!", color: "#ff4444" };
      case EEngineEventType.POLICE_WARNING:
        return { message: "Police are watching!", color: "#ff8800" };
      case EEngineEventType.POLICE_RAID:
        return { message: `POLICE RAID! -$${data.penalty ?? 200}`, color: "#ff0000" };
      case EEngineEventType.BAR_FIGHT_STARTED:
        return { message: "Bar fight!", color: "#ff6600" };
      case EEngineEventType.BAR_FIGHT_RESOLVED:
        return { message: "Fight resolved", color: "#44aa44" };
      case EEngineEventType.GUEST_SLIPPED:
        return { message: "Guest slipped!", color: "#ffaa00" };
      case EEngineEventType.GUEST_HELPED_UP:
        return { message: "Helped up", color: "#44aa44" };
      case EEngineEventType.LAST_CALL:
        return { message: "LAST CALL!", color: "#ffd93d" };
      case EEngineEventType.EXPENSE_DEDUCTED:
        return { message: `-$${data.amount} expenses`, color: "#ff6b6b" };
      case EEngineEventType.SHIFT_CHANGE:
        return { message: `${(data.phase as string).toUpperCase()} phase`, color: "#4ecdc4" };
      case EEngineEventType.SHIFT_SUMMARY:
        // Populate shift summary in store
        store.shiftSummary = {
          visible: true,
          guestsServed: (data.guestsServed as number) ?? 0,
          guestsTotal: (data.guestsTotal as number) ?? 0,
          moneyEarned: (data.moneyEarned as number) ?? 0,
          tipsEarned: (data.tipsEarned as number) ?? 0,
          reputationChange: (data.reputationChange as number) ?? 0,
          fights: (data.fights as number) ?? 0,
          slips: (data.slips as number) ?? 0,
          overserves: (data.overserves as number) ?? 0,
          policeRaids: (data.policeRaids as number) ?? 0,
          restockCost: (data.restockCost as number) ?? 0,
          breakageCost: (data.breakageCost as number) ?? 0,
          wasteCost: (data.wasteCost as number) ?? 0,
          totalExpenses: (data.totalExpenses as number) ?? 0,
        };
        return null; // handled by ShiftSummary.vue
      default:
        return null;
    }
  }

  private _isCriticalEvent(type: number): boolean {
    return type === EEngineEventType.GUEST_OVERSERVED
      || type === EEngineEventType.POLICE_WARNING
      || type === EEngineEventType.POLICE_RAID
      || type === EEngineEventType.BAR_FIGHT_STARTED
      || type === EEngineEventType.GUEST_SLIPPED
      || type === EEngineEventType.LAST_CALL
      || type === EEngineEventType.SHIFT_CHANGE;
  }

  public get playerSlots(): (IPlayerStateData | undefined)[] {
    const arr: (IPlayerStateData | undefined)[] = Array.from({ length: Communicator.playerSlots }, () => undefined);
    this._players.forEach((player) => {
      if (player.packet && typeof player.packet.number === "number") {
        arr[player.packet.number] = player.packet;
      }
    });
    return arr;
  }
}

export default Game.getInstance();
