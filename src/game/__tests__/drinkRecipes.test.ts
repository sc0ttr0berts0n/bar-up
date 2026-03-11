/**
 * DrinkRecipes unit tests — validates recipe data structure, variant configs,
 * and appliance variant mappings.
 */
import { describe, it, expect } from "vitest";
import { RECIPES, APPLIANCE_VARIANTS, SPIRIT_TYPES, getMenuDrinkKeys } from "../Shared/DrinkRecipes";
import { EApplianceType } from "../Shared/ApplianceTypes";
import { EItemType } from "../Shared/ItemTypes";

describe("RECIPES", () => {
  it("contains all 13 drinks", () => {
    const keys = Object.keys(RECIPES);
    expect(keys.length).toBe(13);
  });

  it("each recipe has required fields", () => {
    for (const [key, recipe] of Object.entries(RECIPES)) {
      expect(recipe.name, `${key}.name`).toBeTruthy();
      expect(recipe.resultType, `${key}.resultType`).toBeTruthy();
      expect(recipe.menuPrice, `${key}.menuPrice`).toBeGreaterThan(0);
    }
  });

  it("includes expected drink keys", () => {
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
});

describe("APPLIANCE_VARIANTS", () => {
  it("has draft system variants", () => {
    const draft = APPLIANCE_VARIANTS[EApplianceType.DRAFT_SYSTEM];
    expect(draft).toBeDefined();
    expect(draft!.variants.length).toBe(4);
  });

  it("has wine rack variants", () => {
    const wine = APPLIANCE_VARIANTS[EApplianceType.WINE_RACK];
    expect(wine).toBeDefined();
    expect(wine!.variants.length).toBe(4);
  });

  it("has liquor rail variants", () => {
    const liquor = APPLIANCE_VARIANTS[EApplianceType.LIQUOR_RAIL];
    expect(liquor).toBeDefined();
    expect(liquor!.variants.length).toBe(4);
  });

  it("all variants require a glass", () => {
    for (const [, config] of Object.entries(APPLIANCE_VARIANTS)) {
      if (config) {
        expect(config.requiredItems).toContain(EItemType.GLASS);
      }
    }
  });

  it("draft system produces beer types", () => {
    const draft = APPLIANCE_VARIANTS[EApplianceType.DRAFT_SYSTEM]!;
    const types = draft.variants.map((v) => v.type);
    expect(types).toContain(EItemType.PILSNER);
    expect(types).toContain(EItemType.LAGER);
    expect(types).toContain(EItemType.ALE);
    expect(types).toContain(EItemType.IPA);
  });

  it("wine rack produces wine types", () => {
    const wine = APPLIANCE_VARIANTS[EApplianceType.WINE_RACK]!;
    const types = wine.variants.map((v) => v.type);
    expect(types).toContain(EItemType.MERLOT);
    expect(types).toContain(EItemType.CHARDONNAY);
    expect(types).toContain(EItemType.PINOT_NOIR);
    expect(types).toContain(EItemType.ROSE);
  });

  it("liquor rail produces spirit types", () => {
    const liquor = APPLIANCE_VARIANTS[EApplianceType.LIQUOR_RAIL]!;
    const types = liquor.variants.map((v) => v.type);
    expect(types).toContain(EItemType.WHISKEY);
    expect(types).toContain(EItemType.VODKA);
    expect(types).toContain(EItemType.GIN);
    expect(types).toContain(EItemType.RUM);
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

describe("SPIRIT_TYPES", () => {
  it("contains all 4 spirit types", () => {
    expect(SPIRIT_TYPES.has(EItemType.WHISKEY)).toBe(true);
    expect(SPIRIT_TYPES.has(EItemType.VODKA)).toBe(true);
    expect(SPIRIT_TYPES.has(EItemType.GIN)).toBe(true);
    expect(SPIRIT_TYPES.has(EItemType.RUM)).toBe(true);
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
  });
});
