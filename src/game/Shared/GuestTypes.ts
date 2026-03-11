export enum EGuestStatus {
  WAITING_AT_DOOR = "waiting_at_door",
  WALKING_TO_SEAT = "walking_to_seat",
  DECIDING = "deciding",
  READY_TO_ORDER = "ready_to_order",
  WAITING_FOR_ORDER = "waiting_for_order",
  DRINKING = "drinking",
  WALKING_TO_QUEUE = "walking_to_queue",
  QUEUED = "queued",
  RETURNING_TO_SEAT = "returning_to_seat",
  FIGHTING = "fighting",
  SLIPPED = "slipped",
  LEAVING = "leaving",
}

export enum EGuestTrait {
  LIGHTWEIGHT = "lightweight",
  LUSH = "lush",
  VIOLENT = "violent",
  CHATTY = "chatty",
  MESSY = "messy",
  CLEANLY = "cleanly",
  IMPATIENT = "impatient",
  HIGHROLLER = "highroller",
}

/** Trait display info for HUD/view */
export const TRAIT_DISPLAY: Record<EGuestTrait, { label: string; icon: string }> = {
  [EGuestTrait.LIGHTWEIGHT]: { label: "Lightweight", icon: "\u{1FAB6}" },
  [EGuestTrait.LUSH]: { label: "Lush", icon: "\uD83C\uDF77" },
  [EGuestTrait.VIOLENT]: { label: "Violent", icon: "\uD83D\uDC4A" },
  [EGuestTrait.CHATTY]: { label: "Chatty", icon: "\uD83D\uDCAC" },
  [EGuestTrait.MESSY]: { label: "Messy", icon: "\uD83D\uDDD1\uFE0F" },
  [EGuestTrait.CLEANLY]: { label: "Cleanly", icon: "\u2728" },
  [EGuestTrait.IMPATIENT]: { label: "Impatient", icon: "\u23F0" },
  [EGuestTrait.HIGHROLLER]: { label: "Highroller", icon: "\uD83D\uDCB0" },
};

/** Conflicting trait pairs — never assign both to the same guest */
export const TRAIT_CONFLICTS: [EGuestTrait, EGuestTrait][] = [
  [EGuestTrait.LIGHTWEIGHT, EGuestTrait.LUSH],
  [EGuestTrait.MESSY, EGuestTrait.CLEANLY],
];

export interface IGuestOrder {
  drinkKey: string;
}

export interface IGuestStateData {
  id: string;
  partyId: string;
  name: string;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  moveProgress: number;
  status: EGuestStatus;
  order: IGuestOrder | null;
  happiness: number;
  roundsRemaining: number;
  seatApplianceId: string | null;
  seatApplianceGridX: number;
  seatApplianceGridY: number;
  seatIndex: number;
  drinkProgress: number;
  statusTimer: number;
  drunkenness: number;
  drunkGoal: number;
  ordersCompleted: number;
  chatCount: number;
  preferredDrink: string | null;
  preferenceRevealed: boolean;
  traitCount: number;
  revealedTraits: string[];
  queuePosition: number;
  carryingDirtyGlass: boolean;
}
