/**
 * Phase 2 — tests for incomplete mechanics (2B-2E).
 * Verifies HIGHROLLER tips, CLEANLY mess skip, BIN/trash system,
 * and extra player starting money.
 */
import { describe, it, expect } from "vitest";
import { createTestEngine, tick, priv } from "./engineHelper";
import { Guest } from "../Network/Server/GameObjects/Guest";
import { Item } from "../Network/Server/GameObjects/Item";
import { EGuestStatus, EGuestTrait, type IPersonality } from "../Shared/GuestTypes";
import { EItemType } from "../Shared/ItemTypes";
import { EApplianceType } from "../Shared/ApplianceTypes";
import { RECIPES } from "../Shared/DrinkRecipes";
import GameSettings from "../Shared/GameSettings";

const NEUTRAL_PERSONALITY: IPersonality = { wrath: 0.5, greed: 0.5, gluttony: 0.5, sloth: 0.5, pride: 0.5, envy: 0.5, lust: 0.5 };

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
  traits?: EGuestTrait[];
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
  if (opts?.order) {
    g._order = { drinkKey: opts.order };
  }
  if (opts?.drunkenness !== undefined) {
    g._drunkenness = opts.drunkenness;
  }
  if (opts?.traits) {
    g._traits = opts.traits;
  }
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

// ── 2B: HIGHROLLER Tip Multiplier ────────────────────────────

describe("2B: HIGHROLLER tip multiplier", () => {
  it("generous guest earns more than greedy guest", () => {
    // Generous serve (low greed → high tip mult)
    const engine1 = createTestEngine();
    priv(engine1)._guestSpawner.enabled = false;
    const guest1 = spawnSeatedGuest(engine1, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      traits: [EGuestTrait.HIGHROLLER],
      personality: { greed: 0.1 }, // generous
    });
    (guest1 as any)._preferredDrink = "lager";
    const bt1 = setupBartender(engine1, 5, 2, "down");
    const item1 = new Item(EItemType.PILSNER);
    item1.pickUp("test-player");
    priv(engine1)._items.set((item1 as any)._id, item1);
    (bt1 as any)._heldItemId = (item1 as any)._id;
    (bt1 as any)._heldItemType = EItemType.PILSNER;
    const before1 = priv(engine1)._money;
    engine1.bartenderInteract("test-player");
    tick(engine1, 20);
    const hrEarned = priv(engine1)._money - before1;

    // Greedy serve (high greed → low tip mult)
    const engine2 = createTestEngine();
    priv(engine2)._guestSpawner.enabled = false;
    const guest2 = spawnSeatedGuest(engine2, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      traits: [],
      personality: { greed: 0.9 }, // greedy
    });
    (guest2 as any)._preferredDrink = "lager";
    const bt2 = setupBartender(engine2, 5, 2, "down");
    const item2 = new Item(EItemType.PILSNER);
    item2.pickUp("test-player");
    priv(engine2)._items.set((item2 as any)._id, item2);
    (bt2 as any)._heldItemId = (item2 as any)._id;
    (bt2 as any)._heldItemType = EItemType.PILSNER;
    const before2 = priv(engine2)._money;
    engine2.bartenderInteract("test-player");
    tick(engine2, 20);
    const normalEarned = priv(engine2)._money - before2;

    // Generous should earn strictly more than greedy
    expect(hrEarned).toBeGreaterThan(normalEarned);
    // Both should earn at least base price
    const basePrice = RECIPES["pilsner"].menuPrice;
    expect(hrEarned).toBeGreaterThan(basePrice);
    expect(normalEarned).toBeGreaterThanOrEqual(basePrice);
  });
});

// ── 2C: CLEANLY Trait Effect ─────────────────────────────────

