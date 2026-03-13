/**
 * Widget System Tests — Widget class, config-driven behavior, BIN port.
 */
import { describe, it, expect } from "vitest";
import { Widget, type IWidgetContext } from "../Network/Server/GameObjects/Widget";
import { Appliance } from "../Network/Server/GameObjects/Appliance";
import { Item } from "../Network/Server/GameObjects/Item";
import { Bartender } from "../Network/Server/GameObjects/Bartender";
import { EItemType } from "../Shared/ItemTypes";
import { EApplianceType } from "../Shared/ApplianceTypes";
import {
  WIDGET_BIN, WIDGET_CARD_HOLDER, WIDGET_GLASS_SHELF, WIDGET_SERVICE_BAR,
  WIDGET_COUNTER, WIDGET_HIGHTOP, WIDGET_TABLE, WIDGET_BAR_QUEUE,
  WIDGET_DRAFT_SYSTEM, WIDGET_WINE_RACK, WIDGET_LIQUOR_RAIL,
  WIDGET_ICE_WELL, WIDGET_SINK,
  type IWidgetConfig,
} from "../Shared/WidgetTypes";
import { createTestEngine } from "./engineHelper";

// ── Helpers ───────────────────────────────────────────────────

function mockBartender(): Bartender {
  const bt = new Bartender(0, 5, 2);
  bt.assign("test-player");
  return bt;
}

function mockContext(): IWidgetContext & {
  items: Map<string, Item>;
  events: { type: string; data: Record<string, unknown> }[];
  timedCallback: (() => void) | null;
} {
  const items = new Map<string, Item>();
  const events: { type: string; data: Record<string, unknown> }[] = [];
  const ctx = {
    items,
    events,
    timedCallback: null as (() => void) | null,
    createItem(type: EItemType) {
      const item = new Item(type);
      items.set(item.id, item);
      return item;
    },
    deleteItem(id: string) {
      items.delete(id);
    },
    getItem(id: string) {
      return items.get(id) ?? null;
    },
    startTimedInteract(_bartender: Bartender, _duration: number, onComplete: () => void) {
      ctx.timedCallback = onComplete;
    },
    pushEvent(type: string, data: Record<string, unknown>) {
      events.push({ type, data });
    },
  };
  return ctx;
}

function giveItem(bt: Bartender, type: EItemType, ctx: ReturnType<typeof mockContext>): Item {
  const item = ctx.createItem(type);
  item.pickUp(bt.id!);
  bt.setHeldItem(item.id, item.type);
  return item;
}

// ── Widget class ──────────────────────────────────────────────

describe("Widget class", () => {
  it("extends Appliance (instanceof)", () => {
    const w = new Widget(WIDGET_BIN, 3, 1);
    expect(w).toBeInstanceOf(Appliance);
    expect(w).toBeInstanceOf(Widget);
  });

  it("state getter returns valid IApplianceStateData", () => {
    const w = new Widget(WIDGET_BIN, 3, 1);
    const s = w.state;
    expect(s.type).toBe(EApplianceType.BIN);
    expect(s.gridX).toBe(3);
    expect(s.gridY).toBe(1);
    expect(s.maxSlots).toBe(3);
    expect(s.slots).toHaveLength(3);
  });

  it("widgetConfig getter exposes config", () => {
    const w = new Widget(WIDGET_BIN, 0, 0);
    expect(w.widgetConfig).toBe(WIDGET_BIN);
    expect(w.widgetConfig.collectMode).toBe("trash");
  });
});

// ── getSeatOffsets ────────────────────────────────────────────

describe("Widget getSeatOffsets", () => {
  it("0 seats returns empty array", () => {
    const w = new Widget(WIDGET_BIN, 0, 0);
    expect(w.getSeatOffsets()).toEqual([]);
  });

  it("1 south seat returns [[0, 0.6]]", () => {
    const config: IWidgetConfig = {
      ...WIDGET_BIN,
      seats: { north: 0, south: 1, east: 0, west: 0 },
    };
    const w = new Widget(config, 0, 0);
    expect(w.getSeatOffsets()).toEqual([[0, 0.6]]);
  });

  it("4 seats (table-like) returns 4 offsets", () => {
    const config: IWidgetConfig = {
      ...WIDGET_BIN,
      seats: { north: 1, south: 1, east: 1, west: 1 },
    };
    const w = new Widget(config, 0, 0);
    const offsets = w.getSeatOffsets();
    expect(offsets).toHaveLength(4);
    // Verify directions: north=-y, south=+y, east=+x, west=-x
    expect(offsets[0][1]).toBeLessThan(0); // north
    expect(offsets[1][1]).toBeGreaterThan(0); // south
    expect(offsets[2][0]).toBeGreaterThan(0); // east
    expect(offsets[3][0]).toBeLessThan(0); // west
  });
});

