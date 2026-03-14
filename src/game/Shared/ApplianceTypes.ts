export enum EApplianceType {
  COUNTER = "counter",
  SERVICE_BAR = "service_bar",
  ICE_WELL = "ice_well",
  LIQUOR_RAIL = "liquor_rail",
  GLASS_SHELF = "glass_shelf",
  DRAFT_SYSTEM = "draft_system",
  SINK = "sink",
  BIN = "bin",
  WINE_RACK = "wine_rack",
  CARD_HOLDER = "card_holder",
  SHAKER = "shaker",
  GARNISH_STATION = "garnish_station",
  HIGHTOP = "hightop",
  TABLE = "table",
  BAR_QUEUE = "bar_queue",
}

export interface IApplianceStateData {
  id: string;
  type: EApplianceType;
  gridX: number;
  gridY: number;
  sizeX: number;
  sizeY: number;
  slots: (string | null)[];
  maxSlots: number;
  seatIds: string[];
  maxSeats: number;
  currentStock: number;
  maxStock: number;
}

export enum EApplianceFacing {
  NORTH = "north",
  SOUTH = "south",
  EAST = "east",
  WEST = "west",
  ALL = "all",
}

export interface IApplianceConfig {
  type: EApplianceType;
  sizeX: number;
  sizeY: number;
  maxSlots: number;
  maxSeats: number;
  label: string;
  color: number;
  stockCapacity: number;
  restockCost: number;
}

export const APPLIANCE_CONFIGS: Record<EApplianceType, IApplianceConfig> = {
  [EApplianceType.COUNTER]: { type: EApplianceType.COUNTER, sizeX: 1, sizeY: 1, maxSlots: 1, maxSeats: 1, label: "Bar", color: 0xc4a35a, stockCapacity: 0, restockCost: 0 },
  [EApplianceType.SERVICE_BAR]: { type: EApplianceType.SERVICE_BAR, sizeX: 2, sizeY: 1, maxSlots: 8, maxSeats: 0, label: "Service", color: 0x8b7355, stockCapacity: 0, restockCost: 0 },
  [EApplianceType.ICE_WELL]: { type: EApplianceType.ICE_WELL, sizeX: 1, sizeY: 1, maxSlots: 0, maxSeats: 0, label: "ICE", color: 0x87ceeb, stockCapacity: 20, restockCost: 5 },
  [EApplianceType.LIQUOR_RAIL]: { type: EApplianceType.LIQUOR_RAIL, sizeX: 1, sizeY: 1, maxSlots: 8, maxSeats: 0, label: "Liquor", color: 0xdaa520, stockCapacity: 20, restockCost: 15 },
  [EApplianceType.GLASS_SHELF]: { type: EApplianceType.GLASS_SHELF, sizeX: 1, sizeY: 1, maxSlots: 40, maxSeats: 0, label: "Glass", color: 0xb0c4de, stockCapacity: 30, restockCost: 10 },
  [EApplianceType.DRAFT_SYSTEM]: { type: EApplianceType.DRAFT_SYSTEM, sizeX: 1, sizeY: 1, maxSlots: 8, maxSeats: 0, label: "Draft", color: 0xcd853f, stockCapacity: 20, restockCost: 10 },
  [EApplianceType.SINK]: { type: EApplianceType.SINK, sizeX: 1, sizeY: 1, maxSlots: 2, maxSeats: 0, label: "Sink", color: 0x708090, stockCapacity: 0, restockCost: 0 },
  [EApplianceType.BIN]: { type: EApplianceType.BIN, sizeX: 1, sizeY: 1, maxSlots: 3, maxSeats: 0, label: "BIN", color: 0x696969, stockCapacity: 0, restockCost: 0 },
  [EApplianceType.WINE_RACK]: { type: EApplianceType.WINE_RACK, sizeX: 1, sizeY: 1, maxSlots: 8, maxSeats: 0, label: "Wine", color: 0x722f37, stockCapacity: 20, restockCost: 12 },
  [EApplianceType.CARD_HOLDER]: { type: EApplianceType.CARD_HOLDER, sizeX: 1, sizeY: 1, maxSlots: 0, maxSeats: 0, label: "Cards", color: 0xff4444, stockCapacity: 0, restockCost: 0 },
  [EApplianceType.SHAKER]: { type: EApplianceType.SHAKER, sizeX: 1, sizeY: 1, maxSlots: 0, maxSeats: 0, label: "Shaker", color: 0xc0c0c0, stockCapacity: 0, restockCost: 0 },
  [EApplianceType.GARNISH_STATION]: { type: EApplianceType.GARNISH_STATION, sizeX: 1, sizeY: 1, maxSlots: 0, maxSeats: 0, label: "Garnish", color: 0x60a040, stockCapacity: 15, restockCost: 8 },
  [EApplianceType.HIGHTOP]: { type: EApplianceType.HIGHTOP, sizeX: 1, sizeY: 1, maxSlots: 0, maxSeats: 4, label: "Hi-Top", color: 0x8b4513, stockCapacity: 0, restockCost: 0 },
  [EApplianceType.TABLE]: { type: EApplianceType.TABLE, sizeX: 1, sizeY: 1, maxSlots: 0, maxSeats: 4, label: "Table", color: 0xa0522d, stockCapacity: 0, restockCost: 0 },
  [EApplianceType.BAR_QUEUE]: { type: EApplianceType.BAR_QUEUE, sizeX: 3, sizeY: 1, maxSlots: 6, maxSeats: 0, label: "Queue", color: 0xb8860b, stockCapacity: 0, restockCost: 0 },
};

export const SEAT_OFFSETS: Partial<Record<EApplianceType, [number, number][]>> = {
  [EApplianceType.COUNTER]: [[0, 0.6]],
  [EApplianceType.HIGHTOP]: [[0, -0.6], [0.6, 0], [0, 0.6], [-0.6, 0]],
  [EApplianceType.TABLE]: [[0, -0.6], [0.6, 0], [0, 0.6], [-0.6, 0]],
};
