import { EGuestStatus, EGuestTrait, type IGuestOrder, type IGuestStateData } from "../../../Shared/GuestTypes";
import { getMenuDrinkKeys } from "../../../Shared/DrinkRecipes";
import GameSettings from "../../../Shared/GameSettings";
import { Random } from "../../../Utils/Random";
import type { Vec2 } from "../../../../types/Vec2";

const GUEST_NAMES = [
  "Alex", "Blake", "Casey", "Dana", "Ellis", "Frankie", "Gray", "Harper",
  "Indie", "Jamie", "Kit", "Lane", "Morgan", "Noel", "Oakley", "Parker",
  "Quinn", "Reese", "Sage", "Taylor", "Val", "Wren", "Avery", "Bailey",
  "Charlie", "Drew", "Eden", "Finley", "Glen", "Hayden", "Ira", "Jordan",
  "Kendall", "Lee", "Marley", "Nico", "Olive", "Peyton", "River", "Sky",
];

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
  private _seatApplianceGridX: number = 0;
  private _seatApplianceGridY: number = 0;
  private _seatIndex: number = -1;
  private _drinkProgress: number = 0;
  private _drinkDuration: number = 0;
  private _statusTimer: number = 0;
  private _path: Vec2[] = [];
  private _pathIndex: number = 0;
  private _needsLeavePath: boolean = false;
  private _isReorder: boolean = false;
  private _drunkenness: number = 0;
  private _drunkGoal: number;
  private _sipsTaken: number = 0;
  private _ordersCompleted: number = 0;
  private _producedDirtyGlass: boolean = false;
  private _name: string;
  private _chatCount: number = 0;
  private _preferredDrink: string | null = null;
  private _preferenceRevealed: boolean = false;
  private _traits: EGuestTrait[] = [];
  private _revealedTraits: EGuestTrait[] = [];
  private _queuePosition: number = -1;
  private _carryingDirtyGlass: boolean = false;
  private _isTileBlocked: ((x: number, y: number) => boolean) | null = null;

  constructor(partyId: string, spawnX: number, spawnY: number) {
    this._id = Random.uuid();
    this._partyId = partyId;
    this._gridX = spawnX;
    this._gridY = spawnY;
    this._targetX = spawnX;
    this._targetY = spawnY;
    this._happiness = GameSettings.happinessStarting;
    this._roundsRemaining = Random.rangeInt(1, 3);
    this._name = Random.pickOne(GUEST_NAMES);
    this._drunkGoal = Random.range(
      GameSettings.drunkGoalRange[0],
      GameSettings.drunkGoalRange[1],
    );

    // Pick a random preferred drink from the menu
    const drinkKeys = getMenuDrinkKeys();
    if (drinkKeys.length > 0) {
      this._preferredDrink = Random.pickOne(drinkKeys);
    }
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
  get drunkenness() {
    return this._drunkenness;
  }
  get name() {
    return this._name;
  }
  get chatCount() {
    return this._chatCount;
  }
  get preferredDrink() {
    return this._preferredDrink;
  }
  get preferenceRevealed() {
    return this._preferenceRevealed;
  }
  get traits() {
    return this._traits;
  }
  get producedDirtyGlass() {
    return this._producedDirtyGlass;
  }
  clearDirtyGlassFlag() {
    this._producedDirtyGlass = false;
  }
  get queuePosition() {
    return this._queuePosition;
  }
  setQueuePosition(pos: number) {
    this._queuePosition = pos;
  }
  get carryingDirtyGlass() {
    return this._carryingDirtyGlass;
  }
  setCarryingDirtyGlass(val: boolean) {
    this._carryingDirtyGlass = val;
  }
  setTileBlockedCheck(fn: ((x: number, y: number) => boolean) | null) {
    this._isTileBlocked = fn;
  }

  hasTrait(trait: EGuestTrait): boolean {
    return this._traits.includes(trait);
  }

  setTraits(traits: EGuestTrait[]) {
    this._traits = traits;
  }

  /** Chat with this guest. Returns true if new info was revealed. */
  chat(): boolean {
    this._chatCount++;
    this.adjustHappiness(GameSettings.chatHappinessBonus);

    // CHATTY trait: bonus happiness
    if (this.hasTrait(EGuestTrait.CHATTY)) {
      this.adjustHappiness(GameSettings.chatHappinessBonus);
    }

    const chance = GameSettings.chatRevealBaseChance
      + GameSettings.chatRevealChancePerChat * (this._chatCount - 1);

    if (Random.range(0, 1) < chance) {
      // Try to reveal an unrevealed trait first
      const unrevealed = this._traits.filter((t) => !this._revealedTraits.includes(t));
      if (unrevealed.length > 0) {
        this._revealedTraits.push(Random.pickOne(unrevealed));
        return true;
      }
      // Then reveal preference
      if (!this._preferenceRevealed && this._preferredDrink) {
        this._preferenceRevealed = true;
        return true;
      }
    }
    return false;
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

  setSeat(applianceId: string, seatIndex: number, gridX: number = 0, gridY: number = 0) {
    this._seatApplianceId = applianceId;
    this._seatApplianceGridX = gridX;
    this._seatApplianceGridY = gridY;
    this._seatIndex = seatIndex;
  }

  setStatus(status: EGuestStatus) {
    this._status = status;
    this._statusTimer = 0;
    this._drinkProgress = 0;
    if (status === EGuestStatus.DRINKING) {
      this._drinkDuration = Random.range(
        GameSettings.drinkingDuration[0],
        GameSettings.drinkingDuration[1],
      );
    }
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

    // Passive drunkenness decay (metabolism) — always active
    if (this._drunkenness > 0) {
      this._drunkenness = Math.max(0, this._drunkenness - GameSettings.drunkennessDecayRate * dt);
    }

    // Handle movement along path
    if (this._moveProgress < 1) {
      this._moveProgress += dt * GameSettings.guestMoveSpeed;
      if (this._moveProgress >= 1) {
        this._moveProgress = 1;
        this._gridX = this._targetX;
        this._gridY = this._targetY;
        this._pathIndex++;
        // Continue to next path node (with collision check)
        if (this._pathIndex < this._path.length) {
          const next = this._path[this._pathIndex];
          if (this._isTileBlocked && this._isTileBlocked(next.x, next.y)) {
            // Tile blocked — wait and retry next tick (don't advance pathIndex)
            this._pathIndex--;
          } else {
            this._targetX = next.x;
            this._targetY = next.y;
            this._moveProgress = 0;
          }
        }
      }
    }

    // Status-specific updates
    switch (this._status) {
      case EGuestStatus.WAITING_AT_DOOR:
        if (this._statusTimer >= GameSettings.waitingAtDoorTimeout) {
          this.setStatus(EGuestStatus.LEAVING);
        }
        break;

      case EGuestStatus.WALKING_TO_SEAT:
        // Waiting for movement to complete
        if (!this.isMoving && this._pathIndex >= this._path.length) {
          this.setStatus(EGuestStatus.DECIDING);
        }
        break;

      case EGuestStatus.DECIDING: {
        const isOverGoal = this._drunkenness >= this._drunkGoal;
        const [minDecide, maxDecide] = isOverGoal
          ? GameSettings.drunkCoastDuration
          : this._isReorder
            ? GameSettings.reorderPauseDuration
            : GameSettings.decidingDuration;
        let decideDuration = Random.range(minDecide, maxDecide);
        if (this.hasTrait(EGuestTrait.IMPATIENT)) decideDuration *= GameSettings.impatientTimerMultiplier;
        if (this._statusTimer >= decideDuration) {
          this._isReorder = false;
          if (isOverGoal) {
            // Past their goal: chance to leave, otherwise coast (re-enter DECIDING)
            if (Random.range(0, 1) < GameSettings.drunkLeaveChance) {
              this.setStatus(EGuestStatus.LEAVING);
            } else {
              // Coast — reset timer, let decay bring drunkenness down
              this.setStatus(EGuestStatus.DECIDING);
            }
          } else {
            this.setStatus(EGuestStatus.READY_TO_ORDER);
          }
        }
        break;
      }

      case EGuestStatus.WALKING_TO_QUEUE:
        // Waiting for movement to complete
        if (!this.isMoving && this._pathIndex >= this._path.length) {
          this.setStatus(EGuestStatus.QUEUED);
          this._carryingDirtyGlass = false; // dropped off at queue
        }
        break;

      case EGuestStatus.QUEUED:
        // Waiting in line — happiness decays
        this.adjustHappiness(-GameSettings.queueHappinessDecayRate * dt);
        break;

      case EGuestStatus.RETURNING_TO_SEAT:
        // Walking back to table with drink
        if (!this.isMoving && this._pathIndex >= this._path.length) {
          this.setStatus(EGuestStatus.DRINKING);
        }
        break;

      case EGuestStatus.READY_TO_ORDER:
        // Happiness decays while waiting to give order (counter guests only)
        if (this._statusTimer > 5) {
          this.adjustHappiness(-GameSettings.happinessReadyDecayRate * dt);
        }
        break;

      case EGuestStatus.WAITING_FOR_ORDER:
        // Happiness decays while waiting for drink
        this.adjustHappiness(-GameSettings.happinessDecayRate * dt);
        break;

      case EGuestStatus.DRINKING: {
        this._drinkProgress = Math.min(1, this._statusTimer / this._drinkDuration);

        // Discrete sips — check if it's time for the next sip
        const sipInterval = 1.0 / GameSettings.sipsPerDrink;
        const nextSipAt = (this._sipsTaken + 1) * sipInterval;
        if (this._drinkProgress >= nextSipAt && this._sipsTaken < GameSettings.sipsPerDrink) {
          this._sipsTaken++;
          let sipAmount = GameSettings.sipDrunkenness;
          if (this.hasTrait(EGuestTrait.LIGHTWEIGHT)) sipAmount *= GameSettings.lightweightDrunkMultiplier;
          if (this.hasTrait(EGuestTrait.LUSH)) sipAmount *= GameSettings.lushDrunkMultiplier;
          this._drunkenness += sipAmount;
        }

        if (this._drinkProgress >= 1) {
          this._ordersCompleted++;
          this._producedDirtyGlass = true;
          this._sipsTaken = 0; // reset for next drink
          this._order = null; // clear order now that drink is done
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

      case EGuestStatus.FIGHTING:
        // Auto-resolve after timeout — guest leaves
        if (this._statusTimer >= GameSettings.fightTimeoutSeconds) {
          this.setStatus(EGuestStatus.LEAVING);
        }
        break;

      case EGuestStatus.SLIPPED:
        // Happiness decays while on the floor
        this.adjustHappiness(-GameSettings.happinessDecayRate * dt);
        break;

      case EGuestStatus.LEAVING:
        // Wait for Engine to set leave path
        if (this._needsLeavePath) break;
        // Waiting for movement to complete, then remove
        if (!this.isMoving && this._pathIndex >= this._path.length) {
          return true; // remove this guest
        }
        break;
    }

    // VIOLENT trait: check for fight trigger while DECIDING or DRINKING
    if (
      this.hasTrait(EGuestTrait.VIOLENT) &&
      (this._status === EGuestStatus.DECIDING || this._status === EGuestStatus.DRINKING) &&
      this._drunkenness >= GameSettings.fightDrunkThreshold &&
      this._happiness < GameSettings.fightHappinessThreshold
    ) {
      this.setStatus(EGuestStatus.FIGHTING);
    }

    // Force leave if happiness hits 0
    const noLeaveStatuses = [EGuestStatus.LEAVING, EGuestStatus.WAITING_AT_DOOR, EGuestStatus.FIGHTING, EGuestStatus.SLIPPED, EGuestStatus.WALKING_TO_QUEUE, EGuestStatus.QUEUED, EGuestStatus.RETURNING_TO_SEAT];
    if (this._happiness <= 0 && !noLeaveStatuses.includes(this._status)) {
      this.setStatus(EGuestStatus.LEAVING);
    }

    return false;
  }

  get state(): IGuestStateData {
    return {
      id: this._id,
      partyId: this._partyId,
      name: this._name,
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
      seatApplianceGridX: this._seatApplianceGridX,
      seatApplianceGridY: this._seatApplianceGridY,
      seatIndex: this._seatIndex,
      drinkProgress: this._drinkProgress,
      statusTimer: this._statusTimer,
      drunkenness: this._drunkenness,
      drunkGoal: this._drunkGoal,
      ordersCompleted: this._ordersCompleted,
      chatCount: this._chatCount,
      preferredDrink: this._preferenceRevealed ? this._preferredDrink : null,
      preferenceRevealed: this._preferenceRevealed,
      traitCount: this._traits.length,
      revealedTraits: this._revealedTraits.map((t) => t as string),
      queuePosition: this._queuePosition,
      carryingDirtyGlass: this._carryingDirtyGlass,
    };
  }
}
