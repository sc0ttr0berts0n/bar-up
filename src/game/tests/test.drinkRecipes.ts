/**
 * Drink Recipe Tests — verifies all 13 drink crafting recipes + stock depletion.
 * Appliance positions are looked up dynamically to support custom layouts.
 */
import { suite, findApplianceByType, teleportPlayer, waitTicks } from "../TestSuite";
import { EApplianceType } from "../Shared/ApplianceTypes";
import { EItemType } from "../Shared/ItemTypes";

// ── Recipe test data ─────────────────────────────────────────

const RECIPES = [
  // Beers (Draft System)
  { name: "pilsner", appType: EApplianceType.DRAFT_SYSTEM, variantIdx: 0, expected: EItemType.PILSNER },
  { name: "lager", appType: EApplianceType.DRAFT_SYSTEM, variantIdx: 1, expected: EItemType.LAGER },
  { name: "ale", appType: EApplianceType.DRAFT_SYSTEM, variantIdx: 2, expected: EItemType.ALE },
  { name: "ipa", appType: EApplianceType.DRAFT_SYSTEM, variantIdx: 3, expected: EItemType.IPA },
  // Wines (Wine Rack)
  { name: "merlot", appType: EApplianceType.WINE_RACK, variantIdx: 0, expected: EItemType.MERLOT },
  { name: "chardonnay", appType: EApplianceType.WINE_RACK, variantIdx: 1, expected: EItemType.CHARDONNAY },
  { name: "pinot_noir", appType: EApplianceType.WINE_RACK, variantIdx: 2, expected: EItemType.PINOT_NOIR },
  { name: "rose", appType: EApplianceType.WINE_RACK, variantIdx: 3, expected: EItemType.ROSE },
  // Spirits (Liquor Rail)
  { name: "whiskey", appType: EApplianceType.LIQUOR_RAIL, variantIdx: 0, expected: EItemType.WHISKEY },
  { name: "vodka", appType: EApplianceType.LIQUOR_RAIL, variantIdx: 1, expected: EItemType.VODKA },
  { name: "gin", appType: EApplianceType.LIQUOR_RAIL, variantIdx: 2, expected: EItemType.GIN },
  { name: "rum", appType: EApplianceType.LIQUOR_RAIL, variantIdx: 3, expected: EItemType.RUM },
];

// ── Register standard recipe tests ──────────────────────────

for (const recipe of RECIPES) {
  suite.test(`craft_${recipe.name}`, async (ctx) => {
    const shelf = findApplianceByType(EApplianceType.GLASS_SHELF);
    const app = findApplianceByType(recipe.appType);

    // Grab glass from shelf
    teleportPlayer(shelf.gridX, shelf.gridY + 1, "up");
    await waitTicks(2);
    ctx.api.grab();
    await waitTicks(10);
    ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "holding glass");

    // Craft at appliance
    teleportPlayer(app.gridX, app.gridY + 1, "up");
    await waitTicks(2);
    ctx.api.select(recipe.variantIdx);
    await waitTicks(10);
    ctx.assertEqual(ctx.api.held(), recipe.expected, `holding ${recipe.name}`);
  });
}

// ── Highball (3-step: glass → liquor → ice) ──────────────────

suite.test("craft_highball", async (ctx) => {
  const shelf = findApplianceByType(EApplianceType.GLASS_SHELF);
  const liquor = findApplianceByType(EApplianceType.LIQUOR_RAIL);
  const ice = findApplianceByType(EApplianceType.ICE_WELL);

  // Grab glass
  teleportPlayer(shelf.gridX, shelf.gridY + 1, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "holding glass");

  // Craft spirit at liquor rail, variant 0 = whiskey
  teleportPlayer(liquor.gridX, liquor.gridY + 1, "up");
  await waitTicks(2);
  ctx.api.select(0);
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.WHISKEY, "holding whiskey");

  // Mix at ice well — uses interact, not select
  teleportPlayer(ice.gridX, ice.gridY + 1, "up");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.HIGHBALL, "holding highball");
});

// ── Stock depletion ──────────────────────────────────────────

suite.test("craft_no_stock", async (ctx) => {
  const eng = ctx.engine();
  const shelf = findApplianceByType(EApplianceType.GLASS_SHELF);
  const draft = findApplianceByType(EApplianceType.DRAFT_SYSTEM);

  // Drain draft system stock
  draft._currentStock = 0;

  // Try to craft a pilsner — should fail (no stock)
  teleportPlayer(shelf.gridX, shelf.gridY + 1, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "holding glass");

  teleportPlayer(draft.gridX, draft.gridY + 1, "up");
  await waitTicks(2);
  ctx.api.select(0);
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "still holding glass — no stock");
});
