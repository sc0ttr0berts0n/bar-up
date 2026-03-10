import { EDirection } from "../../../Shared/TileTypes";
import { PLAYER_COLORS, type IPlayerStateData } from "../../../Shared/PlayerTypes";
import type { EItemType } from "../../../Shared/ItemTypes";
import GameSettings from "../../../Shared/GameSettings";

export class Bartender {
  private _id: string | null = null;
  private _number: number;
  private _gridX: number;
  private _gridY: number;
  private _targetX: number;
  private _targetY: number;
  private _moveProgress: number = 1; // 1 = arrived
  private _facing: EDirection = EDirection.DOWN;
  private _heldItemId: string | null = null;
  private _heldItemType: string | null = null;
  private _isInteracting: boolean = false;
  private _interactProgress: number = 0;
  private _color: number;
  private _moveDirection: EDirection | null = null;

  constructor(number: number, spawnX: number, spawnY: number) {
    this._number = number;
    this._gridX = spawnX;
    this._gridY = spawnY;
    this._targetX = spawnX;
    this._targetY = spawnY;
    this._color = PLAYER_COLORS[number % PLAYER_COLORS.length];
  }

  get id() {
    return this._id;
  }
  get number() {
    return this._number;
  }
  get gridX() {
    return this._gridX;
  }
  get gridY() {
    return this._gridY;
  }
  get heldItemId() {
    return this._heldItemId;
  }
  get isMoving() {
    return this._moveProgress < 1;
  }
  get isInteracting() {
    return this._isInteracting;
  }
  get facing() {
    return this._facing;
  }

  assign(uuid: string) {
    this._id = uuid;
  }

  unassign() {
    this._id = null;
  }

  setHeldItem(itemId: string | null, itemType: string | null) {
    this._heldItemId = itemId;
    this._heldItemType = itemType;
  }

  startInteract() {
    this._isInteracting = true;
    this._interactProgress = 0;
  }

  /**
   * Set the move direction from player input.
   * Actual movement happens in tick().
   */
  setMoveDirection(direction: EDirection | null) {
    this._moveDirection = direction;
    if (direction !== null) {
      this._facing = direction;
    }
  }

  /**
   * Tick the bartender state at 60Hz.
   * Returns true if movement completed this tick (to check for new move).
   */
  tick(
    dt: number,
    canMoveTo: (x: number, y: number) => boolean,
  ): boolean {
    // Handle interaction progress
    if (this._isInteracting) {
      this._interactProgress += dt / GameSettings.interactDuration;
      if (this._interactProgress >= 1) {
        this._isInteracting = false;
        this._interactProgress = 0;
      }
    }

    // Handle movement
    if (this._moveProgress < 1) {
      this._moveProgress += dt * GameSettings.playerMoveSpeed;
      if (this._moveProgress >= 1) {
        this._moveProgress = 1;
        this._gridX = this._targetX;
        this._gridY = this._targetY;
        return true; // movement completed
      }
      return false;
    }

    // Try to start new movement from input direction
    if (this._moveDirection !== null && !this._isInteracting) {
      let dx = 0;
      let dy = 0;
      switch (this._moveDirection) {
        case EDirection.UP:
          dy = -1;
          break;
        case EDirection.DOWN:
          dy = 1;
          break;
        case EDirection.LEFT:
          dx = -1;
          break;
        case EDirection.RIGHT:
          dx = 1;
          break;
      }
      const newX = this._gridX + dx;
      const newY = this._gridY + dy;
      if (canMoveTo(newX, newY)) {
        this._targetX = newX;
        this._targetY = newY;
        this._moveProgress = 0;
      }
    }

    return false;
  }

  get state(): IPlayerStateData {
    return {
      id: this._id,
      number: this._number,
      gridX: this._gridX,
      gridY: this._gridY,
      targetX: this._targetX,
      targetY: this._targetY,
      moveProgress: this._moveProgress,
      facing: this._facing,
      heldItemId: this._heldItemId,
      heldItemType: this._heldItemType,
      isInteracting: this._isInteracting,
      interactProgress: this._interactProgress,
      color: this._color,
    };
  }
}
