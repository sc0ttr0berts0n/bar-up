import { EApplianceType } from "./ApplianceTypes";
import { EItemType } from "./ItemTypes";

export interface IDrinkRecipe {
  name: string;
  resultType: EItemType;
  glassType: EItemType;
  baseCost: number;
  menuPrice: number;
  tier: number;
  steps: IRecipeStep[];
}

export interface IRecipeStep {
  applianceType: EApplianceType;
  description: string;
}

export const RECIPES: Record<string, IDrinkRecipe> = {
  // Beers (Glass -> Draft System) - Tier 1
  pilsner: {
    name: "Pilsner", resultType: EItemType.PILSNER, glassType: EItemType.GLASS,
    baseCost: 2, menuPrice: 5, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.DRAFT_SYSTEM, description: "Fill from tap" },
    ],
  },
  lager: {
    name: "Lager", resultType: EItemType.LAGER, glassType: EItemType.GLASS,
    baseCost: 2, menuPrice: 5, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.DRAFT_SYSTEM, description: "Fill from tap" },
    ],
  },
  ale: {
    name: "Ale", resultType: EItemType.ALE, glassType: EItemType.GLASS,
    baseCost: 2, menuPrice: 5, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.DRAFT_SYSTEM, description: "Fill from tap" },
    ],
  },
  ipa: {
    name: "IPA", resultType: EItemType.IPA, glassType: EItemType.GLASS,
    baseCost: 2, menuPrice: 6, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.DRAFT_SYSTEM, description: "Fill from tap" },
    ],
  },
  // Wines (Glass -> Wine Rack) - Tier 1
  merlot: {
    name: "Merlot", resultType: EItemType.MERLOT, glassType: EItemType.GLASS,
    baseCost: 3, menuPrice: 7, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.WINE_RACK, description: "Pour wine" },
    ],
  },
  chardonnay: {
    name: "Chardonnay", resultType: EItemType.CHARDONNAY, glassType: EItemType.GLASS,
    baseCost: 3, menuPrice: 7, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.WINE_RACK, description: "Pour wine" },
    ],
  },
  pinot_noir: {
    name: "Pinot Noir", resultType: EItemType.PINOT_NOIR, glassType: EItemType.GLASS,
    baseCost: 3, menuPrice: 8, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.WINE_RACK, description: "Pour wine" },
    ],
  },
  rose: {
    name: "Ros\u00e9", resultType: EItemType.ROSE, glassType: EItemType.GLASS,
    baseCost: 3, menuPrice: 7, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.WINE_RACK, description: "Pour wine" },
    ],
  },
  prosecco: {
    name: "Prosecco", resultType: EItemType.PROSECCO, glassType: EItemType.GLASS,
    baseCost: 3, menuPrice: 8, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.WINE_RACK, description: "Pour wine" },
    ],
  },
  // Spirits (Glass -> Liquor Rail) - Tier 1
  whiskey: {
    name: "Whiskey", resultType: EItemType.WHISKEY, glassType: EItemType.GLASS,
    baseCost: 3, menuPrice: 8, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour spirit" },
    ],
  },
  vodka: {
    name: "Vodka", resultType: EItemType.VODKA, glassType: EItemType.GLASS,
    baseCost: 3, menuPrice: 7, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour spirit" },
    ],
  },
  gin: {
    name: "Gin", resultType: EItemType.GIN, glassType: EItemType.GLASS,
    baseCost: 3, menuPrice: 8, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour spirit" },
    ],
  },
  rum: {
    name: "Rum", resultType: EItemType.RUM, glassType: EItemType.GLASS,
    baseCost: 3, menuPrice: 7, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour spirit" },
    ],
  },
  tequila: {
    name: "Tequila", resultType: EItemType.TEQUILA, glassType: EItemType.GLASS,
    baseCost: 3, menuPrice: 8, tier: 1,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour spirit" },
    ],
  },
  // Tier 2: Mixed drinks (Spirit -> Ice Well mixer)
  highball: {
    name: "Highball", resultType: EItemType.HIGHBALL, glassType: EItemType.GLASS,
    baseCost: 3, menuPrice: 6, tier: 2,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour spirit" },
      { applianceType: EApplianceType.ICE_WELL, description: "Add soda" },
    ],
  },
  gin_tonic: {
    name: "Gin & Tonic", resultType: EItemType.GIN_TONIC, glassType: EItemType.GLASS,
    baseCost: 4, menuPrice: 9, tier: 2,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour gin" },
      { applianceType: EApplianceType.ICE_WELL, description: "Add tonic" },
    ],
  },
  rum_cola: {
    name: "Rum & Cola", resultType: EItemType.RUM_COLA, glassType: EItemType.GLASS,
    baseCost: 3, menuPrice: 8, tier: 2,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour rum" },
      { applianceType: EApplianceType.ICE_WELL, description: "Add cola" },
    ],
  },
  spritz: {
    name: "Spritz", resultType: EItemType.SPRITZ, glassType: EItemType.GLASS,
    baseCost: 4, menuPrice: 10, tier: 2,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.WINE_RACK, description: "Pour prosecco" },
      { applianceType: EApplianceType.ICE_WELL, description: "Add soda" },
    ],
  },
  // Tier 3: Shaken cocktails (Spirit -> Shaker -> Garnish Station)
  martini: {
    name: "Martini", resultType: EItemType.MARTINI, glassType: EItemType.GLASS,
    baseCost: 5, menuPrice: 12, tier: 3,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour gin or vodka" },
      { applianceType: EApplianceType.SHAKER, description: "Shake" },
      { applianceType: EApplianceType.GARNISH_STATION, description: "Add olive" },
    ],
  },
  old_fashioned: {
    name: "Old Fashioned", resultType: EItemType.OLD_FASHIONED, glassType: EItemType.GLASS,
    baseCost: 5, menuPrice: 13, tier: 3,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour whiskey" },
      { applianceType: EApplianceType.SHAKER, description: "Shake" },
      { applianceType: EApplianceType.GARNISH_STATION, description: "Add cherry" },
    ],
  },
  margarita: {
    name: "Margarita", resultType: EItemType.MARGARITA, glassType: EItemType.GLASS,
    baseCost: 5, menuPrice: 12, tier: 3,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour tequila" },
      { applianceType: EApplianceType.SHAKER, description: "Shake" },
      { applianceType: EApplianceType.GARNISH_STATION, description: "Add lime" },
    ],
  },
  // Tier 4: Complex multi-step
  long_island: {
    name: "Long Island", resultType: EItemType.LONG_ISLAND, glassType: EItemType.GLASS,
    baseCost: 6, menuPrice: 15, tier: 4,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour vodka" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Add rum (mix base)" },
      { applianceType: EApplianceType.SHAKER, description: "Shake" },
      { applianceType: EApplianceType.GARNISH_STATION, description: "Add lime" },
    ],
  },
  espresso_martini: {
    name: "Espresso Martini", resultType: EItemType.ESPRESSO_MARTINI, glassType: EItemType.GLASS,
    baseCost: 6, menuPrice: 14, tier: 4,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour vodka" },
      { applianceType: EApplianceType.SHAKER, description: "Shake" },
      { applianceType: EApplianceType.GARNISH_STATION, description: "Add espresso" },
    ],
  },
};

