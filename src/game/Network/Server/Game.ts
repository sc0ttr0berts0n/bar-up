import Communicator, { type UUID } from "../Communicator/Communicator";
import { Engine } from "./Engine";
import { GameLoop } from "./GameLoop";
import { Player } from "./Models/Player";
import { PACKET_TYPE } from "../Communicator/PacketTypes";
import config from "./server.settings";
import GameSettings from "../../Shared/GameSettings";
import type { IPlayerStateData } from "../../Shared/PlayerTypes";
import type { IGuestStateData } from "../../Shared/GuestTypes";
import type { IApplianceStateData } from "../../Shared/ApplianceTypes";
import type { IItemStateData } from "../../Shared/ItemTypes";

export class Game {
  private _updateInterval: number | undefined;
  private _players = new Map<UUID, Player>();
  private _spectators = new Set<UUID>();
  private _gameLoop: GameLoop;
  public engine: Engine;

  constructor() {
    this._gameLoop = new GameLoop(this);
    this.engine = new Engine(this);
    this.start();
  }

  get spectators() {
    return this._spectators;
  }

  get players() {
    return this._players;
  }

  get GameLoop() {
    return this._gameLoop;
  }

  private _startUpdateLoop() {
    this._updateInterval = window.setInterval(() => {
      const players: IPlayerStateData[] = this.engine.bartenders
        .filter((b) => b.id !== null)
        .map((b) => b.state);

      const guests: IGuestStateData[] = [...this.engine.guests.values()].map(
        (g) => g.state,
      );

      const appliances: IApplianceStateData[] = [
        ...this.engine.appliances.values(),
      ].map((a) => a.state);

      const items: IItemStateData[] = [...this.engine.items.values()].map(
        (i) => i.state,
      );

      Communicator.emit({
        type: PACKET_TYPE.SERVER_UPDATE,
        data: {
          players,
          guests,
          appliances,
          items,
          events: this.engine.events,
          money: this.engine.money,
          shiftPhase: this.engine.shiftManager.phase,
          shiftTimer: this.engine.shiftManager.isOvertime
            ? this.engine.shiftManager.overtimeTimer
            : this.engine.shiftManager.remainingTime,
          messes: this.engine.messes,
          reputation: this.engine.reputation,
          menuConfig: this.engine.menuConfig,
          policeAttention: this.engine.policeAttention,
          isLastCall: this.engine.shiftManager.lastCallTriggered,
          isOvertime: this.engine.shiftManager.isOvertime,
        },
      });

      // Decrement TTL and drop expired events
      this.engine.events = this.engine.events
        .map((e) => ({ ...e, ttl: (e.ttl ?? 1) - 1 }))
        .filter((e) => e.ttl > 0);
    }, 1000 / config.updateRate);
  }

  start() {
    this._gameLoop.startLoop();
    this._startUpdateLoop();
  }

  stop() {
    this._gameLoop.stopLoop();
    if (this._updateInterval) {
      window.clearInterval(this._updateInterval);
    }
  }

  joinAsPlayer(uuid: UUID, bartenderNumber: number) {
    this.engine.assignPlayerBartender(uuid, bartenderNumber);
    this._players.set(uuid, new Player(uuid, bartenderNumber));
    this.leaveAsSpectator(uuid);

    // Bonus starting money for 2nd+ player
    if (this._players.size > 1) {
      this.engine.addMoney(GameSettings.moneyPerExtraPlayer);
    }
  }

  leaveAsPlayerByUUID(uuid: UUID) {
    const leaver = this._players.get(uuid);
    if (leaver) {
      this.engine.unassignPlayerBartender(leaver.bartenderNumber);
      this._players.delete(uuid);
    }
  }

  joinAsSpectator(uuid: UUID) {
    this._spectators.add(uuid);
  }

  leaveAsSpectator(uuid: UUID): boolean {
    return this._spectators.delete(uuid);
  }

  isSpectator(uuid: UUID) {
    return this._spectators.has(uuid);
  }
}
