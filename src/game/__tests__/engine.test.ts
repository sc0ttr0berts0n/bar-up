/**
 * Engine unit tests — construction, ticking, appliance layout, bartender creation.
 */
import { describe, it, expect } from "vitest";
import { createTestEngine, tick, priv } from "./engineHelper";
import { EApplianceType } from "../Shared/ApplianceTypes";
import GameSettings from "../Shared/GameSettings";

describe("Engine construction", () => {
  it("creates without errors", () => {
    const engine = createTestEngine();
    expect(engine).toBeDefined();
  });

  it("initializes bartender slots", () => {
    const engine = createTestEngine();
    const bartenders = priv(engine)._bartenders;
    expect(bartenders.length).toBe(GameSettings.maxPlayers);
  });

  it("creates all appliances from layout", () => {
    const engine = createTestEngine();
    const appliances = priv(engine)._appliances;
    expect(appliances.size).toBeGreaterThan(0);
  });

  it("includes required appliance types", () => {
    const engine = createTestEngine();
    const types = new Set<string>();
    for (const app of priv(engine)._appliances.values()) {
      types.add(app.type);
    }
    expect(types.has(EApplianceType.GLASS_SHELF)).toBe(true);
    expect(types.has(EApplianceType.DRAFT_SYSTEM)).toBe(true);
    expect(types.has(EApplianceType.LIQUOR_RAIL)).toBe(true);
    expect(types.has(EApplianceType.WINE_RACK)).toBe(true);
    expect(types.has(EApplianceType.COUNTER)).toBe(true);
    expect(types.has(EApplianceType.SINK)).toBe(true);
    expect(types.has(EApplianceType.ICE_WELL)).toBe(true);
    expect(types.has(EApplianceType.BIN)).toBe(true);
  });

  it("starts with correct money", () => {
    const engine = createTestEngine();
    expect(priv(engine)._money).toBe(GameSettings.startingMoney);
  });

  it("starts in service phase", () => {
    const engine = createTestEngine();
    expect(priv(engine)._shiftManager.phase).toBe("service");
  });

  it("initializes menu config from all recipes", () => {
    const engine = createTestEngine();
    const menuConfig = priv(engine)._menuConfig;
    expect(menuConfig.size).toBeGreaterThan(0);
    // All menu items should be enabled
    for (const [, cfg] of menuConfig) {
      expect(cfg.enabled).toBe(true);
    }
  });

  it("initializes tile grid", () => {
    const engine = createTestEngine();
    const tileGrid = priv(engine)._tileGrid;
    expect(tileGrid.width).toBeGreaterThan(0);
    expect(tileGrid.height).toBeGreaterThan(0);
  });
});

describe("Engine ticking", () => {
  it("runs update without errors", () => {
    const engine = createTestEngine();
    // Disable spawner to avoid guest creation during tick
    priv(engine)._guestSpawner.enabled = false;
    expect(() => tick(engine, 10)).not.toThrow();
  });

  it("shift timer advances during tick", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    const sm = priv(engine)._shiftManager;
    const timerBefore = sm.timer;
    tick(engine, 60); // 1 second
    expect(sm.timer).toBeGreaterThan(timerBefore);
  });

  it("police attention decays over time", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    priv(engine)._policeAttention = 0.5;
    tick(engine, 60); // 1 second
    expect(priv(engine)._policeAttention).toBeLessThan(0.5);
  });
});

describe("Engine appliance stock", () => {
  it("glass shelf starts fully stocked", () => {
    const engine = createTestEngine();
    let glassShelf: any = null;
    for (const app of priv(engine)._appliances.values()) {
      if (app.type === EApplianceType.GLASS_SHELF) {
        glassShelf = app;
        break;
      }
    }
    expect(glassShelf).not.toBeNull();
    expect(glassShelf.hasStock()).toBe(true);
    expect(glassShelf.currentStock).toBe(glassShelf.maxStock);
  });

  it("depleteStock reduces stock by 1", () => {
    const engine = createTestEngine();
    let draft: any = null;
    for (const app of priv(engine)._appliances.values()) {
      if (app.type === EApplianceType.DRAFT_SYSTEM) {
        draft = app;
        break;
      }
    }
    expect(draft).not.toBeNull();
    const before = draft.currentStock;
    draft.depleteStock();
    expect(draft.currentStock).toBe(before - 1);
  });

  it("restock restores to max", () => {
    const engine = createTestEngine();
    let draft: any = null;
    for (const app of priv(engine)._appliances.values()) {
      if (app.type === EApplianceType.DRAFT_SYSTEM) {
        draft = app;
        break;
      }
    }
    draft.depleteStock();
    draft.depleteStock();
    draft.restock();
    expect(draft.currentStock).toBe(draft.maxStock);
  });
});

