/**
 * Drink Recipe Tests — verifies all 13 drink crafting recipes + stock depletion.
 */
import { suite, teleportPlayer, waitTicks } from "../TestSuite";
import { EItemType } from "../Shared/ItemTypes";

// ── Recipe test data ─────────────────────────────────────────

const RECIPES = [
  // Beers (Draft System at 5,1)
  { name: "pilsner", appX: 5, variantIdx: 0, expected: EItemType.PILSNER },
  { name: "lager", appX: 5, variantIdx: 1, expected: EItemType.LAGER },
  { name: "ale", appX: 5, variantIdx: 2, expected: EItemType.ALE },
  { name: "ipa", appX: 5, variantIdx: 3, expected: EItemType.IPA },
  // Wines (Wine Rack at 10,1)
  { name: "merlot", appX: 10, variantIdx: 0, expected: EItemType.MERLOT },
  { name: "chardonnay", appX: 10, variantIdx: 1, expected: EItemType.CHARDONNAY },
  { name: "pinot_noir", appX: 10, variantIdx: 2, expected: EItemType.PINOT_NOIR },
  { name: "rose", appX: 10, variantIdx: 3, expected: EItemType.ROSE },
  // Spirits (Liquor Rail at 8,1)
  { name: "whiskey", appX: 8, variantIdx: 0, expected: EItemType.WHISKEY },
  { name: "vodka", appX: 8, variantIdx: 1, expected: EItemType.VODKA },
  { name: "gin", appX: 8, variantIdx: 2, expected: EItemType.GIN },
  { name: "rum", appX: 8, variantIdx: 3, expected: EItemType.RUM },
];

// ── Register standard recipe tests ──────────────────────────

for (const recipe of RECIPES) {
  suite.test(`craft_${recipe.name}`, async (ctx) => {
    // Grab glass from shelf at (9,1)
    teleportPlayer(9, 2, "up");
    await waitTicks(2);
    ctx.api.grab();
    await waitTicks(10);
    ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "holding glass");

    // Craft at appliance
    teleportPlayer(recipe.appX, 2, "up");
    await waitTicks(2);
    ctx.api.select(recipe.variantIdx);
    await waitTicks(10);
    ctx.assertEqual(ctx.api.held(), recipe.expected, `holding ${recipe.name}`);
  });
}

// ── Highball (3-step: glass → liquor → ice) ──────────────────

suite.test("craft_highball", async (ctx) => {
  // Grab glass
  teleportPlayer(9, 2, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "holding glass");

  // Craft spirit at liquor rail (8,1), variant 0 = whiskey
  teleportPlayer(8, 2, "up");
  await waitTicks(2);
  ctx.api.select(0);
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.WHISKEY, "holding whiskey");

  // Mix at ice well (11,1) — uses interact, not select
  teleportPlayer(11, 2, "up");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.HIGHBALL, "holding highball");
});

// ── Stock depletion ──────────────────────────────────────────

suite.test("craft_no_stock", async (ctx) => {
  const eng = ctx.engine();

  // Find draft system and drain its stock
  for (const app of eng._appliances.values()) {
    if (app.type === "draft_system") {
      app._currentStock = 0;
      break;
    }
  }

  // Try to craft a pilsner — should fail (no stock)
  teleportPlayer(9, 2, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "holding glass");

  teleportPlayer(5, 2, "up");
  await waitTicks(2);
  ctx.api.select(0);
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "still holding glass — no stock");
});
