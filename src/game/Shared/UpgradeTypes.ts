export enum EUpgradeId {
  FAST_SINK = "fast_sink",
  STOCK_CAPACITY = "stock_capacity",
  EXTRA_QUEUE = "extra_queue",
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
];

export interface IUpgradeStateData {
  levels: Record<string, number>; // upgradeId → current level (0 = not purchased)
}
