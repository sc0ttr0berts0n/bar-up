import { EApplianceType } from "./ApplianceTypes";
import { ETileZone } from "./TileTypes";
import type { Vec2 } from "../../types/Vec2";

export interface IAppliancePlacement {
  type: EApplianceType;
  gridX: number;
  gridY: number;
}

export interface IBarLayout {
  width: number;
  height: number;
  zones: ETileZone[][];
  appliances: IAppliancePlacement[];
  playerSpawns: Vec2[];
  guestEntrance: Vec2;
  queueSlots: Vec2[];
}

/**
 * Default bar layout: 20x15 grid
 *
 * Layout overview (top-down):
 *   Row 0: WALL (top wall)
 *   Row 1-2: EMPLOYEE_ONLY (behind the bar - appliances here)
 *   Row 3: BAR_COUNTER (the bar counter itself, guests sit facing south)
 *   Row 4: WALKING_LANE (aisle in front of bar)
 *   Row 5-12: SEATING area (tables, hightops, standing room)
 *   Row 13: WALKING_LANE (aisle to entrance)
 *   Row 14: WALL (bottom wall) with ENTRANCE at center
 */
function buildDefaultLayout(): IBarLayout {
  const W = 20;
  const H = 15;
  const zones: ETileZone[][] = [];

  for (let y = 0; y < H; y++) {
    const row: ETileZone[] = [];
    for (let x = 0; x < W; x++) {
      if (y === 0 || y === H - 1 || x === 0 || x === W - 1) {
        // Walls on border
        row.push(ETileZone.WALL);
      } else if (y >= 1 && y <= 2) {
        // Behind the bar - employee only
        row.push(ETileZone.EMPLOYEE_ONLY);
      } else if (y === 3) {
        // Bar counter row
        row.push(ETileZone.BAR_COUNTER);
      } else if (y === 4 || y === 13) {
        // Walking lanes
        row.push(ETileZone.WALKING_LANE);
      } else {
        // Seating / floor area
        row.push(ETileZone.SEATING);
      }
    }
    zones.push(row);
  }

  // Entrance opening at bottom center
  zones[H - 1][9] = ETileZone.ENTRANCE;
  zones[H - 1][10] = ETileZone.ENTRANCE;

  // Appliance placements (behind the bar, employee area)
  const appliances: IAppliancePlacement[] = [
    // Bar counter tiles along row 3
    { type: EApplianceType.COUNTER, gridX: 2, gridY: 3 },
    { type: EApplianceType.COUNTER, gridX: 3, gridY: 3 },
    { type: EApplianceType.COUNTER, gridX: 4, gridY: 3 },
    { type: EApplianceType.COUNTER, gridX: 5, gridY: 3 },
    { type: EApplianceType.COUNTER, gridX: 6, gridY: 3 },
    { type: EApplianceType.COUNTER, gridX: 7, gridY: 3 },
    { type: EApplianceType.BAR_QUEUE, gridX: 8, gridY: 3 }, // spans x=8,9,10
    { type: EApplianceType.COUNTER, gridX: 11, gridY: 3 },
    { type: EApplianceType.COUNTER, gridX: 12, gridY: 3 },
    { type: EApplianceType.COUNTER, gridX: 13, gridY: 3 },
    { type: EApplianceType.COUNTER, gridX: 14, gridY: 3 },
    { type: EApplianceType.COUNTER, gridX: 15, gridY: 3 },

    // Behind bar appliances (row 1-2)
    { type: EApplianceType.GLASS_SHELF, gridX: 9, gridY: 1 },
    { type: EApplianceType.DRAFT_SYSTEM, gridX: 5, gridY: 1 },
    { type: EApplianceType.LIQUOR_RAIL, gridX: 8, gridY: 1 },
    { type: EApplianceType.WINE_RACK, gridX: 10, gridY: 1 },
    { type: EApplianceType.ICE_WELL, gridX: 11, gridY: 1 },
    { type: EApplianceType.SINK, gridX: 14, gridY: 1 },
    { type: EApplianceType.BIN, gridX: 17, gridY: 1 },
    { type: EApplianceType.CARD_HOLDER, gridX: 3, gridY: 1 },
    { type: EApplianceType.SERVICE_BAR, gridX: 16, gridY: 2 },

    // Seating area
    { type: EApplianceType.HIGHTOP, gridX: 4, gridY: 7 },
    { type: EApplianceType.HIGHTOP, gridX: 14, gridY: 7 },
    { type: EApplianceType.TABLE, gridX: 4, gridY: 10 },
    { type: EApplianceType.TABLE, gridX: 14, gridY: 10 },
  ];

  const playerSpawns: Vec2[] = [
    { x: 5, y: 2 },
    { x: 7, y: 2 },
    { x: 10, y: 2 },
    { x: 13, y: 2 },
  ];

  const guestEntrance: Vec2 = { x: 9, y: 14 };

  // Queue slots: positions where guests stand to wait at the bar queue
  // Front row (directly south of bar queue, served first), then overflow south
  const queueSlots: Vec2[] = [
    { x: 8, y: 4 }, { x: 9, y: 4 }, { x: 10, y: 4 },   // front row
    { x: 8, y: 5 }, { x: 9, y: 5 }, { x: 10, y: 5 },   // overflow row 1
    { x: 9, y: 6 },                                       // overflow row 2
  ];

  return {
    width: W,
    height: H,
    zones,
    appliances,
    playerSpawns,
    guestEntrance,
    queueSlots,
  };
}

export const DEFAULT_BAR_LAYOUT: IBarLayout = buildDefaultLayout();
