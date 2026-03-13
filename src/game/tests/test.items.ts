/**
 * Item Tests — grab/drop, counter placement, dirty glass wash, cut-off card.
 */
import { suite, teleportPlayer, waitTicks, givePlayerItem, findApplianceByType, delay } from "../TestSuite";
import { Item } from "../Network/Server/GameObjects/Item";
import { EItemType } from "../Shared/ItemTypes";
import { EApplianceType } from "../Shared/ApplianceTypes";

suite.test("grab_glass_from_shelf", async (ctx) => {
  const shelf = findApplianceByType(EApplianceType.GLASS_SHELF);
  teleportPlayer(shelf.gridX, shelf.gridY + 1, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "holding glass");
});

suite.test("drop_on_counter", async (ctx) => {
  // Give player a glass
  givePlayerItem(EItemType.GLASS);
  await waitTicks(2);
  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "holding glass");

  // Find a counter and face it
  const counter = findApplianceByType(EApplianceType.COUNTER);
  teleportPlayer(counter.gridX, counter.gridY - 1, "down");
  await waitTicks(2);
  ctx.api.grab(); // E = drop on counter
  await waitTicks(10);

  ctx.assertEqual(ctx.api.held(), "nothing", "hands empty after drop");

  // Verify item is on the counter
  const eng = ctx.engine();
  let itemOnCounter = false;
  for (const item of eng._items.values()) {
    if ((item as any)._locationApplianceId || (item as any).locationApplianceId) {
      itemOnCounter = true;
      break;
    }
  }
  ctx.assertTruthy(itemOnCounter, "item placed on counter");
});

suite.test("pickup_from_counter", async (ctx) => {
  const eng = ctx.engine();

  // Place a glass on counter via engine
  const counter = findApplianceByType(EApplianceType.COUNTER);
  ctx.assertTruthy(counter, "counter exists");
  const item = new Item(EItemType.GLASS);
  item.placeOnAppliance(counter.id, 0);
  eng._items.set((item as any).id, item);
  counter.setSlot(0, (item as any).id);

  // Pick it up
  teleportPlayer(counter.gridX, counter.gridY - 1, "down");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);

  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "picked up glass from counter");
});

suite.test("dirty_glass_wash", async (ctx) => {
  const sink = findApplianceByType(EApplianceType.SINK);

  // Give player a dirty glass
  givePlayerItem(EItemType.DIRTY_GLASS);
  await waitTicks(2);
  ctx.assertEqual(ctx.api.held(), EItemType.DIRTY_GLASS, "holding dirty glass");

  // Wash at sink — now returns clean glass
  teleportPlayer(sink.gridX, sink.gridY + 1, "up");
  await waitTicks(2);
  ctx.api.interact();
  await delay(1500); // wash animation = 1.0s

  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "holding clean glass after washing");
});

suite.test("grab_cutoff_card", async (ctx) => {
  const cards = findApplianceByType(EApplianceType.CARD_HOLDER);
  teleportPlayer(cards.gridX, cards.gridY + 1, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.CUT_OFF_CARD, "holding cut-off card");
});
