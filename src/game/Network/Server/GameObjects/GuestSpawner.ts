import GameSettings from "../../../Shared/GameSettings";
import { Random } from "../../../Utils/Random";
import type { Engine } from "../Engine";
import { Guest } from "./Guest";

export class GuestSpawner {
  private _engine: Engine;
  private _timeSinceLastSpawn: number = 0;
  private _enabled: boolean = false;

  constructor(engine: Engine) {
    this._engine = engine;
  }

  get enabled() {
    return this._enabled;
  }
  set enabled(val: boolean) {
    this._enabled = val;
    if (val) this._timeSinceLastSpawn = GameSettings.guestSpawnInterval * 0.5; // spawn quickly on start
  }

  tick(dt: number) {
    if (!this._enabled) return;

    this._timeSinceLastSpawn += dt;
    if (this._timeSinceLastSpawn >= GameSettings.guestSpawnInterval) {
      this._timeSinceLastSpawn = 0;
      this._spawnParty();
    }
  }

  private _spawnParty() {
    if (this._engine.guests.size >= GameSettings.maxConcurrentGuests) return;

    const partySize = Random.rangeInt(1, GameSettings.maxPartySize);
    const partyId = Random.uuid();
    const entrance = this._engine.layout.guestEntrance;

    for (let i = 0; i < partySize; i++) {
      if (this._engine.guests.size >= GameSettings.maxConcurrentGuests) break;
      // Check if there's an available seat
      const seat = this._engine.findAvailableSeat();
      if (!seat) break; // no more seats

      const guest = new Guest(partyId, entrance.x, entrance.y);
      guest.setSeat(seat.applianceId, seat.seatIndex);

      // Reserve the seat
      const appliance = this._engine.appliances.get(seat.applianceId);
      if (appliance) {
        appliance.seatGuest(seat.seatIndex, guest.id);
      }

      // Pathfind to near the seat appliance
      const path = this._engine.pathfindGuestToSeat(guest, seat.applianceId);
      guest.setPath(path);

      this._engine.addGuest(guest);
    }
  }
}
