/**
 * Guest Behavior Tests — fight trigger/resolve, trait effects, queue flow,
 * closing transition, and service bar operations.
 */
import { suite, teleportPlayer, spawnTestGuest, waitTicks, givePlayerItem, delay } from "../TestSuite";
import { EGuestStatus, EGuestTrait } from "../Shared/GuestTypes";
import { EItemType } from "../Shared/ItemTypes";
import { EApplianceType } from "../Shared/ApplianceTypes";
import GameSettings from "../Shared/GameSettings";

// ── Fight System ─────────────────────────────────────────────

suite.test("fight_trigger", async (ctx) => {
  const eng = ctx.engine();

  // Spawn VIOLENT, drunk, unhappy guest that's drinking
  const guest = spawnTestGuest(5, EGuestStatus.DRINKING, {
    drunkenness: GameSettings.fightDrunkThreshold + 0.15,
    happiness: GameSettings.fightHappinessThreshold - 5,
    traits: [EGuestTrait.VIOLENT],
  });
  const g = guest as any;
  g._drinkDuration = 999;
  g._sipsTaken = GameSettings.sipsPerDrink;

  await waitTicks(5);

  ctx.assertEqual(guest.status, EGuestStatus.FIGHTING, "VIOLENT guest triggered fight");
});

suite.test("fight_resolve", async (ctx) => {
  // Spawn already fighting guest
  const guest = spawnTestGuest(5, EGuestStatus.FIGHTING);

  // Interact to resolve
  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);

  ctx.assertEqual(guest.status, EGuestStatus.LEAVING, "fight resolved — guest leaving");
});

suite.test("fight_aoe_happiness", async (ctx) => {
  const eng = ctx.engine();

  // Spawn fighting guest at x=5
  const fighter = spawnTestGuest(5, EGuestStatus.DRINKING, {
    drunkenness: GameSettings.fightDrunkThreshold + 0.15,
    happiness: GameSettings.fightHappinessThreshold - 5,
    traits: [EGuestTrait.VIOLENT],
  });
  const fg = fighter as any;
  fg._drinkDuration = 999;
  fg._sipsTaken = GameSettings.sipsPerDrink;

  // Nearby guest at x=6 (within AOE radius)
  const bystander = spawnTestGuest(6, EGuestStatus.DRINKING, {
    happiness: 80,
  });
  const bg = bystander as any;
  bg._drinkDuration = 999;
  bg._sipsTaken = GameSettings.sipsPerDrink;

  const happinessBefore = bystander.happiness;

  await waitTicks(5);

  ctx.assertEqual(fighter.status, EGuestStatus.FIGHTING, "fighter is fighting");
  ctx.assertEqual(
    bystander.happiness,
    happinessBefore - GameSettings.fightAoeHappinessDrop,
    `bystander lost ${GameSettings.fightAoeHappinessDrop} happiness`,
  );
});

// ── Trait Effects ────────────────────────────────────────────

suite.test("trait_lightweight_sip", async (ctx) => {
  const eng = ctx.engine();

  // Spawn a LIGHTWEIGHT guest in DRINKING state
  const guest = spawnTestGuest(5, EGuestStatus.DRINKING, {
    traits: [EGuestTrait.LIGHTWEIGHT],
  });
  const g = guest as any;
  g._drinkDuration = 5;
  g._drinkProgress = 0;
  g._statusTimer = 0;
  g._sipsTaken = 0;
  g._drunkenness = 0;

  // Wait for at least one sip
  const sipInterval = 1.0 / GameSettings.sipsPerDrink;
  const waitMs = Math.ceil(sipInterval * g._drinkDuration * 1000) + 200;
  await delay(waitMs);

  const expectedSip = GameSettings.sipDrunkenness * GameSettings.lightweightDrunkMultiplier;
  ctx.assertTruthy(g._sipsTaken >= 1, `took at least 1 sip (took ${g._sipsTaken})`);
  // Allow tolerance for decay
  ctx.assertTruthy(
    g._drunkenness > expectedSip * 0.6,
    `drunkenness ${g._drunkenness.toFixed(3)} reflects lightweight multiplier`,
  );
});

