/**
 * Widget System Types — config-driven appliance behavior.
 */
import { EApplianceType } from "./ApplianceTypes";
import { EItemType } from "./ItemTypes";
import GameSettings from "./GameSettings";

export interface IWidgetTransform {
  input: EItemType[];
  output: EItemType | null;
  duration?: number;
}

export interface IWidgetConfig {
  type: EApplianceType;
  label: string;
  color: number;
  sizeX: number;
  sizeY: number;
  topSlots: number;
  topSlotMode: "normal" | "place_only" | "pick_only";
  storageVariants?: { type: EItemType; label: string }[];
  stockCapacity: number;
  restockCost: number;
  sourceItem?: EItemType;
  transforms?: IWidgetTransform[];
  seats: { north: number; south: number; east: number; west: number };
  queue?: { direction: "north" | "south" | "east" | "west"; slots: number };
  returnableItems?: EItemType[];
  collectMode?: "trash";
}

export const WIDGET_BIN: IWidgetConfig = {
  type: EApplianceType.BIN, label: "BIN", color: 0x696969, sizeX: 1, sizeY: 1,
  topSlots: 3, topSlotMode: "place_only", stockCapacity: 0, restockCost: 0,
  seats: { north: 0, south: 0, east: 0, west: 0 }, collectMode: "trash",
};

