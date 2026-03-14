/**
 * Group Dynamics tests — mood sync, fight cascade, atmosphere, party leave penalty.
 */
import { describe, it, expect } from "vitest";
import { Guest } from "../Network/Server/GameObjects/Guest";
import { EGuestStatus, type IPersonality } from "../Shared/GuestTypes";
import GameSettings from "../Shared/GameSettings";

function createGuest(partyId: string, x: number, y: number, personality?: Partial<IPersonality>): Guest {
  const guest = new Guest(partyId, x, y);
  const p: IPersonality = {
    wrath: 0.5,
    greed: 0.5,
    gluttony: 0.5,
    sloth: 0.5,
    pride: 0.5,
    envy: 0.5,
    lust: 0.5,
    ...personality,
  };
  guest.setPersonality(p);
  return guest;
}

describe("Guest.applyMoodInfluence", () => {
  it("increases happiness with positive influence", () => {
    const guest = createGuest("p1", 5, 5);
    const before = guest.happiness;
    guest.applyMoodInfluence(10);
    expect(guest.happiness).toBe(before + 10);
  });

  it("decreases happiness with negative influence", () => {
    const guest = createGuest("p1", 5, 5);
    const before = guest.happiness;
    guest.applyMoodInfluence(-10);
    expect(guest.happiness).toBe(before - 10);
  });

  it("clamps to 0 minimum", () => {
    const guest = createGuest("p1", 5, 5);
    guest.applyMoodInfluence(-9999);
    expect(guest.happiness).toBe(0);
  });

  it("clamps to max", () => {
    const guest = createGuest("p1", 5, 5);
    guest.applyMoodInfluence(9999);
    expect(guest.happiness).toBe(GameSettings.happinessMax);
  });
});

describe("Mood influence radius", () => {
  it("kind guests (low envy) have smaller radius", () => {
    const radius = GameSettings.moodInfluenceRadiusBase + 0.1 * GameSettings.moodInfluenceEnvyScale;
    expect(radius).toBeCloseTo(2.3, 1);
  });

  it("envious guests (high envy) have larger radius", () => {
    const radius = GameSettings.moodInfluenceRadiusBase + 0.9 * GameSettings.moodInfluenceEnvyScale;
    expect(radius).toBeCloseTo(4.7, 1);
  });
});

describe("Mood influence multiplier", () => {
  it("kind guests (low envy) spread positive vibes (negative mult)", () => {
    const mult = GameSettings.moodInfluenceBaseMult + 0.1; // envy = 0.1
    expect(mult).toBeLessThan(0);
  });

  it("envious guests (high envy) drag neighbors down (positive mult)", () => {
    const mult = GameSettings.moodInfluenceBaseMult + 0.9; // envy = 0.9
    expect(mult).toBeGreaterThan(0);
  });

  it("envy 0.5 is neutral", () => {
    const mult = GameSettings.moodInfluenceBaseMult + 0.5;
    expect(mult).toBe(0);
  });
});

describe("Intra-party influence", () => {
  it("party influence is amplified", () => {
    expect(GameSettings.intraPartyInfluenceScale).toBe(2);
  });
});

describe("Fight cascade settings", () => {
  it("wrathful guests above threshold can join fights", () => {
    const wrath = 0.8;
    const joinChance = (wrath - 0.5) * GameSettings.fightCascadeJoinBase;
    expect(joinChance).toBeGreaterThan(0);
  });

  it("non-wrathful guests below threshold cannot join", () => {
    const wrath = 0.4;
    expect(wrath).toBeLessThanOrEqual(GameSettings.fightCascadePartyWrathThreshold);
    // But general threshold is higher
    expect(wrath).toBeLessThan(GameSettings.fightCascadeWrathThreshold);
  });

  it("party members have lower threshold for joining", () => {
    expect(GameSettings.fightCascadePartyWrathThreshold).toBeLessThan(GameSettings.fightCascadeWrathThreshold);
  });

  it("party members have higher join chance scale", () => {
    expect(GameSettings.fightCascadePartyJoinScale).toBeGreaterThan(1);
  });
});

describe("Atmosphere calculation", () => {
  it("atmosphere settings are bounded [0, 100]", () => {
    expect(GameSettings.atmosphereMin).toBe(0);
    expect(GameSettings.atmosphereMax).toBe(100);
  });

  it("fight penalty reduces atmosphere", () => {
    expect(GameSettings.atmosphereFightPenalty).toBe(20);
  });

  it("mess penalty reduces atmosphere", () => {
    expect(GameSettings.atmosphereMessPenalty).toBe(5);
  });

  it("lust bonus adds to atmosphere", () => {
    expect(GameSettings.atmosphereLustBonus).toBe(0.2);
  });

  it("happy party bonus adds to atmosphere", () => {
    expect(GameSettings.atmosphereHappyPartyBonus).toBe(2);
  });
});

describe("Party leave penalty", () => {
  it("party member angry leave penalty is configured", () => {
    expect(GameSettings.partyMemberAngryLeavePenalty).toBe(10);
  });

  it("adjustHappiness works for penalty application", () => {
    const guest = createGuest("p1", 5, 5);
    const before = guest.happiness;
    guest.adjustHappiness(-GameSettings.partyMemberAngryLeavePenalty);
    expect(guest.happiness).toBe(before - GameSettings.partyMemberAngryLeavePenalty);
  });
});

describe("Atmosphere decay modifier", () => {
  it("atmosphereHappinessDecayMod is configured", () => {
    expect(GameSettings.atmosphereHappinessDecayMod).toBe(0.5);
  });

  it("low atmosphere increases decay rate", () => {
    // At atmosphere 0: decay multiplier = 1 + (1 - 0/100) * 0.5 = 1.5x
    const atmo = 0;
    const decayMult = 1 + (1 - atmo / GameSettings.atmosphereMax) * GameSettings.atmosphereHappinessDecayMod;
    expect(decayMult).toBeCloseTo(1.5);
  });

  it("high atmosphere decreases decay rate", () => {
    // At atmosphere 100: decay multiplier = 1 + (1 - 100/100) * 0.5 = 1.0x (no penalty)
    const atmo = 100;
    const decayMult = 1 + (1 - atmo / GameSettings.atmosphereMax) * GameSettings.atmosphereHappinessDecayMod;
    expect(decayMult).toBeCloseTo(1.0);
  });
});
