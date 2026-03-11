/**
 * Guest Tests — overserve detection, cut-off card, chat/preferences,
 * mess cleanup, slip recovery.
 */
import { suite, teleportPlayer, spawnTestGuest, waitTicks, givePlayerItem } from "../TestSuite";
import { EGuestStatus } from "../Shared/GuestTypes";
import { EItemType } from "../Shared/ItemTypes";
import GameSettings from "../Shared/GameSettings";

suite.test("overserve_detection", async (ctx) => {
  const eng = ctx.engine();

  // Spawn a very drunk guest waiting for pilsner
  const guest = spawnTestGuest(5, EGuestStatus.WAITING_FOR_ORDER, {
    order: "pilsner",
    drunkenness: GameSettings.overserveDrunkennessThreshold + 0.1,
  });

  const repBefore = eng._reputation;
  const policeBefore = eng._policeAttention;

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

  ctx.assertTruthy(guest.wasOverserved, "guest flagged as overserved");
  ctx.assertTruthy(eng._reputation < repBefore, "reputation decreased");
  ctx.assertTruthy(eng._policeAttention > policeBefore, "police attention increased");

  // Check mess at guest position
  const messKey = `${guest.gridX},${guest.gridY}`;
  ctx.assertTruthy(eng._messes.has(messKey), "mess created at guest position");
});

suite.test("cutoff_card", async (ctx) => {
  const eng = ctx.engine();

  // Spawn a drinking guest with proper drink state so they stay DRINKING
  const guest = spawnTestGuest(5, EGuestStatus.DRINKING, { drunkenness: 0.5 });
  const g = guest as any;
  g._drinkDuration = 30; // long drink so they don't finish
  g._drinkProgress = 0.1;
  g._statusTimer = 3;

  // Give player a cut-off card
  givePlayerItem(EItemType.CUT_OFF_CARD);
  await waitTicks(2);
  ctx.assertEqual(ctx.api.held(), EItemType.CUT_OFF_CARD, "holding card");

  // Face guest and interact
  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);

  ctx.assertEqual(guest.status, EGuestStatus.LEAVING, "guest leaving after cut-off");
  ctx.assertEqual(ctx.api.held(), "nothing", "card consumed");

  // Verify card item was deleted
  let cardExists = false;
  for (const item of eng._items.values()) {
    if ((item as any)._type === EItemType.CUT_OFF_CARD || (item as any).type === EItemType.CUT_OFF_CARD) {
      cardExists = true;
    }
  }
  ctx.assert(!cardExists, "card item deleted from engine");
});

suite.test("chat_reveals_preference", async (ctx) => {
  // Spawn a drinking guest with proper drink state so they stay DRINKING
  const guest = spawnTestGuest(5, EGuestStatus.DRINKING, {
    preferredDrink: "pilsner",
    happiness: 50,
  });
  const g = guest as any;
  g._drinkDuration = 30; // long drink so they don't finish
  g._drinkProgress = 0.1;
  g._statusTimer = 3;
  g._chatAvailable = true;
  g._chatCooldown = 0;

  const chatsBefore = guest.chatCount;
  const happinessBefore = guest.happiness;

  // Face guest empty-handed and interact
  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);

  ctx.assertTruthy(guest.chatCount > chatsBefore, "chat count increased");
  ctx.assertTruthy(guest.happiness > happinessBefore, "happiness increased from chat");
});

suite.test("mess_cleanup", async (ctx) => {
  const eng = ctx.engine();

  // Add a mess at (6,2) — employee area, no appliance on this tile
  // (Mess cleanup only fires if facing tile has NO applianceId,
  //  since interact routes to craft handler before mess check)
  eng._messes.add("6,2");
  ctx.assertTruthy(eng._messes.has("6,2"), "mess exists before cleanup");

  // Face the mess and interact
  teleportPlayer(5, 2, "right");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);

  ctx.assert(!eng._messes.has("6,2"), "mess cleaned up");
});

suite.test("slip_recovery", async (ctx) => {
  // Spawn a slipped guest
  const guest = spawnTestGuest(5, EGuestStatus.SLIPPED);

  // Face guest and interact to help up
  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);

  // During service phase, guest should walk back to seat (not leave)
  ctx.assert(
    guest.status === EGuestStatus.WALKING_TO_SEAT || guest.status === EGuestStatus.DECIDING,
    `guest recovering: status=${guest.status}`,
  );
});
