/**
 * DrinkRecipes unit tests -- validates recipe data structure, variant configs,
 * mix maps, and appliance variant mappings.
 */
import { describe, it, expect } from "vitest";
import {
  RECIPES, APPLIANCE_VARIANTS, SPIRIT_TYPES, getMenuDrinkKeys,
  getMixMap, ICE_WELL_MIX_MAP, GARNISH_MAP, LIQUOR_RAIL_MIX_MAP,
} from "../Shared/DrinkRecipes";
import { EApplianceType } from "../Shared/ApplianceTypes";
import { EItemType } from "../Shared/ItemTypes";

describe("RECIPES", () => {
  it("contains all 23 drinks", () => {
    const keys = Object.keys(RECIPES);
    expect(keys.length).toBe(23);
  });

  it("each recipe has required fields", () => {
    for (const [key, recipe] of Object.entries(RECIPES)) {
      expect(recipe.name, `${key}.name`).toBeTruthy();
      expect(recipe.resultType, `${key}.resultType`).toBeTruthy();
      expect(recipe.menuPrice, `${key}.menuPrice`).toBeGreaterThan(0);
      expect(recipe.tier, `${key}.tier`).toBeGreaterThanOrEqual(1);
    }
  });

  it("includes original drink keys", () => {
    const keys = Object.keys(RECIPES);
    expect(keys).toContain("pilsner");
    expect(keys).toContain("lager");
    expect(keys).toContain("ale");
    expect(keys).toContain("ipa");
    expect(keys).toContain("merlot");
    expect(keys).toContain("chardonnay");
    expect(keys).toContain("pinot_noir");
    expect(keys).toContain("rose");
    expect(keys).toContain("whiskey");
    expect(keys).toContain("vodka");
    expect(keys).toContain("gin");
    expect(keys).toContain("rum");
    expect(keys).toContain("highball");
  });

  it("includes new drink keys", () => {
    const keys = Object.keys(RECIPES);
    expect(keys).toContain("tequila");
    expect(keys).toContain("prosecco");
    expect(keys).toContain("gin_tonic");
    expect(keys).toContain("rum_cola");
    expect(keys).toContain("spritz");
    expect(keys).toContain("martini");
    expect(keys).toContain("old_fashioned");
    expect(keys).toContain("margarita");
    expect(keys).toContain("long_island");
    expect(keys).toContain("espresso_martini");
  });

  it("tier 1 drinks have 2 steps", () => {
    for (const [, recipe] of Object.entries(RECIPES)) {
      if (recipe.tier === 1) {
        expect(recipe.steps.length).toBe(2);
      }
    }
  });

  it("tier 2 drinks have 3 steps", () => {
    for (const [, recipe] of Object.entries(RECIPES)) {
      if (recipe.tier === 2) {
        expect(recipe.steps.length).toBe(3);
      }
    }
  });

  it("tier 3 drinks have 4 steps", () => {
    for (const [, recipe] of Object.entries(RECIPES)) {
      if (recipe.tier === 3) {
        expect(recipe.steps.length).toBe(4);
      }
    }
  });
});

describe("APPLIANCE_VARIANTS", () => {
  it("has draft system variants", () => {
    const draft = APPLIANCE_VARIANTS[EApplianceType.DRAFT_SYSTEM];
    expect(draft).toBeDefined();
    expect(draft!.variants.length).toBe(4);
  });

  it("has wine rack variants (including prosecco)", () => {
    const wine = APPLIANCE_VARIANTS[EApplianceType.WINE_RACK];
    expect(wine).toBeDefined();
    expect(wine!.variants.length).toBe(5);
    expect(wine!.variants.map(v => v.type)).toContain(EItemType.PROSECCO);
  });

  it("has liquor rail variants (including tequila)", () => {
    const liquor = APPLIANCE_VARIANTS[EApplianceType.LIQUOR_RAIL];
    expect(liquor).toBeDefined();
    expect(liquor!.variants.length).toBe(5);
    expect(liquor!.variants.map(v => v.type)).toContain(EItemType.TEQUILA);
  });

  it("has ice well variants (mixer types)", () => {
    const iceWell = APPLIANCE_VARIANTS[EApplianceType.ICE_WELL];
    expect(iceWell).toBeDefined();
    expect(iceWell!.variants.length).toBe(3);
  });

  it("has garnish station variants", () => {
    const garnish = APPLIANCE_VARIANTS[EApplianceType.GARNISH_STATION];
    expect(garnish).toBeDefined();
    expect(garnish!.variants.length).toBe(5);
  });

  it("ice well accepts spirits and prosecco", () => {
    const iceWell = APPLIANCE_VARIANTS[EApplianceType.ICE_WELL]!;
    expect(iceWell.requiredItems).toContain(EItemType.WHISKEY);
    expect(iceWell.requiredItems).toContain(EItemType.VODKA);
    expect(iceWell.requiredItems).toContain(EItemType.GIN);
    expect(iceWell.requiredItems).toContain(EItemType.RUM);
    expect(iceWell.requiredItems).toContain(EItemType.PROSECCO);
  });

  it("garnish station accepts shaken intermediates", () => {
    const garnish = APPLIANCE_VARIANTS[EApplianceType.GARNISH_STATION]!;
    expect(garnish.requiredItems).toContain(EItemType.MARTINI_SHAKEN);
    expect(garnish.requiredItems).toContain(EItemType.OLD_FASHIONED_SHAKEN);
    expect(garnish.requiredItems).toContain(EItemType.MARGARITA_SHAKEN);
    expect(garnish.requiredItems).toContain(EItemType.LONG_ISLAND_SHAKEN);
  });

  it("liquor rail accepts glass and vodka (for Long Island base)", () => {
    const liquor = APPLIANCE_VARIANTS[EApplianceType.LIQUOR_RAIL]!;
    expect(liquor.requiredItems).toContain(EItemType.GLASS);
    expect(liquor.requiredItems).toContain(EItemType.VODKA);
  });

  it("draft system and wine rack still require glass only", () => {
    const draft = APPLIANCE_VARIANTS[EApplianceType.DRAFT_SYSTEM]!;
    expect(draft.requiredItems).toEqual([EItemType.GLASS]);
    const wine = APPLIANCE_VARIANTS[EApplianceType.WINE_RACK]!;
    expect(wine.requiredItems).toEqual([EItemType.GLASS]);
  });

  it("each variant has a label and color", () => {
    for (const [, config] of Object.entries(APPLIANCE_VARIANTS)) {
      if (config) {
        for (const variant of config.variants) {
          expect(variant.label).toBeTruthy();
          expect(typeof variant.color).toBe("number");
        }
      }
    }
  });
});

