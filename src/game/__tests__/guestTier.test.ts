/**
 * Guest tier system tests — tier assignment, stat modifiers, tip multipliers, trait bias.
 */
import { describe, it, expect } from "vitest";
import { createTestEngine, priv } from "./engineHelper";
import { Guest } from "../Network/Server/GameObjects/Guest";
import { Item } from "../Network/Server/GameObjects/Item";
import { EGuestTier, EGuestTrait, deriveTraits } from "../Shared/GuestTypes";
import { EApplianceType } from "../Shared/ApplianceTypes";
import { EItemType } from "../Shared/ItemTypes";
import GameSettings from "../Shared/GameSettings";

describe("Guest tier — applyTier", () => {
  it("default tier is NORMAL", () => {
    const guest = new Guest("party1", 10, 14);
    expect(guest.tier).toBe(EGuestTier.NORMAL);
    expect(guest.state.tier).toBe(EGuestTier.NORMAL);
  });

  it("LOW tier reduces patience and happiness", () => {
    const guest = new Guest("party1", 10, 14);
    guest.applyTier(EGuestTier.LOW);
    expect(guest.tier).toBe(EGuestTier.LOW);
    expect(guest.state.patience).toBe(GameSettings.patienceStarting + GameSettings.guestTierStats.low.patienceMod);
    expect(guest.state.happiness).toBe(GameSettings.happinessStarting + GameSettings.guestTierStats.low.happinessMod);
  });

  it("HIGH tier increases patience and happiness", () => {
    const guest = new Guest("party1", 10, 14);
    guest.applyTier(EGuestTier.HIGH);
    expect(guest.tier).toBe(EGuestTier.HIGH);
    expect(guest.state.patience).toBe(GameSettings.patienceStarting + GameSettings.guestTierStats.high.patienceMod);
    expect(guest.state.happiness).toBe(GameSettings.happinessStarting + GameSettings.guestTierStats.high.happinessMod);
  });

  it("LOW tier rounds in [1,2]", () => {
    for (let i = 0; i < 20; i++) {
      const guest = new Guest("party1", 10, 14);
      guest.applyTier(EGuestTier.LOW);
      expect(guest.state.roundsRemaining).toBeGreaterThanOrEqual(1);
      expect(guest.state.roundsRemaining).toBeLessThanOrEqual(2);
    }
  });

  it("HIGH tier rounds in [2,4]", () => {
    for (let i = 0; i < 20; i++) {
      const guest = new Guest("party1", 10, 14);
      guest.applyTier(EGuestTier.HIGH);
      expect(guest.state.roundsRemaining).toBeGreaterThanOrEqual(2);
      expect(guest.state.roundsRemaining).toBeLessThanOrEqual(4);
    }
  });

  it("NORMAL tier matches default stats", () => {
    const guest = new Guest("party1", 10, 14);
    guest.applyTier(EGuestTier.NORMAL);
    expect(guest.state.patience).toBe(GameSettings.patienceStarting);
    expect(guest.state.happiness).toBe(GameSettings.happinessStarting);
  });
});

describe("Guest tier — tip multiplier", () => {
  function servePilsnerWithTier(tier: EGuestTier): number {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    engine.setMenuDrink("pilsner", true, 100);

    // Find a counter at x=5
    const counters = [...priv(engine)._appliances.values()].filter(
      (a: any) => a.type === EApplianceType.COUNTER && a.gridX === 5,
    );
    const counter = counters[0] as any;

    // Create guest seated at counter
    const guest = new Guest("test-party", 5, 4);
    guest.applyTier(tier);
    guest.setTraits([]);
    const g = guest as any;
    g._gridX = 5;
    g._gridY = 4;
    g._targetX = 5;
    g._targetY = 4;
    g._moveProgress = 1;
    g._status = "waiting_for_order";
    g._order = { drinkKey: "pilsner" };
    g._happiness = 80;
    g._statusTimer = 5;
    g._preferredDrink = "lager"; // avoid preferred bonus
    g._seatApplianceId = counter.id;
    g._seatIndex = 0;
    g._seatApplianceGridX = counter.gridX;
    g._seatApplianceGridY = counter.gridY;
    counter.seatGuest(0, guest.id);
    priv(engine)._guests.set(guest.id, guest);

    // Setup bartender facing down at counter
    const bt = priv(engine)._bartenders[0];
    bt.assign("test-player");
    const b = bt as any;
    b._gridX = 5;
    b._gridY = 2;
    b._targetX = 5;
    b._targetY = 2;
    b._moveProgress = 1;
    b._facing = "down";

    // Give bartender a pilsner
    const item = new Item(EItemType.PILSNER);
    item.pickUp("test-player");
    priv(engine)._items.set(item.id, item);
    b._heldItemId = item.id;
    b._heldItemType = EItemType.PILSNER;

    const moneyBefore = priv(engine)._money;
    engine.bartenderInteract("test-player");
    return priv(engine)._money - moneyBefore;
  }

  it("HIGH tier tip > NORMAL > LOW for same conditions", () => {
    const earnedLow = servePilsnerWithTier(EGuestTier.LOW);
    const earnedNormal = servePilsnerWithTier(EGuestTier.NORMAL);
    const earnedHigh = servePilsnerWithTier(EGuestTier.HIGH);

    // All include base price of $100, tip varies by tier multiplier
    expect(earnedHigh).toBeGreaterThan(earnedNormal);
    expect(earnedNormal).toBeGreaterThan(earnedLow);
  });
});

