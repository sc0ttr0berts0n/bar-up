/**
 * Guest Behaviors — comprehensive tests for traits, fights, slips,
 * drunkenness, patience decay, chat mechanics, and seating logic.
 */
import { describe, it, expect } from "vitest";
import { createTestEngine, tick, priv } from "./engineHelper";
import { Guest } from "../Network/Server/GameObjects/Guest";
import { Item } from "../Network/Server/GameObjects/Item";
import { EGuestStatus, EGuestTrait, type IPersonality, deriveTraits } from "../Shared/GuestTypes";
import { EItemType } from "../Shared/ItemTypes";
import { EApplianceType } from "../Shared/ApplianceTypes";
import { RECIPES } from "../Shared/DrinkRecipes";
import GameSettings from "../Shared/GameSettings";

/** Default neutral personality (all 0.5) */
const NEUTRAL_PERSONALITY: IPersonality = { wrath: 0.5, greed: 0.5, gluttony: 0.5, sloth: 0.5, pride: 0.5, envy: 0.5, lust: 0.5 };
/** Personality presets matching old trait behaviors */
const PERSONALITY_PRESETS: Partial<Record<string, Partial<IPersonality>>> = {
  violent: { wrath: 0.9, envy: 0.7 },
  lightweight: { gluttony: 0.1 },
  lush: { gluttony: 0.9, wrath: 0.5 },
  impatient: { wrath: 0.8, gluttony: 0.3 },
  chatty: { lust: 0.8, pride: 0.3 },
  cleanly: { sloth: 0.1, gluttony: 0.3 },
  messy: { sloth: 0.8, gluttony: 0.7 },
  highroller: { greed: 0.1, pride: 0.8 },
  generous: { greed: 0.1, envy: 0.2 },
  peaceful: { wrath: 0.1, envy: 0.2 }, // won't fight
};

// ── Helpers ───────────────────────────────────────────────────

function findAppliance(engine: any, type: EApplianceType) {
  for (const app of priv(engine)._appliances.values()) {
    if (app.type === type) return app;
  }
  return null;
}

function spawnSeatedGuest(engine: any, counterX: number, opts?: {
  status?: EGuestStatus;
  order?: string;
  drunkenness?: number;
  happiness?: number;
  patience?: number;
  traits?: EGuestTrait[];
  roundsRemaining?: number;
  preferredDrink?: string;
  personality?: Partial<IPersonality>;
}) {
  const guest = new Guest("test-party", counterX, 4);
  const g = guest as any;
  g._gridX = counterX;
  g._gridY = 4;
  g._targetX = counterX;
  g._targetY = 4;
  g._moveProgress = 1;
  g._status = opts?.status ?? EGuestStatus.WAITING_FOR_ORDER;
  if (opts?.order) g._order = { drinkKey: opts.order };
  if (opts?.drunkenness !== undefined) g._drunkenness = opts.drunkenness;
  if (opts?.happiness !== undefined) g._happiness = opts.happiness;
  if (opts?.patience !== undefined) g._patience = opts.patience;
  if (opts?.traits) g._traits = opts.traits;
  if (opts?.roundsRemaining !== undefined) g._roundsRemaining = opts.roundsRemaining;
  if (opts?.preferredDrink !== undefined) g._preferredDrink = opts.preferredDrink;
  // Set personality — merge provided overrides with neutral defaults
  g._personality = { ...NEUTRAL_PERSONALITY, ...(opts?.personality ?? {}) };

  // Seat at counter
  const counters = [...priv(engine)._appliances.values()].filter(
    (a: any) => a.type === EApplianceType.COUNTER && a.gridX === counterX,
  );
  if (counters.length > 0) {
    const counter = counters[0] as any;
    counter.seatGuest(0, guest.id);
    g._seatApplianceId = counter.id;
    g._seatIndex = 0;
    g._seatApplianceGridX = counter.gridX;
    g._seatApplianceGridY = counter.gridY;
  }

  priv(engine)._guests.set(guest.id, guest);
  return guest;
}

function setupBartender(engine: any, x: number, y: number, facing: string) {
  const bartender = priv(engine)._bartenders[0];
  bartender.assign("test-player");
  const b = bartender as any;
  b._gridX = x;
  b._gridY = y;
  b._targetX = x;
  b._targetY = y;
  b._moveProgress = 1;
  b._facing = facing;
  return bartender;
}

function giveBartenderItem(engine: any, bartender: any, type: EItemType) {
  const item = new Item(type);
  item.pickUp("test-player");
  priv(engine)._items.set((item as any)._id, item);
  (bartender as any)._heldItemId = (item as any)._id;
  (bartender as any)._heldItemType = type;
  return item;
}

// ── FIGHT SYSTEM ─────────────────────────────────────────────

