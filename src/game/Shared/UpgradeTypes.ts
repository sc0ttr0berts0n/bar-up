export enum EUpgradeId {
  FAST_SINK = "fast_sink",
  STOCK_CAPACITY = "stock_capacity",
  EXTRA_QUEUE = "extra_queue",
  TRAY_STAND = "tray_stand",
  KITCHEN = "kitchen",
  GARNISH_STATION = "garnish_station",
  SHAKER = "shaker",
  JUKEBOX = "jukebox",
}

export interface IUpgradeLevel {
  cost: number;
  description: string;
}

export interface IUpgradeConfig {
  id: EUpgradeId;
  name: string;
  maxLevel: number;
  levels: IUpgradeLevel[];
}

export const UPGRADE_CONFIGS: IUpgradeConfig[] = [
  {
    id: EUpgradeId.FAST_SINK,
    name: "Fast Sink",
    maxLevel: 3,
    levels: [
      { cost: 150, description: "Wash 1.0s \u2192 0.8s" },
      { cost: 300, description: "Wash 0.8s \u2192 0.6s" },
      { cost: 500, description: "Wash 0.6s \u2192 0.4s" },
    ],
  },
  {
    id: EUpgradeId.STOCK_CAPACITY,
    name: "Stock Capacity",
    maxLevel: 3,
    levels: [
      { cost: 200, description: "+5 max stock" },
      { cost: 400, description: "+10 max stock" },
      { cost: 700, description: "+15 max stock" },
    ],
  },
  {
    id: EUpgradeId.EXTRA_QUEUE,
    name: "Extra Queue Slots",
    maxLevel: 2,
    levels: [
      { cost: 250, description: "7 \u2192 10 queue slots" },
      { cost: 500, description: "10 \u2192 13 queue slots" },
    ],
  },
  {
    id: EUpgradeId.TRAY_STAND,
    name: "Tray Stand",
    maxLevel: 2,
    levels: [
      { cost: 300, description: "Carry 2 items at once" },
      { cost: 600, description: "Carry 3 items at once" },
    ],
  },
  {
    id: EUpgradeId.KITCHEN,
    name: "Kitchen",
    maxLevel: 2,
    levels: [
      { cost: 400, description: "Unlock food service" },
      { cost: 800, description: "+50% food stock capacity" },
    ],
  },
  {
    id: EUpgradeId.GARNISH_STATION,
    name: "Garnish Station",
    maxLevel: 1,
    levels: [
      { cost: 500, description: "Unlock tier 2 cocktails" },
    ],
  },
  {
    id: EUpgradeId.SHAKER,
    name: "Shaker",
    maxLevel: 1,
    levels: [
      { cost: 600, description: "Unlock tier 3 cocktails" },
    ],
  },
  {
    id: EUpgradeId.JUKEBOX,
    name: "Jukebox",
    maxLevel: 2,
    levels: [
      { cost: 350, description: "+5 atmosphere bonus" },
      { cost: 700, description: "+10 atmosphere bonus" },
    ],
  },
];

export interface IUpgradeStateData {
  levels: Record<string, number>; // upgradeId → current level (0 = not purchased)
}
