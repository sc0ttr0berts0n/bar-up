export enum EApplianceType {
  COUNTER = "counter",
  SERVICE_BAR = "service_bar",
  ICE_WELL = "ice_well",
  LIQUOR_RAIL = "liquor_rail",
  GLASS_SHELF = "glass_shelf",
  DRAFT_SYSTEM = "draft_system",
  SINK = "sink",
  BIN = "bin",
  HIGHTOP = "hightop",
  TABLE = "table",
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
}

/** Which side of the appliance is accessible for interaction */
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
}

export const APPLIANCE_CONFIGS: Record<EApplianceType, IApplianceConfig> = {
  [EApplianceType.COUNTER]: {
    type: EApplianceType.COUNTER,
    sizeX: 1,
    sizeY: 1,
    maxSlots: 1,
    maxSeats: 1,
    label: "Bar",
    color: 0xc4a35a,
  },
  [EApplianceType.SERVICE_BAR]: {
    type: EApplianceType.SERVICE_BAR,
    sizeX: 2,
    sizeY: 1,
    maxSlots: 8,
    maxSeats: 0,
    label: "Service",
    color: 0x8b7355,
  },
  [EApplianceType.ICE_WELL]: {
    type: EApplianceType.ICE_WELL,
    sizeX: 1,
    sizeY: 1,
    maxSlots: 0,
    maxSeats: 0,
    label: "ICE",
    color: 0x87ceeb,
  },
  [EApplianceType.LIQUOR_RAIL]: {
    type: EApplianceType.LIQUOR_RAIL,
    sizeX: 1,
    sizeY: 1,
    maxSlots: 8,
    maxSeats: 0,
    label: "Liquor",
    color: 0xdaa520,
  },
  [EApplianceType.GLASS_SHELF]: {
    type: EApplianceType.GLASS_SHELF,
    sizeX: 1,
    sizeY: 1,
    maxSlots: 40,
    maxSeats: 0,
    label: "Glass",
    color: 0xb0c4de,
  },
  [EApplianceType.DRAFT_SYSTEM]: {
    type: EApplianceType.DRAFT_SYSTEM,
    sizeX: 1,
    sizeY: 1,
    maxSlots: 8,
    maxSeats: 0,
    label: "Draft",
    color: 0xcd853f,
  },
  [EApplianceType.SINK]: {
    type: EApplianceType.SINK,
    sizeX: 1,
    sizeY: 1,
    maxSlots: 2,
    maxSeats: 0,
    label: "Sink",
    color: 0x708090,
  },
  [EApplianceType.BIN]: {
    type: EApplianceType.BIN,
    sizeX: 1,
    sizeY: 1,
    maxSlots: 20,
    maxSeats: 0,
    label: "BIN",
    color: 0x696969,
  },
  [EApplianceType.HIGHTOP]: {
    type: EApplianceType.HIGHTOP,
    sizeX: 1,
    sizeY: 1,
    maxSlots: 0,
    maxSeats: 4,
    label: "Hi-Top",
    color: 0x8b4513,
  },
  [EApplianceType.TABLE]: {
    type: EApplianceType.TABLE,
    sizeX: 1,
    sizeY: 1,
    maxSlots: 0,
    maxSeats: 4,
    label: "Table",
    color: 0xa0522d,
  },
};
