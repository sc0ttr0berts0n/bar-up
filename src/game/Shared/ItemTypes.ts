export enum EItemType {
  // Glass (from Glass Shelf)
  GLASS = "glass",
  // Beer variants (from Draft System)
  PILSNER = "pilsner",
  LAGER = "lager",
  ALE = "ale",
  IPA = "ipa",
  // Wine variants (from Wine Rack)
  MERLOT = "merlot",
  CHARDONNAY = "chardonnay",
  PINOT_NOIR = "pinot_noir",
  ROSE = "rose",
  // Spirit variants (from Liquor Rail)
  WHISKEY = "whiskey",
  VODKA = "vodka",
  GIN = "gin",
  RUM = "rum",
  // Mixed drinks
  HIGHBALL = "highball",
  // Other
  DIRTY_GLASS = "dirty_glass",
  CUT_OFF_CARD = "cut_off_card",
  TRASH_BAG = "trash_bag",
}

/** Set of all glass types that can be returned to the glass shelf */
export const GLASS_TYPES = new Set<EItemType>([
  EItemType.GLASS,
]);

/** Shared display info for items — used by both player and guest views.
 *  Colors must have sufficient contrast for white text overlays. */
export const ITEM_DISPLAY: Record<string, { label: string; color: number }> = {
  // Glass
  glass: { label: "Glass", color: 0x708090 },
  // Beer variants
  pilsner: { label: "Pilsner", color: 0x8b7320 },
  lager: { label: "Lager", color: 0x996b10 },
  ale: { label: "Ale", color: 0x9a6830 },
  ipa: { label: "IPA", color: 0xa05018 },
  // Wine variants
  merlot: { label: "Merlot", color: 0x722f37 },
  chardonnay: { label: "Chard", color: 0x7a6a10 },
  pinot_noir: { label: "Pinot", color: 0x4a1a2e },
  rose: { label: "Rosé", color: 0xa04060 },
  // Spirit variants
  whiskey: { label: "Whiskey", color: 0x8a5a18 },
  vodka: { label: "Vodka", color: 0x5060a0 },
  gin: { label: "Gin", color: 0x2a6a3a },
  rum: { label: "Rum", color: 0x8a5c08 },
  // Mixed drinks
  highball: { label: "H-ball", color: 0x3570a8 },
  // Other
  dirty_glass: { label: "Dirty", color: 0x666666 },
  cut_off_card: { label: "Cut Off", color: 0xcc3333 },
  trash_bag: { label: "Trash", color: 0x555555 },
};

export interface IItemStateData {
  id: string;
  type: EItemType;
  locationApplianceId: string | null;
  locationSlotIndex: number;
  heldByPlayerId: string | null;
}
