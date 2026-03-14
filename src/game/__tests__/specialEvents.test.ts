/**
 * Special Events unit tests — event rolling, modifier application, and effects.
 */
import { describe, it, expect, vi } from "vitest";
import { ShiftManager } from "../Network/Server/GameObjects/ShiftManager";
import { ESpecialEvent, getActiveEventConfigs, SPECIAL_EVENT_CONFIGS } from "../Shared/EventTypes";
import GameSettings from "../Shared/GameSettings";
import { createTestEngine, tick, priv } from "./engineHelper";
import { Guest } from "../Network/Server/GameObjects/Guest";
import { EGuestStatus, EGuestTier } from "../Shared/GuestTypes";
import { Random } from "../Utils/Random";

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

describe("EventTypes config", () => {
  it("has 6 active event configs (not counting NONE)", () => {
    const active = getActiveEventConfigs();
    expect(active.length).toBe(6);
  });

  it("NONE has weight 0", () => {
    expect(SPECIAL_EVENT_CONFIGS[ESpecialEvent.NONE].weight).toBe(0);
  });

  it("all active events have positive weights", () => {
    for (const config of getActiveEventConfigs()) {
      expect(config.weight).toBeGreaterThan(0);
    }
  });

  it("all events have label, description, and color", () => {
    for (const config of Object.values(SPECIAL_EVENT_CONFIGS)) {
      expect(config.label).toBeTruthy();
      expect(config.description).toBeTruthy();
      expect(config.color).toBeTruthy();
    }
  });
});

describe("ShiftManager event rolling", () => {
  it("starts with NONE event", () => {
    const sm = createSM();
    expect(sm.currentEvent).toBe(ESpecialEvent.NONE);
  });

  it("rollEvent returns a valid event", () => {
    const sm = createSM();
    const event = sm.rollEvent();
    expect(Object.values(ESpecialEvent)).toContain(event);
    expect(sm.currentEvent).toBe(event);
  });

  it("clearEvent resets to NONE", () => {
    const sm = createSM();
    // Force an event by mocking Random
    const origRange = Random.range;
    Random.range = () => 1; // force non-NONE (past noEventChance)
    sm.rollEvent();
    Random.range = origRange;
    sm.clearEvent();
    expect(sm.currentEvent).toBe(ESpecialEvent.NONE);
  });

  it("rolls event when entering prep via skipPhase", () => {
    const sm = createSM();
    // service -> closing -> prep
    sm.skipPhase(); // closing
    sm.skipPhase(); // prep — should roll
    // Can't deterministically check which event, just that it's valid
    expect(Object.values(ESpecialEvent)).toContain(sm.currentEvent);
  });

  it("rolls event when entering prep via endOvertime", () => {
    const sm = createSM();
    sm.skipPhase(); // closing
    sm.startOvertime();
    sm.endOvertime(); // prep — should roll
    expect(Object.values(ESpecialEvent)).toContain(sm.currentEvent);
  });

  it("with noEventChance = 1.0, always rolls NONE", () => {
    // Temporarily override
    const orig = GameSettings.eventNoEventChance;
    (GameSettings as any).eventNoEventChance = 1.0;
    const sm = createSM();
    for (let i = 0; i < 20; i++) {
      sm.rollEvent();
      expect(sm.currentEvent).toBe(ESpecialEvent.NONE);
    }
    (GameSettings as any).eventNoEventChance = orig;
  });

  it("with noEventChance = 0, always rolls an active event", () => {
    const orig = GameSettings.eventNoEventChance;
    (GameSettings as any).eventNoEventChance = 0;
    const sm = createSM();
    for (let i = 0; i < 20; i++) {
      sm.rollEvent();
      expect(sm.currentEvent).not.toBe(ESpecialEvent.NONE);
    }
    (GameSettings as any).eventNoEventChance = orig;
  });
});

describe("Engine event helpers", () => {
  it("currentEvent returns NONE by default", () => {
    const engine = createTestEngine();
    expect(engine.currentEvent).toBe(ESpecialEvent.NONE);
  });

  it("isEventActive returns false during prep", () => {
    const engine = createTestEngine();
    // Force an event
    priv(engine)._shiftManager._currentEvent = ESpecialEvent.HAPPY_HOUR;
    // Engine starts in service phase — force to prep
    priv(engine)._shiftManager._phase = "prep";
    expect(engine.isEventActive(ESpecialEvent.HAPPY_HOUR)).toBe(false);
  });

  it("isEventActive returns true during service with matching event", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._currentEvent = ESpecialEvent.HAPPY_HOUR;
    // Engine starts in service phase
    expect(engine.isEventActive(ESpecialEvent.HAPPY_HOUR)).toBe(true);
  });

  it("isEventActive returns false for non-matching event", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._currentEvent = ESpecialEvent.HAPPY_HOUR;
    expect(engine.isEventActive(ESpecialEvent.VIP_NIGHT)).toBe(false);
  });
});

