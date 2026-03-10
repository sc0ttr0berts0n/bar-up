import type { IBarLayout } from "../../Shared/BarLayout";
import { APPLIANCE_CONFIGS } from "../../Shared/ApplianceTypes";
import { ETileZone, type ITile } from "../../Shared/TileTypes";
import type { Vec2 } from "../../../types/Vec2";

export class TileGrid {
  private _tiles: ITile[][];
  private _width: number;
  private _height: number;

  constructor(layout: IBarLayout) {
    this._width = layout.width;
    this._height = layout.height;
    this._tiles = [];

    for (let y = 0; y < this._height; y++) {
      const row: ITile[] = [];
      for (let x = 0; x < this._width; x++) {
        const zone = layout.zones[y][x];
        row.push({
          x,
          y,
          zone,
          applianceId: null,
          occupantId: null,
          walkable: zone !== ETileZone.WALL,
        });
      }
      this._tiles.push(row);
    }
  }

  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }

  getTile(x: number, y: number): ITile | null {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return null;
    return this._tiles[y][x];
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this._width && y >= 0 && y < this._height;
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile) return false;
    return tile.walkable && tile.zone !== ETileZone.WALL;
  }

  isWalkableForPlayer(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile) return false;
    if (!tile.walkable) return false;
    if (tile.zone === ETileZone.WALL) return false;
    // Players can't walk on seating tiles occupied by appliances (tables/hightops)
    if (tile.applianceId !== null) return false;
    return true;
  }

  isWalkableForGuest(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile) return false;
    if (!tile.walkable) return false;
    if (tile.zone === ETileZone.WALL) return false;
    if (tile.zone === ETileZone.EMPLOYEE_ONLY) return false;
    if (tile.applianceId !== null) return false;
    return true;
  }

  setApplianceId(x: number, y: number, id: string | null): void {
    const tile = this.getTile(x, y);
    if (tile) {
      tile.applianceId = id;
      // Appliance tiles with bar counter zone remain walkable for players behind bar
      if (tile.zone !== ETileZone.BAR_COUNTER && tile.zone !== ETileZone.EMPLOYEE_ONLY) {
        tile.walkable = id === null;
      }
    }
  }

  setOccupant(x: number, y: number, id: string | null): void {
    const tile = this.getTile(x, y);
    if (tile) tile.occupantId = id;
  }

  getAdjacentTiles(x: number, y: number): ITile[] {
    const dirs: Vec2[] = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    const tiles: ITile[] = [];
    for (const d of dirs) {
      const tile = this.getTile(x + d.x, y + d.y);
      if (tile) tiles.push(tile);
    }
    return tiles;
  }

  /** Find the appliance ID on an adjacent tile matching the given type filter */
  getAdjacentApplianceId(
    x: number,
    y: number,
    typeFilter?: string,
  ): string | null {
    const adjacent = this.getAdjacentTiles(x, y);
    for (const tile of adjacent) {
      if (tile.applianceId !== null) {
        return tile.applianceId;
      }
    }
    return null;
  }
}
