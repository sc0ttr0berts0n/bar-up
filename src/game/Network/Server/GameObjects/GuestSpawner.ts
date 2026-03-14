import GameSettings from "../../../Shared/GameSettings";
import { EGuestStatus, EGuestTier, type IPersonality, PERSONALITY_DIMENSIONS } from "../../../Shared/GuestTypes";
import { Random } from "../../../Utils/Random";
import type { Engine } from "../Engine";
import { Guest } from "./Guest";
import { PopulationPool, REGULAR_THRESHOLD, type ITownsfolk } from "./PopulationPool";

/** Tier-based personality generation parameters: [mean, stddev] */
const PERSONALITY_TIER_PARAMS: Record<EGuestTier, { mean: number; stddev: number }> = {
  [EGuestTier.LOW]:    { mean: 0.6, stddev: 0.25 },  // skews toward sins
  [EGuestTier.NORMAL]: { mean: 0.45, stddev: 0.2 },  // balanced, slight virtue lean
  [EGuestTier.HIGH]:   { mean: 0.3, stddev: 0.15 },   // skews toward virtues
};

export class GuestSpawner {
  private _engine: Engine;
  private _timeSinceLastSpawn: number = 0;
  private _enabled: boolean = false;

  /** Set of townsfolk IDs currently active in the bar */
  private _activeTownsfolkIds: Set<number> = new Set();

  constructor(engine: Engine) {
    this._engine = engine;
  }

  get enabled() {
    return this._enabled;
  }
  set enabled(val: boolean) {
    this._enabled = val;
    if (val) this._timeSinceLastSpawn = GameSettings.guestSpawnInterval - 3; // first spawn within ~3 seconds
  }

  get activeTownsfolkIds(): ReadonlySet<number> {
    return this._activeTownsfolkIds;
  }

  /** Track a townsfolk as active (in the bar) */
  trackActive(townsfolkId: number) {
    if (townsfolkId >= 0) this._activeTownsfolkIds.add(townsfolkId);
  }

  /** Untrack a townsfolk (left the bar) */
  untrackActive(townsfolkId: number) {
    this._activeTownsfolkIds.delete(townsfolkId);
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
    const tier = this._rollTier();

    // Try to find group seating for the whole party
    const seats = this._engine.findGroupSeating(partySize);

    // Pick townsfolk from the population pool
    const pool = this._engine.populationPool;
    const townsfolk = pool
      ? pool.pickTownsfolk(partySize, new Set(this._activeTownsfolkIds), this._engine.shiftNumber)
      : [];

    // Create all guests with personality-driven traits
    const guests: Guest[] = [];
    for (let i = 0; i < partySize; i++) {
      const guest = new Guest(partyId, entrance.x, entrance.y);

      if (townsfolk[i]) {
        // Use townsfolk data from the population pool
        const person = townsfolk[i];
        guest.setTownsfolkId(person.id);
        guest.setName(person.name);
        guest.setPersonality(person.personality);
        guest.setPreferredDrink(person.preferredDrink);
        guest.setRegular(person.visitCount >= REGULAR_THRESHOLD);
        this.trackActive(person.id);
      } else {
        // Fallback: random personality (should rarely happen with 1000 pool)
        const personality = this._rollPersonality(tier);
        guest.setPersonality(personality);
      }

      guest.applyTier(tier);
      // Gluttony drives rounds: 1 + floor(gluttony * 3) => 1-4
      // Blend with tier rounds — take the max
      const gluttonyRounds = 1 + Math.floor(guest.personality.gluttony * 3);
      guest.setRounds(Math.min(4, Math.max(guest.roundsRemaining, gluttonyRounds)));
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

  /** Roll guest tier based on current reputation */
  private _rollTier(): EGuestTier {
    const rep = this._engine.reputation;
    const [baseLow, , baseHigh] = GameSettings.guestTierBaseWeights;
    const shift = rep * GameSettings.guestTierRepShift;
    const min = GameSettings.guestTierMinWeight;

    const wLow = Math.max(min, baseLow - shift);
    const wHigh = Math.max(min, baseHigh + shift);
    const wNorm = Math.max(min, 100 - wLow - wHigh);

    const total = wLow + wNorm + wHigh;
    const roll = Random.range(0, total);
    if (roll < wLow) return EGuestTier.LOW;
    if (roll < wLow + wNorm) return EGuestTier.NORMAL;
    return EGuestTier.HIGH;
  }

  /** Generate 7 personality floats based on tier using gaussian distribution */
  _rollPersonality(tier: EGuestTier): IPersonality {
    const params = PERSONALITY_TIER_PARAMS[tier];
    const roll = () => Math.max(0, Math.min(1, Random.gaussian(params.mean, params.stddev)));
    return {
      wrath: roll(),
      greed: roll(),
      gluttony: roll(),
      sloth: roll(),
      pride: roll(),
      envy: roll(),
      lust: roll(),
    };
  }
}