export const WIDGET_CARD_HOLDER: IWidgetConfig = {
  type: EApplianceType.CARD_HOLDER, label: "Cards", color: 0xff4444, sizeX: 1, sizeY: 1,
  topSlots: 0, topSlotMode: "normal", stockCapacity: 0, restockCost: 0,
  sourceItem: EItemType.CUT_OFF_CARD, returnableItems: [EItemType.CUT_OFF_CARD],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_GLASS_SHELF: IWidgetConfig = {
  type: EApplianceType.GLASS_SHELF, label: "Glass", color: 0xb0c4de, sizeX: 1, sizeY: 1,
  topSlots: 0, topSlotMode: "pick_only", stockCapacity: 30, restockCost: 10,
  sourceItem: EItemType.GLASS, returnableItems: [EItemType.GLASS],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_SERVICE_BAR: IWidgetConfig = {
  type: EApplianceType.SERVICE_BAR, label: "Service", color: 0x8b7355, sizeX: 2, sizeY: 1,
  topSlots: 8, topSlotMode: "normal", stockCapacity: 0, restockCost: 0,
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_COUNTER: IWidgetConfig = {
  type: EApplianceType.COUNTER, label: "Bar", color: 0xc4a35a, sizeX: 1, sizeY: 1,
  topSlots: 1, topSlotMode: "normal", stockCapacity: 0, restockCost: 0,
  seats: { north: 0, south: 1, east: 0, west: 0 },
};

export const WIDGET_HIGHTOP: IWidgetConfig = {
  type: EApplianceType.HIGHTOP, label: "Hi-Top", color: 0x8b4513, sizeX: 1, sizeY: 1,
  topSlots: 0, topSlotMode: "normal", stockCapacity: 0, restockCost: 0,
  seats: { north: 1, south: 1, east: 1, west: 1 },
};

export const WIDGET_TABLE: IWidgetConfig = {
  type: EApplianceType.TABLE, label: "Table", color: 0xa0522d, sizeX: 1, sizeY: 1,
  topSlots: 0, topSlotMode: "normal", stockCapacity: 0, restockCost: 0,
  seats: { north: 1, south: 1, east: 1, west: 1 },
};

export const WIDGET_BAR_QUEUE: IWidgetConfig = {
  type: EApplianceType.BAR_QUEUE, label: "Queue", color: 0xb8860b, sizeX: 3, sizeY: 1,
  topSlots: 6, topSlotMode: "normal", stockCapacity: 0, restockCost: 0,
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_DRAFT_SYSTEM: IWidgetConfig = {
  type: EApplianceType.DRAFT_SYSTEM, label: "Draft", color: 0xcd853f, sizeX: 1, sizeY: 1,
  topSlots: 0, topSlotMode: "normal", stockCapacity: 20, restockCost: 10,
  storageVariants: [
    { type: EItemType.PILSNER, label: "Pilsner" },
    { type: EItemType.LAGER, label: "Lager" },
    { type: EItemType.ALE, label: "Ale" },
    { type: EItemType.IPA, label: "IPA" },
  ],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_WINE_RACK: IWidgetConfig = {
  type: EApplianceType.WINE_RACK, label: "Wine", color: 0x722f37, sizeX: 1, sizeY: 1,
  topSlots: 0, topSlotMode: "normal", stockCapacity: 20, restockCost: 12,
  storageVariants: [
    { type: EItemType.MERLOT, label: "Merlot" },
    { type: EItemType.CHARDONNAY, label: "Chardonnay" },
    { type: EItemType.PINOT_NOIR, label: "Pinot Noir" },
    { type: EItemType.ROSE, label: "Rosé" },
    { type: EItemType.PROSECCO, label: "Prosecco" },
  ],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_LIQUOR_RAIL: IWidgetConfig = {
  type: EApplianceType.LIQUOR_RAIL, label: "Liquor", color: 0xdaa520, sizeX: 1, sizeY: 1,
  topSlots: 0, topSlotMode: "normal", stockCapacity: 20, restockCost: 15,
  storageVariants: [
    { type: EItemType.WHISKEY, label: "Whiskey" },
    { type: EItemType.VODKA, label: "Vodka" },
    { type: EItemType.GIN, label: "Gin" },
    { type: EItemType.RUM, label: "Rum" },
    { type: EItemType.TEQUILA, label: "Tequila" },
  ],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_ICE_WELL: IWidgetConfig = {
  type: EApplianceType.ICE_WELL, label: "ICE", color: 0x87ceeb, sizeX: 1, sizeY: 1,
  topSlots: 0, topSlotMode: "normal", stockCapacity: 20, restockCost: 5,
  // Ice Well is now a variant appliance — mixers selected via sub-menu in DrinkRecipes.ts
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_SHAKER: IWidgetConfig = {
  type: EApplianceType.SHAKER, label: "Shaker", color: 0xc0c0c0, sizeX: 1, sizeY: 1,
  topSlots: 0, topSlotMode: "normal", stockCapacity: 0, restockCost: 0,
  transforms: [
    { input: [EItemType.GIN], output: EItemType.MARTINI_SHAKEN, duration: GameSettings.shakeDuration },
    { input: [EItemType.VODKA], output: EItemType.MARTINI_SHAKEN, duration: GameSettings.shakeDuration },
    { input: [EItemType.WHISKEY], output: EItemType.OLD_FASHIONED_SHAKEN, duration: GameSettings.shakeDuration },
    { input: [EItemType.TEQUILA], output: EItemType.MARGARITA_SHAKEN, duration: GameSettings.shakeDuration },
    { input: [EItemType.LONG_ISLAND_BASE], output: EItemType.LONG_ISLAND_SHAKEN, duration: GameSettings.shakeDuration },
  ],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_GARNISH_STATION: IWidgetConfig = {
  type: EApplianceType.GARNISH_STATION, label: "Garnish", color: 0x60a040, sizeX: 1, sizeY: 1,
  topSlots: 0, topSlotMode: "normal", stockCapacity: 15, restockCost: 8,
  // Garnish station is a variant appliance — garnish type selected via sub-menu in DrinkRecipes.ts
  seats: { north: 0, south: 0, east: 0, west: 0 },
};

export const WIDGET_SINK: IWidgetConfig = {
  type: EApplianceType.SINK, label: "Sink", color: 0x708090, sizeX: 1, sizeY: 1,
  topSlots: 0, topSlotMode: "normal", stockCapacity: 0, restockCost: 0,
  transforms: [{ input: [EItemType.DIRTY_GLASS], output: EItemType.GLASS, duration: GameSettings.washDuration }],
  seats: { north: 0, south: 0, east: 0, west: 0 },
};
