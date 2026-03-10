import { Container, Graphics } from "pixi.js";
import { ETileZone } from "../Shared/TileTypes";

const ZONE_COLORS: Record<ETileZone, number> = {
  [ETileZone.FLOOR]: 0x3d3224,
  [ETileZone.EMPLOYEE_ONLY]: 0x2e3d3a,
  [ETileZone.WALKING_LANE]: 0x383028,
  [ETileZone.SEATING]: 0x352a1e,
  [ETileZone.WALL]: 0x0e0e0e,
  [ETileZone.ENTRANCE]: 0x2d5a3d,
  [ETileZone.BAR_COUNTER]: 0x6b5530,
};

export class TileGridView extends Container {
  constructor(
    width: number,
    height: number,
    tileSize: number,
    zones: ETileZone[][],
  ) {
    super();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const zone = zones[y][x];
        const color = ZONE_COLORS[zone] ?? 0x333333;

        const tile = new Graphics()
          .rect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2)
          .fill(color);

        // Subtle border
        tile.rect(x * tileSize, y * tileSize, tileSize, tileSize)
          .stroke({ color: 0x222222, width: 1 });

        this.addChild(tile);
      }
    }
  }
}
