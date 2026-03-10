import { EGuestStatus, type IGuestOrder, type IGuestStateData } from "../../../Shared/GuestTypes";
import GameSettings from "../../../Shared/GameSettings";
import { Random } from "../../../Utils/Random";
import type { Vec2 } from "../../../../types/Vec2";

export class Guest {
  private _id: string;
  private _partyId: string;
  private _gridX: number;
  private _gridY: number;
  private _targetX: number;
  private _targetY: number;
  private _moveProgress: number = 1;
  private _status: EGuestStatus = EGuestStatus.WALKING_TO_SEAT;
  private _order: IGuestOrder | null = null;
  private _happiness: number;
  private _roundsRemaining: number;
  private _seatApplianceId: string | null = null;
  private _seatIndex: number = -1;
  private _drinkProgress: number = 0;
  private _statusTimer: number = 0;
  private _path: Vec2[] = [];
  private _pathIndex: number = 0;
  private _needsLeavePath: boolean = false;
  private _isReorder: boolean = false;
  private _drunkenness: number = 0;
  private _ordersCompleted: number = 0;

  constructor(partyId: string, spawnX: number, spawnY: number) {
    this._id = Random.uuid();
    this._partyId = partyId;
    this._gridX = spawnX;
    this._gridY = spawnY;
    this._targetX = spawnX;
    this._targetY = spawnY;
    this._happiness = GameSettings.happinessStarting;
    this._roundsRemaining = Random.rangeInt(1, 3);
  }

  get id() {
    return this._id;
  }
  get partyId() {
    return this._partyId;
  }
  get gridX() {
    return this._gridX;
  }
  get gridY() {
    return this._gridY;
  }
  get status() {
    return this._status;
  }
  get order() {
    return this._order;
  }
  get happiness() {
    return this._happiness;
  }
  get seatApplianceId() {
    return this._seatApplianceId;
  }
  get seatIndex() {
    return this._seatIndex;
  }
  get isMoving() {
    return this._moveProgress < 1;
  }
  get roundsRemaining() {
    return this._roundsRemaining;
  }

  setPath(path: Vec2[]) {
    this._path = path;
    this._pathIndex = 0;
    if (path.length > 0) {
      this._targetX = path[0].x;
      this._targetY = path[0].y;
      this._moveProgress = 0;
    }
  }

  setSeat(applianceId: string, seatIndex: number) {
    this._seatApplianceId = applianceId;
    this._seatIndex = seatIndex;
  }

  setStatus(status: EGuestStatus) {
    this._status = status;
    this._statusTimer = 0;
    this._drinkProgress = 0;
    if (status === EGuestStatus.LEAVING) {
      this._needsLeavePath = true;
    }
  }

  get needsLeavePath() {
    return this._needsLeavePath;
  }

  setLeavePath(path: Vec2[]) {
    this._needsLeavePath = false;
    this.setPath(path);
  }

  setOrder(order: IGuestOrder) {
    this._order = order;
  }

  clearOrder() {
    this._order = null;
  }

  adjustHappiness(amount: number) {
    this._happiness = Math.max(0, Math.min(GameSettings.happinessMax, this._happiness + amount));
  }

  decrementRounds() {
    this._roundsRemaining--;
  }

  /** Tick guest movement and status timers. Returns true if guest should be removed. */
  tick(dt: number): boolean {
    this._statusTimer += dt;

    // Handle movement along path
    if (this._moveProgress < 1) {
      this._moveProgress += dt * GameSettings.guestMoveSpeed;
      if (this._moveProgress >= 1) {
        this._moveProgress = 1;
        this._gridX = this._targetX;
        this._gridY = this._targetY;
        this._pathIndex++;
        // Continue to next path node
        if (this._pathIndex < this._path.length) {
          const next = this._path[this._pathIndex];
          this._targetX = next.x;
          this._targetY = next.y;
          this._moveProgress = 0;
        }
      }
    }

    // Status-specific updates
    switch (this._status) {
      case EGuestStatus.WALKING_TO_SEAT:
        // Waiting for movement to complete
        if (!this.isMoving && this._pathIndex >= this._path.length) {
          this.setStatus(EGuestStatus.DECIDING);
        }
        break;

      case EGuestStatus.DECIDING: {
        const [minDecide, maxDecide] = this._isReorder
          ? GameSettings.reorderPauseDuration
          : GameSettings.decidingDuration;
        const decideDuration = Random.range(minDecide, maxDecide);
        if (this._statusTimer >= decideDuration) {
          this._isReorder = false;
          this.setStatus(EGuestStatus.READY_TO_ORDER);
        }
        break;
      }

      case EGuestStatus.READY_TO_ORDER:
        // Happiness decays while waiting to give order
        if (this._statusTimer > 5) {
          this.adjustHappiness(-GameSettings.happinessReadyDecayRate * dt);
        }
        break;

      case EGuestStatus.WAITING_FOR_ORDER:
        // Happiness decays while waiting for drink
        this.adjustHappiness(-GameSettings.happinessDecayRate * dt);
        break;

      case EGuestStatus.DRINKING: {
        const drinkDuration = Random.range(
          GameSettings.drinkingDuration[0],
          GameSettings.drinkingDuration[1],
        );
        this._drinkProgress = Math.min(1, this._statusTimer / drinkDuration);

        // Drunkenness increases while drinking, 0.25x faster per completed order
        const drunkRate = GameSettings.baseDrunkennessRate
          * (1 + GameSettings.drunkennessAcceleration * this._ordersCompleted);
        this._drunkenness += drunkRate * dt;

        if (this._drinkProgress >= 1) {
          this._ordersCompleted++;
          this.decrementRounds();
          if (this._roundsRemaining <= 0) {
            this.setStatus(EGuestStatus.LEAVING);
          } else {
            this._isReorder = true;
            this.setStatus(EGuestStatus.DECIDING);
          }
        }
        break;
      }

      case EGuestStatus.LEAVING:
        // Wait for Engine to set leave path
        if (this._needsLeavePath) break;
        // Waiting for movement to complete, then remove
        if (!this.isMoving && this._pathIndex >= this._path.length) {
          return true; // remove this guest
        }
        break;
    }

    // Force leave if happiness hits 0
    if (this._happiness <= 0 && this._status !== EGuestStatus.LEAVING) {
      this.setStatus(EGuestStatus.LEAVING);
    }

    return false;
  }

  get state(): IGuestStateData {
    return {
      id: this._id,
      partyId: this._partyId,
      gridX: this._gridX,
      gridY: this._gridY,
      targetX: this._targetX,
      targetY: this._targetY,
      moveProgress: this._moveProgress,
      status: this._status,
      order: this._order,
      happiness: this._happiness,
      roundsRemaining: this._roundsRemaining,
      seatApplianceId: this._seatApplianceId,
      seatIndex: this._seatIndex,
      drinkProgress: this._drinkProgress,
      statusTimer: this._statusTimer,
      drunkenness: this._drunkenness,
      ordersCompleted: this._ordersCompleted,
    };
  }
}