describe("2C: Sloth-driven mess chance", () => {
  it("diligent guest (low sloth) rarely creates mess on drink finish", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      traits: [EGuestTrait.CLEANLY],
      drunkenness: 0, // sober, sloth=0 → messChance = 0*0.3 + 0*0.3 = 0
      personality: { sloth: 0.0 },
    });

    // Set up drink state so it completes quickly
    const g = guest as any;
    g._drinkDuration = 1;
    g._drinkProgress = 0.99;
    g._statusTimer = 0.99;
    g._sipsTaken = GameSettings.sipsPerDrink; // all sips done
    g._roundsRemaining = 0; // will leave after

    const messesBefore = priv(engine)._messes.size;

    // Tick until guest finishes drinking
    tick(engine, 120);

    // Mess count should not increase for CLEANLY guest
    expect(priv(engine)._messes.size).toBe(messesBefore);
  });

  it("slothful guest can create mess", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // sloth=0.8, drunkenness=1.0: messChance = 0.8*0.3 + 1.0*0.3 = 0.54
    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: 1.0,
      traits: [EGuestTrait.MESSY],
      personality: { sloth: 0.8 },
    });

    const g = guest as any;
    g._drinkDuration = 1;
    g._drinkProgress = 0.99;
    g._statusTimer = 0.99;
    g._sipsTaken = GameSettings.sipsPerDrink;
    g._roundsRemaining = 0;

    // Run many trials — with sloth=0.8 + drunk=1.0, messChance = 0.54
    let messCreated = false;
    for (let trial = 0; trial < 20; trial++) {
      const eng2 = createTestEngine();
      priv(eng2)._guestSpawner.enabled = false;
      const g2 = spawnSeatedGuest(eng2, 5, {
        status: EGuestStatus.DRINKING,
        drunkenness: 1.0,
        traits: [EGuestTrait.MESSY],
        personality: { sloth: 0.8 },
      });
      const gp = g2 as any;
      gp._drinkDuration = 1;
      gp._drinkProgress = 0.99;
      gp._statusTimer = 0.99;
      gp._sipsTaken = GameSettings.sipsPerDrink;
      gp._roundsRemaining = 0;

      tick(eng2, 120);
      if (priv(eng2)._messes.size > 0) {
        messCreated = true;
        break;
      }
    }
    expect(messCreated).toBe(true);
  });
});

// ── 2D: Trash System (BIN + TRASH_BAG) ──────────────────────

describe("2D: Trash system", () => {
  it("BIN accepts held item and stores as trash", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    const bin = findAppliance(engine, EApplianceType.BIN);
    expect(bin).not.toBeNull();

    const bartender = setupBartender(engine, bin.gridX, 2, "up");

    // Give bartender a dirty glass
    const item = new Item(EItemType.DIRTY_GLASS);
    item.pickUp("test-player");
    priv(engine)._items.set((item as any)._id, item);
    (bartender as any)._heldItemId = (item as any)._id;
    (bartender as any)._heldItemType = EItemType.DIRTY_GLASS;

    engine.bartenderGrab("test-player");

    expect((bartender as any)._heldItemId).toBeNull();
    expect(bin.hasAnyItem()).toBe(true);
  });

  it("empty-handed pickup from BIN creates TRASH_BAG", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    const bin = findAppliance(engine, EApplianceType.BIN);

    // Put something in the bin first
    bin.setSlot(0, "trash");

    const bartender = setupBartender(engine, bin.gridX, 2, "up");

    engine.bartenderGrab("test-player");

    expect((bartender as any)._heldItemType).toBe(EItemType.TRASH_BAG);
  });

  it("TRASH_BAG dump at entrance removes item", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // Entrance is at y=14, x=9-10
    const bartender = setupBartender(engine, 9, 13, "down");

    // Give bartender a trash bag
    const bag = new Item(EItemType.TRASH_BAG);
    bag.pickUp("test-player");
    priv(engine)._items.set((bag as any)._id, bag);
    (bartender as any)._heldItemId = (bag as any)._id;
    (bartender as any)._heldItemType = EItemType.TRASH_BAG;

    engine.bartenderGrab("test-player");

    expect((bartender as any)._heldItemId).toBeNull();
    expect((bartender as any)._heldItemType).toBeNull();
  });

  it("BIN rejects TRASH_BAG deposit", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    const bin = findAppliance(engine, EApplianceType.BIN);

    const bartender = setupBartender(engine, bin.gridX, 2, "up");

    // Give bartender a trash bag
    const bag = new Item(EItemType.TRASH_BAG);
    bag.pickUp("test-player");
    priv(engine)._items.set((bag as any)._id, bag);
    (bartender as any)._heldItemId = (bag as any)._id;
    (bartender as any)._heldItemType = EItemType.TRASH_BAG;

    engine.bartenderGrab("test-player");

    // Trash bag should still be held (BIN rejects it)
    expect((bartender as any)._heldItemType).toBe(EItemType.TRASH_BAG);
  });
});

// ── 2E: Extra Player Starting Money ──────────────────────────

describe("2E: Extra player starting money", () => {
  it("addMoney increases engine money", () => {
    const engine = createTestEngine();
    const before = priv(engine)._money;
    engine.addMoney(100);
    expect(priv(engine)._money).toBe(before + 100);
  });

  it("moneyPerExtraPlayer is configured", () => {
    expect(GameSettings.moneyPerExtraPlayer).toBeGreaterThan(0);
  });
});
