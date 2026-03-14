import GameSettings from "../../../Shared/GameSettings";
import { ESpecialEvent, getActiveEventConfigs } from "../../../Shared/EventTypes";
import { Random } from "../../../Utils/Random";

export type ShiftPhase = "prep" | "service" | "closing";

export class ShiftManager {
  private _phase: ShiftPhase = "service"; // start with service for prototype
  private _timer: number = 0;
  private _onPhaseChange: ((phase: ShiftPhase) => void) | null = null;
  private _onLastCall: (() => void) | null = null;
  private _lastCallTriggered: boolean = false;
  private _isOvertime: boolean = false;
  private _overtimeTimer: number = 0;
  private _currentEvent: ESpecialEvent = ESpecialEvent.NONE;

  get phase() {
    return this._phase;
  }
  get timer() {
    return this._timer;
  }
  get lastCallTriggered() {
    return this._lastCallTriggered;
  }
  get isOvertime() {
    return this._isOvertime;
  }
  get overtimeTimer() {
    return this._overtimeTimer;
  }
  get currentEvent() {
    return this._currentEvent;
  }

  set onPhaseChange(cb: (phase: ShiftPhase) => void) {
    this._onPhaseChange = cb;
  }
  set onLastCall(cb: () => void) {
    this._onLastCall = cb;
  }

  private _getPhaseDuration(): number {
    switch (this._phase) {
      case "service":
        return GameSettings.servicePhaseDuration;
      case "closing":
        return GameSettings.closingPhaseDuration;
      case "prep":
        return GameSettings.prepPhaseDuration;
    }
  }

  private _getNextPhase(): ShiftPhase {
    switch (this._phase) {
      case "prep":
        return "service";
      case "service":
        return "closing";
      case "closing":
        return "prep";
    }
  }

  get remainingTime(): number {
    return Math.max(0, this._getPhaseDuration() - this._timer);
  }

  /** Roll a random special event for the upcoming shift. Called when entering prep. */
  rollEvent(): ESpecialEvent {
    // Chance of no event
    if (Random.range(0, 1) < GameSettings.eventNoEventChance) {
      this._currentEvent = ESpecialEvent.NONE;
      return this._currentEvent;
    }

    // Weighted random among active events
    const configs = getActiveEventConfigs();
    const totalWeight = configs.reduce((sum, c) => sum + c.weight, 0);
    let roll = Random.range(0, totalWeight);
    for (const config of configs) {
      roll -= config.weight;
      if (roll <= 0) {
        this._currentEvent = config.id;
        return this._currentEvent;
      }
    }
    this._currentEvent = ESpecialEvent.NONE;
    return this._currentEvent;
  }

  /** Clear event (e.g., when shift ends). */
  clearEvent() {
    this._currentEvent = ESpecialEvent.NONE;
  }

  /** Skip the current phase immediately, advancing to the next one. */
  skipPhase() {
    this._timer = 0;
    this._isOvertime = false;
    this._phase = this._getNextPhase();
    if (this._phase === "service") {
      this._lastCallTriggered = false;
    }
    if (this._phase === "prep") {
      this.rollEvent();
    }
    this._onPhaseChange?.(this._phase);
  }

  /** Start overtime — pauses normal closing→prep transition. */
  startOvertime() {
    this._isOvertime = true;
    this._overtimeTimer = 0;
    this._phase = "closing"; // stay in closing conceptually
  }

  /** End overtime — advance to prep. */
  endOvertime() {
    this._isOvertime = false;
    this._overtimeTimer = 0;
    this._timer = 0;
    this._phase = "prep";
    this.rollEvent();
    this._onPhaseChange?.(this._phase);
  }

  tick(dt: number) {
    // Overtime: count up but don't auto-advance
    if (this._isOvertime) {
      this._overtimeTimer += dt;
      return;
    }

    this._timer += dt;

    // Last call trigger during service phase
    if (this._phase === "service" && !this._lastCallTriggered) {
      if (this.remainingTime <= GameSettings.lastCallTimeRemaining) {
        this._lastCallTriggered = true;
        this._onLastCall?.();
      }
    }

    if (this._timer >= this._getPhaseDuration()) {
      this._timer = 0;
      const nextPhase = this._getNextPhase();
      if (this._phase === "service") {
        this._lastCallTriggered = false;
      }
      this._phase = nextPhase;
      if (this._phase === "prep") {
        this.rollEvent();
      }
      this._onPhaseChange?.(this._phase);
    }
  }
}
