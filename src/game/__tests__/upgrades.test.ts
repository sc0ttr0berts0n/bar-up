/**
 * Upgrade system tests — purchase validation, effects, persistence across shift reset.
 */
import { describe, it, expect } from "vitest";
import { createTestEngine, priv } from "./engineHelper";
import { EUpgradeId } from "../Shared/UpgradeTypes";
import { EApplianceType } from "../Shared/ApplianceTypes";
import GameSettings from "../Shared/GameSettings";

describe("Upgrade — purchase validation", () => {
  it("purchaseUpgrade deducts money", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._phase = "prep";
    const moneyBefore = priv(engine)._money;
    const result = engine.purchaseUpgrade(EUpgradeId.FAST_SINK);
    expect(result).toBe(true);
    expect(priv(engine)._money).toBe(moneyBefore - 150);
  });

  it("purchaseUpgrade fails without enough money", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._phase = "prep";
    priv(engine)._money = 50;
    const result = engine.purchaseUpgrade(EUpgradeId.FAST_SINK);
    expect(result).toBe(false);
    expect(priv(engine)._money).toBe(50);
  });

  it("purchaseUpgrade fails at max level", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._phase = "prep";
    priv(engine)._money = 5000;
    // Buy all 3 levels of FAST_SINK
    engine.purchaseUpgrade(EUpgradeId.FAST_SINK);
    engine.purchaseUpgrade(EUpgradeId.FAST_SINK);
    engine.purchaseUpgrade(EUpgradeId.FAST_SINK);
    expect(engine.getUpgradeLevel(EUpgradeId.FAST_SINK)).toBe(3);
    const moneyBefore = priv(engine)._money;
    const result = engine.purchaseUpgrade(EUpgradeId.FAST_SINK);
    expect(result).toBe(false);
    expect(priv(engine)._money).toBe(moneyBefore);
  });

  it("purchaseUpgrade fails outside prep phase", () => {
    const engine = createTestEngine();
    priv(engine)._money = 5000;
    // Default phase is service (spawner enabled)
    const result = engine.purchaseUpgrade(EUpgradeId.FAST_SINK);
    expect(result).toBe(false);
  });

  it("purchaseUpgrade fails for invalid upgrade id", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._phase = "prep";
    priv(engine)._money = 5000;
    const result = engine.purchaseUpgrade("nonexistent");
    expect(result).toBe(false);
  });
});

describe("Upgrade — FAST_SINK effect", () => {
  it("reduces wash duration per level", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._phase = "prep";
    priv(engine)._money = 5000;

    // Find sink widget config
    const sinkWidget = [...priv(engine)._appliances.values()].find(
      (a: any) => a.type === EApplianceType.SINK,
    );
    expect(sinkWidget).toBeDefined();

    engine.purchaseUpgrade(EUpgradeId.FAST_SINK);
    // Level 1: 1.0 - 0.2 = 0.8
    expect(sinkWidget!._widgetConfig.transforms[0].duration).toBeCloseTo(0.8);

    engine.purchaseUpgrade(EUpgradeId.FAST_SINK);
    // Level 2: 1.0 - 0.4 = 0.6
    expect(sinkWidget!._widgetConfig.transforms[0].duration).toBeCloseTo(0.6);

    engine.purchaseUpgrade(EUpgradeId.FAST_SINK);
    // Level 3: 1.0 - 0.6 = 0.4
    expect(sinkWidget!._widgetConfig.transforms[0].duration).toBeCloseTo(0.4);
  });
});

describe("Upgrade — STOCK_CAPACITY effect", () => {
  it("increases maxStock of stocked appliances by 5 per level", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._phase = "prep";
    priv(engine)._money = 5000;

    // Find a stocked appliance (e.g., DRAFT_SYSTEM)
    const stocked = [...priv(engine)._appliances.values()].find(
      (a: any) => a.type === EApplianceType.DRAFT_SYSTEM,
    ) as any;
    expect(stocked).toBeDefined();
    const baseMax = stocked._maxStock;

    engine.purchaseUpgrade(EUpgradeId.STOCK_CAPACITY);
    expect(stocked._maxStock).toBe(baseMax + 5);

    engine.purchaseUpgrade(EUpgradeId.STOCK_CAPACITY);
    expect(stocked._maxStock).toBe(baseMax + 10);
  });
});

describe("Upgrade — EXTRA_QUEUE effect", () => {
  it("adds 3 queue slots per level", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._phase = "prep";
    priv(engine)._money = 5000;

    const baseSlots = priv(engine)._queueSlots.length;

    engine.purchaseUpgrade(EUpgradeId.EXTRA_QUEUE);
    expect(priv(engine)._queueSlots.length).toBe(baseSlots + 3);

    engine.purchaseUpgrade(EUpgradeId.EXTRA_QUEUE);
    expect(priv(engine)._queueSlots.length).toBe(baseSlots + 6);
  });
});

describe("Upgrade — upgradeState", () => {
  it("returns correct level map after purchases", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._phase = "prep";
    priv(engine)._money = 5000;

    engine.purchaseUpgrade(EUpgradeId.FAST_SINK);
    engine.purchaseUpgrade(EUpgradeId.STOCK_CAPACITY);
    engine.purchaseUpgrade(EUpgradeId.FAST_SINK);

    const state = engine.upgradeState;
    expect(state.levels[EUpgradeId.FAST_SINK]).toBe(2);
    expect(state.levels[EUpgradeId.STOCK_CAPACITY]).toBe(1);
  });
});

describe("Upgrade — persistence across shift reset", () => {
  it("stock capacity upgrade persists after shift expenses", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._phase = "prep";
    priv(engine)._money = 5000;

    engine.purchaseUpgrade(EUpgradeId.STOCK_CAPACITY);

    const stocked = [...priv(engine)._appliances.values()].find(
      (a: any) => a.type === EApplianceType.DRAFT_SYSTEM,
    ) as any;
    const maxAfterUpgrade = stocked._maxStock;

    // Simulate shift expenses (restock fills to maxStock)
    priv(engine)._shiftStats = { fights: 0 };
    priv(engine)._calculateShiftExpenses();

    // maxStock should still include the upgrade bonus
    expect(stocked._maxStock).toBe(maxAfterUpgrade);
    // currentStock should be fully restocked
    expect(stocked._currentStock).toBe(maxAfterUpgrade);
  });

  it("upgrade levels persist across shift expenses", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._phase = "prep";
    priv(engine)._money = 5000;

    engine.purchaseUpgrade(EUpgradeId.FAST_SINK);
    engine.purchaseUpgrade(EUpgradeId.EXTRA_QUEUE);

    priv(engine)._shiftStats = { fights: 0 };
    priv(engine)._calculateShiftExpenses();

    expect(engine.getUpgradeLevel(EUpgradeId.FAST_SINK)).toBe(1);
    expect(engine.getUpgradeLevel(EUpgradeId.EXTRA_QUEUE)).toBe(1);
  });
});
