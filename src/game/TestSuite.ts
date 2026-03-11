/**
 * Test Suite Runner — registration, execution, assertion helpers, and
 * game-state setup utilities for the in-browser test suite.
 *
 * Tests register via `suite.test(name, fn)`.
 * Run via `__TEST.runAll()` or `__TEST.run('name')` from console / Claude in Chrome.
 */
import Server from "./Network/Server/Server";
import { Guest } from "./Network/Server/GameObjects/Guest";
import { Item } from "./Network/Server/GameObjects/Item";
import { EApplianceType } from "./Shared/ApplianceTypes";
import { EGuestStatus, type EGuestTrait } from "./Shared/GuestTypes";
import { EItemType } from "./Shared/ItemTypes";
import { EDirection } from "./Shared/TileTypes";
import { RECIPES } from "./Shared/DrinkRecipes";
import GameSettings from "./Shared/GameSettings";

// ── Types ────────────────────────────────────────────────────

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  assertions: number;
}

export interface TestContext {
  assert(condition: boolean, message: string): void;
  assertEqual<T>(actual: T, expected: T, label: string): void;
  assertTruthy(value: unknown, label: string): void;
  engine: () => any;
  api: any; // the __TEST api object
}

type TestFn = (ctx: TestContext) => Promise<void>;

// ── Test Suite ───────────────────────────────────────────────

class TestSuite {
  private _tests: Map<string, TestFn> = new Map();
  private _running = false;
  private _abortRequested = false;

  test(name: string, fn: TestFn) {
    this._tests.set(name, fn);
  }

  list(): string[] {
    return [...this._tests.keys()];
  }

  /** Abort any currently running test suite. */
  abort() {
    if (this._running) {
      this._abortRequested = true;
      console.log("%c⏹ Abort requested — finishing current test…", "color:#f59e0b;font-weight:bold");
    }
  }

  private _makeContext(): { ctx: TestContext; getAssertions: () => number } {
    let assertions = 0;
    const ctx: TestContext = {
      assert(condition, message) {
        if (!condition) throw new Error(`ASSERT: ${message}`);
        assertions++;
      },
      assertEqual(actual, expected, label) {
        if (actual !== expected) throw new Error(`ASSERT: ${label} — expected "${expected}", got "${actual}"`);
        assertions++;
      },
      assertTruthy(value, label) {
        if (!value) throw new Error(`ASSERT: ${label} — got falsy: ${value}`);
        assertions++;
      },
      engine: () => getEngine(),
      api: (window as any).__TEST,
    };
    return { ctx, getAssertions: () => assertions };
  }

  async run(name: string): Promise<TestResult> {
    const fn = this._tests.get(name);
    if (!fn) return { name, passed: false, duration: 0, error: "test not found", assertions: 0 };

    // If called standalone (not from runAll), acquire lock
    const standalone = !this._running;
    if (standalone) {
      if (this._running) {
        return { name, passed: false, duration: 0, error: "tests already running — call abort() first", assertions: 0 };
      }
      this._running = true;
    }

    const { ctx, getAssertions } = this._makeContext();
    const t0 = performance.now();
    try {
      await resetGameState();
      await fn(ctx);
      const duration = performance.now() - t0;
      console.log(
        `%c PASS %c ${name} (${duration.toFixed(0)}ms, ${getAssertions()} asserts)`,
        "background:#22c55e;color:white;font-weight:bold;padding:1px 4px;border-radius:2px",
        "color:#22c55e",
      );
      return { name, passed: true, duration, assertions: getAssertions() };
    } catch (e) {
      const duration = performance.now() - t0;
      const error = e instanceof Error ? e.message : String(e);
      console.log(
        `%c FAIL %c ${name}: ${error}`,
        "background:#ef4444;color:white;font-weight:bold;padding:1px 4px;border-radius:2px",
        "color:#ef4444",
      );
      return { name, passed: false, duration, error, assertions: getAssertions() };
    } finally {
      if (standalone) this._running = false;
    }
  }