/** Get the list of drink keys available on the menu */
export function getMenuDrinkKeys(): string[] {
  return Object.keys(RECIPES);
}

/** Variant options for appliances with sub-menus (craft: glass + appliance -> drink) */
export interface IDrinkVariant {
  type: EItemType;
  label: string;
  color: number;
}

export interface IApplianceVariantConfig {
  requiredItems: EItemType[];
  variants: IDrinkVariant[];
}

export const APPLIANCE_VARIANTS: Partial<Record<EApplianceType, IApplianceVariantConfig>> = {
  [EApplianceType.DRAFT_SYSTEM]: {
    requiredItems: [EItemType.GLASS],
    variants: [
      { type: EItemType.PILSNER, label: "Pilsner", color: 0x8b7320 },
      { type: EItemType.LAGER, label: "Lager", color: 0x996b10 },
      { type: EItemType.ALE, label: "Ale", color: 0x9a6830 },
      { type: EItemType.IPA, label: "IPA", color: 0xa05018 },
    ],
  },
  [EApplianceType.WINE_RACK]: {
    requiredItems: [EItemType.GLASS],
    variants: [
      { type: EItemType.MERLOT, label: "Merlot", color: 0x722f37 },
      { type: EItemType.CHARDONNAY, label: "Chardonnay", color: 0x7a6a10 },
      { type: EItemType.PINOT_NOIR, label: "Pinot Noir", color: 0x4a1a2e },
      { type: EItemType.ROSE, label: "Ros\u00e9", color: 0xa04060 },
      { type: EItemType.PROSECCO, label: "Prosecco", color: 0xd4a850 },
    ],
  },
  [EApplianceType.LIQUOR_RAIL]: {
    requiredItems: [EItemType.GLASS, EItemType.VODKA],
    variants: [
      { type: EItemType.WHISKEY, label: "Whiskey", color: 0x8a5a18 },
      { type: EItemType.VODKA, label: "Vodka", color: 0x5060a0 },
      { type: EItemType.GIN, label: "Gin", color: 0x2a6a3a },
      { type: EItemType.RUM, label: "Rum", color: 0x8a5c08 },
      { type: EItemType.TEQUILA, label: "Tequila", color: 0xc4a030 },
    ],
  },
  [EApplianceType.ICE_WELL]: {
    requiredItems: [EItemType.WHISKEY, EItemType.VODKA, EItemType.GIN, EItemType.RUM, EItemType.PROSECCO],
    variants: [
      { type: EItemType.HIGHBALL, label: "Soda", color: 0x87ceeb },
      { type: EItemType.GIN_TONIC, label: "Tonic", color: 0xa0d8b0 },
      { type: EItemType.RUM_COLA, label: "Cola", color: 0x4a2810 },
    ],
  },
  [EApplianceType.GARNISH_STATION]: {
    requiredItems: [EItemType.MARTINI_SHAKEN, EItemType.OLD_FASHIONED_SHAKEN, EItemType.MARGARITA_SHAKEN, EItemType.LONG_ISLAND_SHAKEN],
    variants: [
      { type: EItemType.MARTINI, label: "Olive", color: 0x556b2f },
      { type: EItemType.ESPRESSO_MARTINI, label: "Espresso", color: 0x3c1a00 },
      { type: EItemType.OLD_FASHIONED, label: "Cherry", color: 0xcc2244 },
      { type: EItemType.MARGARITA, label: "Lime", color: 0x32cd32 },
      { type: EItemType.LONG_ISLAND, label: "Orange", color: 0xff8c00 },
    ],
  },
};