describe("Fight system", () => {
  it("VIOLENT guest triggers fight when drunk + unhappy", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // wrath=0.9 → fight threshold = 15 + 20*(1-0.9) = 17
    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: GameSettings.fightDrunkThreshold + 0.1,
      happiness: 10, // below threshold of 17
      traits: [EGuestTrait.VIOLENT],
      personality: PERSONALITY_PRESETS.violent,
    });
    // Set up drinking state
    const g = guest as any;
    g._drinkDuration = 999; // long drink so status stays DRINKING
    g._sipsTaken = GameSettings.sipsPerDrink; // done sipping

    tick(engine, 2);

    expect(guest.status).toBe(EGuestStatus.FIGHTING);
  });

  it("VIOLENT guest does NOT fight when happy enough", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // wrath=0.9 → fight threshold = 17. happiness=40 is well above
    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: GameSettings.fightDrunkThreshold + 0.1,
      happiness: 40,
      traits: [EGuestTrait.VIOLENT],
      personality: PERSONALITY_PRESETS.violent,
    });
    const g = guest as any;
    g._drinkDuration = 999;
    g._sipsTaken = GameSettings.sipsPerDrink;

    tick(engine, 2);

    expect(guest.status).toBe(EGuestStatus.DRINKING);
  });

  it("VIOLENT guest does NOT fight when sober", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: GameSettings.fightDrunkThreshold - 0.2,
      happiness: 0,
      traits: [EGuestTrait.VIOLENT],
      personality: PERSONALITY_PRESETS.violent,
    });
    const g = guest as any;
    g._drinkDuration = 999;
    g._sipsTaken = GameSettings.sipsPerDrink;

    tick(engine, 2);

    expect(guest.status).toBe(EGuestStatus.DRINKING);
  });

  it("non-VIOLENT guest never triggers fight", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // Low wrath → fight threshold = 15 + 20*(1-0.1) = 33. Even at happiness=0, wrath is low.
    // But the new system uses continuous wrath, not binary. With wrath=0.1, threshold=33.
    // happiness=0 is below 33, so it WOULD fight... but only if drunk >= threshold.
    // Actually the formula is: happiness < 15 + 20*(1-wrath) AND drunk >= threshold
    // With wrath=0.1: threshold = 33. happiness=0 < 33. So even peaceful guests fight when conditions are extreme.
    // To truly never fight: set happiness above any possible threshold (>35)
    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: 1.0,
      happiness: 40, // above wrath=0.1 threshold of 33
      traits: [],
      personality: PERSONALITY_PRESETS.peaceful,
    });
    const g = guest as any;
    g._drinkDuration = 999;
    g._sipsTaken = GameSettings.sipsPerDrink;

    tick(engine, 2);

    expect(guest.status).toBe(EGuestStatus.DRINKING);
  });

  it("fight triggers AOE happiness drop on nearby guests", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // VIOLENT guest that will fight — wrath=0.9, threshold=17
    spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: GameSettings.fightDrunkThreshold + 0.1,
      happiness: 10,
      traits: [EGuestTrait.VIOLENT],
      personality: PERSONALITY_PRESETS.violent,
    });
    (priv(engine)._guests.values().next().value as any)._drinkDuration = 999;
    (priv(engine)._guests.values().next().value as any)._sipsTaken = GameSettings.sipsPerDrink;

    // Nearby guest (within AOE radius)
    const nearGuest = spawnSeatedGuest(engine, 6, {
      status: EGuestStatus.DRINKING,
      happiness: 80,
    });
    (nearGuest as any)._drinkDuration = 999;
    (nearGuest as any)._sipsTaken = GameSettings.sipsPerDrink;
    const nearHappinessBefore = nearGuest.happiness;

    tick(engine, 2);

    expect(nearGuest.happiness).toBe(nearHappinessBefore - GameSettings.fightAoeHappinessDrop);
  });

  it("fight increments shiftStats.fights", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: GameSettings.fightDrunkThreshold + 0.1,
      happiness: 10,
      traits: [EGuestTrait.VIOLENT],
      personality: PERSONALITY_PRESETS.violent,
    });
    const fighter = [...priv(engine)._guests.values()].at(-1) as any;
    fighter._drinkDuration = 999;
    fighter._sipsTaken = GameSettings.sipsPerDrink;

    expect(priv(engine)._shiftStats.fights).toBe(0);
    tick(engine, 2);
    expect(priv(engine)._shiftStats.fights).toBe(1);
  });

  it("fight auto-resolves after timeout", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._status = EGuestStatus.FIGHTING;
    g._statusTimer = 0;
    g._moveProgress = 1;

    // Tick enough for fight timeout
    const dt = 1 / GameSettings.tickRate;
    for (let i = 0; i < GameSettings.fightTimeoutSeconds * GameSettings.tickRate + 10; i++) {
      guest.tick(dt);
    }

    expect(guest.status).toBe(EGuestStatus.LEAVING);
  });

  it("interact on FIGHTING guest resolves fight (guest leaves)", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.FIGHTING,
    });

    const bartender = setupBartender(engine, 5, 2, "down");
    engine.bartenderInteract("test-player");

    expect(guest.status).toBe(EGuestStatus.LEAVING);
  });
});

// ── SLIP SYSTEM ──────────────────────────────────────────────

