/**
 * EditModeManager — prep-phase edit mode for repositioning appliances.
 *
 * Server-authoritative: all edits validated here, clients see results via
 * SERVER_UPDATE. Supports pick up, move, place, cancel, commit, and rollback.
 */
import { EApplianceType } from "../../../Shared/ApplianceTypes";
import { ETileZone } from "../../../Shared/TileTypes";
import type { IAppliancePlacement, IBarLayout } from "../../../Shared/BarLayout";
import type { IEditModeStateData } from "../../Communicator/PacketTypes";
import { saveLayout, setActiveSlot } from "../../../Shared/LayoutPersistence";
import type { TileGrid } from "../TileGrid";
import type { Appliance } from "./Appliance";
import type { Vec2 } from "../../../../types/Vec2";

// ── Zone compatibility for placement validation ──────────────────

/** Which zones each appliance type can be placed on */
const ZONE_RULES: Record<EApplianceType, ETileZone[]> = {
  [EApplianceType.GLASS_SHELF]: [ETileZone.EMPLOYEE_ONLY],
  [EApplianceType.DRAFT_SYSTEM]: [ETileZone.EMPLOYEE_ONLY],
  [EApplianceType.WINE_RACK]: [ETileZone.EMPLOYEE_ONLY],
  [EApplianceType.LIQUOR_RAIL]: [ETileZone.EMPLOYEE_ONLY],
  [EApplianceType.ICE_WELL]: [ETileZone.EMPLOYEE_ONLY],
  [EApplianceType.SINK]: [ETileZone.EMPLOYEE_ONLY],
  [EApplianceType.BIN]: [ETileZone.EMPLOYEE_ONLY],
  [EApplianceType.CARD_HOLDER]: [ETileZone.EMPLOYEE_ONLY],
  [EApplianceType.SERVICE_BAR]: [ETileZone.EMPLOYEE_ONLY],
  [EApplianceType.COUNTER]: [ETileZone.BAR_COUNTER],
  [EApplianceType.BAR_QUEUE]: [ETileZone.BAR_COUNTER],
  [EApplianceType.HIGHTOP]: [ETileZone.SEATING],
  [EApplianceType.TABLE]: [ETileZone.SEATING],
};

export class EditModeManager {
  private _active = false;
  private _snapshot: IAppliancePlacement[] = [];
  private _heldApplianceId: string | null = null;
  private _heldByUuid: string | null = null;
  private _heldOriginalPos: { gridX: number; gridY: number } | null = null;
  private _previewX = 0;
  private _previewY = 0;
  private _placementValid = false;

  // ── External refs (set by Engine) ──
  private _tileGrid: TileGrid;
  private _appliances: Map<string, Appliance>;
  private _layout: IBarLayout;
  private _playerSpawns: Vec2[];

  constructor(
    tileGrid: TileGrid,
    appliances: Map<string, Appliance>,
    layout: IBarLayout,
  ) {
    this._tileGrid = tileGrid;
    this._appliances = appliances;
    this._layout = layout;
    this._playerSpawns = layout.playerSpawns;
  }

  get active() { return this._active; }
  get heldApplianceId() { return this._heldApplianceId; }

  // ── State data for SERVER_UPDATE ────────────────────────────────

  get stateData(): IEditModeStateData | null {
    if (!this._active) return null;
    const held = this._heldApplianceId ? this._appliances.get(this._heldApplianceId) : null;
    return {
      active: true,
      heldApplianceId: this._heldApplianceId,
      heldApplianceType: held ? held.type : null,
      heldByUuid: this._heldByUuid,
      previewX: this._previewX,
      previewY: this._previewY,
      placementValid: this._placementValid,
    };
  }

  // ── Enter / Exit ────────────────────────────────────────────────

  enter(): boolean {
    if (this._active) return false;
    // Snapshot current placements for rollback
    this._snapshot = [];
    for (const a of this._appliances.values()) {
      this._snapshot.push({ type: a.type, gridX: a.gridX, gridY: a.gridY });
    }
    this._active = true;
    this._heldApplianceId = null;
    this._heldOriginalPos = null;
    return true;
  }

  /** Commit all changes: update layout, persist to localStorage, exit. */
  commit(): void {
    if (!this._active) return;
    // If still holding, place back at original
    if (this._heldApplianceId && this._heldOriginalPos) {
      this._restoreHeld();
    }
    // Update layout.appliances from current appliance positions
    this._layout.appliances = [];
    for (const a of this._appliances.values()) {
      this._layout.appliances.push({ type: a.type, gridX: a.gridX, gridY: a.gridY });
    }
    // Persist
    saveLayout("autosave", this._layout.appliances);
    setActiveSlot("autosave");
    this._active = false;
    this._snapshot = [];
  }

