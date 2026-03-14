/**
 * Widget System Types — config-driven appliance behavior.
 *
 * Widgets replace Engine.ts switch trees with behavior-on-the-object.
 * Each widget type declares how it responds to grab/interact via config.
 */
import { EApplianceType } from "./ApplianceTypes";
import { EItemType } from "./ItemTypes";
import GameSettings from "./GameSettings";

// ── Widget Config ──────────────────────────────────────────

export interface IWidgetTransform {
  input: EItemType[];       // accepted held item types
  output: EItemType | null; // null = consumed
  duration?: number;        // 0 = instant, >0 = timed (sink)
}

export interface IWidgetConfig {
  type: EApplianceType;
  label: string;
  color: number;
  sizeX: number;
  sizeY: number;

  // ── Top Slots (visible surface, E key) ──
  topSlots: number;
  topSlotMode: "normal" | "place_only" | "pick_only";

  // ── Storage (internal, Space key + modal) ──
  storageVariants?: { type: EItemType; label: string }[];
  stockCapacity: number;
  restockCost: number;

  // ── Source (grab from this spawns item infinitely) ──
  sourceItem?: EItemType;

  // ── Transform (Space key: held item → new item) ──
  transforms?: IWidgetTransform[];

  // ── Seats (per-edge counts) ──
  seats: { north: number; south: number; east: number; west: number };

  // ── Queue attachment ──
  queue?: { direction: "north" | "south" | "east" | "west"; slots: number };

  // ── Behavior flags ──
  returnableItems?: EItemType[];   // items that can be put back (glass → shelf)
  collectMode?: "trash";           // special pickup: clear all → spawn TRASH_BAG
}

// ── Widget Configs (one per ported appliance type) ─────────

export const WIDGET_BIN: IWidgetConfig = {
  type: EApplianceType.BIN,
  label: "BIN",
  color: 0x696969,
  sizeX: 1,
  sizeY: 1,
  topSlots: 3,
  topSlotMode: "place_only",
  stockCapacity: 0,
  restockCost: 0,
  seats: { north: 0, south: 0, east: 0, west: 0 },
  collectMode: "trash",
};