// ── Widget BIN handleGrab ─────────────────────────────────────

describe("Widget BIN handleGrab", () => {
  it("toss held item into bin", () => {
    const w = new Widget(WIDGET_BIN, 3, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const item = giveItem(bt, EItemType.DIRTY_GLASS, ctx);

    const handled = w.handleGrab(bt, item, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).toBeNull();
    expect(w.hasAnyItem()).toBe(true);
    // Item deleted from context
    expect(ctx.items.has(item.id)).toBe(false);
  });

  it("reject TRASH_BAG deposit", () => {
    const w = new Widget(WIDGET_BIN, 3, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const bag = giveItem(bt, EItemType.TRASH_BAG, ctx);

    const handled = w.handleGrab(bt, bag, ctx);

    // BIN always returns true (handled), but trash bag stays held
    expect(handled).toBe(true);
    expect(bt.heldItemId).toBe(bag.id);
  });

  it("pickup creates TRASH_BAG when bin has items", () => {
    const w = new Widget(WIDGET_BIN, 3, 1);
    const bt = mockBartender();
    const ctx = mockContext();

    // Put something in the bin first
    w.setSlot(0, "trash");
    expect(w.hasAnyItem()).toBe(true);

    const handled = w.handleGrab(bt, null, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).not.toBeNull();
    // Find the created item and verify it's a TRASH_BAG
    const createdItem = ctx.items.get(bt.heldItemId!);
    expect(createdItem).toBeDefined();
    expect(createdItem!.type).toBe(EItemType.TRASH_BAG);
    // Bin slots cleared
    expect(w.hasAnyItem()).toBe(false);
  });

  it("does nothing when bin is full and holding item", () => {
    const w = new Widget(WIDGET_BIN, 3, 1);
    const bt = mockBartender();
    const ctx = mockContext();

    // Fill all 3 slots
    w.setSlot(0, "trash");
    w.setSlot(1, "trash");
    w.setSlot(2, "trash");

    const item = giveItem(bt, EItemType.DIRTY_GLASS, ctx);
    const handled = w.handleGrab(bt, item, ctx);

    // Handled (BIN always handles), but item stays held
    expect(handled).toBe(true);
    expect(bt.heldItemId).toBe(item.id);
  });

  it("empty-handed + empty bin = no-op (still handled)", () => {
    const w = new Widget(WIDGET_BIN, 3, 1);
    const bt = mockBartender();
    const ctx = mockContext();

    const handled = w.handleGrab(bt, null, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).toBeNull();
  });
});

// ── Widget BIN handleInteract ─────────────────────────────────

describe("Widget BIN handleInteract", () => {
  it("BIN has no interact behavior (returns false)", () => {
    const w = new Widget(WIDGET_BIN, 3, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const item = giveItem(bt, EItemType.DIRTY_GLASS, ctx);

    const handled = w.handleInteract(bt, item, ctx);
    expect(handled).toBe(false);
  });
});

// ── Widget CARD_HOLDER handleGrab ─────────────────────────────

describe("Widget CARD_HOLDER handleGrab", () => {
  it("empty-handed spawns CUT_OFF_CARD (infinite source)", () => {
    const w = new Widget(WIDGET_CARD_HOLDER, 0, 1);
    const bt = mockBartender();
    const ctx = mockContext();

    const handled = w.handleGrab(bt, null, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).not.toBeNull();
    const item = ctx.items.get(bt.heldItemId!);
    expect(item!.type).toBe(EItemType.CUT_OFF_CARD);
  });

  it("holding CUT_OFF_CARD returns it (deleted)", () => {
    const w = new Widget(WIDGET_CARD_HOLDER, 0, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const card = giveItem(bt, EItemType.CUT_OFF_CARD, ctx);

    const handled = w.handleGrab(bt, card, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).toBeNull();
    expect(ctx.items.has(card.id)).toBe(false);
  });

  it("holding non-returnable item is not handled", () => {
    const w = new Widget(WIDGET_CARD_HOLDER, 0, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const glass = giveItem(bt, EItemType.GLASS, ctx);

    const handled = w.handleGrab(bt, glass, ctx);

    // No topSlots, no match — falls through
    expect(handled).toBe(false);
    expect(bt.heldItemId).toBe(glass.id);
  });
});

// ── Widget GLASS_SHELF handleGrab ─────────────────────────────

describe("Widget GLASS_SHELF handleGrab", () => {
  it("empty-handed spawns GLASS (depletes stock)", () => {
    const w = new Widget(WIDGET_GLASS_SHELF, 1, 1);
    const bt = mockBartender();
    const ctx = mockContext();

    const initialStock = w.currentStock;
    const handled = w.handleGrab(bt, null, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).not.toBeNull();
    const item = ctx.items.get(bt.heldItemId!);
    expect(item!.type).toBe(EItemType.GLASS);
    expect(w.currentStock).toBe(initialStock - 1);
  });

  it("holding GLASS returns it (deleted)", () => {
    const w = new Widget(WIDGET_GLASS_SHELF, 1, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const glass = giveItem(bt, EItemType.GLASS, ctx);

    const handled = w.handleGrab(bt, glass, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).toBeNull();
    expect(ctx.items.has(glass.id)).toBe(false);
  });

  it("returning GLASS restores stock", () => {
    const w = new Widget(WIDGET_GLASS_SHELF, 1, 1);
    const bt = mockBartender();
    const ctx = mockContext();

    // Take a glass (depletes stock by 1)
    w.handleGrab(bt, null, ctx);
    const stockAfterTake = w.currentStock;
    const glass = ctx.items.get(bt.heldItemId!)!;

    // Return the glass
    w.handleGrab(bt, glass, ctx);

    expect(w.currentStock).toBe(stockAfterTake + 1);
    expect(bt.heldItemId).toBeNull();
  });

  it("returning GLASS does not exceed max stock", () => {
    const w = new Widget(WIDGET_GLASS_SHELF, 1, 1);
    const bt = mockBartender();
    const ctx = mockContext();

    // Stock is already at max (30)
    expect(w.currentStock).toBe(w.maxStock);

    // Give bartender a glass manually and return it
    const glass = giveItem(bt, EItemType.GLASS, ctx);
    w.handleGrab(bt, glass, ctx);

    // Should not exceed max
    expect(w.currentStock).toBe(w.maxStock);
  });

  it("out of stock returns handled but no item", () => {
    const w = new Widget(WIDGET_GLASS_SHELF, 1, 1);
    // Deplete all stock
    for (let i = 0; i < 30; i++) w.depleteStock();
    expect(w.currentStock).toBe(0);

    const bt = mockBartender();
    const ctx = mockContext();

    const handled = w.handleGrab(bt, null, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).toBeNull(); // no item spawned
  });
});

// ── Widget SERVICE_BAR handleGrab ─────────────────────────────

describe("Widget SERVICE_BAR handleGrab", () => {
  it("place item on surface", () => {
    const w = new Widget(WIDGET_SERVICE_BAR, 16, 2);
    const bt = mockBartender();
    const ctx = mockContext();
    const item = giveItem(bt, EItemType.DIRTY_GLASS, ctx);

    const handled = w.handleGrab(bt, item, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).toBeNull();
    expect(w.hasAnyItem()).toBe(true);
    // Item placed on appliance
    expect(item.locationApplianceId).toBe(w.id);
  });

  it("pick up item from surface", () => {
    const w = new Widget(WIDGET_SERVICE_BAR, 16, 2);
    const bt = mockBartender();
    const ctx = mockContext();

    // Place an item on the surface first
    const item = ctx.createItem(EItemType.DIRTY_GLASS);
    item.placeOnAppliance(w.id, 0);
    w.setSlot(0, item.id);

    const handled = w.handleGrab(bt, null, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).toBe(item.id);
    expect(w.hasAnyItem()).toBe(false);
  });

  it("empty surface + empty hands = not handled", () => {
    const w = new Widget(WIDGET_SERVICE_BAR, 16, 2);
    const bt = mockBartender();
    const ctx = mockContext();

    const handled = w.handleGrab(bt, null, ctx);

    expect(handled).toBe(false);
  });

  it("full surface rejects placement", () => {
    const w = new Widget(WIDGET_SERVICE_BAR, 16, 2);
    const bt = mockBartender();
    const ctx = mockContext();

    // Fill all 8 slots
    for (let i = 0; i < 8; i++) {
      const filler = ctx.createItem(EItemType.DIRTY_GLASS);
      filler.placeOnAppliance(w.id, i);
      w.setSlot(i, filler.id);
    }

    const item = giveItem(bt, EItemType.GLASS, ctx);
    const handled = w.handleGrab(bt, item, ctx);

    // No open slot — not handled, falls through
    expect(handled).toBe(false);
    expect(bt.heldItemId).toBe(item.id);
  });
});

// ── Engine integration ────────────────────────────────────────

describe("Widget Engine integration", () => {
  it("BIN appliance is a Widget instance in engine", () => {
    const engine = createTestEngine();
    const priv = engine as any;
    let found = false;
    for (const app of priv._appliances.values()) {
      if (app.type === EApplianceType.BIN) {
        expect(app).toBeInstanceOf(Widget);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("CARD_HOLDER is a Widget instance", () => {
    const engine = createTestEngine();
    const priv = engine as any;
    let found = false;
    for (const app of priv._appliances.values()) {
      if (app.type === EApplianceType.CARD_HOLDER) {
        expect(app).toBeInstanceOf(Widget);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("GLASS_SHELF is a Widget instance", () => {
    const engine = createTestEngine();
    const priv = engine as any;
    let found = false;
    for (const app of priv._appliances.values()) {
      if (app.type === EApplianceType.GLASS_SHELF) {
        expect(app).toBeInstanceOf(Widget);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("SERVICE_BAR is a Widget instance", () => {
    const engine = createTestEngine();
    const priv = engine as any;
    let found = false;
    for (const app of priv._appliances.values()) {
      if (app.type === EApplianceType.SERVICE_BAR) {
        expect(app).toBeInstanceOf(Widget);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("all appliance types are now Widgets", () => {
    const engine = createTestEngine();
    const priv = engine as any;
    for (const app of priv._appliances.values()) {
      expect(app).toBeInstanceOf(Widget);
      expect(app).toBeInstanceOf(Appliance); // Widget extends Appliance
    }
  });
});

// ── Widget COUNTER ──────────────────────────────────────────

describe("Widget COUNTER handleGrab", () => {
  it("place item on counter surface", () => {
    const w = new Widget(WIDGET_COUNTER, 5, 3);
    const bt = mockBartender();
    const ctx = mockContext();
    const item = giveItem(bt, EItemType.PILSNER, ctx);

    const handled = w.handleGrab(bt, item, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).toBeNull();
    expect(w.hasAnyItem()).toBe(true);
    expect(item.locationApplianceId).toBe(w.id);
  });

  it("pick up item from counter", () => {
    const w = new Widget(WIDGET_COUNTER, 5, 3);
    const bt = mockBartender();
    const ctx = mockContext();
    const item = ctx.createItem(EItemType.DIRTY_GLASS);
    item.placeOnAppliance(w.id, 0);
    w.setSlot(0, item.id);

    const handled = w.handleGrab(bt, null, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).toBe(item.id);
    expect(w.hasAnyItem()).toBe(false);
  });

  it("counter has 1 top slot", () => {
    const w = new Widget(WIDGET_COUNTER, 5, 3);
    expect(w.state.maxSlots).toBe(1);
    expect(w.state.slots).toHaveLength(1);
  });

  it("counter has 1 south seat", () => {
    const w = new Widget(WIDGET_COUNTER, 5, 3);
    // maxSeats from APPLIANCE_CONFIGS is 1
    expect(w.maxSeats).toBe(1);
    expect(w.getSeatOffsets()).toEqual([[0, 0.6]]);
  });
});

// ── Widget HIGHTOP / TABLE ──────────────────────────────────

describe("Widget HIGHTOP & TABLE", () => {
  it("hightop has 0 top slots", () => {
    const w = new Widget(WIDGET_HIGHTOP, 4, 7);
    expect(w.state.maxSlots).toBe(0);
    expect(w.state.slots).toHaveLength(0);
  });

  it("hightop has 4 seats (N/S/E/W)", () => {
    const w = new Widget(WIDGET_HIGHTOP, 4, 7);
    expect(w.maxSeats).toBe(4);
    const offsets = w.getSeatOffsets();
    expect(offsets).toHaveLength(4);
  });

  it("table config matches hightop structure", () => {
    const w = new Widget(WIDGET_TABLE, 4, 10);
    expect(w.state.maxSlots).toBe(0);
    expect(w.maxSeats).toBe(4);
    expect(w.getSeatOffsets()).toHaveLength(4);
  });

  it("hightop handleGrab returns false (no surface, no source)", () => {
    const w = new Widget(WIDGET_HIGHTOP, 4, 7);
    const bt = mockBartender();
    const ctx = mockContext();

    expect(w.handleGrab(bt, null, ctx)).toBe(false);
    const item = giveItem(bt, EItemType.GLASS, ctx);
    expect(w.handleGrab(bt, item, ctx)).toBe(false);
  });
});

// ── Widget BAR_QUEUE ────────────────────────────────────────

describe("Widget BAR_QUEUE handleGrab", () => {
  it("place item on bar queue", () => {
    const w = new Widget(WIDGET_BAR_QUEUE, 8, 3);
    const bt = mockBartender();
    const ctx = mockContext();
    const item = giveItem(bt, EItemType.DIRTY_GLASS, ctx);

    const handled = w.handleGrab(bt, item, ctx);

    expect(handled).toBe(true);
    expect(bt.heldItemId).toBeNull();
    expect(w.hasAnyItem()).toBe(true);
  });

  it("bar queue has 6 top slots", () => {
    const w = new Widget(WIDGET_BAR_QUEUE, 8, 3);
    expect(w.state.maxSlots).toBe(6);
    expect(w.state.slots).toHaveLength(6);
  });
});

// ── Widget Variant Appliances (DRAFT/WINE/LIQUOR) ───────────

describe("Widget variant appliances", () => {
  it("DRAFT_SYSTEM has 0 top slots (no E-key surface)", () => {
    const w = new Widget(WIDGET_DRAFT_SYSTEM, 5, 1);
    expect(w.state.maxSlots).toBe(0);
  });

  it("DRAFT_SYSTEM handleGrab with held glass returns false", () => {
    const w = new Widget(WIDGET_DRAFT_SYSTEM, 5, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const glass = giveItem(bt, EItemType.GLASS, ctx);

    // No topSlots → can't place, not handled
    const handled = w.handleGrab(bt, glass, ctx);
    expect(handled).toBe(false);
    expect(bt.heldItemId).toBe(glass.id);
  });

  it("DRAFT_SYSTEM handleInteract returns false (variants via bartenderSelect)", () => {
    const w = new Widget(WIDGET_DRAFT_SYSTEM, 5, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const glass = giveItem(bt, EItemType.GLASS, ctx);

    const handled = w.handleInteract(bt, glass, ctx);
    expect(handled).toBe(false);
  });

  it("WINE_RACK has stock and 0 top slots", () => {
    const w = new Widget(WIDGET_WINE_RACK, 10, 1);
    expect(w.state.maxSlots).toBe(0);
    expect(w.currentStock).toBe(20);
  });

  it("LIQUOR_RAIL has stock and 0 top slots", () => {
    const w = new Widget(WIDGET_LIQUOR_RAIL, 8, 1);
    expect(w.state.maxSlots).toBe(0);
    expect(w.currentStock).toBe(20);
  });
});

// ── Widget ICE_WELL (instant transform) ─────────────────────

describe("Widget ICE_WELL handleInteract", () => {
  it("transforms spirit to highball", () => {
    const w = new Widget(WIDGET_ICE_WELL, 11, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const whiskey = giveItem(bt, EItemType.WHISKEY, ctx);

    const handled = w.handleInteract(bt, whiskey, ctx);

    expect(handled).toBe(true);
    expect(whiskey.type).toBe(EItemType.HIGHBALL);
    expect((bt as any)._heldItemType).toBe(EItemType.HIGHBALL);
    expect(w.currentStock).toBe(19); // depleted
  });

  it("transforms all spirit types", () => {
    for (const spiritType of [EItemType.WHISKEY, EItemType.VODKA, EItemType.GIN, EItemType.RUM]) {
      const w = new Widget(WIDGET_ICE_WELL, 11, 1);
      const bt = mockBartender();
      const ctx = mockContext();
      const spirit = giveItem(bt, spiritType, ctx);

      expect(w.handleInteract(bt, spirit, ctx)).toBe(true);
      expect(spirit.type).toBe(EItemType.HIGHBALL);
    }
  });

  it("rejects non-spirit items", () => {
    const w = new Widget(WIDGET_ICE_WELL, 11, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const glass = giveItem(bt, EItemType.GLASS, ctx);

    const handled = w.handleInteract(bt, glass, ctx);
    expect(handled).toBe(false);
    expect(glass.type).toBe(EItemType.GLASS); // unchanged
  });

  it("out of stock rejects transform", () => {
    const w = new Widget(WIDGET_ICE_WELL, 11, 1);
    for (let i = 0; i < 20; i++) w.depleteStock();
    expect(w.currentStock).toBe(0);

    const bt = mockBartender();
    const ctx = mockContext();
    const whiskey = giveItem(bt, EItemType.WHISKEY, ctx);

    const handled = w.handleInteract(bt, whiskey, ctx);
    expect(handled).toBe(true); // handled (but no transform)
    expect(whiskey.type).toBe(EItemType.WHISKEY); // unchanged
  });

  it("pushes craft event on transform", () => {
    const w = new Widget(WIDGET_ICE_WELL, 11, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const whiskey = giveItem(bt, EItemType.WHISKEY, ctx);

    w.handleInteract(bt, whiskey, ctx);

    expect(ctx.events).toHaveLength(1);
    expect(ctx.events[0].type).toBe("item_crafted");
    expect(ctx.events[0].data.itemType).toBe(EItemType.HIGHBALL);
  });

  it("has 0 top slots", () => {
    const w = new Widget(WIDGET_ICE_WELL, 11, 1);
    expect(w.state.maxSlots).toBe(0);
  });
});

// ── Widget SINK (timed transform) ───────────────────────────

describe("Widget SINK handleInteract", () => {
  it("starts timed wash for dirty glass", () => {
    const w = new Widget(WIDGET_SINK, 14, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const dirtyGlass = giveItem(bt, EItemType.DIRTY_GLASS, ctx);

    const handled = w.handleInteract(bt, dirtyGlass, ctx);

    expect(handled).toBe(true);
    // Timed — callback stored but not yet executed
    expect(ctx.timedCallback).not.toBeNull();
    // Item still exists (hasn't been washed yet)
    expect(ctx.items.has(dirtyGlass.id)).toBe(true);
  });

  it("timed callback transforms dirty glass into clean glass (wash complete)", () => {
    const w = new Widget(WIDGET_SINK, 14, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const dirtyGlass = giveItem(bt, EItemType.DIRTY_GLASS, ctx);

    w.handleInteract(bt, dirtyGlass, ctx);
    // Simulate wash completion
    ctx.timedCallback!();

    // Item still exists but transformed to clean glass
    expect(ctx.items.has(dirtyGlass.id)).toBe(true);
    expect(dirtyGlass.type).toBe(EItemType.GLASS);
    expect(bt.heldItemId).toBe(dirtyGlass.id);
    expect(bt.state.heldItemType).toBe(EItemType.GLASS);
  });

  it("rejects non-dirty-glass items", () => {
    const w = new Widget(WIDGET_SINK, 14, 1);
    const bt = mockBartender();
    const ctx = mockContext();
    const glass = giveItem(bt, EItemType.GLASS, ctx);

    const handled = w.handleInteract(bt, glass, ctx);
    expect(handled).toBe(false);
  });

  it("has 0 top slots (no surface)", () => {
    const w = new Widget(WIDGET_SINK, 14, 1);
    expect(w.state.maxSlots).toBe(0);
  });
});

// ── Constructor slot override ───────────────────────────────

describe("Widget constructor slot override", () => {
  it("overrides APPLIANCE_CONFIGS maxSlots with topSlots", () => {
    // DRAFT_SYSTEM: APPLIANCE_CONFIGS says maxSlots=8, Widget says topSlots=0
    const w = new Widget(WIDGET_DRAFT_SYSTEM, 5, 1);
    expect(w.state.maxSlots).toBe(0);
    expect(w.state.slots).toHaveLength(0);
  });

  it("GLASS_SHELF: APPLIANCE_CONFIGS=40, Widget topSlots=0", () => {
    const w = new Widget(WIDGET_GLASS_SHELF, 9, 1);
    expect(w.state.maxSlots).toBe(0);
    expect(w.state.slots).toHaveLength(0);
  });

  it("BIN: topSlots=3 matches APPLIANCE_CONFIGS", () => {
    const w = new Widget(WIDGET_BIN, 17, 1);
    expect(w.state.maxSlots).toBe(3);
    expect(w.state.slots).toHaveLength(3);
  });

  it("SERVICE_BAR: topSlots=8 matches APPLIANCE_CONFIGS", () => {
    const w = new Widget(WIDGET_SERVICE_BAR, 16, 2);
    expect(w.state.maxSlots).toBe(8);
  });
});