  /** Rollback all changes to snapshot, exit. */
  rollback(): void {
    if (!this._active) return;
    // Clear held state first
    this._heldApplianceId = null;
    this._heldByUuid = null;
    this._heldOriginalPos = null;
    // Restore all appliances to snapshot positions
    const appliancesByType = new Map<string, Appliance[]>();
    for (const a of this._appliances.values()) {
      const key = a.type;
      if (!appliancesByType.has(key)) appliancesByType.set(key, []);
      appliancesByType.get(key)!.push(a);
    }

    // Clear all appliance tiles first
    for (const a of this._appliances.values()) {
      this._clearTiles(a.gridX, a.gridY, a.sizeX, a.sizeY);
    }

    // Match snapshot placements back to appliance objects by type
    // (preserves IDs so references stay valid)
    const usedIds = new Set<string>();
    for (const placement of this._snapshot) {
      const candidates = appliancesByType.get(placement.type);
      if (!candidates) continue;
      const appliance = candidates.find((a) => !usedIds.has(a.id));
      if (!appliance) continue;
      usedIds.add(appliance.id);
      appliance.moveTo(placement.gridX, placement.gridY);
      this._registerTiles(appliance);
    }

    this._active = false;
    this._snapshot = [];
  }

  // ── Pick up / Place / Cancel ────────────────────────────────────

  pickUp(applianceId: string, byUuid?: string): boolean {
    if (!this._active || this._heldApplianceId) return false;
    const appliance = this._appliances.get(applianceId);
    if (!appliance) return false;

    // Remove from tile grid
    this._clearTiles(appliance.gridX, appliance.gridY, appliance.sizeX, appliance.sizeY);
    this._heldApplianceId = applianceId;
    this._heldByUuid = byUuid ?? null;
    this._heldOriginalPos = { gridX: appliance.gridX, gridY: appliance.gridY };
    this._previewX = appliance.gridX;
    this._previewY = appliance.gridY;
    this._placementValid = true;
    return true;
  }

  /** Update preview position (derived from bartender facing tile). */
  updatePreview(gridX: number, gridY: number): void {
    if (!this._heldApplianceId) return;
    this._previewX = gridX;
    this._previewY = gridY;
    const appliance = this._appliances.get(this._heldApplianceId);
    this._placementValid = appliance
      ? this._isValidPlacement(appliance.type, gridX, gridY, appliance.sizeX, appliance.sizeY, appliance.id)
      : false;
  }

  /** Place the held appliance at the preview position. */
  place(gridX: number, gridY: number): boolean {
    if (!this._heldApplianceId) return false;
    const appliance = this._appliances.get(this._heldApplianceId);
    if (!appliance) return false;

    if (!this._isValidPlacement(appliance.type, gridX, gridY, appliance.sizeX, appliance.sizeY, appliance.id)) {
      return false;
    }

    appliance.moveTo(gridX, gridY);
    this._registerTiles(appliance);
    this._heldApplianceId = null;
    this._heldByUuid = null;
    this._heldOriginalPos = null;
    return true;
  }

  /** Cancel current hold — return appliance to original position. */
  cancelHold(): void {
    if (!this._heldApplianceId || !this._heldOriginalPos) return;
    this._restoreHeld();
  }

  // ── Validation ──────────────────────────────────────────────────

  private _isValidPlacement(
    type: EApplianceType,
    gridX: number,
    gridY: number,
    sizeX: number,
    sizeY: number,
    selfId: string,
  ): boolean {
    const allowedZones = ZONE_RULES[type];
    if (!allowedZones) return false;

    for (let dy = 0; dy < sizeY; dy++) {
      for (let dx = 0; dx < sizeX; dx++) {
        const tx = gridX + dx;
        const ty = gridY + dy;

        // Bounds check
        if (!this._tileGrid.isInBounds(tx, ty)) return false;

        // Zone check
        const tile = this._tileGrid.getTile(tx, ty);
        if (!tile) return false;
        if (!allowedZones.includes(tile.zone)) return false;

        // Overlap check (ignore self)
        if (tile.applianceId !== null && tile.applianceId !== selfId) return false;

        // Player spawn check
        for (const spawn of this._playerSpawns) {
          if (spawn.x === tx && spawn.y === ty) return false;
        }
      }
    }
    return true;
  }

  // ── Tile grid helpers ───────────────────────────────────────────

  private _clearTiles(gridX: number, gridY: number, sizeX: number, sizeY: number) {
    for (let dy = 0; dy < sizeY; dy++) {
      for (let dx = 0; dx < sizeX; dx++) {
        this._tileGrid.setApplianceId(gridX + dx, gridY + dy, null);
      }
    }
  }

  private _registerTiles(appliance: Appliance) {
    for (let dy = 0; dy < appliance.sizeY; dy++) {
      for (let dx = 0; dx < appliance.sizeX; dx++) {
        this._tileGrid.setApplianceId(
          appliance.gridX + dx,
          appliance.gridY + dy,
          appliance.id,
        );
      }
    }
  }

  private _restoreHeld() {
    if (!this._heldApplianceId || !this._heldOriginalPos) return;
    const appliance = this._appliances.get(this._heldApplianceId);
    if (appliance) {
      appliance.moveTo(this._heldOriginalPos.gridX, this._heldOriginalPos.gridY);
      this._registerTiles(appliance);
    }
    this._heldApplianceId = null;
    this._heldByUuid = null;
    this._heldOriginalPos = null;
  }
}
