/**
 * Test Automation API — exposes window.__TEST for programmatic game control.
 * Used by Claude in Chrome (javascript_tool) to send commands and read state
 * without relying on synthetic keyboard events.
 *
 * Works because LOCAL host mode uses direct function calls (no network).
 */
import Communicator from "./Network/Communicator/Communicator";
import Server from "./Network/Server/Server";
import { PACKET_TYPE } from "./Network/Communicator/PacketTypes";
import { EDirection } from "./Shared/TileTypes";
import { suite } from "./TestSuite";
import "./tests/index"; // registers all tests with suite

const DIR_MAP: Record<string, EDirection> = {
  up: EDirection.UP,
  down: EDirection.DOWN,
  left: EDirection.LEFT,
  right: EDirection.RIGHT,
};

function send(type: string, data?: Record<string, unknown>) {
  Communicator.sendToServer({
    uuid: Communicator.uuid,
    type,
    ...(data ? { data } : {}),
  } as any);
}

const api = {
  // ── Actions (packet senders) ──────────────────────────────
  move(dir: string) {
    send(PACKET_TYPE.CLIENT_MOVE, { direction: DIR_MAP[dir] });
  },
  stop() {
    send(PACKET_TYPE.CLIENT_STOP);
  },
  interact() {
    send(PACKET_TYPE.CLIENT_INTERACT);
  },
  grab() {
    send(PACKET_TYPE.CLIENT_GRAB);
  },
  select(index: number) {
    send(PACKET_TYPE.CLIENT_SELECT, { variantIndex: index });
  },

  // ── Game flow ─────────────────────────────────────────────
  join(slot = 0) {
    send(PACKET_TYPE.CLIENT_JOIN_GAME, { index: slot });
  },
  leave() {
    send(PACKET_TYPE.CLIENT_LEAVE_GAME);
  },
  skipPhase() {
    send(PACKET_TYPE.CLIENT_SKIP_PHASE);
  },
  setMenu(drinkKey: string, enabled: boolean, price?: number) {
    send(PACKET_TYPE.CLIENT_SET_MENU, { drinkKey, enabled, price: price ?? 0 });
  },
  restock(applianceId: string) {
    send(PACKET_TYPE.CLIENT_RESTOCK, { applianceId });
  },

  // ── State readers ─────────────────────────────────────────
  state() {
    return Communicator.state?.data ?? null;
  },
  players() {
    return this.state()?.players ?? [];
  },
  guests() {
    return this.state()?.guests ?? [];
  },
  items() {
    return this.state()?.items ?? [];
  },
  appliances() {
    return this.state()?.appliances ?? [];
  },
  phase() {
    const s = this.state();
    if (!s) return null;
    return {
      phase: s.shiftPhase,
      timer: Math.round(s.shiftTimer * 10) / 10,
      isLastCall: s.isLastCall,
      isOvertime: s.isOvertime,
    };
  },
  money() {
    const s = this.state();
    if (!s) return null;
    return { money: s.money, reputation: s.reputation };
  },

  // ── Engine direct access (host only) ──────────────────────
  engine() {
    return Server.game?.engine ?? null;
  },

  // ── Internal: real-time bartender from engine (bypasses 20Hz broadcast) ──
  _bt() {
    return (Server.game?.engine as any)?._bartenders?.[0] ?? null;
  },

  // ── Compound helpers ──────────────────────────────────────

  /**
   * Face a direction without moving.
   * move() + immediate stop() only sets facing (no tile movement starts).
   */
  face(dir: string) {
    this.move(dir);
    this.stop();
  },

  /**
   * Move exactly one tile in a direction. Uses engine for real-time position.
   * Movement speed is 6 tiles/sec (~167ms per tile).
   * Strategy: send move, wait for engine to start the tile, send stop, wait for arrival.
   */
  step(dir: string, timeoutMs = 1000): Promise<string> {
    const bt = this._bt();
    if (!bt) return Promise.resolve("no player");
    const startX = bt._gridX;
    const startY = bt._gridY;
    this.move(dir);
    const t0 = Date.now();
    return new Promise((resolve) => {
      // Phase 1: wait for engine to start moving (target changes from current position)
      const waitForStart = () => {
        const b = this._bt();
        if (!b) { this.stop(); resolve("no player"); return; }
        // Detect movement start: either targetX/Y differs from start, or we already arrived at a new tile
        if (b._targetX !== startX || b._targetY !== startY || b._gridX !== startX || b._gridY !== startY) {
          this.stop(); // prevent further tiles
          waitForArrive();
          return;
        }
        if (Date.now() - t0 > timeoutMs) {
          this.stop();
          resolve(`blocked (${b._gridX},${b._gridY})`);
          return;
        }
        setTimeout(waitForStart, 8);
      };
      // Phase 2: wait for tile arrival (gridX/Y updates when moveProgress reaches 1)
      const waitForArrive = () => {
        const b = this._bt();
        if (!b) { resolve("no player"); return; }
        // gridX/Y only snaps to targetX/Y when moveProgress >= 1
        if (b._gridX !== startX || b._gridY !== startY) {
          resolve(`(${b._gridX},${b._gridY})`);
          return;
        }
        if (Date.now() - t0 > timeoutMs) {
          resolve(`timeout (${b._gridX},${b._gridY})`);
          return;
        }
        setTimeout(waitForArrive, 8);
      };
      setTimeout(waitForStart, 8);
    });
  },

  /** Walk to a target grid tile step by step. Uses engine for real-time checks. */
  async goTo(tx: number, ty: number, maxSteps = 40): Promise<string> {
    for (let i = 0; i < maxSteps; i++) {
      const bt = this._bt();
      if (!bt) return "no player";
      const dx = tx - bt._gridX;
      const dy = ty - bt._gridY;
      if (dx === 0 && dy === 0) return `arrived (${tx},${ty})`;
      let dir: string;
      if (Math.abs(dx) >= Math.abs(dy)) {
        dir = dx > 0 ? "right" : "left";
      } else {
        dir = dy > 0 ? "down" : "up";
      }
      const result = await this.step(dir);
      if (result.startsWith("blocked") || result.startsWith("timeout")) return result;
    }
    const bt = this._bt();
    return `maxSteps (${bt?._gridX},${bt?._gridY})`;
  },

  /** Poll state until condition is true. Returns false on timeout. */
  waitFor(condFn: () => boolean, timeoutMs = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (condFn()) return resolve(true);
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(check, 100);
      };
      check();
    });
  },

  /** Quick summary for debugging — one-line snapshot. */
  status() {
    const p = this.phase();
    const m = this.money();
    const pl = this.players();
    const g = this.guests();
    return `${p?.phase} ${p?.timer}s | $${m?.money} rep:${m?.reputation} | ${pl.length} players | ${g.length} guests`;
  },

  /** Player position shorthand (real-time from engine). */
  pos() {
    const bt = this._bt();
    return bt ? `(${bt._gridX},${bt._gridY})` : "no player";
  },

  /** What the player is holding (real-time from engine). */
  held() {
    const bt = this._bt();
    return bt?._heldItemType ?? "nothing";
  },

  // ── Test runner ─────────────────────────────────────────────
  runAll: (filter?: string) => suite.runAll(filter),
  run: (name: string) => suite.run(name),
  tests: () => suite.list(),
  abort: () => suite.abort(),
};

(window as any).__TEST = api;
