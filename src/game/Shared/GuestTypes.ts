export enum EGuestStatus {
  WALKING_TO_SEAT = "walking_to_seat",
  DECIDING = "deciding",
  READY_TO_ORDER = "ready_to_order",
  WAITING_FOR_ORDER = "waiting_for_order",
  DRINKING = "drinking",
  LEAVING = "leaving",
}

export interface IGuestOrder {
  drinkKey: string;
}

export interface IGuestStateData {
  id: string;
  partyId: string;
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
  seatIndex: number;
  drinkProgress: number;
  statusTimer: number;
  drunkenness: number;
  ordersCompleted: number;
}