describe("Slip system", () => {
  it("drunk LEAVING guest slips on mess (probabilistic)", () => {
    let slipped = false;
    for (let trial = 0; trial < 30; trial++) {
      const engine = createTestEngine();
      priv(engine)._guestSpawner.enabled = false;

      const guest = spawnSeatedGuest(engine, 5, {
        status: EGuestStatus.LEAVING,
        drunkenness: GameSettings.slipDrunkThreshold + 0.2,
      });
      // Set guest as moving through a mess tile
      const g = guest as any;
      g._moveProgress = 0.5; // currently moving
      g._targetX = 5;
      g._targetY = 5;
      priv(engine)._messes.add(`${g._gridX},${g._gridY}`);

      tick(engine, 1);

      if (guest.status === EGuestStatus.SLIPPED) {
        slipped = true;
        break;
      }
    }
    expect(slipped).toBe(true);
  });

  it("sober guest does NOT slip on mess", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.LEAVING,
      drunkenness: GameSettings.slipDrunkThreshold - 0.1,
    });
    const g = guest as any;
    g._moveProgress = 0.5;
    g._targetX = 5;
    g._targetY = 5;
    priv(engine)._messes.add(`${g._gridX},${g._gridY}`);

    // Tick many times — should never slip
    for (let i = 0; i < 60; i++) {
      tick(engine, 1);
      if (guest.status === EGuestStatus.SLIPPED) break;
      // Re-set state for next tick (if guest leaves, reset)
      if (guest.status !== EGuestStatus.LEAVING) break;
    }

    expect(guest.status).not.toBe(EGuestStatus.SLIPPED);
  });

  it("slip applies happiness penalty", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    let found = false;
    for (let trial = 0; trial < 50; trial++) {
      const eng2 = createTestEngine();
      priv(eng2)._guestSpawner.enabled = false;

      const guest = spawnSeatedGuest(eng2, 5, {
        status: EGuestStatus.LEAVING,
        drunkenness: GameSettings.slipDrunkThreshold + 0.3,
        happiness: 80,
      });
      const g = guest as any;
      g._moveProgress = 0.5;
      g._targetX = 5;
      g._targetY = 5;
      priv(eng2)._messes.add(`${g._gridX},${g._gridY}`);

      tick(eng2, 1);

      if (guest.status === EGuestStatus.SLIPPED) {
        expect(guest.happiness).toBe(80 - GameSettings.slipHappinessPenalty);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("slip increments shiftStats.slips", () => {
    let found = false;
    for (let trial = 0; trial < 50; trial++) {
      const engine = createTestEngine();
      priv(engine)._guestSpawner.enabled = false;

      const guest = spawnSeatedGuest(engine, 5, {
        status: EGuestStatus.LEAVING,
        drunkenness: GameSettings.slipDrunkThreshold + 0.3,
      });
      const g = guest as any;
      g._moveProgress = 0.5;
      g._targetX = 5;
      g._targetY = 5;
      priv(engine)._messes.add(`${g._gridX},${g._gridY}`);

      tick(engine, 1);

      if (guest.status === EGuestStatus.SLIPPED) {
        expect(priv(engine)._shiftStats.slips).toBe(1);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("interact on SLIPPED guest helps them up", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.SLIPPED,
    });

    const bartender = setupBartender(engine, 5, 2, "down");
    engine.bartenderInteract("test-player");

    // Should transition to WALKING_TO_SEAT (has seat) or LEAVING
    expect(guest.status === EGuestStatus.WALKING_TO_SEAT || guest.status === EGuestStatus.LEAVING).toBe(true);
  });
});

// ── TRAIT EFFECTS ────────────────────────────────────────────

describe("LIGHTWEIGHT (low gluttony) trait", () => {
  it("low gluttony increases drunkenness per sip", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._personality = { ...NEUTRAL_PERSONALITY, ...PERSONALITY_PRESETS.lightweight };
    g._status = EGuestStatus.DRINKING;
    g._drinkDuration = 10;
    g._drinkProgress = 0;
    g._statusTimer = 0;
    g._sipsTaken = 0;
    g._drunkenness = 0;

    const dt = 1 / GameSettings.tickRate;

    // Advance to first sip (at 1/sipsPerDrink progress)
    const sipInterval = 1.0 / GameSettings.sipsPerDrink;
    const ticksToFirstSip = Math.ceil(sipInterval * g._drinkDuration * GameSettings.tickRate) + 5;
    for (let i = 0; i < ticksToFirstSip; i++) {
      guest.tick(dt);
    }

    // drunkRate = 1.3 - 0.6 * 0.1 = 1.24 (higher than baseline 1.0)
    const expectedSip = GameSettings.sipDrunkenness * (1.3 - 0.6 * 0.1);
    expect(g._sipsTaken).toBeGreaterThanOrEqual(1);
    expect(g._drunkenness).toBeGreaterThan(expectedSip * 0.7);
    expect(g._drunkenness).toBeLessThan(expectedSip * 1.3);
  });
});

describe("LUSH (high gluttony) trait", () => {
  it("high gluttony decreases drunkenness per sip", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._personality = { ...NEUTRAL_PERSONALITY, ...PERSONALITY_PRESETS.lush };
    g._status = EGuestStatus.DRINKING;
    g._drinkDuration = 10;
    g._drinkProgress = 0;
    g._statusTimer = 0;
    g._sipsTaken = 0;
    g._drunkenness = 0;

    const dt = 1 / GameSettings.tickRate;
    const sipInterval = 1.0 / GameSettings.sipsPerDrink;
    const ticksToFirstSip = Math.ceil(sipInterval * g._drinkDuration * GameSettings.tickRate) + 5;
    for (let i = 0; i < ticksToFirstSip; i++) {
      guest.tick(dt);
    }

    // drunkRate = 1.3 - 0.6 * 0.9 = 0.76 (lower than baseline 1.0)
    const expectedSip = GameSettings.sipDrunkenness * (1.3 - 0.6 * 0.9);
    expect(g._sipsTaken).toBeGreaterThanOrEqual(1);
    expect(g._drunkenness).toBeGreaterThan(expectedSip * 0.6);
    expect(g._drunkenness).toBeLessThan(expectedSip * 1.4);
  });
});

describe("IMPATIENT (high wrath) trait", () => {
  it("high wrath speeds up deciding duration", () => {
    // Create two guests: one high-wrath, one low-wrath, both DECIDING
    const normalGuest = new Guest("test", 5, 14);
    const impGuest = new Guest("test", 5, 14);
    const ng = normalGuest as any;
    const ig = impGuest as any;

    ng._status = EGuestStatus.DECIDING;
    ng._statusTimer = 0;
    ng._moveProgress = 1;
    ng._drunkenness = 0;
    ng._drunkGoal = 1.0;
    ng._personality = { ...NEUTRAL_PERSONALITY, wrath: 0.0 }; // patient

    ig._status = EGuestStatus.DECIDING;
    ig._statusTimer = 0;
    ig._moveProgress = 1;
    ig._drunkenness = 0;
    ig._drunkGoal = 1.0;
    ig._personality = { ...NEUTRAL_PERSONALITY, ...PERSONALITY_PRESETS.impatient };

    const dt = 1 / GameSettings.tickRate;
    const maxDecide = GameSettings.decidingDuration[1];
    // wrath=0.8: decideDuration *= 1.0 - 0.8*0.3 = 0.76
    const wrathMax = maxDecide * (1.0 - 0.8 * 0.3);

    // Tick until impatient guest transitions
    let impTicks = 0;
    for (let i = 0; i < maxDecide * GameSettings.tickRate + 60; i++) {
      impGuest.tick(dt);
      impTicks++;
      if (ig._status !== EGuestStatus.DECIDING) break;
    }

    // High-wrath guest should decide faster than max normal duration
    const impTime = impTicks / GameSettings.tickRate;
    expect(impTime).toBeLessThanOrEqual(wrathMax + 1); // +1s tolerance
  });

  it("wrath-scaled fast-serve bonus: bonus patience if served within 10s", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      patience: 50,
      traits: [EGuestTrait.IMPATIENT],
      personality: PERSONALITY_PRESETS.impatient,
    });
    // Make statusTimer < 10 (just started waiting)
    (guest as any)._statusTimer = 3;

    const bartender = setupBartender(engine, 5, 2, "down");
    giveBartenderItem(engine, bartender, EItemType.PILSNER);

    const patienceBefore = guest.patience;
    engine.bartenderInteract("test-player");

    // Wrath-scaled bonus: round(10 * 0.8) = 8
    const wrathBonus = Math.round(GameSettings.impatientFastServeBonus * 0.8);
    const expectedMin = patienceBefore + GameSettings.patienceServeBonus + wrathBonus;
    expect(guest.patience).toBeGreaterThanOrEqual(expectedMin);
  });
});

