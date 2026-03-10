import type { IPlayerStateData } from "../../Shared/PlayerTypes";
import type { IGuestStateData } from "../../Shared/GuestTypes";
import type { IApplianceStateData } from "../../Shared/ApplianceTypes";
import type { IItemStateData } from "../../Shared/ItemTypes";
import type { EDirection } from "../../Shared/TileTypes";
import type { UUID } from "./Communicator";

export const PACKET_TYPE = {
  CLIENT_CONNECTION: "client-connection",
  CLIENT_DISCONNECTED: "client-disconnected",
  CLIENT_MOVE: "client-move",
  CLIENT_STOP: "client-stop",
  CLIENT_INTERACT: "client-interact",
  CLIENT_JOIN_GAME: "client-join-game",
  CLIENT_LEAVE_GAME: "client-leave-game",
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
  };
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

export interface INetworkPacketClientJoinGame extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_JOIN_GAME"];
  data: {
    index: number;
  };
}

export interface INetworkPacketClientLeaveGame extends ITargetedNetworkPacket {
  type: (typeof PACKET_TYPE)["CLIENT_LEAVE_GAME"];
}
