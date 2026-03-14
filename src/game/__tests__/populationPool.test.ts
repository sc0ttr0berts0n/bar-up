/**
 * PopulationPool unit tests — generation, affinity, regulars.
 */
import { describe, it, expect } from "vitest";
import { PopulationPool, POOL_SIZE, REGULAR_THRESHOLD } from "../Network/Server/GameObjects/PopulationPool";
import { createTestEngine, tick, priv } from "./engineHelper";

describe("PopulationPool", () => {
  describe("generation", () => {
    it("generates POOL_SIZE townsfolk", () => {
      const pool = new PopulationPool();
      pool.generate();
      expect(pool.size).toBe(POOL_SIZE);
    });

    it("each townsfolk has valid personality floats", () => {
      const pool = new PopulationPool();
      pool.generate();
      for (const person of pool.pool) {
        expect(person.personality.wrath).toBeGreaterThanOrEqual(0);
        expect(person.personality.wrath).toBeLessThanOrEqual(1);
        expect(person.personality.greed).toBeGreaterThanOrEqual(0);
        expect(person.personality.greed).toBeLessThanOrEqual(1);
        expect(person.personality.gluttony).toBeGreaterThanOrEqual(0);
        expect(person.personality.gluttony).toBeLessThanOrEqual(1);
        expect(person.personality.sloth).toBeGreaterThanOrEqual(0);
        expect(person.personality.sloth).toBeLessThanOrEqual(1);
        expect(person.personality.pride).toBeGreaterThanOrEqual(0);
        expect(person.personality.pride).toBeLessThanOrEqual(1);
        expect(person.personality.envy).toBeGreaterThanOrEqual(0);
        expect(person.personality.envy).toBeLessThanOrEqual(1);
        expect(person.personality.lust).toBeGreaterThanOrEqual(0);
        expect(person.personality.lust).toBeLessThanOrEqual(1);
      }
    });

    it("each townsfolk has a name", () => {
      const pool = new PopulationPool();
      pool.generate();
      for (const person of pool.pool) {
        expect(person.name.length).toBeGreaterThan(0);
      }
    });

    it("each townsfolk has a preferred drink", () => {
      const pool = new PopulationPool();
      pool.generate();
      for (const person of pool.pool) {
        expect(person.preferredDrink.length).toBeGreaterThan(0);
      }
    });

    it("each townsfolk starts with zero visits", () => {
      const pool = new PopulationPool();
      pool.generate();
      for (const person of pool.pool) {
        expect(person.visitCount).toBe(0);
        expect(person.lastVisitShift).toBe(-1);
        expect(person.lifetimeSpend).toBe(0);
      }
    });

    it("each townsfolk has a unique id", () => {
      const pool = new PopulationPool();
      pool.generate();
      const ids = new Set(pool.pool.map(p => p.id));
      expect(ids.size).toBe(POOL_SIZE);
    });
  });

  describe("affinity", () => {
    it("recalculateAffinities sets affinity for all townsfolk", () => {
      const pool = new PopulationPool();
      pool.generate();
      pool.recalculateAffinities(0, ["pilsner", "lager"], 1);
      for (const person of pool.pool) {
        expect(person.affinity).toBeGreaterThanOrEqual(0);
        expect(person.affinity).toBeLessThanOrEqual(1);
      }
    });

    it("higher reputation increases affinity for virtuous townsfolk", () => {
      const pool = new PopulationPool();
      pool.generate();

      // Find a very virtuous person (low sin values)
      const virtuous = pool.pool.find(p =>
        p.personality.wrath < 0.2 && p.personality.greed < 0.2 &&
        p.personality.sloth < 0.2 && p.personality.pride < 0.2
      );
      if (!virtuous) return; // unlikely but possible

      const drinks = ["pilsner"];
      pool.recalculateAffinities(0, drinks, 1);
      const affinityAtZeroRep = virtuous.affinity;

      pool.recalculateAffinities(20, drinks, 2);
      const affinityAtHighRep = virtuous.affinity;

      expect(affinityAtHighRep).toBeGreaterThan(affinityAtZeroRep);
    });

    it("regulars have higher affinity from regular bonus", () => {
      const pool = new PopulationPool();
      pool.generate();

      const person = pool.pool[0];
      const drinks = [person.preferredDrink];

      // Before visits
      pool.recalculateAffinities(0, drinks, 1);
      const affinityBefore = person.affinity;

      // Simulate becoming a regular
      for (let i = 0; i < REGULAR_THRESHOLD; i++) {
        pool.recordVisit(person.id, i, 10, 70);
      }

      pool.recalculateAffinities(0, drinks, REGULAR_THRESHOLD + 1);
      const affinityAfter = person.affinity;

      expect(affinityAfter).toBeGreaterThan(affinityBefore);
    });

    it("recent visitors have lower affinity (same shift)", () => {
      const pool = new PopulationPool();
      pool.generate();
      const person = pool.pool[0];
      const drinks = [person.preferredDrink];

      pool.recalculateAffinities(0, drinks, 1);
      const normalAffinity = person.affinity;

      // Simulate a visit this shift
      pool.recordVisit(person.id, 2, 10, 70);
      pool.recalculateAffinities(0, drinks, 2);
      const sameShiftAffinity = person.affinity;

      expect(sameShiftAffinity).toBeLessThan(normalAffinity);
    });
  });

  describe("picking", () => {
    it("pickTownsfolk returns requested count", () => {
      const pool = new PopulationPool();
      pool.generate();
      pool.recalculateAffinities(0, ["pilsner"], 1);

      const picked = pool.pickTownsfolk(4, new Set(), 1);
      expect(picked.length).toBe(4);
    });

    it("pickTownsfolk excludes active ids", () => {
      const pool = new PopulationPool();
      pool.generate();
      pool.recalculateAffinities(0, ["pilsner"], 1);

      const active = new Set([0, 1, 2, 3, 4]);
      const picked = pool.pickTownsfolk(5, active, 1);
      for (const p of picked) {
        expect(active.has(p.id)).toBe(false);
      }
    });

    it("pickTownsfolk excludes same-shift visitors", () => {
      const pool = new PopulationPool();
      pool.generate();

      // Mark first 10 as visited this shift
      for (let i = 0; i < 10; i++) {
        pool.recordVisit(i, 5, 10, 60);
      }

      pool.recalculateAffinities(0, ["pilsner"], 5);
      const picked = pool.pickTownsfolk(20, new Set(), 5);
      for (const p of picked) {
        expect(p.lastVisitShift).not.toBe(5);
      }
    });
  });

  describe("visit recording", () => {
    it("recordVisit increments visit count", () => {
      const pool = new PopulationPool();
      pool.generate();

      pool.recordVisit(0, 1, 15, 70);
      const person = pool.getTownsfolk(0)!;
      expect(person.visitCount).toBe(1);
      expect(person.lastVisitShift).toBe(1);
      expect(person.lifetimeSpend).toBe(15);
      expect(person.visitHappinessSum).toBe(70);
    });

    it("recordVisit accumulates over multiple visits", () => {
      const pool = new PopulationPool();
      pool.generate();

      pool.recordVisit(0, 1, 15, 70);
      pool.recordVisit(0, 2, 20, 80);
      const person = pool.getTownsfolk(0)!;
      expect(person.visitCount).toBe(2);
      expect(person.lastVisitShift).toBe(2);
      expect(person.lifetimeSpend).toBe(35);
      expect(person.visitHappinessSum).toBe(150);
    });
  });

  describe("regulars", () => {
    it("isRegular returns false for new townsfolk", () => {
      const pool = new PopulationPool();
      pool.generate();
      expect(pool.isRegular(0)).toBe(false);
    });

    it("isRegular returns true after REGULAR_THRESHOLD visits", () => {
      const pool = new PopulationPool();
      pool.generate();

      for (let i = 0; i < REGULAR_THRESHOLD; i++) {
        pool.recordVisit(0, i, 10, 60);
      }
      expect(pool.isRegular(0)).toBe(true);
    });

    it("isRegular returns false before REGULAR_THRESHOLD visits", () => {
      const pool = new PopulationPool();
      pool.generate();

      for (let i = 0; i < REGULAR_THRESHOLD - 1; i++) {
        pool.recordVisit(0, i, 10, 60);
      }
      expect(pool.isRegular(0)).toBe(false);
    });
  });

  describe("engine integration", () => {
    it("engine has a population pool", () => {
      const engine = createTestEngine();
      expect(priv(engine)._populationPool).toBeDefined();
      expect(priv(engine)._populationPool.size).toBe(POOL_SIZE);
    });

    it("engine tracks shift number", () => {
      const engine = createTestEngine();
      expect(priv(engine)._shiftNumber).toBe(0);
    });

    it("spawned guests have townsfolkIds", () => {
      const engine = createTestEngine();
      // Run long enough for a spawn
      tick(engine, 60 * 20);
      const guests = [...priv(engine)._guests.values()];
      if (guests.length > 0) {
        expect(guests[0].townsfolkId).toBeGreaterThanOrEqual(0);
      }
    });

    it("spawned guests from pool have names from pool", () => {
      const engine = createTestEngine();
      tick(engine, 60 * 20);
      const guests = [...priv(engine)._guests.values()];
      if (guests.length > 0) {
        const guest = guests[0];
        if (guest.townsfolkId >= 0) {
          const townsfolk = priv(engine)._populationPool.getTownsfolk(guest.townsfolkId);
          expect(guest.name).toBe(townsfolk.name);
        }
      }
    });
  });
});
