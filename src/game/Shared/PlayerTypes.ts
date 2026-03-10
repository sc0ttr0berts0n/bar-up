import type { EDirection } from "./TileTypes";

export interface IPlayerStateData {
  id: string | null;
  number: number;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  moveProgress: number;
  facing: EDirection;
  heldItemId: string | null;
  heldItemType: string | null;
  isInteracting: boolean;
  interactProgress: number;
  color: number;
}

export const PLAYER_COLORS: number[] = [
  0x4ecdc4, // teal
  0xff6b6b, // coral
  0xffd93d, // yellow
  0x95e1d3, // mint
];
