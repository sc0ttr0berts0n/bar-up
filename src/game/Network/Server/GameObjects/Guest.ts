import { EGuestStatus, EGuestTier, EGuestTrait, type IGuestOrder, type IGuestSlot, type IGuestStateData, type IPersonality, deriveTraits, emptySlot } from "../../../Shared/GuestTypes";
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
  private _patience: number;
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
  private _chatAvailable: boolean = false;
  private _chatCooldown: number = 0;
  private _preferredDrink: string | null = null;
  private _preferenceRevealed: boolean = false;
  private _personality: IPersonality = { wrath: 0.5, greed: 0.5, gluttony: 0.5, sloth: 0.5, pride: 0.5, envy: 0.5, lust: 0.5 };
  private _isDesignatedDriver: boolean = false;
  private _traits: EGuestTrait[] = [];
  private _revealedTraits: EGuestTrait[] = [];
  private _queuePosition: number = -1;
  private _carryingDirtyGlass: boolean = false;
  private _wasOverserved: boolean = false;
  private _lastCallDecision: "none" | "ordering" | "leaving" | "finishing" = "none";
  private _isChugging: boolean = false;
  private _tier: EGuestTier = EGuestTier.NORMAL;
  private _isTileBlocked: ((x: number, y: number) => boolean) | null = null;
  private _isWalkableTile: ((x: number, y: number) => boolean) | null = null;
  /** Dual consumption slots: index 0 = primary (drink), index 1 = secondary (food/extra drink) */
  private _slots: [IGuestSlot, IGuestSlot] = [emptySlot(), emptySlot()];
  /** Independent drink durations per slot */
  private _slotDurations: [number, number] = [0, 0];
  /** Independent sip counters per slot */
  private _slotSipsTaken: [number, number] = [0, 0];
  /** Track which slots produced dirty glasses this tick */
  private _slotProducedDirtyGlass: [boolean, boolean] = [false, false];
  /** Slip immunity timer — prevents re-slipping immediately after being helped up */
  private _slipImmunity: number = 0;

  constructor(partyId: string, spawnX: number, spawnY: number) {
    this._id = Random.uuid();
    this._partyId = partyId;
    this._gridX = spawnX;
    this._gridY = spawnY;
    this._targetX = spawnX;
    this._targetY = spawnY;
    this._patience = GameSettings.patienceStarting;
    this._happiness = GameSettings.happinessStarting;
    this._roundsRemaining = Random.rangeInt(1, 3); // overridden by applyTier/setPersonality
    this._name = Random.pickOne(GUEST_NAMES);
    this._drunkGoal = Random.range(
      GameSettings.drunkGoalRange[0],
      GameSettings.drunkGoalRange[1],
    );
    this._chatCooldown = Random.range(
      GameSettings.chatInitialCooldown[0],
      GameSettings.chatInitialCooldown[1],
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
  get patience() {
    return this._patience;
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
  get slipImmune() {
    return this._slipImmunity > 0;
  }
  get name() {
    return this._name;
  }
  get chatCount() {
    return this._chatCount;
  }
  get chatAvailable() {
    return this._chatAvailable;
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
  get wasOverserved() {
    return this._wasOverserved;
  }
  setOverserved() {
    this._wasOverserved = true;
  }
  setTileBlockedCheck(fn: ((x: number, y: number) => boolean) | null) {
    this._isTileBlocked = fn;
  }
  setWalkableCheck(fn: ((x: number, y: number) => boolean) | null) {
    this._isWalkableTile = fn;
  }
  get lastCallDecision() {
    return this._lastCallDecision;
  }
  setLastCallDecision(decision: "none" | "ordering" | "leaving" | "finishing") {
    this._lastCallDecision = decision;
  }
  get isChugging() {
    return this._isChugging;
  }
  setChugging(val: boolean) {
    this._isChugging = val;
  }

  // ── Dual Slot API ─────────────────────────────────────────────

  get slots(): readonly [IGuestSlot, IGuestSlot] {
    return this._slots;
  }

  /** Get the first empty slot index (0 or 1), or -1 if both are occupied */
  getFirstEmptySlotIndex(): number {
    if (this._slots[0].itemType === null) return 0;
    if (this._slots[1].itemType === null) return 1;
    return -1;
  }

  /** Fill a slot with an item. Returns true if successful. */
  fillSlot(slotIndex: number, itemType: string, isFood: boolean = false): boolean {
    if (slotIndex < 0 || slotIndex > 1) return false;
    if (this._slots[slotIndex].itemType !== null) return false;
    this._slots[slotIndex] = { itemType, progress: 0, isFood };
    this._slotDurations[slotIndex] = Random.range(
      GameSettings.drinkingDuration[0],
      GameSettings.drinkingDuration[1],
    );
    this._slotSipsTaken[slotIndex] = 0;
    return true;
  }

  /** Clear a slot (item consumed). */
  clearSlot(slotIndex: number) {
    if (slotIndex < 0 || slotIndex > 1) return;
    this._slots[slotIndex] = emptySlot();
    this._slotDurations[slotIndex] = 0;
    this._slotSipsTaken[slotIndex] = 0;
    this._slotProducedDirtyGlass[slotIndex] = false;
  }

  /** Check if any slot has a dirty-glass flag pending */
  get slotProducedDirtyGlass(): [boolean, boolean] {
    return [...this._slotProducedDirtyGlass] as [boolean, boolean];
  }

  clearSlotDirtyGlassFlag(slotIndex: number) {
    if (slotIndex >= 0 && slotIndex <= 1) {
      this._slotProducedDirtyGlass[slotIndex] = false;
    }
  }

  /** Are both slots empty? */
  get allSlotsEmpty(): boolean {
    return this._slots[0].itemType === null && this._slots[1].itemType === null;
  }

  /** Are all occupied slots finished consuming? */
  get allSlotsFinished(): boolean {
    for (let i = 0; i < 2; i++) {
      if (this._slots[i].itemType !== null && this._slots[i].progress < 1) return false;
    }
    return true;
  }

  get personality() {
    return this._personality;
  }

  get isDesignatedDriver() {
    return this._isDesignatedDriver;
  }

  setPersonality(personality: IPersonality, isDesignatedDriver: boolean = false) {
    this._personality = personality;
    this._isDesignatedDriver = isDesignatedDriver;
    this._traits = deriveTraits(personality, isDesignatedDriver);
  }

  hasTrait(trait: EGuestTrait): boolean {
    return this._traits.includes(trait);
  }

  /** @deprecated Use setPersonality() instead — kept for test compatibility */
  setTraits(traits: EGuestTrait[]) {
    this._traits = traits;
  }

  get tier() {
    return this._tier;
  }

  applyTier(tier: EGuestTier) {
    this._tier = tier;
    const stats = GameSettings.guestTierStats[tier];
    this._patience = Math.min(GameSettings.patienceMax, GameSettings.patienceStarting + stats.patienceMod);
    this._happiness = Math.min(GameSettings.happinessMax, GameSettings.happinessStarting + stats.happinessMod);
    this._roundsRemaining = Random.rangeInt(stats.roundsRange[0], stats.roundsRange[1]);
  }

  /** Chat with this guest. Returns true if new info was revealed. */
  chat(): boolean {
    this._chatCount++;
    this._chatAvailable = false;
    this._chatCooldown = Random.range(
      GameSettings.chatCooldownRange[0],
      GameSettings.chatCooldownRange[1],
    );
    // Base chat happiness + lust-driven bonus (lustful guests enjoy chatting more)
    this.adjustHappiness(GameSettings.chatHappinessBonus + Math.round(this._personality.lust * GameSettings.chatHappinessBonus));

    // Reveal chance: base + per-chat + lust-driven depth
    const chance = GameSettings.chatRevealBaseChance
      + GameSettings.chatRevealChancePerChat * (this._chatCount - 1)
      + this._personality.lust * 0.1;

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

  /** Shared drink-finished logic for both slot-based and legacy paths */
  private _drinkFinished() {
    this._order = null;
    this._isChugging = false;

    // Last call post-drink behavior
    if (this._lastCallDecision === "ordering") {
      this._roundsRemaining = 1;
      this._isReorder = true;
      this.setStatus(EGuestStatus.DECIDING);
      this._lastCallDecision = "finishing";
    } else if (this._lastCallDecision === "finishing") {
      this._roundsRemaining = 0;
      this.setStatus(EGuestStatus.LEAVING);
    } else {
      // Normal behavior
      this.decrementRounds();
      if (this._roundsRemaining <= 0) {
        this.setStatus(EGuestStatus.LEAVING);
      } else {
        this._isReorder = true;
        this.setStatus(EGuestStatus.DECIDING);
      }
    }
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
    // Grant slip immunity when recovering from a slip
    if (this._status === EGuestStatus.SLIPPED && status !== EGuestStatus.SLIPPED) {
      this._slipImmunity = 3; // 3 seconds of immunity
    }
    this._status = status;
    this._statusTimer = 0;
    this._drinkProgress = 0;
    if (status === EGuestStatus.DRINKING) {
      this._drinkDuration = Random.range(
        GameSettings.drinkingDuration[0],
        GameSettings.drinkingDuration[1],
      );
      // Initialize slot durations for any filled slots that don't have a duration yet
      for (let i = 0; i < 2; i++) {
        if (this._slots[i].itemType !== null && this._slotDurations[i] <= 0) {
          this._slotDurations[i] = Random.range(
            GameSettings.drinkingDuration[0],
            GameSettings.drinkingDuration[1],
          );
        }
      }
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

  adjustPatience(amount: number) {
    this._patience = Math.max(0, Math.min(GameSettings.patienceMax, this._patience + amount));
  }

  adjustHappiness(amount: number) {
    this._happiness = Math.max(0, Math.min(GameSettings.happinessMax, this._happiness + amount));
  }

  decrementRounds() {
    this._roundsRemaining--;
  }

  setRounds(rounds: number) {
    this._roundsRemaining = rounds;
  }

  /** Tick guest movement and status timers. Returns true if guest should be removed. */
  tick(dt: number): boolean {
    this._statusTimer += dt;

    // Tick down slip immunity
    if (this._slipImmunity > 0) {
      this._slipImmunity = Math.max(0, this._slipImmunity - dt);
    }

    // Passive drunkenness decay (metabolism) — always active
    if (this._drunkenness > 0) {
      this._drunkenness = Math.max(0, this._drunkenness - GameSettings.drunkennessDecayRate * dt);
    }

    // Handle movement along path (frozen while slipped or fighting)
    if (this._moveProgress < 1 && this._status !== EGuestStatus.SLIPPED && this._status !== EGuestStatus.FIGHTING) {
      this._moveProgress += dt * GameSettings.guestMoveSpeed;
      if (this._moveProgress >= 1) {
        this._moveProgress = 1;
        this._gridX = this._targetX;
        this._gridY = this._targetY;
        this._pathIndex++;
        // Drunk stumble: chance to step in a random direction instead of following path
        if (this._drunkenness > 0.1 && this._pathIndex < this._path.length && Random.chance(this._drunkenness * 0.6)) {
          const offsets = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
          const shuffled = offsets.sort(() => Math.random() - 0.5);
          for (const off of shuffled) {
            const sx = this._gridX + off.x;
            const sy = this._gridY + off.y;
            // Must be walkable terrain AND not blocked by another guest
            const walkable = this._isWalkableTile ? this._isWalkableTile(sx, sy) : true;
            const notBlocked = !this._isTileBlocked || !this._isTileBlocked(sx, sy);
            if (walkable && notBlocked) {
              // Stumble to random tile, then re-insert current path node so they correct course
              this._pathIndex--;
              this._targetX = sx;
              this._targetY = sy;
              this._moveProgress = 0;
              break;
            }
          }
          // If no stumble tile found, fall through to normal path logic
          if (this._moveProgress >= 1 && this._pathIndex < this._path.length) {
            const next = this._path[this._pathIndex];
            if (this._isTileBlocked && this._isTileBlocked(next.x, next.y)) {
              this._pathIndex--;
            } else {
              this._targetX = next.x;
              this._targetY = next.y;
              this._moveProgress = 0;
            }
          }
        } else if (this._pathIndex < this._path.length) {
          // Normal path following
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
        // Last call: immediate leave or fast deciding
        if (this._lastCallDecision === "leaving") {
          this.setStatus(EGuestStatus.LEAVING);
          break;
        }
        const lastCallOrdering = this._lastCallDecision === "ordering" || this._lastCallDecision === "finishing";
        const isOverGoal = this._drunkenness >= this._drunkGoal;
        let decideDuration: number;
        if (lastCallOrdering) {
          decideDuration = GameSettings.lastCallDecideSpeed;
        } else {
          const [minDecide, maxDecide] = isOverGoal
            ? GameSettings.drunkCoastDuration
            : this._isReorder
              ? GameSettings.reorderPauseDuration
              : GameSettings.decidingDuration;
          decideDuration = Random.range(minDecide, maxDecide);
          // Wrath drives impatience: high wrath = faster deciding (0.7x at wrath=1, 1.0x at wrath=0)
          decideDuration *= 1.0 - this._personality.wrath * 0.3;
        }
        if (this._statusTimer >= decideDuration) {
          this._isReorder = false;
          if (lastCallOrdering) {
            this.setStatus(EGuestStatus.READY_TO_ORDER);
          } else if (isOverGoal) {
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
        // Waiting in line — patience decays
        this.adjustPatience(-GameSettings.queuePatienceDecayRate * dt);
        break;

      case EGuestStatus.RETURNING_TO_SEAT:
        // Walking back to table with drink
        if (!this.isMoving && this._pathIndex >= this._path.length) {
          this.setStatus(EGuestStatus.DRINKING);
        }
        break;

      case EGuestStatus.READY_TO_ORDER:
        // Patience decays while waiting to give order
        if (this._statusTimer > 5) {
          this.adjustPatience(-GameSettings.patienceReadyDecayRate * dt);
        }
        break;

      case EGuestStatus.WAITING_FOR_ORDER:
        // Patience decays while waiting for drink
        this.adjustPatience(-GameSettings.patienceWaitingForDrinkDecayRate * dt);
        break;

      case EGuestStatus.DRINKING: {
        // Chugging: advance status timer faster during last call
        if (this._isChugging) {
          this._statusTimer += dt * (GameSettings.lastCallChugSpeedMultiplier - 1);
        }

        // Chat cooldown tick
        if (!this._chatAvailable && this._chatCooldown > 0) {
          this._chatCooldown -= dt;
          if (this._chatCooldown <= 0) {
            this._chatAvailable = true;
          }
        }

        // Determine if we use slot-based or legacy drink progress
        const useLegacy = this.allSlotsEmpty;

        if (!useLegacy) {
          // ── Slot-based consumption ──
          const effectiveDt = this._isChugging
            ? dt * GameSettings.lastCallChugSpeedMultiplier
            : dt;
          for (let si = 0; si < 2; si++) {
            const slot = this._slots[si];
            if (slot.itemType === null || slot.progress >= 1) continue;

            const duration = this._slotDurations[si];
            if (duration <= 0) continue;

            slot.progress = Math.min(1, slot.progress + effectiveDt / duration);

            // Discrete sips for drink slots (not food)
            if (!slot.isFood) {
              const sipInterval = 1.0 / GameSettings.sipsPerDrink;
              const nextSipAt = (this._slotSipsTaken[si] + 1) * sipInterval;
              if (slot.progress >= nextSipAt && this._slotSipsTaken[si] < GameSettings.sipsPerDrink) {
                this._slotSipsTaken[si]++;
                let sipAmount: number = GameSettings.sipDrunkenness;
                if (this._isDesignatedDriver) {
                  sipAmount = 0;
                } else {
                  sipAmount *= 1.3 - 0.6 * this._personality.gluttony;
                }
                this._drunkenness += sipAmount;
              }
            }

            // Slot finished consuming
            if (slot.progress >= 1) {
              if (!slot.isFood) {
                this._slotProducedDirtyGlass[si] = true;
                this._producedDirtyGlass = true;
              }
              this._ordersCompleted++;
            }
          }

          // Legacy drinkProgress: mirrors slot 0
          this._drinkProgress = this._slots[0].itemType !== null
            ? this._slots[0].progress
            : (this._slots[1].itemType !== null ? this._slots[1].progress : 0);
          this._sipsTaken = this._slotSipsTaken[0] || this._slotSipsTaken[1];

          // Check if all occupied slots are finished
          if (this.allSlotsFinished) {
            for (let si = 0; si < 2; si++) {
              if (this._slots[si].itemType !== null) this.clearSlot(si);
            }
            this._drinkFinished();
          }
        } else {
          // ── Legacy single-drink path (backward compat for tests / old code paths) ──
          this._drinkProgress = Math.min(1, this._statusTimer / this._drinkDuration);

          const sipInterval = 1.0 / GameSettings.sipsPerDrink;
          const nextSipAt = (this._sipsTaken + 1) * sipInterval;
          if (this._drinkProgress >= nextSipAt && this._sipsTaken < GameSettings.sipsPerDrink) {
            this._sipsTaken++;
            let sipAmount: number = GameSettings.sipDrunkenness;
            if (this._isDesignatedDriver) {
              sipAmount = 0;
            } else {
              sipAmount *= 1.3 - 0.6 * this._personality.gluttony;
            }
            this._drunkenness += sipAmount;
          }

          if (this._drinkProgress >= 1) {
            this._ordersCompleted++;
            this._producedDirtyGlass = true;
            this._sipsTaken = 0;
            this._drinkFinished();
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
        // Patience decays while on the floor
        this.adjustPatience(-GameSettings.patienceDecayRate * dt);
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

    // Fight check — wrath drives fight threshold continuously
    // fightHappinessThreshold = 15 + 20 * (1 - wrath): wrathful guests fight at higher happiness
    if (
      (this._status === EGuestStatus.DECIDING || this._status === EGuestStatus.DRINKING) &&
      this._drunkenness >= GameSettings.fightDrunkThreshold &&
      this._happiness < 15 + 20 * (1 - this._personality.wrath)
    ) {
      this.setStatus(EGuestStatus.FIGHTING);
    }

    // Force leave if patience hits 0
    const noLeaveStatuses = [EGuestStatus.LEAVING, EGuestStatus.WAITING_AT_DOOR, EGuestStatus.FIGHTING, EGuestStatus.SLIPPED, EGuestStatus.WALKING_TO_QUEUE, EGuestStatus.QUEUED, EGuestStatus.RETURNING_TO_SEAT];
    if (this._patience <= 0 && !noLeaveStatuses.includes(this._status)) {
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
      patience: this._patience,
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
      chatAvailable: this._chatAvailable,
      preferredDrink: this._preferenceRevealed ? this._preferredDrink : null,
      preferenceRevealed: this._preferenceRevealed,
      traitCount: this._traits.length,
      revealedTraits: this._revealedTraits.map((t) => t as string),
      queuePosition: this._queuePosition,
      carryingDirtyGlass: this._carryingDirtyGlass,
      wasOverserved: this._wasOverserved,
      lastCallDecision: this._lastCallDecision,
      isChugging: this._isChugging,
      tier: this._tier,
      personality: { ...this._personality },
      isDesignatedDriver: this._isDesignatedDriver,
      slots: [
        { ...this._slots[0] },
        { ...this._slots[1] },
      ],
    };
  }
}