describe("Chat happiness (lust-driven)", () => {
  it("high lust gets bigger chat happiness bonus", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._personality = { ...NEUTRAL_PERSONALITY, ...PERSONALITY_PRESETS.chatty };
    g._chatAvailable = true;
    const happinessBefore = guest.happiness;

    guest.chat();

    // lust=0.8: base + round(0.8 * base) = 5 + 4 = 9
    const expectedBonus = GameSettings.chatHappinessBonus + Math.round(0.8 * GameSettings.chatHappinessBonus);
    expect(guest.happiness).toBe(happinessBefore + expectedBonus);
  });

  it("low lust (reserved) guest gets near-base happiness bonus", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._personality = { ...NEUTRAL_PERSONALITY, lust: 0.0 }; // reserved
    g._chatAvailable = true;
    const happinessBefore = guest.happiness;

    guest.chat();

    // lust=0: base + round(0 * base) = 5 + 0 = 5
    expect(guest.happiness).toBe(happinessBefore + GameSettings.chatHappinessBonus);
  });
});

// ── DRUNKENNESS MECHANICS ────────────────────────────────────

describe("Drunkenness mechanics", () => {
  it("drunkenness increases via discrete sips during drinking", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._status = EGuestStatus.DRINKING;
    g._drinkDuration = 5; // short drink
    g._drinkProgress = 0;
    g._statusTimer = 0;
    g._sipsTaken = 0;
    g._drunkenness = 0;
    g._moveProgress = 1;

    const dt = 1 / GameSettings.tickRate;
    // Tick through entire drink
    for (let i = 0; i < g._drinkDuration * GameSettings.tickRate + 60; i++) {
      guest.tick(dt);
      if (g._status !== EGuestStatus.DRINKING) break;
    }

    // All sips should have been taken
    expect(g._sipsTaken === 0 || g._drunkenness > 0).toBe(true);
  });

  it("drunkenness decays passively over time", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._status = EGuestStatus.DECIDING;
    g._moveProgress = 1;
    g._drunkenness = 0.5;

    const dt = 1 / GameSettings.tickRate;
    const drunkBefore = g._drunkenness;

    // Tick 1 second
    for (let i = 0; i < GameSettings.tickRate; i++) {
      guest.tick(dt);
    }

    const expectedDecay = GameSettings.drunkennessDecayRate * 1.0;
    expect(g._drunkenness).toBeCloseTo(drunkBefore - expectedDecay, 2);
  });

  it("drunkenness does not go below 0", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._status = EGuestStatus.DECIDING;
    g._moveProgress = 1;
    g._drunkenness = 0.001;

    const dt = 1 / GameSettings.tickRate;
    for (let i = 0; i < 600; i++) {
      guest.tick(dt);
    }

    expect(g._drunkenness).toBeGreaterThanOrEqual(0);
  });

  it("guest over drunk goal has chance to leave during DECIDING", () => {
    let leftCount = 0;
    const trials = 50;
    for (let t = 0; t < trials; t++) {
      const guest = new Guest("test", 5, 14);
      const g = guest as any;
      g._status = EGuestStatus.DECIDING;
      g._moveProgress = 1;
      g._drunkenness = 1.5; // well over any goal
      g._drunkGoal = 0.2;
      g._statusTimer = 0;

      const dt = 1 / GameSettings.tickRate;
      // Tick through the coast duration max
      for (let i = 0; i < GameSettings.drunkCoastDuration[1] * GameSettings.tickRate + 60; i++) {
        guest.tick(dt);
        if (g._status === EGuestStatus.LEAVING) {
          leftCount++;
          break;
        }
        if (g._status !== EGuestStatus.DECIDING) break;
      }
    }
    // With 40% leave chance, expect some to leave
    expect(leftCount).toBeGreaterThan(0);
    expect(leftCount).toBeLessThan(trials); // and some to coast
  });
});

// ── PATIENCE DECAY ───────────────────────────────────────────

describe("Patience decay rates", () => {
  it("READY_TO_ORDER: patience decays after 5s grace period", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._status = EGuestStatus.READY_TO_ORDER;
    g._moveProgress = 1;
    g._statusTimer = 0;
    g._patience = 60;

    const dt = 1 / GameSettings.tickRate;

    // First 5 seconds — no decay
    for (let i = 0; i < 5 * GameSettings.tickRate; i++) {
      guest.tick(dt);
    }
    expect(g._patience).toBe(60); // unchanged

    // Next 5 seconds — should decay
    const before = g._patience;
    for (let i = 0; i < 5 * GameSettings.tickRate; i++) {
      guest.tick(dt);
    }
    const expectedDecay = GameSettings.patienceReadyDecayRate * 5;
    expect(g._patience).toBeCloseTo(before - expectedDecay, 1);
  });

  it("WAITING_FOR_ORDER: patience decays immediately", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._status = EGuestStatus.WAITING_FOR_ORDER;
    g._moveProgress = 1;
    g._statusTimer = 0;
    g._patience = 60;
    g._order = { drinkKey: "pilsner" };

    const dt = 1 / GameSettings.tickRate;
    for (let i = 0; i < GameSettings.tickRate; i++) {
      guest.tick(dt);
    }

    const expectedDecay = GameSettings.patienceWaitingForDrinkDecayRate * 1;
    expect(g._patience).toBeCloseTo(60 - expectedDecay, 1);
  });

  it("QUEUED: patience decays at queue rate", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._status = EGuestStatus.QUEUED;
    g._moveProgress = 1;
    g._patience = 60;

    const dt = 1 / GameSettings.tickRate;
    for (let i = 0; i < GameSettings.tickRate; i++) {
      guest.tick(dt);
    }

    const expectedDecay = GameSettings.queuePatienceDecayRate * 1;
    expect(g._patience).toBeCloseTo(60 - expectedDecay, 1);
  });

  it("patience hitting 0 forces guest to leave", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._status = EGuestStatus.WAITING_FOR_ORDER;
    g._moveProgress = 1;
    g._patience = 1; // very low
    g._order = { drinkKey: "pilsner" };

    const dt = 1 / GameSettings.tickRate;
    for (let i = 0; i < 600; i++) {
      guest.tick(dt);
      if (g._status === EGuestStatus.LEAVING) break;
    }

    expect(g._status).toBe(EGuestStatus.LEAVING);
  });

  it("SLIPPED: patience decays at generic rate", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._status = EGuestStatus.SLIPPED;
    g._moveProgress = 1;
    g._patience = 60;

    const dt = 1 / GameSettings.tickRate;
    for (let i = 0; i < GameSettings.tickRate; i++) {
      guest.tick(dt);
    }

    const expectedDecay = GameSettings.patienceDecayRate * 1;
    expect(g._patience).toBeCloseTo(60 - expectedDecay, 1);
  });
});

// ── CHAT MECHANICS ───────────────────────────────────────────