  async runAll(filter?: string): Promise<TestResult[]> {
    // Abort any previous run first
    if (this._running) {
      this.abort();
      // Wait for previous run to finish (up to 10s)
      const start = Date.now();
      while (this._running && Date.now() - start < 10000) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (this._running) {
        console.log("%c✖ Previous run did not stop — force-clearing lock", "color:#ef4444;font-weight:bold");
      }
    }

    this._running = true;
    this._abortRequested = false;

    const results: TestResult[] = [];
    try {
      const names = filter
        ? this.list().filter((n) => n.includes(filter))
        : this.list();
      console.log(`%c▶ Running ${names.length} tests…`, "color:#3b82f6;font-weight:bold");
      for (const name of names) {
        if (this._abortRequested) {
          console.log("%c⏹ Aborted", "color:#f59e0b;font-weight:bold");
          break;
        }
        results.push(await this._runSingle(name));
      }
      const passed = results.filter((r) => r.passed).length;
      const failed = results.filter((r) => !r.passed).length;
      const totalMs = results.reduce((s, r) => s + r.duration, 0);
      const color = failed === 0 ? "#22c55e" : "#ef4444";
      console.log(
        `%c\n${passed}/${results.length} passed, ${failed} failed (${(totalMs / 1000).toFixed(1)}s)`,
        `color:${color};font-weight:bold`,
      );
      return results;
    } finally {
      this._running = false;
      this._abortRequested = false;
    }
  }

  /** Internal: run a single test without acquiring/releasing the lock. */
  private async _runSingle(name: string): Promise<TestResult> {
    const fn = this._tests.get(name);
    if (!fn) return { name, passed: false, duration: 0, error: "test not found", assertions: 0 };

    const { ctx, getAssertions } = this._makeContext();
    const t0 = performance.now();
    try {
      await resetGameState();
      await fn(ctx);
      const duration = performance.now() - t0;
      console.log(
        `%c PASS %c ${name} (${duration.toFixed(0)}ms, ${getAssertions()} asserts)`,
        "background:#22c55e;color:white;font-weight:bold;padding:1px 4px;border-radius:2px",
        "color:#22c55e",
      );
      return { name, passed: true, duration, assertions: getAssertions() };
    } catch (e) {
      const duration = performance.now() - t0;
      const error = e instanceof Error ? e.message : String(e);
      console.log(
        `%c FAIL %c ${name}: ${error}`,
        "background:#ef4444;color:white;font-weight:bold;padding:1px 4px;border-radius:2px",
        "color:#ef4444",
      );
      return { name, passed: false, duration, error, assertions: getAssertions() };
    }
  }
}

export const suite = new TestSuite();

// ── Engine Access ────────────────────────────────────────────

function getEngine(): any {
  const eng = Server.game?.engine;
  if (!eng) throw new Error("No engine — is the game running?");
  return eng;
}

// ── Timing Helpers ───────────────────────────────────────────

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Wait approximately N game ticks (~17ms each at 60Hz). */
export function waitTicks(n: number): Promise<void> {
  return delay(Math.ceil(n * (1000 / 60)));
}

// ── State Reset ──────────────────────────────────────────────

/** Reset game to a clean baseline before each test. */
export async function resetGameState(): Promise<void> {
  const eng = getEngine() as any;

  // Stop random spawns
  eng._guestSpawner.enabled = false;

  // Unseat and remove all guests
  for (const guest of eng._guests.values()) {
    if (guest.seatApplianceId) {
      const app = eng._appliances.get(guest.seatApplianceId);
      if (app) app.unseatGuest(guest.id);
    }
  }
  eng._guests.clear();

  // Clear queue slots
  if (eng._queueSlots) {
    for (const slot of eng._queueSlots) {
      slot.guestId = null;
    }
  }

  // Remove all items
  eng._items.clear();

  // Clear appliance slots
  for (const app of eng._appliances.values()) {
    app.clearSlots();
  }

  // Reset bartender
  const bt = eng._bartenders[0];
  if (bt) {
    bt.setHeldItem(null, null);
    bt.cancelInteract();
    bt._gridX = 5;
    bt._gridY = 2;
    bt._targetX = 5;
    bt._targetY = 2;
    bt._moveProgress = 1;
    bt._moveDirection = null;
    bt._facing = EDirection.UP;
  }

  // Clear messes, events, pending washes
  eng._messes.clear();
  eng._events = [];
  eng._pendingWash.clear();

  // Reset economy
  eng._money = GameSettings.startingMoney;
  eng._reputation = 0;
  eng._policeAttention = 0;
  eng._policeWarningTriggered = false;
  eng._policeRaidTimer = 0;

  // Ensure service phase
  const sm = eng._shiftManager;
  for (let i = 0; i < 3 && sm.phase !== "service"; i++) {
    sm.skipPhase();
  }

  // Re-enable all menu items at default prices
  for (const [key, recipe] of Object.entries(RECIPES)) {
    eng._menuConfig.set(key, { enabled: true, price: (recipe as any).menuPrice });
  }

  // Restock all appliances
  for (const app of eng._appliances.values()) {
    if (app.restock) app.restock();
  }

  // Let state settle
  await delay(50);
}