export const WIDGET_CARD_HOLDER: IWidgetConfig = {
  type: EApplianceType.CARD_HOLDER,
  label: "Cards",
  color: 0xff4444,
  sizeX: 1,
  sizeY: 1,
  topSlots: 0,
  topSlotMode: "normal",
  stockCapacity: 0,
  restockCost: 0,
  sourceItem: EItemType.CUT_OFF_CARD,
  returnableItems: [EItemType.CUT_OFF_CARD],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_GLASS_SHELF: IWidgetConfig = {
  type: EApplianceType.GLASS_SHELF,
  label: "Glass",
  color: 0xb0c4de,
  sizeX: 1,
  sizeY: 1,
  topSlots: 0,
  topSlotMode: "pick_only",
  stockCapacity: 30,
  restockCost: 10,
  sourceItem: EItemType.GLASS,
  returnableItems: [EItemType.GLASS],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_SERVICE_BAR: IWidgetConfig = {
  type: EApplianceType.SERVICE_BAR,
  label: "Service",
  color: 0x8b7355,
  sizeX: 2,
  sizeY: 1,
  topSlots: 8,
  topSlotMode: "normal",
  stockCapacity: 0,
  restockCost: 0,
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

// ── Seating & Surface Widgets ───────────────────────────────

export const WIDGET_COUNTER: IWidgetConfig = {
  type: EApplianceType.COUNTER,
  label: "Bar",
  color: 0xc4a35a,
  sizeX: 1,
  sizeY: 1,
  topSlots: 1,
  topSlotMode: "normal",
  stockCapacity: 0,
  restockCost: 0,
  seats: { north: 0, south: 1, east: 0, west: 0 },
};

export const WIDGET_HIGHTOP: IWidgetConfig = {
  type: EApplianceType.HIGHTOP,
  label: "Hi-Top",
  color: 0x8b4513,
  sizeX: 1,
  sizeY: 1,
  topSlots: 0,
  topSlotMode: "normal",
  stockCapacity: 0,
  restockCost: 0,
  seats: { north: 1, south: 1, east: 1, west: 1 },
};

export const WIDGET_TABLE: IWidgetConfig = {
  type: EApplianceType.TABLE,
  label: "Table",
  color: 0xa0522d,
  sizeX: 1,
  sizeY: 1,
  topSlots: 0,
  topSlotMode: "normal",
  stockCapacity: 0,
  restockCost: 0,
  seats: { north: 1, south: 1, east: 1, west: 1 },
};

export const WIDGET_BAR_QUEUE: IWidgetConfig = {
  type: EApplianceType.BAR_QUEUE,
  label: "Queue",
  color: 0xb8860b,
  sizeX: 3,
  sizeY: 1,
  topSlots: 6,
  topSlotMode: "normal",
  stockCapacity: 0,
  restockCost: 0,
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

// ── Variant Appliances (sub-menu via bartenderSelect) ───────

export const WIDGET_DRAFT_SYSTEM: IWidgetConfig = {
  type: EApplianceType.DRAFT_SYSTEM,
  label: "Draft",
  color: 0xcd853f,
  sizeX: 1,
  sizeY: 1,
  topSlots: 0,
  topSlotMode: "normal",
  stockCapacity: 20,
  restockCost: 10,
  storageVariants: [
    { type: EItemType.PILSNER, label: "Pilsner" },
    { type: EItemType.LAGER, label: "Lager" },
    { type: EItemType.ALE, label: "Ale" },
    { type: EItemType.IPA, label: "IPA" },
  ],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_WINE_RACK: IWidgetConfig = {
  type: EApplianceType.WINE_RACK,
  label: "Wine",
  color: 0x722f37,
  sizeX: 1,
  sizeY: 1,
  topSlots: 0,
  topSlotMode: "normal",
  stockCapacity: 20,
  restockCost: 12,
  storageVariants: [
    { type: EItemType.MERLOT, label: "Merlot" },
    { type: EItemType.CHARDONNAY, label: "Chardonnay" },
    { type: EItemType.PINOT_NOIR, label: "Pinot Noir" },
    { type: EItemType.ROSE, label: "Rosé" },
  ],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_LIQUOR_RAIL: IWidgetConfig = {
  type: EApplianceType.LIQUOR_RAIL,
  label: "Liquor",
  color: 0xdaa520,
  sizeX: 1,
  sizeY: 1,
  topSlots: 0,
  topSlotMode: "normal",
  stockCapacity: 20,
  restockCost: 15,
  storageVariants: [
    { type: EItemType.WHISKEY, label: "Whiskey" },
    { type: EItemType.VODKA, label: "Vodka" },
    { type: EItemType.GIN, label: "Gin" },
    { type: EItemType.RUM, label: "Rum" },
  ],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

// ── Transform Appliances ────────────────────────────────────

export const WIDGET_ICE_WELL: IWidgetConfig = {
  type: EApplianceType.ICE_WELL,
  label: "ICE",
  color: 0x87ceeb,
  sizeX: 1,
  sizeY: 1,
  topSlots: 0,
  topSlotMode: "normal",
  stockCapacity: 20,
  restockCost: 5,
  transforms: [{
    input: [EItemType.WHISKEY, EItemType.VODKA, EItemType.GIN, EItemType.RUM],
    output: EItemType.HIGHBALL,
  }],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_SINK: IWidgetConfig = {
  type: EApplianceType.SINK,
  label: "Sink",
  color: 0x708090,
  sizeX: 1,
  sizeY: 1,
  topSlots: 0,
  topSlotMode: "normal",
  stockCapacity: 0,
  restockCost: 0,
  transforms: [{
    input: [EItemType.DIRTY_GLASS],
    output: EItemType.GLASS,
    duration: GameSettings.washDuration,
  }],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

// ── Upgrade-unlocked Appliances ──────────────────────────────

export const WIDGET_KITCHEN: IWidgetConfig = {
  type: EApplianceType.KITCHEN,
  label: "Kitchen",
  color: 0xcc6633,
  sizeX: 2,
  sizeY: 1,
  topSlots: 4,
  topSlotMode: "normal",
  stockCapacity: 15,
  restockCost: 20,
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_GARNISH_STATION: IWidgetConfig = {
  type: EApplianceType.GARNISH_STATION,
  label: "Garnish",
  color: 0x66cc66,
  sizeX: 1,
  sizeY: 1,
  topSlots: 4,
  topSlotMode: "normal",
  stockCapacity: 15,
  restockCost: 10,
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_SHAKER: IWidgetConfig = {
  type: EApplianceType.SHAKER,
  label: "Shaker",
  color: 0xc0c0c0,
  sizeX: 1,
  sizeY: 1,
  topSlots: 2,
  topSlotMode: "normal",
  stockCapacity: 0,
  restockCost: 0,
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_JUKEBOX: IWidgetConfig = {
  type: EApplianceType.JUKEBOX,
  label: "Jukebox",
  color: 0xff6699,
  sizeX: 1,
  sizeY: 1,
  topSlots: 0,
  topSlotMode: "normal",
  stockCapacity: 0,
  restockCost: 0,
  seats: { north: 0, south: 0, east: 0, west: 0 },
};
