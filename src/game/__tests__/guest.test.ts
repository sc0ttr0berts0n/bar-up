/**
 * Guest unit tests — state transitions, patience, happiness, drunkenness, traits.
 */
import { describe, it, expect } from "vitest";
import { Guest } from "../Network/Server/GameObjects/Guest";
import { EGuestStatus, EGuestTrait } from "../Shared/GuestTypes";
import GameSettings from "../Shared/GameSettings";

function createGuest(status?: EGuestStatus): Guest {
  const guest = new Guest("test-party", 5, 14);
  if (status) (guest as any)._status = status;
  return guest;
}

describe("Guest construction", () => {
  it("creates with default values", () => {
    const guest = createGuest();
    expect(guest.id).toBeTruthy();
    expect(guest.partyId).toBe("test-party");
    expect(guest.gridX).toBe(5);
    expect(guest.gridY).toBe(14);
    expect(guest.patience).toBe(GameSettings.patienceStarting);
    expect(guest.happiness).toBe(GameSettings.happinessStarting);
    expect(guest.drunkenness).toBe(0);
  });

  it("has a name", () => {
    const guest = createGuest();
    expect(guest.name).toBeTruthy();
    expect(typeof guest.name).toBe("string");
  });

  it("has rounds remaining", () => {
    const guest = createGuest();
    expect(guest.roundsRemaining).toBeGreaterThanOrEqual(1);
    expect(guest.roundsRemaining).toBeLessThanOrEqual(3);
  });
});

describe("Guest patience", () => {
  it("starts at configured value", () => {
    const guest = createGuest();
    expect(guest.patience).toBe(GameSettings.patienceStarting);
  });

  it("can be adjusted", () => {
    const guest = createGuest();
    const before = guest.patience;
    guest.adjustPatience(-10);
    expect(guest.patience).toBe(before - 10);
  });

  it("clamps to 0 minimum", () => {
    const guest = createGuest();
    guest.adjustPatience(-9999);
    expect(guest.patience).toBeGreaterThanOrEqual(0);
  });

  it("clamps to 100 maximum", () => {
    const guest = createGuest();
    guest.adjustPatience(9999);
    expect(guest.patience).toBeLessThanOrEqual(100);
  });
});

describe("Guest happiness", () => {
  it("starts at configured value", () => {
    const guest = createGuest();
    expect(guest.happiness).toBe(GameSettings.happinessStarting);
  });

  it("can be adjusted", () => {
    const guest = createGuest();
    const before = guest.happiness;
    guest.adjustHappiness(10);
    expect(guest.happiness).toBe(before + 10);
  });

  it("clamps to 0 minimum", () => {
    const guest = createGuest();
    guest.adjustHappiness(-9999);
    expect(guest.happiness).toBeGreaterThanOrEqual(0);
  });

  it("clamps to 100 maximum", () => {
    const guest = createGuest();
    guest.adjustHappiness(9999);
    expect(guest.happiness).toBeLessThanOrEqual(100);
  });
});

describe("Guest status", () => {
  it("can set status", () => {
    const guest = createGuest();
    guest.setStatus(EGuestStatus.DECIDING);
    expect(guest.status).toBe(EGuestStatus.DECIDING);
  });

  it("can set order", () => {
    const guest = createGuest(EGuestStatus.WAITING_FOR_ORDER);
    guest.setOrder({ drinkKey: "pilsner" });
    expect(guest.order).toBeTruthy();
    expect(guest.order!.drinkKey).toBe("pilsner");
  });

  it("can clear order", () => {
    const guest = createGuest(EGuestStatus.WAITING_FOR_ORDER);
    guest.setOrder({ drinkKey: "pilsner" });
    guest.clearOrder();
    expect(guest.order).toBeNull();
  });

  it("can set seat", () => {
    const guest = createGuest();
    guest.setSeat("appliance-1", 0, 5, 3);
    expect((guest as any)._seatApplianceId).toBe("appliance-1");
    expect((guest as any)._seatIndex).toBe(0);
  });
});

describe("Guest drunkenness", () => {
  it("starts at 0", () => {
    const guest = createGuest();
    expect(guest.drunkenness).toBe(0);
  });

  it("can be set directly", () => {
    const guest = createGuest();
    (guest as any)._drunkenness = 0.5;
    expect(guest.drunkenness).toBe(0.5);
  });

  it("overserve flag works", () => {
    const guest = createGuest();
    expect((guest as any)._wasOverserved).toBeFalsy();
    guest.setOverserved();
    expect((guest as any)._wasOverserved).toBe(true);
  });
});

describe("Guest traits", () => {
  it("starts with no traits", () => {
    const guest = createGuest();
    expect(guest.traits.length).toBe(0);
  });

  it("can set traits", () => {
    const guest = createGuest();
    guest.setTraits([EGuestTrait.LIGHTWEIGHT, EGuestTrait.CHATTY]);
    expect(guest.hasTrait(EGuestTrait.LIGHTWEIGHT)).toBe(true);
    expect(guest.hasTrait(EGuestTrait.CHATTY)).toBe(true);
    expect(guest.hasTrait(EGuestTrait.VIOLENT)).toBe(false);
  });
});

describe("Guest rounds", () => {
  it("decrements rounds", () => {
    const guest = createGuest();
    const before = guest.roundsRemaining;
    guest.decrementRounds();
    expect(guest.roundsRemaining).toBe(before - 1);
  });
});

describe("Guest state serialization", () => {
  it("returns serializable state", () => {
    const guest = createGuest(EGuestStatus.WAITING_FOR_ORDER);
    guest.setOrder({ drinkKey: "pilsner" });
    const state = guest.state;
    expect(state.id).toBe(guest.id);
    expect(state.status).toBe(EGuestStatus.WAITING_FOR_ORDER);
    expect(state.order?.drinkKey).toBe("pilsner");
    expect(typeof state.patience).toBe("number");
    expect(typeof state.happiness).toBe("number");
    expect(typeof state.drunkenness).toBe("number");
  });
});
