export enum ETileZone {
  FLOOR = "floor",
  EMPLOYEE_ONLY = "employee_only",
  WALKING_LANE = "walking_lane",
  SEATING = "seating",
  WALL = "wall",
  ENTRANCE = "entrance",
  BAR_COUNTER = "bar_counter",
}

export enum EDirection {
  UP = "up",
  DOWN = "down",
  LEFT = "left",
  RIGHT = "right",
}

export interface ITile {
  x: number;
  y: number;
  zone: ETileZone;
  applianceId: string | null;
  occupantId: string | null;
  walkable: boolean;
}

export interface ITileGridState {
  width: number;
  height: number;
}