describe("Happy Hour effects", () => {
  it("adds happiness bonus to newly added guests", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._currentEvent = ESpecialEvent.HAPPY_HOUR;

    const guest = new Guest("party1", 10, 14);
    guest.setPersonality({ wrath: 0.5, greed: 0.5, gluttony: 0.5, sloth: 0.5, pride: 0.5, envy: 0.5, lust: 0.5 });
    guest.applyTier(EGuestTier.NORMAL);
    const basehappiness = guest.happiness;
    engine.addGuest(guest);
    expect(guest.happiness).toBe(basehappiness + GameSettings.eventHappyHourHappinessBonus);
  });
});

describe("Live Music effects", () => {
  it("adds happiness bonus to newly added guests", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._currentEvent = ESpecialEvent.LIVE_MUSIC;

    const guest = new Guest("party1", 10, 14);
    guest.setPersonality({ wrath: 0.5, greed: 0.5, gluttony: 0.5, sloth: 0.5, pride: 0.5, envy: 0.5, lust: 0.5 });
    guest.applyTier(EGuestTier.NORMAL);
    const baseHappiness = guest.happiness;
    engine.addGuest(guest);
    expect(guest.happiness).toBe(baseHappiness + GameSettings.eventLiveMusicHappinessBonus);
  });
});

describe("Trivia Night effects", () => {
  it("adds extra rounds to newly added guests", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._currentEvent = ESpecialEvent.TRIVIA_NIGHT;

    const guest = new Guest("party1", 10, 14);
    guest.setPersonality({ wrath: 0.5, greed: 0.5, gluttony: 0.5, sloth: 0.5, pride: 0.5, envy: 0.5, lust: 0.5 });
    guest.applyTier(EGuestTier.NORMAL);
    guest.setRounds(2);
    const baseRounds = guest.roundsRemaining;
    engine.addGuest(guest);
    expect(guest.roundsRemaining).toBe(baseRounds + GameSettings.eventTriviaExtraRounds);
  });
});

describe("Health Inspector effects", () => {
  it("fines money when a mess is created", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._currentEvent = ESpecialEvent.HEALTH_INSPECTOR;
    const startMoney = engine.money;
    priv(engine)._addMess(5, 5);
    expect(engine.money).toBe(startMoney - GameSettings.eventHealthInspectorMessFine);
  });

  it("tracks mess count for health inspector", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._currentEvent = ESpecialEvent.HEALTH_INSPECTOR;
    priv(engine)._addMess(5, 5);
    priv(engine)._addMess(6, 6);
    expect(priv(engine)._healthInspectorMessCount).toBe(2);
  });

  it("does not fine when health inspector is not active", () => {
    const engine = createTestEngine();
    priv(engine)._shiftManager._currentEvent = ESpecialEvent.NONE;
    const startMoney = engine.money;
    priv(engine)._addMess(5, 5);
    expect(engine.money).toBe(startMoney);
  });
});

describe("GameSettings event constants", () => {
  it("has all required event settings", () => {
    expect(GameSettings.eventNoEventChance).toBe(0.4);
    expect(GameSettings.eventHappyHourPriceMultiplier).toBe(0.5);
    expect(GameSettings.eventHappyHourSpawnMultiplier).toBe(1.5);
    expect(GameSettings.eventHappyHourHappinessBonus).toBe(10);
    expect(GameSettings.eventVIPGuaranteedCount).toBe(3);
    expect(GameSettings.eventVIPTipMultiplier).toBe(3.0);
    expect(GameSettings.eventTriviaExtraRounds).toBe(1);
    expect(GameSettings.eventTriviaHappinessPerRound).toBe(5);
    expect(GameSettings.eventHealthInspectorMessFine).toBe(50);
    expect(GameSettings.eventHealthInspectorCleanBonus).toBe(200);
    expect(GameSettings.eventLiveMusicHappinessBonus).toBe(15);
    expect(GameSettings.eventLiveMusicLustTipBonus).toBe(0.15);
    expect(GameSettings.eventLiveMusicWrathPatienceMultiplier).toBe(1.5);
    expect(GameSettings.eventSportsNightForcedPartySize).toBe(4);
    expect(GameSettings.eventSportsNightGluttonyMean).toBe(0.75);
    expect(GameSettings.eventSportsNightExtraRounds).toBe(1);
  });
});