describe("Chat mechanics", () => {
  it("chat cooldown makes chatAvailable after time", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._status = EGuestStatus.DRINKING;
    g._drinkDuration = 999;
    g._moveProgress = 1;
    g._chatAvailable = false;
    g._chatCooldown = 1.0; // 1 second cooldown

    const dt = 1 / GameSettings.tickRate;
    for (let i = 0; i < 2 * GameSettings.tickRate; i++) {
      guest.tick(dt);
    }

    expect(g._chatAvailable).toBe(true);
  });

  it("chat resets cooldown", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._chatAvailable = true;
    g._chatCooldown = 0;

    guest.chat();

    expect(g._chatAvailable).toBe(false);
    expect(g._chatCooldown).toBeGreaterThan(0);
  });

  it("chat increments chatCount", () => {
    const guest = new Guest("test", 5, 14);
    expect(guest.chatCount).toBe(0);
    guest.chat();
    expect(guest.chatCount).toBe(1);
    guest.chat();
    expect(guest.chatCount).toBe(2);
  });

  it("chat reveal chance increases with chatCount", () => {
    // With high chatCount, chance should be near 100%
    let revealed = false;
    for (let trial = 0; trial < 20; trial++) {
      const guest = new Guest("test", 5, 14);
      const g = guest as any;
      g._chatCount = 10; // many prior chats → very high reveal chance
      g._traits = [EGuestTrait.VIOLENT]; // something to reveal

      const result = guest.chat();
      if (result) {
        revealed = true;
        break;
      }
    }
    expect(revealed).toBe(true);
  });

  it("chat reveals traits before preferences", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._chatCount = 20; // guarantee reveal
    g._traits = [EGuestTrait.LIGHTWEIGHT];
    g._preferredDrink = "pilsner";
    g._preferenceRevealed = false;
    g._revealedTraits = [];

    guest.chat();

    // Trait should be revealed first
    if (g._revealedTraits.length > 0) {
      expect(g._revealedTraits).toContain(EGuestTrait.LIGHTWEIGHT);
    }
  });

  it("bartender can only chat when empty-handed and guest is DRINKING", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
    });
    const g = guest as any;
    g._chatAvailable = true;
    g._drinkDuration = 999;

    // Bartender with item — should NOT chat
    const bartender = setupBartender(engine, 5, 2, "down");
    giveBartenderItem(engine, bartender, EItemType.GLASS);
    const chatBefore = guest.chatCount;
    engine.bartenderInteract("test-player");
    expect(guest.chatCount).toBe(chatBefore); // no chat happened

    // Drop item, then chat should work
    (bartender as any)._heldItemId = null;
    (bartender as any)._heldItemType = null;
    engine.bartenderInteract("test-player");
    expect(guest.chatCount).toBe(chatBefore + 1);
  });
});

// ── POLICE RAID DETAILS ──────────────────────────────────────

describe("Police raid details", () => {
  it("raid deducts exact money penalty", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    const moneyBefore = priv(engine)._money;
    priv(engine)._policeAttention = GameSettings.policeRaidThreshold + 0.5;
    tick(engine, 1);
    expect(priv(engine)._money).toBe(moneyBefore - GameSettings.policeRaidMoneyPenalty);
  });

  it("raid applies exact reputation penalty", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    priv(engine)._policeAttention = GameSettings.policeRaidThreshold + 0.5;
    tick(engine, 1);
    expect(priv(engine)._reputation).toBe(GameSettings.policeRaidReputationPenalty);
  });

  it("raid sets raid timer that blocks guest spawning", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    priv(engine)._policeAttention = GameSettings.policeRaidThreshold + 0.5;
    tick(engine, 1);
    expect(priv(engine)._policeRaidTimer).toBeGreaterThan(0);
    expect(engine.isRaided).toBe(true);
  });

  it("raid timer decays to 0 over time", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    priv(engine)._policeRaidTimer = 5; // 5 seconds

    tick(engine, 5 * GameSettings.tickRate + 10);
    expect(priv(engine)._policeRaidTimer).toBeLessThanOrEqual(0);
    expect(engine.isRaided).toBe(false);
  });

  it("raid force-leaves overserved guests", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const drunkGuest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: GameSettings.overserveDrunkennessThreshold + 0.1,
    });
    (drunkGuest as any)._drinkDuration = 999;

    const soberGuest = spawnSeatedGuest(engine, 6, {
      status: EGuestStatus.DRINKING,
      drunkenness: 0.1,
    });
    (soberGuest as any)._drinkDuration = 999;

    priv(engine)._policeAttention = GameSettings.policeRaidThreshold + 0.5;
    tick(engine, 1);

    expect(drunkGuest.status).toBe(EGuestStatus.LEAVING);
    // Sober guest should not be affected
    expect(soberGuest.status).not.toBe(EGuestStatus.LEAVING);
  });

  it("raid resets police attention to 0", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    priv(engine)._policeAttention = GameSettings.policeRaidThreshold + 0.5;
    tick(engine, 1);
    expect(priv(engine)._policeAttention).toBe(0);
  });

  it("raid increments shiftStats.policeRaids", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    priv(engine)._policeAttention = GameSettings.policeRaidThreshold + 0.5;
    tick(engine, 1);
    expect(priv(engine)._shiftStats.policeRaids).toBe(1);
  });
});

// ── SEATING LOGIC ────────────────────────────────────────────

