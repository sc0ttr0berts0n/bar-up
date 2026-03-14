/**
 * PopulationPool — generates and manages a pool of 1000 townsfolk.
 * Each townsfolk has persistent personality, preferred drink, visit stats,
 * and an affinity score for the bar that determines spawn probability.
 */
import { type IPersonality, PERSONALITY_DIMENSIONS } from "../../../Shared/GuestTypes";
import { getMenuDrinkKeys } from "../../../Shared/DrinkRecipes";
import { Random } from "../../../Utils/Random";

export interface ITownsfolk {
  id: number;
  name: string;
  personality: IPersonality;
  preferredDrink: string;
  appearanceSeed: number;
  visitCount: number;
  lastVisitShift: number;
  lifetimeSpend: number;
  lifetimeHappiness: number;  // cumulative happiness at departure (for averaging)
  visitHappinessSum: number;  // sum of departure happiness scores
  affinity: number;           // calculated bar affinity [0, 1]
}

/** Pool size constant */
export const POOL_SIZE = 1000;

/** Visit count threshold for a townsfolk to become a regular */
export const REGULAR_THRESHOLD = 5;

/** Name pool for townsfolk generation */
const FIRST_NAMES = [
  "Alex", "Blake", "Casey", "Dana", "Ellis", "Frankie", "Gray", "Harper",
  "Indie", "Jamie", "Kit", "Lane", "Morgan", "Noel", "Oakley", "Parker",
  "Quinn", "Reese", "Sage", "Taylor", "Val", "Wren", "Avery", "Bailey",
  "Charlie", "Drew", "Eden", "Finley", "Glen", "Hayden", "Ira", "Jordan",
  "Kendall", "Lee", "Marley", "Nico", "Olive", "Peyton", "River", "Sky",
  "Rowan", "Cameron", "Emery", "Dakota", "Phoenix", "Remy", "Jesse", "Shay",
  "Kai", "Ash", "Corin", "Darcy", "Elliot", "Flynn", "Gale", "Holly",
  "Jules", "Kerry", "Linden", "Mack", "Neve", "Ori", "Pat", "Rory",
  "Soren", "Tate", "Uma", "Voss", "Winter", "Yael", "Zion", "Briar",
  "Cedar", "Devon", "Ember", "Fable", "Harbor", "Jem", "Lark", "Moss",
];