suite.test("trait_chatty_bonus", async (ctx) => {
  // Spawn a CHATTY drinking guest with chat available
  const guest = spawnTestGuest(5, EGuestStatus.DRINKING, {
    happiness: 50,
    traits: [EGuestTrait.CHATTY],
  });
  const g = guest as any;
  g._drinkDuration = 999;
  g._chatAvailable = true;
  g._chatCooldown = 0;

  const happinessBefore = guest.happiness;

  // Chat (empty-handed interact on drinking guest)
  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);

  const expectedBonus = GameSettings.chatHappinessBonus * 2; // CHATTY = double
  ctx.assertEqual(
    guest.happiness,
    happinessBefore + expectedBonus,
    `CHATTY bonus: ${guest.happiness} = ${happinessBefore} + ${expectedBonus}`,
  );
});

suite.test("trait_impatient_fast_serve", async (ctx) => {
  // IMPATIENT guest waiting for pilsner — high patience so bonuses don't cap
  const guest = spawnTestGuest(5, EGuestStatus.WAITING_FOR_ORDER, {
    order: "pilsner",
    patience: 30,
    traits: [EGuestTrait.IMPATIENT],
  });

  // Give player a pre-crafted pilsner (skip crafting to keep statusTimer low)
  givePlayerItem(EItemType.PILSNER);
  await waitTicks(2);

  // Reset statusTimer right before serving to guarantee < 10s
  (guest as any)._statusTimer = 1;

  // Serve immediately
  teleportPlayer(5, 2, "down");
  await waitTicks(2);
  ctx.api.interact();
  await waitTicks(10);

  ctx.assertEqual(guest.status, EGuestStatus.DRINKING, "guest drinking");
  // Both bonuses (+40 serve + +10 fast-serve = +50) should push from 30 to ~80
  // Even with minor tick decay, should be well above 70
  ctx.assertTruthy(
    guest.patience >= 70,
    `patience ${guest.patience} >= 70 (got serve + fast-serve bonus from 30)`,
  );
});

// ── Service Bar ──────────────────────────────────────────────

suite.test("service_bar_place_and_pickup", async (ctx) => {
  const eng = ctx.engine();

  // Give player a glass
  givePlayerItem(EItemType.GLASS);
  await waitTicks(2);
  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "holding glass");

  // Service bar is at (16,1) or (17,1) — find it
  let serviceBarX = 16;
  for (const app of eng._appliances.values()) {
    if ((app as any).type === EApplianceType.SERVICE_BAR) {
      serviceBarX = (app as any)._gridX;
      break;
    }
  }

  // Place on service bar
  teleportPlayer(serviceBarX, 2, "up");
  await waitTicks(2);
  ctx.api.grab(); // E = drop on surface
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), "nothing", "placed glass on service bar");

  // Pick up from service bar
  ctx.api.grab(); // E = pick up
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "picked up glass from service bar");
});

// ── Closing Transition ───────────────────────────────────────

suite.test("closing_decides_leave", async (ctx) => {
  const eng = ctx.engine();

  // Spawn a deciding guest
  const guest = spawnTestGuest(5, EGuestStatus.DECIDING);

  // Skip to closing
  eng._shiftManager.skipPhase(); // service → closing
  await waitTicks(5);

  ctx.assertEqual(guest.status, EGuestStatus.LEAVING, "deciding guest leaves on closing");
});

// ── Return to Source ─────────────────────────────────────────

suite.test("return_glass_to_shelf", async (ctx) => {
  // Give player a glass
  givePlayerItem(EItemType.GLASS);
  await waitTicks(2);
  ctx.assertEqual(ctx.api.held(), EItemType.GLASS, "holding glass");

  // Return it to glass shelf (9,1)
  teleportPlayer(9, 2, "up");
  await waitTicks(2);
  ctx.api.grab(); // E on shelf while holding glass = return
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), "nothing", "glass returned to shelf");
});

suite.test("return_card_to_holder", async (ctx) => {
  // Give player a cut-off card
  givePlayerItem(EItemType.CUT_OFF_CARD);
  await waitTicks(2);
  ctx.assertEqual(ctx.api.held(), EItemType.CUT_OFF_CARD, "holding card");

  // Return it to card holder (3,1)
  teleportPlayer(3, 2, "up");
  await waitTicks(2);
  ctx.api.grab();
  await waitTicks(10);
  ctx.assertEqual(ctx.api.held(), "nothing", "card returned to holder");
});
