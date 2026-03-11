/**
 * ShiftManager unit tests — phase progression, last call timing, overtime.
 */
import { describe, it, expect } from "vitest";
import { ShiftManager } from "../Network/Server/GameObjects/ShiftManager";
import GameSettings from "../Shared/GameSettings";

function createSM(): ShiftManager {
  return new ShiftManager();
}

function tickSM(sm: ShiftManager, seconds: number) {
  const dt = 1 / GameSettings.tickRate;
  const ticks = Math.round(seconds * GameSettings.tickRate);
  for (let i = 0; i < ticks; i++) {
    sm.tick(dt);
  }
}

describe("ShiftManager construction", () => {
  it("starts in service phase", () => {
    const sm = createSM();
    expect(sm.phase).toBe("service");
  });

  it("starts with timer at 0", () => {
    const sm = createSM();
    expect(sm.timer).toBe(0);
  });

  it("last call not triggered initially", () => {
    const sm = createSM();
    expect(sm.lastCallTriggered).toBe(false);
  });

  it("is not in overtime initially", () => {
    const sm = createSM();
    expect(sm.isOvertime).toBe(false);
  });
});

describe("ShiftManager phase progression", () => {
  it("skipPhase cycles service → closing", () => {
    const sm = createSM();
    let phaseChanged = "";
    sm.onPhaseChange = (p) => { phaseChanged = p; };

    sm.skipPhase();
    expect(sm.phase).toBe("closing");
    expect(phaseChanged).toBe("closing");
  });

  it("skipPhase cycles closing → prep", () => {
    const sm = createSM();
    sm.skipPhase(); // service → closing
    sm.skipPhase(); // closing → prep
    expect(sm.phase).toBe("prep");
  });

  it("skipPhase cycles prep → service", () => {
    const sm = createSM();
    sm.skipPhase(); // service → closing
    sm.skipPhase(); // closing → prep
    sm.skipPhase(); // prep → service
    expect(sm.phase).toBe("service");
  });

  it("full cycle returns to service", () => {
    const sm = createSM();
    sm.skipPhase(); // → closing
    sm.skipPhase(); // → prep
    sm.skipPhase(); // → service
    expect(sm.phase).toBe("service");
  });

  it("resets timer on phase change", () => {
    const sm = createSM();
    tickSM(sm, 5); // advance timer
    expect(sm.timer).toBeGreaterThan(0);
    sm.skipPhase();
    expect(sm.timer).toBe(0);
  });
});

describe("ShiftManager timer", () => {
  it("timer advances during tick", () => {
    const sm = createSM();
    tickSM(sm, 1);
    expect(sm.timer).toBeCloseTo(1.0, 1);
  });

  it("remainingTime decreases as timer increases", () => {
    const sm = createSM();
    const fullTime = sm.remainingTime;
    tickSM(sm, 5);
    expect(sm.remainingTime).toBeLessThan(fullTime);
    expect(sm.remainingTime).toBeCloseTo(fullTime - 5, 1);
  });

  it("auto-transitions when phase duration exceeded", () => {
    const sm = createSM();
    let phase = "";
    sm.onPhaseChange = (p) => { phase = p; };
    // Tick past service phase duration
    tickSM(sm, GameSettings.servicePhaseDuration + 1);
    expect(phase).toBe("closing");
    expect(sm.phase).toBe("closing");
  });
});

describe("ShiftManager last call", () => {
  it("triggers last call near end of service", () => {
    const sm = createSM();
    let lastCallFired = false;
    sm.onLastCall = () => { lastCallFired = true; };

    // Tick to near end of service phase (within lastCallTimeRemaining)
    const triggerTime = GameSettings.servicePhaseDuration - GameSettings.lastCallTimeRemaining + 1;
    tickSM(sm, triggerTime);

    expect(lastCallFired).toBe(true);
    expect(sm.lastCallTriggered).toBe(true);
  });

  it("last call fires only once", () => {
    const sm = createSM();
    let lastCallCount = 0;
    sm.onLastCall = () => { lastCallCount++; };

    const triggerTime = GameSettings.servicePhaseDuration - GameSettings.lastCallTimeRemaining + 1;
    tickSM(sm, triggerTime);
    // Continue ticking past last call point
    tickSM(sm, 5);

    expect(lastCallCount).toBe(1);
  });

  it("does not trigger during closing phase", () => {
    const sm = createSM();
    let lastCallFired = false;
    sm.onLastCall = () => { lastCallFired = true; };

    sm.skipPhase(); // → closing
    tickSM(sm, GameSettings.closingPhaseDuration - 1);

    expect(lastCallFired).toBe(false);
  });
});

describe("ShiftManager overtime", () => {
  it("can start overtime", () => {
    const sm = createSM();
    sm.startOvertime();
    expect(sm.isOvertime).toBe(true);
    expect(sm.overtimeTimer).toBe(0);
  });

  it("overtime timer advances during tick", () => {
    const sm = createSM();
    sm.startOvertime();
    tickSM(sm, 2);
    expect(sm.overtimeTimer).toBeCloseTo(2.0, 1);
  });

  it("endOvertime resets state", () => {
    const sm = createSM();
    sm.startOvertime();
    tickSM(sm, 2);
    sm.endOvertime();
    expect(sm.isOvertime).toBe(false);
  });

  it("phase does not advance during overtime", () => {
    const sm = createSM();
    sm.skipPhase(); // → closing
    sm.startOvertime();
    const phase = sm.phase;
    tickSM(sm, GameSettings.closingPhaseDuration + 5);
    // Phase should not change during overtime
    expect(sm.phase).toBe(phase);
  });
});

describe("ShiftManager phase change callback", () => {
  it("fires onPhaseChange for each transition", () => {
    const phases: string[] = [];
    const sm = createSM();
    sm.onPhaseChange = (p) => { phases.push(p); };

    sm.skipPhase(); // → closing
    sm.skipPhase(); // → prep
    sm.skipPhase(); // → service

    expect(phases).toEqual(["closing", "prep", "service"]);
  });
});