describe("Mix Maps", () => {
  it("ICE_WELL_MIX_MAP maps gin to gin_tonic", () => {
    expect(ICE_WELL_MIX_MAP[EItemType.GIN][0]).toBe(EItemType.GIN_TONIC);
  });

  it("ICE_WELL_MIX_MAP maps rum to rum_cola", () => {
    expect(ICE_WELL_MIX_MAP[EItemType.RUM][0]).toBe(EItemType.RUM_COLA);
  });

  it("ICE_WELL_MIX_MAP maps prosecco to spritz", () => {
    expect(ICE_WELL_MIX_MAP[EItemType.PROSECCO][0]).toBe(EItemType.SPRITZ);
  });

  it("ICE_WELL_MIX_MAP maps whiskey/vodka to highball", () => {
    expect(ICE_WELL_MIX_MAP[EItemType.WHISKEY][0]).toBe(EItemType.HIGHBALL);
    expect(ICE_WELL_MIX_MAP[EItemType.VODKA][0]).toBe(EItemType.HIGHBALL);
  });

  it("GARNISH_MAP maps martini_shaken + olive to martini", () => {
    expect(GARNISH_MAP[EItemType.MARTINI_SHAKEN][0]).toBe(EItemType.MARTINI);
  });

  it("GARNISH_MAP maps martini_shaken + espresso to espresso_martini", () => {
    expect(GARNISH_MAP[EItemType.MARTINI_SHAKEN][1]).toBe(EItemType.ESPRESSO_MARTINI);
  });

  it("GARNISH_MAP maps old_fashioned_shaken to old_fashioned", () => {
    expect(GARNISH_MAP[EItemType.OLD_FASHIONED_SHAKEN][2]).toBe(EItemType.OLD_FASHIONED);
  });

  it("LIQUOR_RAIL_MIX_MAP maps vodka + rum to long_island_base", () => {
    expect(LIQUOR_RAIL_MIX_MAP[EItemType.VODKA][3]).toBe(EItemType.LONG_ISLAND_BASE);
  });

  it("getMixMap returns correct maps", () => {
    expect(getMixMap(EApplianceType.ICE_WELL)).toBe(ICE_WELL_MIX_MAP);
    expect(getMixMap(EApplianceType.GARNISH_STATION)).toBe(GARNISH_MAP);
    expect(getMixMap(EApplianceType.LIQUOR_RAIL)).toBe(LIQUOR_RAIL_MIX_MAP);
    expect(getMixMap(EApplianceType.DRAFT_SYSTEM)).toBeNull();
  });
});

describe("SPIRIT_TYPES", () => {
  it("contains all 5 spirit types", () => {
    expect(SPIRIT_TYPES.has(EItemType.WHISKEY)).toBe(true);
    expect(SPIRIT_TYPES.has(EItemType.VODKA)).toBe(true);
    expect(SPIRIT_TYPES.has(EItemType.GIN)).toBe(true);
    expect(SPIRIT_TYPES.has(EItemType.RUM)).toBe(true);
    expect(SPIRIT_TYPES.has(EItemType.TEQUILA)).toBe(true);
  });

  it("does not contain non-spirit types", () => {
    expect(SPIRIT_TYPES.has(EItemType.PILSNER)).toBe(false);
    expect(SPIRIT_TYPES.has(EItemType.MERLOT)).toBe(false);
    expect(SPIRIT_TYPES.has(EItemType.GLASS)).toBe(false);
  });
});

describe("getMenuDrinkKeys", () => {
  it("returns all recipe keys", () => {
    const keys = getMenuDrinkKeys();
    expect(keys.length).toBe(Object.keys(RECIPES).length);
    expect(keys).toContain("pilsner");
    expect(keys).toContain("highball");
    expect(keys).toContain("martini");
    expect(keys).toContain("long_island");
  });
});