const LAST_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export class PopulationPool {
  private _pool: ITownsfolk[] = [];

  get pool(): ReadonlyArray<ITownsfolk> {
    return this._pool;
  }

  get size(): number {
    return this._pool.length;
  }

  /** Generate the full population pool. Called once on game session start. */
  generate(): void {
    this._pool = [];
    const drinkKeys = getMenuDrinkKeys();

    for (let i = 0; i < POOL_SIZE; i++) {
      const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lastInitial = LAST_INITIALS[Math.floor(i / FIRST_NAMES.length) % 26];
      const name = `${firstName} ${lastInitial}.`;

      const personality = this._rollPersonality();
      const preferredDrink = drinkKeys.length > 0 ? Random.pickOne(drinkKeys) : "pilsner";

      this._pool.push({
        id: i,
        name,
        personality,
        preferredDrink,
        appearanceSeed: Math.floor(Random.range(0, 1000000)),
        visitCount: 0,
        lastVisitShift: -1,
        lifetimeSpend: 0,
        lifetimeHappiness: 0,
        visitHappinessSum: 0,
        affinity: 0.5, // initial neutral affinity
      });
    }
  }

  /** Roll a balanced personality (mean=0.5, stddev=0.2) */
  private _rollPersonality(): IPersonality {
    const roll = () => Math.max(0, Math.min(1, Random.gaussian(0.5, 0.2)));
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

  /**
   * Recalculate affinity for all townsfolk between shifts.
   *
   * affinity = baseAffinity
   *   + reputationMatch * 0.3    // high rep attracts virtuous, low rep attracts sinful
   *   + menuMatch * 0.2          // proud guests need complex drinks on the menu
   *   + pastExperience * 0.3     // average happiness from past visits
   *   + regularBonus * 0.2       // regulars have inertia
   */
  recalculateAffinities(reputation: number, enabledDrinkKeys: string[], currentShift: number): void {
    for (const person of this._pool) {
      // Base affinity: slight positive bias so people visit
      let baseAffinity = 0.4;

      // --- Reputation match (0.3 weight) ---
      // Normalize reputation to [-1, 1] range roughly (rep typically -20 to 50)
      const repNorm = Math.max(-1, Math.min(1, reputation / 30));
      // Average of virtues (low sin values = virtuous)
      const avgSin = (person.personality.wrath + person.personality.greed +
        person.personality.gluttony + person.personality.sloth +
        person.personality.pride + person.personality.envy +
        person.personality.lust) / 7;
      // High rep attracts virtuous (low avgSin), low rep attracts sinful (high avgSin)
      // reputationMatch is higher when rep and virtue alignment agree
      const reputationMatch = repNorm > 0
        ? (1 - avgSin) * repNorm  // positive rep favors virtuous
        : avgSin * Math.abs(repNorm);  // negative rep favors sinful

      // --- Menu match (0.2 weight) ---
      // Proud guests want their preferred drink available
      const prefAvailable = enabledDrinkKeys.includes(person.preferredDrink) ? 1 : 0;
      const menuMatch = prefAvailable * (0.5 + 0.5 * person.personality.pride);

      // --- Past experience (0.3 weight) ---
      let pastExperience = 0.5; // neutral if never visited
      if (person.visitCount > 0) {
        // Average happiness normalized to [0, 1] (happiness max = 100)
        pastExperience = (person.visitHappinessSum / person.visitCount) / 100;
      }

      // --- Regular bonus (0.2 weight) ---
      const isRegular = person.visitCount >= REGULAR_THRESHOLD;
      const regularBonus = isRegular ? 0.8 : Math.min(1, person.visitCount / REGULAR_THRESHOLD) * 0.3;

      // Recently visited? Lower affinity (they just came, less likely to return next shift)
      const recentPenalty = person.lastVisitShift === currentShift ? 0.5 : 0;

      person.affinity = Math.max(0, Math.min(1,
        baseAffinity
        + reputationMatch * 0.3
        + menuMatch * 0.2
        + pastExperience * 0.3
        + regularBonus * 0.2
        - recentPenalty
      ));
    }
  }

  /**
   * Pick townsfolk to spawn as guests, weighted by affinity.
   * Returns townsfolk IDs, excluding those already active and those who visited this shift.
   */
  pickTownsfolk(count: number, activeIds: Set<number>, currentShift: number): ITownsfolk[] {
    // Filter candidates: not currently in bar, not visited this shift
    const candidates = this._pool.filter(p =>
      !activeIds.has(p.id) && p.lastVisitShift !== currentShift
    );

    if (candidates.length === 0) return [];

    // Sort by affinity descending, then pick from top portion with some randomness
    candidates.sort((a, b) => b.affinity - a.affinity);

    // Pick from top 20% with weighted random (higher affinity = higher weight)
    const topN = Math.max(count * 5, Math.floor(candidates.length * 0.2));
    const topCandidates = candidates.slice(0, topN);

    const picked: ITownsfolk[] = [];
    const usedIds = new Set<number>();

    for (let i = 0; i < count && topCandidates.length > 0; i++) {
      // Weighted random selection by affinity
      const totalWeight = topCandidates.reduce((sum, c) => sum + c.affinity, 0);
      if (totalWeight <= 0) break;

      let roll = Random.range(0, totalWeight);
      let selectedIdx = 0;
      for (let j = 0; j < topCandidates.length; j++) {
        roll -= topCandidates[j].affinity;
        if (roll <= 0) {
          selectedIdx = j;
          break;
        }
      }

      const selected = topCandidates[selectedIdx];
      if (!usedIds.has(selected.id)) {
        picked.push(selected);
        usedIds.add(selected.id);
      }
      topCandidates.splice(selectedIdx, 1);
    }

    return picked;
  }

  /** Get a townsfolk by ID */
  getTownsfolk(id: number): ITownsfolk | undefined {
    return this._pool[id];
  }

  /** Update a townsfolk's stats after they leave the bar */
  recordVisit(id: number, shift: number, amountSpent: number, departureHappiness: number): void {
    const person = this._pool[id];
    if (!person) return;

    person.visitCount++;
    person.lastVisitShift = shift;
    person.lifetimeSpend += amountSpent;
    person.visitHappinessSum += departureHappiness;
  }

  /** Check if a townsfolk is a regular */
  isRegular(id: number): boolean {
    const person = this._pool[id];
    return person ? person.visitCount >= REGULAR_THRESHOLD : false;
  }
}