// ── SHIFT-END EXPENSES ──────────────────────────────────────

import { Item } from "../Network/Server/GameObjects/Item";
import { EItemType } from "../Shared/ItemTypes";
import { RECIPES } from "../Shared/DrinkRecipes";

describe("Shift-end expenses", () => {
  it("restock cost proportional to depletion", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // Find draft system and deplete half its stock
    let draft: any = null;
    for (const app of priv(engine)._appliances.values()) {
      if (app.type === EApplianceType.DRAFT_SYSTEM) { draft = app; break; }
    }
    expect(draft).not.toBeNull();
    const halfStock = Math.floor(draft.maxStock / 2);
    for (let i = 0; i < halfStock; i++) draft.depleteStock();

    const moneyBefore = priv(engine)._money;
    priv(engine)._calculateShiftExpenses();

    const expectedCost = Math.round(draft.restockCost * halfStock / draft.maxStock);
    expect(priv(engine)._shiftStats.restockCost).toBeGreaterThanOrEqual(expectedCost);
    // Stock should be restored
    expect(draft.currentStock).toBe(draft.maxStock);
  });

  it("full stock = zero restock cost", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // All appliances start at full stock
    const moneyBefore = priv(engine)._money;
    priv(engine)._calculateShiftExpenses();

    expect(priv(engine)._shiftStats.restockCost).toBe(0);
    expect(priv(engine)._money).toBe(moneyBefore); // no fights, no waste either
  });

  it("breakage cost per fight", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    priv(engine)._shiftStats.fights = 3;

    priv(engine)._calculateShiftExpenses();

    expect(priv(engine)._shiftStats.breakageCost).toBe(3 * GameSettings.breakageCostPerFight);
  });

  it("waste cost for items on surfaces", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // Place two pilsners on a counter
    let counter: any = null;
    for (const app of priv(engine)._appliances.values()) {
      if (app.type === EApplianceType.COUNTER && app._maxSlots > 0) { counter = app; break; }
    }
    expect(counter).not.toBeNull();

    const item1 = new Item(EItemType.PILSNER);
    item1.placeOnAppliance(counter.id, 0);
    counter.setSlot(0, item1.id);
    priv(engine)._items.set(item1.id, item1);

    priv(engine)._calculateShiftExpenses();

    const pilsnerCost = RECIPES["pilsner"].baseCost;
    expect(priv(engine)._shiftStats.wasteCost).toBe(pilsnerCost);
  });

  it("no waste for held items", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    // Create an item held by bartender (no applianceId)
    const item = new Item(EItemType.PILSNER);
    item.pickUp("test-player");
    priv(engine)._items.set(item.id, item);

    priv(engine)._calculateShiftExpenses();

    expect(priv(engine)._shiftStats.wasteCost).toBe(0);
  });

  it("items cleared after expenses", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;

    const item = new Item(EItemType.PILSNER);
    priv(engine)._items.set(item.id, item);

    priv(engine)._calculateShiftExpenses();

    expect(priv(engine)._items.size).toBe(0);
  });

  it("total deducted from money", () => {
    const engine = createTestEngine();
    priv(engine)._guestSpawner.enabled = false;
    priv(engine)._shiftStats.fights = 2;

    // Deplete some stock on draft
    let draft: any = null;
    for (const app of priv(engine)._appliances.values()) {
      if (app.type === EApplianceType.DRAFT_SYSTEM) { draft = app; break; }
    }
    for (let i = 0; i < 5; i++) draft.depleteStock();

    const moneyBefore = priv(engine)._money;
    priv(engine)._calculateShiftExpenses();

    const stats = priv(engine)._shiftStats;
    expect(stats.totalExpenses).toBe(stats.restockCost + stats.breakageCost + stats.wasteCost);
    expect(priv(engine)._money).toBe(moneyBefore - stats.totalExpenses);
  });
});
