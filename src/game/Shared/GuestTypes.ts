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
  PICKY = "picky",
  GENEROUS = "generous",
}

/** 7 Deadly Sins / Virtues — continuous personality dimensions [0, 1].
 *  0 = virtue end, 1 = sin end. */
export interface IPersonality {
  wrath: number;     // 0 = patient, 1 = wrathful
  greed: number;     // 0 = generous, 1 = greedy
  gluttony: number;  // 0 = temperate, 1 = gluttonous
  sloth: number;     // 0 = diligent, 1 = slothful
  pride: number;     // 0 = humble, 1 = proud
  envy: number;      // 0 = kind, 1 = envious
  lust: number;      // 0 = reserved, 1 = lustful
}

/** Personality dimension names for iteration */
export const PERSONALITY_DIMENSIONS = ["wrath", "greed", "gluttony", "sloth", "pride", "envy", "lust"] as const;
export type PersonalityDimension = typeof PERSONALITY_DIMENSIONS[number];

/** Display info for personality dimensions */
export const PERSONALITY_DISPLAY: Record<PersonalityDimension, { virtue: string; sin: string; virtueIcon: string; sinIcon: string }> = {
  wrath:    { virtue: "Patient",   sin: "Wrathful",   virtueIcon: "\u{1F54A}", sinIcon: "\uD83D\uDD25" },
  greed:    { virtue: "Generous",  sin: "Greedy",     virtueIcon: "\uD83D\uDCB0", sinIcon: "\uD83E\uDD11" },
  gluttony: { virtue: "Temperate", sin: "Gluttonous", virtueIcon: "\u2696\uFE0F", sinIcon: "\uD83C\uDF54" },
  sloth:    { virtue: "Diligent",  sin: "Slothful",   virtueIcon: "\u2728",   sinIcon: "\uD83D\uDCA4" },
  pride:    { virtue: "Humble",    sin: "Proud",      virtueIcon: "\uD83D\uDE4F", sinIcon: "\uD83D\uDC51" },
  envy:     { virtue: "Kind",      sin: "Envious",    virtueIcon: "\uD83D\uDC9A", sinIcon: "\uD83D\uDC40" },
  lust:     { virtue: "Reserved",  sin: "Lustful",    virtueIcon: "\uD83E\uDDD8", sinIcon: "\uD83C\uDF39" },
};

/** Derive composite traits from personality floats */
export function deriveTraits(p: IPersonality, isDesignatedDriver: boolean = false): EGuestTrait[] {
  const traits: EGuestTrait[] = [];

  if (p.wrath > 0.6 && p.gluttony < 0.4) traits.push(EGuestTrait.IMPATIENT);
  if (p.greed < 0.3 && p.envy < 0.4) traits.push(EGuestTrait.GENEROUS);
  if (p.greed < 0.25 && p.pride > 0.6) traits.push(EGuestTrait.HIGHROLLER);
  if (p.gluttony < 0.25 && !isDesignatedDriver) traits.push(EGuestTrait.LIGHTWEIGHT);
  if (p.sloth < 0.3 && p.gluttony < 0.5) traits.push(EGuestTrait.CLEANLY);
  if (p.pride > 0.7 && p.sloth < 0.4) traits.push(EGuestTrait.PICKY);
  if (p.wrath > 0.7 && p.envy > 0.5) traits.push(EGuestTrait.VIOLENT);
  if (p.sloth > 0.6 && p.gluttony > 0.5) traits.push(EGuestTrait.MESSY);
  if (p.lust > 0.6 && p.pride < 0.5) traits.push(EGuestTrait.CHATTY);
  if (p.gluttony > 0.7 && p.wrath > 0.3) traits.push(EGuestTrait.LUSH);

  return traits;
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
  [EGuestTrait.PICKY]: { label: "Picky", icon: "\uD83E\uDDD0" },
  [EGuestTrait.GENEROUS]: { label: "Generous", icon: "\uD83D\uDC9D" },
};

export enum EGuestTier {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
}

export const TIER_DISPLAY: Record<EGuestTier, { label: string; color: string }> = {
  [EGuestTier.LOW]: { label: "Budget", color: "#888888" },
  [EGuestTier.NORMAL]: { label: "Regular", color: "#cccccc" },
  [EGuestTier.HIGH]: { label: "VIP", color: "#ffd700" },
};

/** @deprecated Conflicts are now handled by personality-based derivation — kept for test compatibility */
export const TRAIT_CONFLICTS: [EGuestTrait, EGuestTrait][] = [
  [EGuestTrait.LIGHTWEIGHT, EGuestTrait.LUSH],
  [EGuestTrait.MESSY, EGuestTrait.CLEANLY],
];

export interface IGuestOrder {
  drinkKey: string;
}

/** A single consumption slot — guests have 2 of these (drink + food, or two drinks, etc.) */
export interface IGuestSlot {
  /** Item type key occupying this slot (e.g. "pilsner", "burger"), or null if empty */
  itemType: string | null;
  /** Consumption progress 0..1, resets when slot is cleared */
  progress: number;
  /** Whether this slot contains food (false = drink or empty). Future use. */
  isFood: boolean;
}

/** Helper to create an empty guest slot */
export function emptySlot(): IGuestSlot {
  return { itemType: null, progress: 0, isFood: false };
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
  patience: number;
  happiness: number;
  roundsRemaining: number;
  seatApplianceId: string | null;
  seatApplianceGridX: number;
  seatApplianceGridY: number;
  seatIndex: number;
  /** @deprecated Use slots[0].progress instead — kept for backward compatibility */
  drinkProgress: number;
  statusTimer: number;
  drunkenness: number;
  drunkGoal: number;
  ordersCompleted: number;
  chatCount: number;
  chatAvailable: boolean;
  preferredDrink: string | null;
  preferenceRevealed: boolean;
  traitCount: number;
  revealedTraits: string[];
  queuePosition: number;
  carryingDirtyGlass: boolean;
  wasOverserved: boolean;
  lastCallDecision: string;
  isChugging: boolean;
  tier: EGuestTier;
  personality: IPersonality;
  isDesignatedDriver: boolean;
  /** Dual consumption slots — index 0 is primary (drink), index 1 is secondary (food/extra drink) */
  slots: [IGuestSlot, IGuestSlot];
}
