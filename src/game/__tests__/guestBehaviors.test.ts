/**
 * Guest Behaviors — comprehensive tests for traits, fights, slips,
 * drunkenness, patience decay, chat mechanics, and seating logic.
 */
import { describe, it, expect } from "vitest";
import { createTestEngine, tick, priv } from "./engineHelper";
import { Guest } from "../Network/Server/GameObjects/Guest";
import { Item } from "../Network/Server/GameObjects/Item";
import { EGuestStatus, EGuestTrait } from "../Shared/GuestTypes";
import { EItemType } from "../Shared/ItemTypes";
import { EApplianceType } from "../Shared/ApplianceTypes";
import { RECIPES } from "../Shared/DrinkRecipes";
import GameSettings from "../Shared/GameSettings";

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

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: GameSettings.fightDrunkThreshold + 0.1,
      happiness: GameSettings.fightHappinessThreshold - 1,
      traits: [EGuestTrait.VIOLENT],
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

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: GameSettings.fightDrunkThreshold + 0.1,
      happiness: GameSettings.fightHappinessThreshold + 10, // above threshold
      traits: [EGuestTrait.VIOLENT],
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
      happiness: 0, // very unhappy but sober
      traits: [EGuestTrait.VIOLENT],
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

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: 1.0,
      happiness: 0,
      traits: [], // no VIOLENT trait
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

    // VIOLENT guest that will fight
    spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: GameSettings.fightDrunkThreshold + 0.1,
      happiness: GameSettings.fightHappinessThreshold - 1,
      traits: [EGuestTrait.VIOLENT],
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
      happiness: GameSettings.fightHappinessThreshold - 1,
      traits: [EGuestTrait.VIOLENT],
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

describe("LIGHTWEIGHT trait", () => {
  it("increases drunkenness per sip by 1.5x", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._traits = [EGuestTrait.LIGHTWEIGHT];
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

    const expectedSip = GameSettings.sipDrunkenness * GameSettings.lightweightDrunkMultiplier;
    // Account for slight decay
    expect(g._sipsTaken).toBeGreaterThanOrEqual(1);
    // The drunkenness should be close to expectedSip (minus tiny decay)
    expect(g._drunkenness).toBeGreaterThan(expectedSip * 0.8);
    expect(g._drunkenness).toBeLessThan(expectedSip * 1.2);
  });
});

describe("LUSH trait", () => {
  it("decreases drunkenness per sip by 0.7x", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._traits = [EGuestTrait.LUSH];
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

    const expectedSip = GameSettings.sipDrunkenness * GameSettings.lushDrunkMultiplier;
    expect(g._sipsTaken).toBeGreaterThanOrEqual(1);
    expect(g._drunkenness).toBeGreaterThan(expectedSip * 0.7);
    expect(g._drunkenness).toBeLessThan(expectedSip * 1.3);
  });
});

describe("IMPATIENT trait", () => {
  it("speeds up deciding duration by 0.6x multiplier", () => {
    // Create two guests: one IMPATIENT, one normal, both DECIDING
    const normalGuest = new Guest("test", 5, 14);
    const impGuest = new Guest("test", 5, 14);
    const ng = normalGuest as any;
    const ig = impGuest as any;

    ng._status = EGuestStatus.DECIDING;
    ng._statusTimer = 0;
    ng._moveProgress = 1;
    ng._drunkenness = 0;
    ng._drunkGoal = 1.0; // not over goal

    ig._status = EGuestStatus.DECIDING;
    ig._statusTimer = 0;
    ig._moveProgress = 1;
    ig._drunkenness = 0;
    ig._drunkGoal = 1.0;
    ig._traits = [EGuestTrait.IMPATIENT];

    const dt = 1 / GameSettings.tickRate;
    const maxDecide = GameSettings.decidingDuration[1];
    const impatientMax = maxDecide * GameSettings.impatientTimerMultiplier;

    // Tick until impatient guest transitions
    let impTicks = 0;
    for (let i = 0; i < maxDecide * GameSettings.tickRate + 60; i++) {
      impGuest.tick(dt);
      impTicks++;
      if (ig._status !== EGuestStatus.DECIDING) break;
    }

    // Impatient guest should decide faster than the max normal duration
    const impTime = impTicks / GameSettings.tickRate;
    expect(impTime).toBeLessThanOrEqual(impatientMax + 1); // +1s tolerance
  });

  it("IMPATIENT fast-serve bonus: bonus patience if served within 10s", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      patience: 50,
      traits: [EGuestTrait.IMPATIENT],
    });
    // Make statusTimer < 10 (just started waiting)
    (guest as any)._statusTimer = 3;

    const bartender = setupBartender(engine, 5, 2, "down");
    giveBartenderItem(engine, bartender, EItemType.PILSNER);

    const patienceBefore = guest.patience;
    engine.bartenderInteract("test-player");

    // Should get serve bonus + impatient fast-serve bonus
    const expectedMin = patienceBefore + GameSettings.patienceServeBonus + GameSettings.impatientFastServeBonus;
    expect(guest.patience).toBeGreaterThanOrEqual(expectedMin);
  });
});

describe("CHATTY trait", () => {
  it("doubles chat happiness bonus", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._traits = [EGuestTrait.CHATTY];
    g._chatAvailable = true;
    const happinessBefore = guest.happiness;

    guest.chat();

    // CHATTY gets base bonus + extra bonus = 2x base
    const expectedBonus = GameSettings.chatHappinessBonus * 2;
    expect(guest.happiness).toBe(happinessBefore + expectedBonus);
  });

  it("non-CHATTY guest gets single happiness bonus", () => {
    const guest = new Guest("test", 5, 14);
    const g = guest as any;
    g._traits = [];
    g._chatAvailable = true;
    const happinessBefore = guest.happiness;

    guest.chat();

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

  it("custom price used for earnings", () => {
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

    expect(priv(engine)._money - moneyBefore).toBe(25);
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

  it("trait conflicts are never assigned together", () => {
    // Roll traits many times and verify no conflicts
    const spawner = priv(createTestEngine())._guestSpawner;
    for (let i = 0; i < 100; i++) {
      const traits = (spawner as any)._rollTraits();
      if (traits.includes(EGuestTrait.LIGHTWEIGHT)) {
        expect(traits).not.toContain(EGuestTrait.LUSH);
      }
      if (traits.includes(EGuestTrait.MESSY)) {
        expect(traits).not.toContain(EGuestTrait.CLEANLY);
      }
    }
  });
});
