/** Special Events — random per-shift modifiers announced during prep phase. */

export enum ESpecialEvent {
  NONE = "none",
  HAPPY_HOUR = "happy_hour",
  VIP_NIGHT = "vip_night",
  TRIVIA_NIGHT = "trivia_night",
  HEALTH_INSPECTOR = "health_inspector",
  LIVE_MUSIC = "live_music",
  SPORTS_NIGHT = "sports_night",
}

export interface ISpecialEventConfig {
  id: ESpecialEvent;
  label: string;
  description: string;
  color: string;
  /** Weighted chance (higher = more likely). NONE has its own weight. */
  weight: number;
}

export const SPECIAL_EVENT_CONFIGS: Record<ESpecialEvent, ISpecialEventConfig> = {
  [ESpecialEvent.NONE]: {
    id: ESpecialEvent.NONE,
    label: "Normal Shift",
    description: "No special event tonight.",
    color: "#888888",
    weight: 0, // handled separately via noEventChance
  },
  [ESpecialEvent.HAPPY_HOUR]: {
    id: ESpecialEvent.HAPPY_HOUR,
    label: "Happy Hour",
    description: "Drink prices halved, guests arrive faster, everyone starts happier!",
    color: "#ffd93d",
    weight: 20,
  },
  [ESpecialEvent.VIP_NIGHT]: {
    id: ESpecialEvent.VIP_NIGHT,
    label: "VIP Night",
    description: "High-tier VIPs guaranteed. Big tips, but they demand quality drinks.",
    color: "#ffd700",
    weight: 15,
  },
  [ESpecialEvent.TRIVIA_NIGHT]: {
    id: ESpecialEvent.TRIVIA_NIGHT,
    label: "Trivia Night",
    description: "Guests stay longer and enjoy themselves more each round!",
    color: "#44ccff",
    weight: 20,
  },
  [ESpecialEvent.HEALTH_INSPECTOR]: {
    id: ESpecialEvent.HEALTH_INSPECTOR,
    label: "Health Inspector",
    description: "No messes allowed! Each mess = $50 fine. Clean shift = $200 bonus.",
    color: "#ff4444",
    weight: 10,
  },
  [ESpecialEvent.LIVE_MUSIC]: {
    id: ESpecialEvent.LIVE_MUSIC,
    label: "Live Music",
    description: "Everyone's happier! Lustful guests tip extra, but wrathful guests get restless.",
    color: "#cc66ff",
    weight: 20,
  },
  [ESpecialEvent.SPORTS_NIGHT]: {
    id: ESpecialEvent.SPORTS_NIGHT,
    label: "Sports Night",
    description: "Groups of 4, high gluttony crowd. More fights but more rounds ordered!",
    color: "#ff8844",
    weight: 15,
  },
};

/** Get all event configs that are actual events (not NONE) */
export function getActiveEventConfigs(): ISpecialEventConfig[] {
  return Object.values(SPECIAL_EVENT_CONFIGS).filter(c => c.id !== ESpecialEvent.NONE);
}
