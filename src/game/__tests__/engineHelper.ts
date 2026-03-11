/**
 * Test helper — creates a standalone Engine instance for Vitest unit tests.
 *
 * Engine's `_game` field is stored but never called during tick/update,
 * so we pass a minimal mock. All server game objects (Guest, Appliance,
 * Bartender, ShiftManager, GuestSpawner) are pure logic with no browser deps.
 */
import { Engine } from "../Network/Server/Engine";

/** Create a test engine with a mock Game reference. */
export function createTestEngine(): Engine {
  return new Engine({} as any);
}

/**
 * Tick the engine N times.
 * Engine.update() calculates its own dt from GameSettings.tickRate (60Hz).
 */
export function tick(engine: Engine, n = 1) {
  for (let i = 0; i < n; i++) {
    engine.update();
  }
}

/** Access engine private fields via `as any`. */
export function priv(obj: unknown): any {
  return obj as any;
}
