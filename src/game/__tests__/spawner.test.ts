/**
 * GuestSpawner unit tests — enable/disable, spawn timing.
 */
import { describe, it, expect } from "vitest";
import { createTestEngine, tick, priv } from "./engineHelper";

describe("GuestSpawner", () => {
  it("spawner exists on engine", () => {
    const engine = createTestEngine();
    expect(priv(engine)._guestSpawner).toBeDefined();
  });

  it("spawner starts enabled", () => {
    const engine = createTestEngine();
    expect(priv(engine)._guestSpawner.enabled).toBe(true);
  });

  it("can disable spawner", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    expect(priv(engine)._guestSpawner.enabled).toBe(false);
  });

  it("no guests spawn when disabled", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    tick(engine, 600); // 10 seconds
    expect(priv(engine)._guests.size).toBe(0);
  });

  it("guests spawn when enabled after enough time", () => {
    const engine = createTestEngine();
    // Keep spawner enabled (default)
    // guestSpawnInterval = 30s, spawner starts at 50% (15s remaining)
    // Need >15s of ticks for first spawn
    tick(engine, 60 * 20); // 20 seconds
    // At least one guest should have spawned
    expect(priv(engine)._guests.size).toBeGreaterThan(0);
  });
});