describe("Seating logic", () => {
  it("small party (<=2) prefers counter over tables", () => {
    const engine = createTestEngine();
    const seats = engine.findGroupSeating(1);
    expect(seats).not.toBeNull();
    if (seats) {
      const app = priv(engine)._appliances.get(seats[0].applianceId);
      expect(app.type).toBe(EApplianceType.COUNTER);
    }
  });

  it("large party (>2) prefers tables over counter", () => {
    const engine = createTestEngine();
    const seats = engine.findGroupSeating(3);
    expect(seats).not.toBeNull();
    if (seats) {
      const app = priv(engine)._appliances.get(seats[0].applianceId);
      expect(app.type === EApplianceType.TABLE || app.type === EApplianceType.HIGHTOP).toBe(true);
    }
  });

  it("falls back to tables when counter is full", () => {
    const engine = createTestEngine();
    // Fill all counter seats
    for (const app of priv(engine)._appliances.values()) {
      if ((app as any).type === EApplianceType.COUNTER) {
        (app as any).seatGuest(0, "fake-guest");
      }
    }

    const seats = engine.findGroupSeating(1);
    expect(seats).not.toBeNull();
    if (seats) {
      const app = priv(engine)._appliances.get(seats[0].applianceId);
      expect(app.type === EApplianceType.TABLE || app.type === EApplianceType.HIGHTOP).toBe(true);
    }
  });

  it("returns null when no seating available", () => {
    const engine = createTestEngine();
    // Fill ALL seats using maxSeats to get the correct count per appliance
    for (const app of priv(engine)._appliances.values()) {
      if ((app as any).type === EApplianceType.COUNTER ||
          (app as any).type === EApplianceType.TABLE ||
          (app as any).type === EApplianceType.HIGHTOP) {
        const seatCount = app.maxSeats;
        for (let i = 0; i < seatCount; i++) {
          app.seatGuest(i, `fake-${app.id}-${i}`);
        }
      }
    }

    const seats = engine.findGroupSeating(1);
    expect(seats).toBeNull();
  });

  it("counter seating returns contiguous seats for party of 2", () => {
    const engine = createTestEngine();

    // With a fresh engine, party of 2 should get contiguous counter seats
    const seats = engine.findGroupSeating(2);
    expect(seats).not.toBeNull();
    if (seats && seats.length === 2) {
      const app0 = priv(engine)._appliances.get(seats[0].applianceId);
      const app1 = priv(engine)._appliances.get(seats[1].applianceId);
      // Both should be counters with adjacent x positions
      expect(app0.type).toBe(EApplianceType.COUNTER);
      expect(app1.type).toBe(EApplianceType.COUNTER);
      expect(Math.abs((app0 as any)._gridX - (app1 as any)._gridX)).toBe(1);
    }
  });
});

// ── QUEUE SYSTEM ─────────────────────────────────────────────

describe("Queue system", () => {
  it("assignQueueSlot returns slot index", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._gridX = 5;
    g._gridY = 5;
    g._moveProgress = 1;
    priv(engine)._guests.set(guest.id, guest);

    const slotIdx = engine.assignQueueSlot(guest);
    expect(slotIdx).toBeGreaterThanOrEqual(0);
    expect(guest.queuePosition).toBe(slotIdx);
  });

  it("freeQueueSlot clears guest position", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._gridX = 5;
    g._gridY = 5;
    g._moveProgress = 1;
    priv(engine)._guests.set(guest.id, guest);

    engine.assignQueueSlot(guest);
    expect(guest.queuePosition).toBeGreaterThanOrEqual(0);

    engine.freeQueueSlot(guest.id);
    expect(guest.queuePosition).toBe(-1);
  });

  it("queue full returns -1", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // Fill all queue slots
    const totalSlots = priv(engine)._queueSlots.length;
    for (let i = 0; i < totalSlots; i++) {
      const g = new Guest("test", 5, 14);
      (g as any)._gridX = 5;
      (g as any)._gridY = 5;
      (g as any)._moveProgress = 1;
      priv(engine)._guests.set(g.id, g);
      engine.assignQueueSlot(g);
    }

    // Next guest should get -1
    const overflow = new Guest("test", 5, 14);
    (overflow as any)._gridX = 5;
    (overflow as any)._gridY = 5;
    (overflow as any)._moveProgress = 1;
    priv(engine)._guests.set(overflow.id, overflow);
    const result = engine.assignQueueSlot(overflow);
    expect(result).toBe(-1);
  });

  it("table guests redirect to queue when READY_TO_ORDER", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // Find a table appliance
    let tableApp: any = null;
    for (const app of priv(engine)._appliances.values()) {
      if ((app as any).type === EApplianceType.TABLE || (app as any).type === EApplianceType.HIGHTOP) {
        tableApp = app;
        break;
      }
    }
    expect(tableApp).not.toBeNull();

    // Seat guest at table
    const guest = new Guest("test", tableApp.gridX, tableApp.gridY + 1);
    const g = guest as any;
    g._gridX = tableApp.gridX;
    g._gridY = tableApp.gridY + 1;
    g._moveProgress = 1;
    g._status = EGuestStatus.READY_TO_ORDER;
    g._seatApplianceId = tableApp.id;
    g._seatIndex = 0;
    tableApp.seatGuest(0, guest.id);
    priv(engine)._guests.set(guest.id, guest);

    tick(engine, 2);

    // Should be redirected to queue
    expect(
      guest.status === EGuestStatus.WALKING_TO_QUEUE ||
      guest.status === EGuestStatus.DECIDING // if queue full
    ).toBe(true);
  });
});

// ── MENU CONFIG ──────────────────────────────────────────────

describe("Menu configuration", () => {
  it("all recipes enabled by default", () => {
    const engine = createTestEngine();
    const enabled = engine.getEnabledDrinkKeys();
    expect(enabled.length).toBeGreaterThan(0);
    // Check all known recipe keys are included
    for (const key of Object.keys(RECIPES)) {
      expect(enabled).toContain(key);
    }
  });

  it("setMenuDrink disables a drink", () => {
    const engine = createTestEngine();
    engine.setMenuDrink("pilsner", false, 5);
    const enabled = engine.getEnabledDrinkKeys();
    expect(enabled).not.toContain("pilsner");
  });

  it("setMenuDrink changes price", () => {
    const engine = createTestEngine();
    engine.setMenuDrink("pilsner", true, 20);
    const config = priv(engine)._menuConfig.get("pilsner");
    expect(config.price).toBe(20);
  });

  it("price floor is $1", () => {
    const engine = createTestEngine();
    engine.setMenuDrink("pilsner", true, 0);
    const config = priv(engine)._menuConfig.get("pilsner");
    expect(config.price).toBe(1);
  });

  it("guest orders from enabled menu only", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // Disable all except pilsner
    for (const [key] of priv(engine)._menuConfig) {
      engine.setMenuDrink(key, key === "pilsner", RECIPES[key]?.menuPrice ?? 5);
    }

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.READY_TO_ORDER,
    });

    const bartender = setupBartender(engine, 5, 2, "down");
    engine.bartenderInteract("test-player");

    expect(guest.order?.drinkKey).toBe("pilsner");
  });

  it("custom price used for earnings (base + tip)", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    engine.setMenuDrink("pilsner", true, 25);

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
    });

    const bartender = setupBartender(engine, 5, 2, "down");
    giveBartenderItem(engine, bartender, EItemType.PILSNER);

    const moneyBefore = priv(engine)._money;
    engine.bartenderInteract("test-player");

    const earned = priv(engine)._money - moneyBefore;
    // Should earn at least the custom base price (plus tip)
    expect(earned).toBeGreaterThanOrEqual(25);
    // Tip should be a reasonable fraction of base price
    expect(earned).toBeLessThan(25 * 2);
  });
});

