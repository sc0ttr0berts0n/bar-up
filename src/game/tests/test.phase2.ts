/**
 * Phase 2 Tests — overserve flash, bin/trash system.
 */
import { suite, teleportPlayer, spawnTestGuest, waitTicks, givePlayerItem, findApplianceByType, delay } from "../TestSuite";
import { EGuestStatus } from "../Shared/GuestTypes";
import { EItemType } from "../Shared/ItemTypes";
import { EApplianceType } from "../Shared/ApplianceTypes";
import GameSettings from "../Shared/GameSettings";
import viewGame from "../View/Game";

suite.test("overserve_flash", async (ctx) => {
  const eng = ctx.engine();
  const level = (viewGame as any)?.level;
  ctx.assertTruthy(level, "level exists");

  // Spawn a very drunk guest waiting for pilsner
  const guest = spawnTestGuest(5, EGuestStatus.WAITING_FOR_ORDER, {
    order: "pilsner",
    drunkenness: GameSettings.overserveDrunkennessThreshold + 0.1,
  });

  // Craft and serve pilsner
  teleportPlayer(9, 2, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  teleportPlayer(5, 2, "up");
  await waitTicks(2);
  ctx.api.select(0);
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.PILSNER, "holding pilsner");

  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);

  ctx.assertTruthy(guest.wasOverserved, "guest overserved");
  // Flash should have triggered — _flashAlpha > 0
  ctx.assertTruthy((level as any)._flashAlpha > 0, `flash active (alpha=${(level as any)._flashAlpha})`);
});

suite.test("bin_toss_and_pickup", async (ctx) => {
  // BIN is at (17,1) — face it from (17,2)
  const bin = findApplianceByType(EApplianceType.BIN);
  ctx.assertTruthy(bin, "BIN exists");

  // Give player a dirty glass and toss it in
  givePlayerItem(EItemType.DIRTY_GLASS);
  await waitTicks(2);
  ctx.assertEqual(ctx.api.held(), EItemType.DIRTY_GLASS, "holding dirty glass");

  teleportPlayer(bin.gridX, 2, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);

  ctx.assertEqual(ctx.api.held(), "nothing", "hands empty after toss");

  // Now pick up the trash bag
  ctx.api.grab();
  await waitTicks(10);

  ctx.assertEqual(ctx.api.held(), EItemType.TRASH_BAG, "picked up trash bag");
});

suite.test("trash_bag_dump", async (ctx) => {
  // Give player a trash bag
  givePlayerItem(EItemType.TRASH_BAG);
  await waitTicks(2);
  ctx.assertEqual(ctx.api.held(), EItemType.TRASH_BAG, "holding trash bag");

  // Walk to entrance (y=14, x=9) — face entrance from y=13
  teleportPlayer(9, 13, "down");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);

  ctx.assertEqual(ctx.api.held(), "nothing", "trash bag dumped at entrance");
});
