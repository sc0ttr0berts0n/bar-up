import { EApplianceType } from "./ApplianceTypes";
import { EItemType } from "./ItemTypes";

export interface IDrinkRecipe {
  name: string;
  resultType: EItemType;
  glassType: EItemType;
  baseCost: number;
  menuPrice: number;
  steps: IRecipeStep[];
}

export interface IRecipeStep {
  applianceType: EApplianceType;
  description: string;
}

export const RECIPES: Record<string, IDrinkRecipe> = {
  // Beers (Pint Glass → Draft System)
  pilsner: {
    name: "Pilsner",
    resultType: EItemType.PILSNER,
    glassType: EItemType.PINT_GLASS,
    baseCost: 2,
    menuPrice: 5,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab pint glass" },
      { applianceType: EApplianceType.DRAFT_SYSTEM, description: "Fill from tap" },
    ],
  },
  lager: {
    name: "Lager",
    resultType: EItemType.LAGER,
    glassType: EItemType.PINT_GLASS,
    baseCost: 2,
    menuPrice: 5,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab pint glass" },
      { applianceType: EApplianceType.DRAFT_SYSTEM, description: "Fill from tap" },
    ],
  },
  ale: {
    name: "Ale",
    resultType: EItemType.ALE,
    glassType: EItemType.PINT_GLASS,
    baseCost: 2,
    menuPrice: 5,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab pint glass" },
      { applianceType: EApplianceType.DRAFT_SYSTEM, description: "Fill from tap" },
    ],
  },
  ipa: {
    name: "IPA",
    resultType: EItemType.IPA,
    glassType: EItemType.PINT_GLASS,
    baseCost: 2,
    menuPrice: 6,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab pint glass" },
      { applianceType: EApplianceType.DRAFT_SYSTEM, description: "Fill from tap" },
    ],
  },
  // Wines (Stem Glass → Wine Rack)
  merlot: {
    name: "Merlot",
    resultType: EItemType.MERLOT,
    glassType: EItemType.STEM_GLASS,
    baseCost: 3,
    menuPrice: 7,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab stem glass" },
      { applianceType: EApplianceType.WINE_RACK, description: "Pour wine" },
    ],
  },
  chardonnay: {
    name: "Chardonnay",
    resultType: EItemType.CHARDONNAY,
    glassType: EItemType.STEM_GLASS,
    baseCost: 3,
    menuPrice: 7,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab stem glass" },
      { applianceType: EApplianceType.WINE_RACK, description: "Pour wine" },
    ],
  },
  pinot_noir: {
    name: "Pinot Noir",
    resultType: EItemType.PINOT_NOIR,
    glassType: EItemType.STEM_GLASS,
    baseCost: 3,
    menuPrice: 8,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab stem glass" },
      { applianceType: EApplianceType.WINE_RACK, description: "Pour wine" },
    ],
  },
  rose: {
    name: "Rosé",
    resultType: EItemType.ROSE,
    glassType: EItemType.STEM_GLASS,
    baseCost: 3,
    menuPrice: 7,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab stem glass" },
      { applianceType: EApplianceType.WINE_RACK, description: "Pour wine" },
    ],
  },
  // Spirits (Shot Glass → Liquor Rail)
  whiskey: {
    name: "Whiskey",
    resultType: EItemType.WHISKEY,
    glassType: EItemType.SHOT_GLASS,
    baseCost: 3,
    menuPrice: 8,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab shot glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour spirit" },
    ],
  },
  vodka: {
    name: "Vodka",
    resultType: EItemType.VODKA,
    glassType: EItemType.SHOT_GLASS,
    baseCost: 3,
    menuPrice: 7,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab shot glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour spirit" },
    ],
  },
  gin: {
    name: "Gin",
    resultType: EItemType.GIN,
    glassType: EItemType.SHOT_GLASS,
    baseCost: 3,
    menuPrice: 8,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab shot glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour spirit" },
    ],
  },
  rum: {
    name: "Rum",
    resultType: EItemType.RUM,
    glassType: EItemType.SHOT_GLASS,
    baseCost: 3,
    menuPrice: 7,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab shot glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour spirit" },
    ],
  },
  // Mixed (Highball Glass → Liquor Rail → Ice Well)
  highball: {
    name: "Highball",
    resultType: EItemType.HIGHBALL,
    glassType: EItemType.HIGHBALL_GLASS,
    baseCost: 3,
    menuPrice: 6,
    steps: [
      { applianceType: EApplianceType.GLASS_SHELF, description: "Grab highball glass" },
      { applianceType: EApplianceType.LIQUOR_RAIL, description: "Pour spirit" },
      { applianceType: EApplianceType.ICE_WELL, description: "Add mixer" },
    ],
  },
};

/** Get the list of drink keys available on the menu */
export function getMenuDrinkKeys(): string[] {
  return Object.keys(RECIPES);
}

/** Variant options for appliances with sub-menus (craft: glass + appliance → drink) */
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
    requiredItems: [EItemType.PINT_GLASS],
    variants: [
      { type: EItemType.PILSNER, label: "Pilsner", color: 0x8b7320 },
      { type: EItemType.LAGER, label: "Lager", color: 0x996b10 },
      { type: EItemType.ALE, label: "Ale", color: 0x9a6830 },
      { type: EItemType.IPA, label: "IPA", color: 0xa05018 },
    ],
  },
  [EApplianceType.WINE_RACK]: {
    requiredItems: [EItemType.STEM_GLASS],
    variants: [
      { type: EItemType.MERLOT, label: "Merlot", color: 0x722f37 },
      { type: EItemType.CHARDONNAY, label: "Chardonnay", color: 0x7a6a10 },
      { type: EItemType.PINOT_NOIR, label: "Pinot Noir", color: 0x4a1a2e },
      { type: EItemType.ROSE, label: "Rosé", color: 0xa04060 },
    ],
  },
  [EApplianceType.LIQUOR_RAIL]: {
    requiredItems: [EItemType.SHOT_GLASS, EItemType.HIGHBALL_GLASS],
    variants: [
      { type: EItemType.WHISKEY, label: "Whiskey", color: 0x8a5a18 },
      { type: EItemType.VODKA, label: "Vodka", color: 0x5060a0 },
      { type: EItemType.GIN, label: "Gin", color: 0x2a6a3a },
      { type: EItemType.RUM, label: "Rum", color: 0x8a5c08 },
    ],
  },
};

/** Grab variant options for appliances (empty-handed → pick glass type) */
export interface IGrabVariantConfig {
  variants: IDrinkVariant[];
}

export const GRAB_VARIANTS: Partial<Record<EApplianceType, IGrabVariantConfig>> = {
  [EApplianceType.GLASS_SHELF]: {
    variants: [
      { type: EItemType.PINT_GLASS, label: "Pint Glass", color: 0x708090 },
      { type: EItemType.SHOT_GLASS, label: "Shot Glass", color: 0x607080 },
      { type: EItemType.STEM_GLASS, label: "Stem Glass", color: 0x506878 },
      { type: EItemType.HIGHBALL_GLASS, label: "Highball", color: 0x486888 },
    ],
  },
};

/** Spirit types that can be mixed into a highball at the ice well */
export const SPIRIT_TYPES = new Set<EItemType>([
  EItemType.WHISKEY, EItemType.VODKA, EItemType.GIN, EItemType.RUM,
]);
