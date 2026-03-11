/**
 * Serving Tests — order taking, drink serving, wrong drink rejection,
 * preferred drink bonus, and full service cycle with dirty glass cleanup.
 */
import { suite, teleportPlayer, spawnTestGuest, waitTicks, givePlayerItem, delay } from "../TestSuite";
import { EGuestStatus } from "../Shared/GuestTypes";
import { EItemType } from "../Shared/ItemTypes";
import GameSettings from "../Shared/GameSettings";

suite.test("take_order", async (ctx) => {
  const eng = ctx.engine();

  // Restrict menu to pilsner only for deterministic orders
  for (const [key, config] of eng._menuConfig) {
    config.enabled = key === "pilsner";
  }

  const guest = spawnTestGuest(5, EGuestStatus.READY_TO_ORDER);

  // Face guest from behind counter and take order
  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);

  ctx.assertEqual(guest.status, EGuestStatus.WAITING_FOR_ORDER, "guest waiting for order");
  ctx.assertEqual(guest.order?.drinkKey, "pilsner", "ordered pilsner");
});

suite.test("serve_correct_drink", async (ctx) => {
  const eng = ctx.engine();
  const moneyBefore = eng._money;

  // Spawn guest waiting for pilsner
  const guest = spawnTestGuest(5, EGuestStatus.WAITING_FOR_ORDER, { order: "pilsner" });

  // Craft pilsner
  teleportPlayer(9, 2, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  teleportPlayer(5, 2, "up");
  await waitTicks(2);
  ctx.api.select(0);
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.PILSNER, "holding pilsner");

  // Serve
  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);

  ctx.assertEqual(guest.status, EGuestStatus.DRINKING, "guest is drinking");
  ctx.assertEqual(ctx.api.held(), "nothing", "hands empty");
  ctx.assertTruthy(eng._money > moneyBefore, "earned money");
});

suite.test("serve_wrong_drink", async (ctx) => {
  // Guest wants pilsner, we serve lager
  const guest = spawnTestGuest(5, EGuestStatus.WAITING_FOR_ORDER, { order: "pilsner" });

  // Craft lager (variant index 1 at draft)
  teleportPlayer(9, 2, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  teleportPlayer(5, 2, "up");
  await waitTicks(2);
  ctx.api.select(1); // lager
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.LAGER, "holding lager");

  // Try to serve — should be rejected
  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);

  ctx.assertEqual(guest.status, EGuestStatus.WAITING_FOR_ORDER, "guest still waiting — wrong drink");
  ctx.assertEqual(ctx.api.held(), EItemType.LAGER, "still holding lager");
});

suite.test("serve_preferred_drink", async (ctx) => {
  // Guest prefers pilsner and ordered it
  const guest = spawnTestGuest(5, EGuestStatus.WAITING_FOR_ORDER, {
    order: "pilsner",
    preferredDrink: "pilsner",
    happiness: 50,
  });
  const happinessBefore = guest.happiness;

  // Craft and serve pilsner
  teleportPlayer(9, 2, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  teleportPlayer(5, 2, "up");
  await waitTicks(2);
  ctx.api.select(0);
  await waitTicks(10);

  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);

  ctx.assertEqual(guest.status, EGuestStatus.DRINKING, "guest drinking");
  // Should get base serve bonus + preferred drink bonus
  const expectedMin = happinessBefore + GameSettings.happinessServeBonus + GameSettings.preferredDrinkBonus;
  ctx.assertTruthy(
    guest.happiness >= expectedMin,
    `happiness ${guest.happiness} >= ${expectedMin} (serve + preferred bonus)`,
  );
});

suite.test("full_service_cycle", async (ctx) => {
  const eng = ctx.engine();

  // Restrict menu to pilsner
  for (const [key, config] of eng._menuConfig) {
    config.enabled = key === "pilsner";
  }

  const guest = spawnTestGuest(5, EGuestStatus.READY_TO_ORDER);

  // 1. Take order
  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);
  ctx.assertEqual(guest.status, EGuestStatus.WAITING_FOR_ORDER, "step 1: order taken");

  // 2. Craft pilsner
  teleportPlayer(9, 2, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  teleportPlayer(5, 2, "up");
  await waitTicks(2);
  ctx.api.select(0);
  await waitTicks(10);

  // 3. Serve
  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);
  ctx.assertEqual(guest.status, EGuestStatus.DRINKING, "step 3: drinking");

  // 4. Fast-forward drink to near completion
  const g = guest as any;
  g._drinkProgress = 0.99;
  g._statusTimer = g._drinkDuration * 0.99;
  await waitTicks(120); // ~2s for tick to catch completion

  // 5. Verify dirty glass exists
  let dirtyGlassId: string | null = null;
  for (const [id, item] of eng._items) {
    if ((item as any)._type === EItemType.DIRTY_GLASS || (item as any).type === EItemType.DIRTY_GLASS) {
      dirtyGlassId = id;
      break;
    }
  }
  ctx.assertTruthy(dirtyGlassId, "dirty glass produced");

  // 6. Pick up dirty glass from counter
  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.DIRTY_GLASS, "step 6: holding dirty glass");

  // 7. Wash at sink (14,1)
  teleportPlayer(14, 2, "up");
  await waitTicks(2);
  ctx.api.interact();
  await delay(1500); // wash takes 1.0s

  ctx.assertEqual(ctx.api.held(), "nothing", "step 7: hands empty after washing");
});
