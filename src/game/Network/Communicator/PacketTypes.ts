import type { IPlayerStateData } from "../../Shared/PlayerTypes";
import type { IGuestStateData } from "../../Shared/GuestTypes";
import type { IApplianceStateData, EApplianceType } from "../../Shared/ApplianceTypes";
import type { IItemStateData } from "../../Shared/ItemTypes";
import type { IUpgradeStateData } from "../../Shared/UpgradeTypes";
import type { EDirection } from "../../Shared/TileTypes";
import type { UUID } from "./Communicator";

export const PACKET_TYPE = {
  CLIENT_CONNECTION: "client-connection",
  CLIENT_DISCONNECTED: "client-disconnected",
  CLIENT_MOVE: "client-move",
  CLIENT_STOP: "client-stop",
  CLIENT_INTERACT: "client-interact",
  CLIENT_GRAB: "client-grab",
  CLIENT_SELECT: "client-select",
  CLIENT_JOIN_GAME: "client-join-game",
  CLIENT_LEAVE_GAME: "client-leave-game",
  CLIENT_SET_MENU: "client-set-menu",
  CLIENT_RESTOCK: "client-restock",
  CLIENT_SKIP_PHASE: "client-skip-phase",
  CLIENT_EDIT_ENTER: "client-edit-enter",
  CLIENT_EDIT_EXIT: "client-edit-exit",
  CLIENT_EDIT_PICK_UP: "client-edit-pick-up",
  CLIENT_EDIT_PLACE: "client-edit-place",
  CLIENT_EDIT_CANCEL: "client-edit-cancel",
  CLIENT_UPGRADE_PURCHASE: "client-upgrade-purchase",
  SERVER_UPDATE: "server-update",
  SERVER_METADATA: "server-metadata",
} as const;

type PacketType = (typeof PACKET_TYPE)[keyof typeof PACKET_TYPE];

export interface INetworkPacket {
  type: PacketType;
}

export interface ITargetedNetworkPacket extends INetworkPacket {
  uuid: UUID;
}

export interface INetworkPacketConnection extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_CONNECTION"];
}

export interface INetworkPacketDisconnected extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_DISCONNECTED"];
}

export interface IEngineEvent {
  type: number;
  data: Record<string, unknown>;
  ttl: number;
  spawnId: number;
}

export enum EEngineEventType {
  DRINK_SERVED = 1,
  GUEST_SEATED = 2,
  GUEST_LEFT = 3,
  GUEST_HAPPY = 4,
  GUEST_UNHAPPY = 5,
  SHIFT_CHANGE = 6,
  MONEY_EARNED = 7,
  ITEM_PICKED_UP = 8,
  ITEM_CRAFTED = 9,
  GUEST_OVERSERVED = 10,
  BAR_FIGHT_STARTED = 11,
  BAR_FIGHT_RESOLVED = 12,
  GUEST_SLIPPED = 13,
  GUEST_HELPED_UP = 14,
  REPUTATION_CHANGE = 15,
  SHIFT_SUMMARY = 16,
  POLICE_WARNING = 17,
  POLICE_RAID = 18,
  LAST_CALL = 19,
  TIP_EARNED = 20,
  EXPENSE_DEDUCTED = 21,
}

export interface INetworkPacketServerUpdate extends INetworkPacket {
  type: (typeof PACKET_TYPE)["SERVER_UPDATE"];
  data: {
    players: IPlayerStateData[];
    guests: IGuestStateData[];
    appliances: IApplianceStateData[];
    items: IItemStateData[];
    events: IEngineEvent[];
    money: number;
    shiftPhase: string;
    shiftTimer: number;
    messes: { x: number; y: number }[];
    reputation: number;
    menuConfig: { drinkKey: string; enabled: boolean; price: number }[];
    policeAttention: number;
    isLastCall: boolean;
    isOvertime: boolean;
    editMode: IEditModeStateData | null;
    upgrades: IUpgradeStateData;
  };
}

export interface IEditModeStateData {
  active: boolean;
  heldApplianceId: string | null;
  heldApplianceType: EApplianceType | null;
  heldByUuid: string | null;
  previewX: number;
  previewY: number;
  placementValid: boolean;
}

export interface INetworkPacketServerMetadata extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["SERVER_METADATA"];
  data: {
    playerSlots: number;
    gridWidth: number;
    gridHeight: number;
  };
}

export interface INetworkPacketClientMove extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_MOVE"];
  data: {
    direction: EDirection;
  };
}

export interface INetworkPacketClientStop extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_STOP"];
}

export interface INetworkPacketClientInteract extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_INTERACT"];
}

export interface INetworkPacketClientGrab extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_GRAB"];
}

export interface INetworkPacketClientSelect extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_SELECT"];
  data: {
    variantIndex: number;
  };
}

export interface INetworkPacketClientJoinGame extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_JOIN_GAME"];
  data: {
    index: number;
  };
}

export interface INetworkPacketClientLeaveGame extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_LEAVE_GAME"];
}

export interface INetworkPacketClientSetMenu extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_SET_MENU"];
  data: {
    drinkKey: string;
    enabled: boolean;
    price: number;
  };
}

export interface INetworkPacketClientRestock extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_RESTOCK"];
  data: {
    applianceId: string;
  };
}

export interface INetworkPacketClientSkipPhase extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_SKIP_PHASE"];
}

// ── Edit Mode Packets ─────────────────────────────────────────

export interface INetworkPacketClientEditEnter extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_EDIT_ENTER"];
}

export interface INetworkPacketClientEditExit extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_EDIT_EXIT"];
  data: { commit: boolean };
}

export interface INetworkPacketClientEditPickUp extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_EDIT_PICK_UP"];
  data: { applianceId: string };
}

export interface INetworkPacketClientEditPlace extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_EDIT_PLACE"];
  data: { gridX: number; gridY: number };
}

export interface INetworkPacketClientEditCancel extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_EDIT_CANCEL"];
}

export interface INetworkPacketClientUpgradePurchase extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_UPGRADE_PURCHASE"];
  data: { upgradeId: string };
}
