import GameSettings from "../../../Shared/GameSettings";
import { EGuestStatus, EGuestTrait, TRAIT_CONFLICTS } from "../../../Shared/GuestTypes";
import { Random } from "../../../Utils/Random";
import type { Engine } from "../Engine";
import { Guest } from "./Guest";

const ALL_TRAITS = Object.values(EGuestTrait);

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

  /** Guest scale multiplier based on active player count */
  private _getPlayerScale(): number {
    const scales = GameSettings.playerCountGuestScale;
    const idx = Math.min(this._engine.activePlayerCount, scales.length) - 1;
    return scales[idx] ?? 1;
  }

  tick(dt: number) {
    if (!this._enabled) return;
    if (this._engine.isRaided) return; // No spawning during police raid

    this._timeSinceLastSpawn += dt;
    // Player count scales spawn frequency (more players = shorter interval)
    const playerScale = this._getPlayerScale();
    // Reputation adjusts spawn interval: higher rep = faster spawns
    const repFactor = Math.max(0.3, 1 - this._engine.reputation * 0.01);
    const adjustedInterval = GameSettings.guestSpawnInterval * repFactor / playerScale;
    if (this._timeSinceLastSpawn >= adjustedInterval) {
      this._timeSinceLastSpawn = 0;
      this._spawnParty();
    }
  }

  private _spawnParty() {
    const guestCap = Math.floor(GameSettings.maxConcurrentGuests * this._getPlayerScale());
    if (this._engine.guests.size >= guestCap) return;

    const partySize = this._rollPartySize();
    // Don't spawn if party would exceed cap
    if (this._engine.guests.size + partySize > guestCap) return;

    const partyId = Random.uuid();
    const entrance = this._engine.layout.guestEntrance;

    // Try to find group seating for the whole party
    const seats = this._engine.findGroupSeating(partySize);

    // Create all guests
    const guests: Guest[] = [];
    for (let i = 0; i < partySize; i++) {
      const guest = new Guest(partyId, entrance.x, entrance.y);
      guest.setTraits(this._rollTraits());
      guests.push(guest);
    }

    if (seats) {
      // Assign each guest to their seat
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i];
        const seat = seats[i];
        const appliance = this._engine.appliances.get(seat.applianceId);
        guest.setSeat(seat.applianceId, seat.seatIndex, appliance?.gridX ?? 0, appliance?.gridY ?? 0);
        if (appliance) {
          appliance.seatGuest(seat.seatIndex, guest.id);
        }
        const path = this._engine.pathfindGuestToSeat(guest, seat.applianceId, seat.seatIndex);
        guest.setPath(path);
      }
    } else {
      // No group seating available — all wait at door
      for (const guest of guests) {
        guest.setStatus(EGuestStatus.WAITING_AT_DOOR);
      }
    }

    for (const guest of guests) {
      this._engine.addGuest(guest);
    }
  }

  /** Weighted random party size using partySizeWeights */
  private _rollPartySize(): number {
    const weights = GameSettings.partySizeWeights;
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = Random.range(0, total);
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return i + 1;
    }
    return 1;
  }

  private _rollTraits(): EGuestTrait[] {
    const roll = Random.range(0, 1);
    const count = roll < 0.4 ? 0 : roll < 0.8 ? 1 : 2;
    if (count === 0) return [];

    const traits: EGuestTrait[] = [];
    const pool = [...ALL_TRAITS];
    for (let i = 0; i < count; i++) {
      if (pool.length === 0) break;
      const trait = Random.pickOne(pool);
      traits.push(trait);
      // Remove picked trait and any conflicting traits from pool
      const toRemove = new Set<EGuestTrait>([trait]);
      for (const [a, b] of TRAIT_CONFLICTS) {
        if (a === trait) toRemove.add(b);
        if (b === trait) toRemove.add(a);
      }
      for (const r of toRemove) {
        const idx = pool.indexOf(r);
        if (idx >= 0) pool.splice(idx, 1);
      }
    }
    return traits;
  }
}