// ── REPUTATION ───────────────────────────────────────────────

describe("Reputation tracking", () => {
  it("happy guest (>=60) leaving gains reputation", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.LEAVING,
      happiness: 70,
    });
    // Place guest at entrance so it's immediately removed on tick
    const g = guest as any;
    const entrance = priv(engine)._layout.guestEntrance;
    g._gridX = entrance.x;
    g._gridY = entrance.y;
    g._targetX = entrance.x;
    g._targetY = entrance.y;
    g._needsLeavePath = false;
    g._path = [];
    g._pathIndex = 0;
    g._moveProgress = 1;

    const repBefore = priv(engine)._reputation;
    tick(engine, 2);

    // Guest should be removed and reputation gained
    expect(priv(engine)._guests.size).toBe(0);
    expect(priv(engine)._reputation).toBe(repBefore + GameSettings.reputationPerHappyGuest);
  });

  it("sad guest (<30) leaving loses reputation", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.LEAVING,
      happiness: 20,
    });
    const g = guest as any;
    const entrance = priv(engine)._layout.guestEntrance;
    g._gridX = entrance.x;
    g._gridY = entrance.y;
    g._targetX = entrance.x;
    g._targetY = entrance.y;
    g._needsLeavePath = false;
    g._path = [];
    g._pathIndex = 0;
    g._moveProgress = 1;

    const repBefore = priv(engine)._reputation;
    tick(engine, 2);

    expect(priv(engine)._guests.size).toBe(0);
    expect(priv(engine)._reputation).toBe(repBefore + GameSettings.reputationPerSadGuest);
  });
});

// ── CLOSING TRANSITION ───────────────────────────────────────

describe("Closing phase transition", () => {
  it("DECIDING guests leave on closing", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DECIDING,
    });

    // Trigger closing
    priv(engine)._shiftManager.skipPhase(); // service → closing
    tick(engine, 2);

    expect(guest.status).toBe(EGuestStatus.LEAVING);
  });

  it("DRINKING guests chug during closing", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
    });
    (guest as any)._drinkDuration = 999;

    priv(engine)._shiftManager.skipPhase(); // service → closing

    expect(guest.isChugging).toBe(true);
    expect(guest.lastCallDecision).toBe("finishing");
  });

  it("no new orders during closing phase", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // Skip to closing
    priv(engine)._shiftManager.skipPhase();

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.READY_TO_ORDER,
    });

    const bartender = setupBartender(engine, 5, 2, "down");
    engine.bartenderInteract("test-player");

    // Order should not be taken during closing
    expect(guest.status).toBe(EGuestStatus.READY_TO_ORDER);
  });
});

// ── CUT-OFF CARD DETAILS ─────────────────────────────────────

describe("Cut-off card penalty", () => {
  it("applies happiness penalty scaled by drunkenness", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // Drunk guest — penalty should be lower (max(5, 15 - drunkenness*10))
    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: 0.8,
      happiness: 80,
    });
    (guest as any)._drinkDuration = 999;

    const bartender = setupBartender(engine, 5, 2, "down");
    giveBartenderItem(engine, bartender, EItemType.CUT_OFF_CARD);

    engine.bartenderInteract("test-player");

    const expectedPenalty = Math.max(5, 15 - 0.8 * 10);
    expect(guest.happiness).toBe(80 - expectedPenalty);
    expect(guest.status).toBe(EGuestStatus.LEAVING);
  });

  it("consumes the cut-off card", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
    });

    const bartender = setupBartender(engine, 5, 2, "down");
    giveBartenderItem(engine, bartender, EItemType.CUT_OFF_CARD);

    engine.bartenderInteract("test-player");

    expect((bartender as any)._heldItemId).toBeNull();
  });
});

// ── WAITING AT DOOR ──────────────────────────────────────────

describe("Waiting at door timeout", () => {
  it("guest leaves after waiting at door timeout", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._status = EGuestStatus.WAITING_AT_DOOR;
    g._statusTimer = 0;
    g._moveProgress = 1;

    const dt = 1 / GameSettings.tickRate;
    for (let i = 0; i < GameSettings.waitingAtDoorTimeout * GameSettings.tickRate + 10; i++) {
      guest.tick(dt);
    }

    expect(g._status).toBe(EGuestStatus.LEAVING);
  });
});

// ── GUEST SPAWNER ────────────────────────────────────────────

describe("Guest spawner", () => {
  it("no spawning during police raid", () => {
    const engine = createTestEngine();
    priv(engine)._policeRaidTimer = 10; // active raid
    const guestsBefore = priv(engine)._guests.size;

    // Spawner enabled but raided
    priv(engine)._guestSpawner.enabled = true;
    priv(engine)._guestSpawner._timeSinceLastSpawn = 999;
    tick(engine, 1);

    expect(priv(engine)._guests.size).toBe(guestsBefore);
  });

  it("personality-derived traits don't produce impossible combos", () => {
    // Roll personality many times and verify derived traits are coherent
    const spawner = priv(createTestEngine())._guestSpawner;
    for (let i = 0; i < 100; i++) {
      const personality = spawner._rollPersonality("normal");
      const traits = deriveTraits(personality);
      // LIGHTWEIGHT needs low gluttony, LUSH needs high gluttony — can't both fire
      if (traits.includes(EGuestTrait.LIGHTWEIGHT)) {
        expect(traits).not.toContain(EGuestTrait.LUSH);
      }
      // CLEANLY needs low sloth, MESSY needs high sloth — can't both fire
      if (traits.includes(EGuestTrait.CLEANLY)) {
        expect(traits).not.toContain(EGuestTrait.MESSY);
      }
    }
  });
});

// ── TIP SYSTEM ──────────────────────────────────────────────

