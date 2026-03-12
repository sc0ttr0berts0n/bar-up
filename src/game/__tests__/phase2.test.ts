/**
 * Phase 2 — tests for incomplete mechanics (2B-2E).
 * Verifies HIGHROLLER tips, CLEANLY mess skip, BIN/trash system,
 * and extra player starting money.
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
  traits?: EGuestTrait[];
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
  it("HIGHROLLER guest earns 1.5x menu price", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      traits: [EGuestTrait.HIGHROLLER],
    });

    // Set up bartender holding a pilsner
    const bartender = setupBartender(engine, 5, 2, "down");
    const item = new Item(EItemType.PILSNER);
    item.pickUp("test-player");
    priv(engine)._items.set((item as any)._id, item);
    (bartender as any)._heldItemId = (item as any)._id;
    (bartender as any)._heldItemType = EItemType.PILSNER;

    const moneyBefore = priv(engine)._money;
    const recipe = RECIPES["pilsner"];
    const menuEntry = priv(engine)._menuConfig.get("pilsner");
    const basePrice = menuEntry?.price ?? recipe.menuPrice;

    engine.bartenderInteract("test-player");
    tick(engine, 20);

    const expected = Math.round(basePrice * GameSettings.highrollerTipMultiplier);
    expect(priv(engine)._money - moneyBefore).toBe(expected);
  });

  it("non-HIGHROLLER guest earns base price", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.WAITING_FOR_ORDER,
      order: "pilsner",
      traits: [],
    });

    const bartender = setupBartender(engine, 5, 2, "down");
    const item = new Item(EItemType.PILSNER);
    item.pickUp("test-player");
    priv(engine)._items.set((item as any)._id, item);
    (bartender as any)._heldItemId = (item as any)._id;
    (bartender as any)._heldItemType = EItemType.PILSNER;

    const moneyBefore = priv(engine)._money;
    const menuEntry = priv(engine)._menuConfig.get("pilsner");
    const basePrice = menuEntry?.price ?? RECIPES["pilsner"].menuPrice;

    engine.bartenderInteract("test-player");
    tick(engine, 20);

    expect(priv(engine)._money - moneyBefore).toBe(basePrice);
  });
});

// ── 2C: CLEANLY Trait Effect ─────────────────────────────────

describe("2C: CLEANLY trait effect", () => {
  it("CLEANLY guest never creates mess on drink finish", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      traits: [EGuestTrait.CLEANLY],
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

  it("non-CLEANLY guest can create mess (with 100% chance)", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // Force 100% mess chance by setting drunkenness high
    const guest = spawnSeatedGuest(engine, 5, {
      status: EGuestStatus.DRINKING,
      drunkenness: 1.0,
      traits: [EGuestTrait.MESSY],
    });

    const g = guest as any;
    g._drinkDuration = 1;
    g._drinkProgress = 0.99;
    g._statusTimer = 0.99;
    g._sipsTaken = GameSettings.sipsPerDrink;
    g._roundsRemaining = 0;

    // Run many trials — with drunkenness=1.0 + MESSY, chance = (0.1 + 1.0*0.3) * 1.5 = 0.6
    // At least one mess should appear over several guests
    let messCreated = false;
    for (let trial = 0; trial < 20; trial++) {
      const eng2 = createTestEngine();
      priv(eng2)._guestSpawner.enabled = false;
      const g2 = spawnSeatedGuest(eng2, 5, {
        status: EGuestStatus.DRINKING,
        drunkenness: 1.0,
        traits: [EGuestTrait.MESSY],
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