describe("Guest tier — personality bias", () => {
  it("LOW tier personality skews toward sins (higher values)", () => {
    const engine = createTestEngine();
    const spawner = priv(engine)._guestSpawner;

    const N = 200;
    let totalSum = 0;

    for (let i = 0; i < N; i++) {
      const p = spawner._rollPersonality(EGuestTier.LOW);
      // Average all 7 dimensions — should be above 0.5 for LOW tier (sin-skewed)
      totalSum += (p.wrath + p.greed + p.gluttony + p.sloth + p.pride + p.envy + p.lust) / 7;
    }

    const avgPersonality = totalSum / N;
    // LOW tier mean=0.6, so average should be above 0.5
    expect(avgPersonality).toBeGreaterThan(0.5);
  });

  it("HIGH tier personality skews toward virtues (lower values)", () => {
    const engine = createTestEngine();
    const spawner = priv(engine)._guestSpawner;

    const N = 200;
    let totalSum = 0;

    for (let i = 0; i < N; i++) {
      const p = spawner._rollPersonality(EGuestTier.HIGH);
      totalSum += (p.wrath + p.greed + p.gluttony + p.sloth + p.pride + p.envy + p.lust) / 7;
    }

    const avgPersonality = totalSum / N;
    // HIGH tier mean=0.3, so average should be below 0.5
    expect(avgPersonality).toBeLessThan(0.5);
  });
});

describe("Guest tier — tier rolling", () => {
  it("high reputation shifts toward HIGH tier", () => {
    const engine = createTestEngine();
    const spawner = priv(engine)._guestSpawner;
    priv(engine)._reputation = 50;

    let highCount = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      if (spawner._rollTier() === EGuestTier.HIGH) highCount++;
    }

    // At rep=50, HIGH weight should be ~35 (baseHigh=10 + 50*0.5=35)
    // Expect at least 15% HIGH (generous lower bound)
    expect(highCount / N).toBeGreaterThan(0.15);
  });

  it("low reputation shifts toward LOW tier", () => {
    const engine = createTestEngine();
    const spawner = priv(engine)._guestSpawner;
    priv(engine)._reputation = -30;

    let lowCount = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      if (spawner._rollTier() === EGuestTier.LOW) lowCount++;
    }

    // At rep=-30, LOW weight should be ~40 (baseLow=25 + 30*0.5=40)
    // Expect at least 25% LOW (generous lower bound)
    expect(lowCount / N).toBeGreaterThan(0.25);
  });

  it("zero reputation gives baseline distribution", () => {
    const engine = createTestEngine();
    const spawner = priv(engine)._guestSpawner;
    priv(engine)._reputation = 0;

    let lowCount = 0;
    let highCount = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      const tier = spawner._rollTier();
      if (tier === EGuestTier.LOW) lowCount++;
      if (tier === EGuestTier.HIGH) highCount++;
    }

    // Baseline: 25% LOW, 10% HIGH. Wide margins for randomness.
    expect(lowCount / N).toBeGreaterThan(0.10);
    expect(lowCount / N).toBeLessThan(0.45);
    expect(highCount / N).toBeLessThan(0.25);
  });
});