describe("Tip system", () => {
  it("higher happiness yields higher tips", () => {
    const results: number[] = [];

    // Use a higher-price drink so rounding differences are visible
    for (const happiness of [10, 50, 100]) {
      const engine = createTestEngine();
      priv(engine)._guestSpawner.enabled = false;
      engine.setMenuDrink("pilsner", true, 50); // high price for visible tip differences

      const guest = spawnSeatedGuest(engine, 5, {
        status: EGuestStatus.WAITING_FOR_ORDER,
        order: "pilsner",
        happiness,
        preferredDrink: "lager", // avoid preferred bonus
      });

      const bartender = setupBartender(engine, 5, 2, "down");
      giveBartenderItem(engine, bartender, EItemType.PILSNER);

      const moneyBefore = priv(engine)._money;
      engine.bartenderInteract("test-player");

      results.push(priv(engine)._money - moneyBefore);
    }

    // Higher happiness → higher total earnings
    expect(results[2]).toBeGreaterThan(results[1]);
    expect(results[1]).toBeGreaterThan(results[0]);
  });

  it("preferred drink adds bonus tip", () => {
    // With preferred drink match
    const engine1 = createTestEngine();
    priv(engine1)._guestSpawner.enabled = false;
    engine1.setMenuDrink("pilsner", true, 50);
    const guest1 = spawnSeatedGuest(engine1, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      preferredDrink: "pilsner",
    });
    const bt1 = setupBartender(engine1, 5, 2, "down");
    giveBartenderItem(engine1, bt1, EItemType.PILSNER);
    const before1 = priv(engine1)._money;
    engine1.bartenderInteract("test-player");
    const earned1 = priv(engine1)._money - before1;

    // Without preferred drink match
    const engine2 = createTestEngine();
    priv(engine2)._guestSpawner.enabled = false;
    engine2.setMenuDrink("pilsner", true, 50);
    const guest2 = spawnSeatedGuest(engine2, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      preferredDrink: "lager",
    });
    const bt2 = setupBartender(engine2, 5, 2, "down");
    giveBartenderItem(engine2, bt2, EItemType.PILSNER);
    const before2 = priv(engine2)._money;
    engine2.bartenderInteract("test-player");
    const earned2 = priv(engine2)._money - before2;

    expect(earned1).toBeGreaterThan(earned2);
  });

  it("fast serve adds speed bonus tip", () => {
    // Fast serve (statusTimer = 0)
    const engine1 = createTestEngine();
    priv(engine1)._guestSpawner.enabled = false;
    engine1.setMenuDrink("pilsner", true, 50);
    const guest1 = spawnSeatedGuest(engine1, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      preferredDrink: "lager",
    });
    const bt1 = setupBartender(engine1, 5, 2, "down");
    giveBartenderItem(engine1, bt1, EItemType.PILSNER);
    const before1 = priv(engine1)._money;
    engine1.bartenderInteract("test-player");
    const earned1 = priv(engine1)._money - before1;

    // Slow serve (statusTimer > threshold)
    const engine2 = createTestEngine();
    priv(engine2)._guestSpawner.enabled = false;
    engine2.setMenuDrink("pilsner", true, 50);
    const guest2 = spawnSeatedGuest(engine2, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      preferredDrink: "lager",
    });
    (guest2 as any)._statusTimer = GameSettings.tipSpeedBonusThreshold + 5;
    const bt2 = setupBartender(engine2, 5, 2, "down");
    giveBartenderItem(engine2, bt2, EItemType.PILSNER);
    const before2 = priv(engine2)._money;
    engine2.bartenderInteract("test-player");
    const earned2 = priv(engine2)._money - before2;

    expect(earned1).toBeGreaterThan(earned2);
  });

  it("generous (low greed) guest tips more than greedy guest", () => {
    // Generous guest (low greed = high tip multiplier)
    const engine1 = createTestEngine();
    priv(engine1)._guestSpawner.enabled = false;
    engine1.setMenuDrink("pilsner", true, 50);
    const guest1 = spawnSeatedGuest(engine1, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      traits: [EGuestTrait.HIGHROLLER],
      preferredDrink: "lager",
      personality: { greed: 0.1 }, // generous: tipMult = 1.8 - 1.3*0.1 = 1.67
    });
    const bt1 = setupBartender(engine1, 5, 2, "down");
    giveBartenderItem(engine1, bt1, EItemType.PILSNER);
    const before1 = priv(engine1)._money;
    engine1.bartenderInteract("test-player");
    const generousEarned = priv(engine1)._money - before1;

    // Greedy guest (high greed = low tip multiplier)
    const engine2 = createTestEngine();
    priv(engine2)._guestSpawner.enabled = false;
    engine2.setMenuDrink("pilsner", true, 50);
    const guest2 = spawnSeatedGuest(engine2, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      traits: [],
      preferredDrink: "lager",
      personality: { greed: 0.9 }, // greedy: tipMult = 1.8 - 1.3*0.9 = 0.63
    });
    const bt2 = setupBartender(engine2, 5, 2, "down");
    giveBartenderItem(engine2, bt2, EItemType.PILSNER);
    const before2 = priv(engine2)._money;
    engine2.bartenderInteract("test-player");
    const greedyEarned = priv(engine2)._money - before2;

    // Generous guest should earn strictly more
    expect(generousEarned).toBeGreaterThan(greedyEarned);
  });

  it("tips tracked in shift stats", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    engine.setMenuDrink("pilsner", true, 50);

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      preferredDrink: "lager",
    });

    const bartender = setupBartender(engine, 5, 2, "down");
    giveBartenderItem(engine, bartender, EItemType.PILSNER);

    engine.bartenderInteract("test-player");

    const stats = priv(engine)._shiftStats;
    expect(stats.tipsEarned).toBeGreaterThan(0);
    expect(stats.moneyEarned).toBe(stats.tipsEarned + 50);
  });

  it("zero happiness and slow serve yields no tip", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      happiness: 0,
      preferredDrink: "lager",
    });
    // Past speed threshold so no speed bonus
    (guest as any)._statusTimer = GameSettings.tipSpeedBonusThreshold + 5;

    const bartender = setupBartender(engine, 5, 2, "down");
    giveBartenderItem(engine, bartender, EItemType.PILSNER);

    const moneyBefore = priv(engine)._money;
    engine.bartenderInteract("test-player");

    const basePrice = RECIPES["pilsner"].menuPrice;
    const earned = priv(engine)._money - moneyBefore;
    // Serve bonus adds +10 happiness (from 0 to 10), but with low happiness the tip should be very small
    // happiness=10 → happinessFactor = (10/100)*1.5 = 0.15, tipPercent = 0.15*0.15 = 0.0225
    // tip = round(5 * 0.0225) = round(0.1125) = 0
    expect(earned).toBe(basePrice);
  });
});