// ── Spawn Helpers ────────────────────────────────────────────

/** Find an appliance by type and grid position. */
export function findAppliance(type: EApplianceType, gridX: number, gridY: number): any {
  const eng = getEngine() as any;
  for (const app of eng._appliances.values()) {
    if (app.type === type && app.gridX === gridX && app.gridY === gridY) {
      return app;
    }
  }
  return null;
}

/** Find first appliance of a given type. */
export function findApplianceByType(type: EApplianceType): any {
  const eng = getEngine() as any;
  for (const app of eng._appliances.values()) {
    if (app.type === type) return app;
  }
  return null;
}

/**
 * Spawn a test guest seated at a specific bar counter x position.
 * Guest is placed at (counterX, 4) facing the counter at (counterX, 3).
 */
export function spawnTestGuest(
  counterX: number,
  status: EGuestStatus = EGuestStatus.READY_TO_ORDER,
  options?: {
    order?: string;
    drunkenness?: number;
    happiness?: number;
    patience?: number;
    traits?: EGuestTrait[];
    preferredDrink?: string;
    roundsRemaining?: number;
  },
): any {
  const eng = getEngine() as any;

  // Find counter appliance at (counterX, 3)
  const counter = findAppliance(EApplianceType.COUNTER, counterX, 3);
  if (!counter) throw new Error(`No counter at x=${counterX}, y=3`);

  // Create guest at spawn point, then teleport
  const guest = new Guest("test-party", counterX, 14);
  const g = guest as any;

  // Seat the guest
  guest.setSeat(counter.id, 0, counterX, 3);
  counter.seatGuest(0, g._id);

  // Teleport to guest-side of counter
  g._gridX = counterX;
  g._gridY = 4;
  g._targetX = counterX;
  g._targetY = 4;
  g._moveProgress = 1;

  // Set status
  g._status = status;
  g._statusTimer = 0;

  // Apply options
  if (options?.order) guest.setOrder({ drinkKey: options.order });
  if (options?.drunkenness !== undefined) g._drunkenness = options.drunkenness;
  if (options?.happiness !== undefined) g._happiness = options.happiness;
  if (options?.patience !== undefined) g._patience = options.patience;
  if (options?.traits) guest.setTraits(options.traits);
  if (options?.preferredDrink !== undefined) g._preferredDrink = options.preferredDrink;
  if (options?.roundsRemaining !== undefined) g._roundsRemaining = options.roundsRemaining;

  eng._guests.set(g._id, guest);
  return guest;
}

/**
 * Create an item and give it to the bartender.
 */
export function givePlayerItem(type: EItemType): any {
  const eng = getEngine() as any;
  const bt = eng._bartenders[0];
  if (!bt) throw new Error("No bartender");
  const item = new Item(type);
  (item as any).pickUp(bt._id);
  eng._items.set((item as any).id, item);
  bt.setHeldItem((item as any).id, type);
  return item;
}

// ── Teleport ─────────────────────────────────────────────────

/**
 * Instantly teleport bartender to a position with a specific facing direction.
 * Use direction strings: "up", "down", "left", "right"
 */
export function teleportPlayer(x: number, y: number, facing: string) {
  const eng = getEngine() as any;
  const bt = eng._bartenders[0];
  if (!bt) throw new Error("No bartender");
  const dirMap: Record<string, EDirection> = {
    up: EDirection.UP,
    down: EDirection.DOWN,
    left: EDirection.LEFT,
    right: EDirection.RIGHT,
  };
  bt._gridX = x;
  bt._gridY = y;
  bt._targetX = x;
  bt._targetY = y;
  bt._moveProgress = 1;
  bt._moveDirection = null;
  bt._facing = dirMap[facing] ?? EDirection.UP;
}
