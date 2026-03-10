import GameSettings from "../../../Shared/GameSettings";

export type ShiftPhase = "prep" | "service" | "closing";

export class ShiftManager {
  private _phase: ShiftPhase = "service"; // start with service for prototype
  private _timer: number = 0;
  private _onPhaseChange: ((phase: ShiftPhase) => void) | null = null;

  get phase() {
    return this._phase;
  }
  get timer() {
    return this._timer;
  }

  set onPhaseChange(cb: (phase: ShiftPhase) => void) {
    this._onPhaseChange = cb;
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

  tick(dt: number) {
    this._timer += dt;
    if (this._timer >= this._getPhaseDuration()) {
      this._timer = 0;
      this._phase = this._getNextPhase();
      this._onPhaseChange?.(this._phase);
    }
  }
}
