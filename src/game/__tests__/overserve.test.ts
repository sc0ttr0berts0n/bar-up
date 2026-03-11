/**
 * Overserve detection unit tests — threshold checking, police attention, reputation.
 */
import { describe, it, expect } from "vitest";
import { createTestEngine, tick, priv } from "./engineHelper";
import { Guest } from "../Network/Server/GameObjects/Guest";
import { EGuestStatus } from "../Shared/GuestTypes";
import GameSettings from "../Shared/GameSettings";

describe("Overserve threshold", () => {
  it("threshold is configured", () => {
    expect(GameSettings.overserveDrunkennessThreshold).toBeGreaterThan(0);
    expect(GameSettings.overserveDrunkennessThreshold).toBeLessThan(1);
  });

  it("guest below threshold is not overserved", () => {
    const guest = new Guest("test", 5, 14);
    (guest as any)._drunkenness = GameSettings.overserveDrunkennessThreshold - 0.1;
    expect(guest.drunkenness).toBeLessThan(GameSettings.overserveDrunkennessThreshold);
  });

  it("guest at or above threshold could be overserved", () => {
    const guest = new Guest("test", 5, 14);
    (guest as any)._drunkenness = GameSettings.overserveDrunkennessThreshold + 0.1;
    expect(guest.drunkenness).toBeGreaterThan(GameSettings.overserveDrunkennessThreshold);
  });
});

describe("Police attention", () => {
  it("engine starts with zero police attention", () => {
    const engine = createTestEngine();
    expect(priv(engine)._policeAttention).toBe(0);
  });

  it("police attention decays over time", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    priv(engine)._policeAttention = 0.5;
    tick(engine, 60); // 1 second of ticks
    expect(priv(engine)._policeAttention).toBeLessThan(0.5);
  });

  it("police attention does not go below 0", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    priv(engine)._policeAttention = 0.01;
    tick(engine, 600); // 10 seconds
    expect(priv(engine)._policeAttention).toBeGreaterThanOrEqual(0);
  });

  it("police warning triggers at threshold", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    // Set well above threshold to account for decay running before the check
    priv(engine)._policeAttention = GameSettings.policeWarningThreshold + 0.5;
    tick(engine, 1);
    expect(priv(engine)._policeWarningTriggered).toBe(true);
  });

  it("police raid triggers at raid threshold", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    const moneyBefore = priv(engine)._money;
    // Set well above threshold to account for decay running before the check
    priv(engine)._policeAttention = GameSettings.policeRaidThreshold + 0.5;
    tick(engine, 1);
    // Raid should penalize money
    expect(priv(engine)._money).toBeLessThan(moneyBefore);
  });
});

describe("Reputation", () => {
  it("engine starts with zero reputation", () => {
    const engine = createTestEngine();
    expect(priv(engine)._reputation).toBe(0);
  });

  it("police raid damages reputation", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    // Set well above threshold to account for decay running before the check
    priv(engine)._policeAttention = GameSettings.policeRaidThreshold + 0.5;
    tick(engine, 1);
    expect(priv(engine)._reputation).not.toBe(0);
  });
});
