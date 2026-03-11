/**
 * Phase Tests — shift progression, early closing end, last call timing.
 */
import { suite, waitTicks, delay } from "../TestSuite";
import GameSettings from "../Shared/GameSettings";

suite.test("phase_skip_cycle", async (ctx) => {
  const eng = ctx.engine();
  const sm = eng._shiftManager;

  // Should start in service (resetGameState ensures this)
  ctx.assertEqual(sm.phase, "service", "starts in service");

  sm.skipPhase();
  ctx.assertEqual(sm.phase, "closing", "skipped to closing");

  sm.skipPhase();
  ctx.assertEqual(sm.phase, "prep", "skipped to prep");

  sm.skipPhase();
  ctx.assertEqual(sm.phase, "service", "skipped back to service");
});

suite.test("early_closing_end", async (ctx) => {
  const eng = ctx.engine();
  const sm = eng._shiftManager;

  // Ensure no guests exist (resetGameState already did this)
  ctx.assertEqual(eng._guests.size, 0, "no guests");

  // Skip to closing phase
  sm.skipPhase();
  ctx.assertEqual(sm.phase, "closing", "entered closing");

  // Let the engine tick — it should detect 0 guests and auto-skip
  await waitTicks(10);
  // The engine's tick checks: if closing && guests.size === 0 → skipPhase()
  // Give it more time if needed
  await delay(200);

  ctx.assertEqual(sm.phase, "prep", "auto-skipped to prep (no guests)");
});

suite.test("last_call_timing", async (ctx) => {
  const eng = ctx.engine();
  const sm = eng._shiftManager as any;

  // Ensure we're in service phase
  ctx.assertEqual(sm.phase, "service", "in service phase");

  // Timer counts UP: remainingTime = phaseDuration - timer
  // Last call fires when remainingTime <= lastCallTimeRemaining
  // i.e. timer >= servicePhaseDuration - lastCallTimeRemaining
  sm._timer = GameSettings.servicePhaseDuration - GameSettings.lastCallTimeRemaining + 1;
  sm._lastCallTriggered = false;

  // Tick the engine so ShiftManager processes the timer
  await waitTicks(5);

  ctx.assertTruthy(sm.lastCallTriggered, "last call triggered");
});
