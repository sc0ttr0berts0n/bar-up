import type { Vec2 } from "../../../types/Vec2";
import type { TileGrid } from "./TileGrid";

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export class Pathfinding {
  /**
   * A* pathfinding on the tile grid.
   * Returns array of grid positions from start to end (inclusive of end, exclusive of start).
   * Returns empty array if no path found.
   */
  static findPath(
    grid: TileGrid,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    isGuest: boolean,
    blockedTiles?: Set<string>,
    softBlockTiles?: Set<string>,
  ): Vec2[] {
    if (startX === endX && startY === endY) return [];

    const isWalkable = isGuest
      ? (x: number, y: number) => grid.isWalkableForGuest(x, y)
      : (x: number, y: number) => grid.isWalkableForPlayer(x, y);

    // End tile must be reachable (or be the destination regardless)
    if (!grid.isInBounds(endX, endY)) return [];

    const open: AStarNode[] = [];
    const closed = new Set<string>();

    const key = (x: number, y: number) => `${x},${y}`;
    const heuristic = (x: number, y: number) =>
      Math.abs(x - endX) + Math.abs(y - endY);

    const startNode: AStarNode = {
      x: startX,
      y: startY,
      g: 0,
      h: heuristic(startX, startY),
      f: heuristic(startX, startY),
      parent: null,
    };
    open.push(startNode);

    const dirs: Vec2[] = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    while (open.length > 0) {
      // Find node with lowest f
      let lowestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[lowestIdx].f) lowestIdx = i;
      }
      const current = open.splice(lowestIdx, 1)[0];

      if (current.x === endX && current.y === endY) {
        // Reconstruct path
        const path: Vec2[] = [];
        let node: AStarNode | null = current;
        while (node && !(node.x === startX && node.y === startY)) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        return path;
      }

      closed.add(key(current.x, current.y));

      for (const d of dirs) {
        const nx = current.x + d.x;
        const ny = current.y + d.y;
        const nKey = key(nx, ny);

        if (closed.has(nKey)) continue;

        // Allow walking to the end tile even if it has an appliance (for guests going to seats)
        const isDestination = nx === endX && ny === endY;
        const walkable = isDestination || isWalkable(nx, ny);
        if (!walkable) continue;
        // Collision: blocked tiles are unwalkable unless it's the destination
        if (!isDestination && blockedTiles?.has(nKey)) continue;

        // Soft avoidance: occupied tiles cost more to traverse
        const isSoftBlocked = !isDestination && softBlockTiles?.has(nKey);
        const g = current.g + (isSoftBlocked ? 4 : 1);
        const h = heuristic(nx, ny);
        const f = g + h;

        // Check if already in open with better g
        const existing = open.find((n) => n.x === nx && n.y === ny);
        if (existing && existing.g <= g) continue;

        if (existing) {
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        } else {
          open.push({ x: nx, y: ny, g, h, f, parent: current });
        }
      }
    }

    return []; // no path
  }
}