/** Grab variant options for appliances (empty-handed -> pick item type) */
export interface IGrabVariantConfig {
  variants: IDrinkVariant[];
}

export const GRAB_VARIANTS: Partial<Record<EApplianceType, IGrabVariantConfig>> = {
};

// -- Mix Maps ---------------------------------------------------------
// Maps: (held item type, variant index) -> output item type
// Used when the same variant menu produces different results based on what you're holding.

export type MixMap = Record<string, EItemType[]>;

/** Ice Well: spirit + mixer variant -> mixed drink */
export const ICE_WELL_MIX_MAP: MixMap = {
  // variant indices: 0=Soda, 1=Tonic, 2=Cola
  [EItemType.WHISKEY]:  [EItemType.HIGHBALL, EItemType.HIGHBALL, EItemType.HIGHBALL],
  [EItemType.VODKA]:    [EItemType.HIGHBALL, EItemType.HIGHBALL, EItemType.HIGHBALL],
  [EItemType.GIN]:      [EItemType.GIN_TONIC, EItemType.GIN_TONIC, EItemType.GIN_TONIC],
  [EItemType.RUM]:      [EItemType.RUM_COLA, EItemType.RUM_COLA, EItemType.RUM_COLA],
  [EItemType.PROSECCO]: [EItemType.SPRITZ, EItemType.SPRITZ, EItemType.SPRITZ],
};

/** Garnish Station: shaken intermediate + garnish variant -> final cocktail */
export const GARNISH_MAP: MixMap = {
  // variant indices: 0=Olive, 1=Espresso, 2=Cherry, 3=Lime, 4=Orange
  [EItemType.MARTINI_SHAKEN]:        [EItemType.MARTINI, EItemType.ESPRESSO_MARTINI, EItemType.MARTINI, EItemType.MARTINI, EItemType.MARTINI],
  [EItemType.OLD_FASHIONED_SHAKEN]:  [EItemType.OLD_FASHIONED, EItemType.OLD_FASHIONED, EItemType.OLD_FASHIONED, EItemType.OLD_FASHIONED, EItemType.OLD_FASHIONED],
  [EItemType.MARGARITA_SHAKEN]:      [EItemType.MARGARITA, EItemType.MARGARITA, EItemType.MARGARITA, EItemType.MARGARITA, EItemType.MARGARITA],
  [EItemType.LONG_ISLAND_SHAKEN]:    [EItemType.LONG_ISLAND, EItemType.LONG_ISLAND, EItemType.LONG_ISLAND, EItemType.LONG_ISLAND, EItemType.LONG_ISLAND],
};

/** Liquor Rail mix map: spirit + second spirit -> base mix (for Long Island) */
export const LIQUOR_RAIL_MIX_MAP: MixMap = {
  // variant indices: 0=Whiskey, 1=Vodka, 2=Gin, 3=Rum, 4=Tequila
  [EItemType.VODKA]: [EItemType.VODKA, EItemType.VODKA, EItemType.VODKA, EItemType.LONG_ISLAND_BASE, EItemType.VODKA],
};

/** Set of appliance types that use mix maps instead of direct variant output */
export const MIX_MAP_APPLIANCES = new Set<EApplianceType>([
  EApplianceType.ICE_WELL,
  EApplianceType.GARNISH_STATION,
  EApplianceType.LIQUOR_RAIL,
]);

/** Get the mix map for an appliance type (if it has one) */
export function getMixMap(type: EApplianceType): MixMap | null {
  switch (type) {
    case EApplianceType.ICE_WELL: return ICE_WELL_MIX_MAP;
    case EApplianceType.GARNISH_STATION: return GARNISH_MAP;
    case EApplianceType.LIQUOR_RAIL: return LIQUOR_RAIL_MIX_MAP;
    default: return null;
  }
}

/** Spirit types that can be mixed into cocktails */
export const SPIRIT_TYPES = new Set<EItemType>([
  EItemType.WHISKEY, EItemType.VODKA, EItemType.GIN, EItemType.RUM, EItemType.TEQUILA,
]);
