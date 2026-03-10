export enum EItemType {
  EMPTY_GLASS = "empty_glass",
  BEER = "beer",
  DRAM = "dram",
  DIRTY_GLASS = "dirty_glass",
}

/** Shared display info for items — used by both player and guest views */
export const ITEM_DISPLAY: Record<string, { label: string; color: number }> = {
  empty_glass: { label: "Glass", color: 0xcccccc },
  beer: { label: "Beer", color: 0xdaa520 },
  dram: { label: "Dram", color: 0x9966cc },
  dirty_glass: { label: "Dirty", color: 0x666666 },
};

export interface IItemStateData {
  id: string;
  type: EItemType;
  locationApplianceId: string | null;
  locationSlotIndex: number;
  heldByPlayerId: string | null;
}
