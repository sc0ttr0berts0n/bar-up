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
  PACKET_TYPE,
} from "../Network/Communicator/PacketTypes";
import type { IPlayerStateData } from "../Shared/PlayerTypes";
import type { IGuestStateData } from "../Shared/GuestTypes";
import type { IApplianceStateData } from "../Shared/ApplianceTypes";
import { EDirection } from "../Shared/TileTypes";
import GameSettings from "../Shared/GameSettings";
import { Level } from "./Level";
import { BartenderView } from "./Player/BartenderView";
import { GuestView } from "./GuestView";
import { store } from "../../store/global";

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
      if (e.key === "Escape") {
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

      this._keysDown.add(e.key);

      switch (e.key) {
        case "w":
        case "ArrowUp":
          this._sendMove(EDirection.UP);
          break;
        case "s":
        case "ArrowDown":
          this._sendMove(EDirection.DOWN);
          break;
        case "a":
        case "ArrowLeft":
          this._sendMove(EDirection.LEFT);
          break;
        case "d":
        case "ArrowRight":
          this._sendMove(EDirection.RIGHT);
          break;
        case "e":
        case " ":
          Communicator.sendToServer<INetworkPacketClientInteract>({
            uuid: Communicator.uuid,
            type: PACKET_TYPE.CLIENT_INTERACT,
          });
          break;
      }
    });

    document.addEventListener("keyup", (e) => {
      this._keysDown.delete(e.key);

      const movementKeys = ["w", "ArrowUp", "s", "ArrowDown", "a", "ArrowLeft", "d", "ArrowRight"];
      if (movementKeys.includes(e.key)) {
        // Check if any other movement key is still held
        const stillHeld = movementKeys.some((k) => this._keysDown.has(k));
        if (!stillHeld) {
          Communicator.sendToServer<INetworkPacketClientStop>({
            uuid: Communicator.uuid,
            type: PACKET_TYPE.CLIENT_STOP,
          });
        }
      }
    });
  }

  private _sendMove(direction: EDirection) {
    Communicator.sendToServer<INetworkPacketClientMove>({
      uuid: Communicator.uuid,
      type: PACKET_TYPE.CLIENT_MOVE,
      data: { direction },
    });
  }

  update(delta: Ticker) {
    this._syncState();

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
    store.shiftPhase = data.shiftPhase as "prep" | "service" | "closing";
    store.shiftTimer = data.shiftTimer;

    // Find local player's held item for HUD display
    const localPlayer = data.players.find((p) => p.id === Communicator.uuid);
    store.heldItemType = localPlayer?.heldItemType ?? null;

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
