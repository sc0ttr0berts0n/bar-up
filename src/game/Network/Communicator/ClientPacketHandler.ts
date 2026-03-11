import { z } from "zod";
import {
  type INetworkPacketClientInteract,
  type INetworkPacketClientGrab,
  type INetworkPacketClientSelect,
  type INetworkPacketClientJoinGame,
  type INetworkPacketClientLeaveGame,
  type INetworkPacketClientMove,
  type INetworkPacketClientStop,
  type INetworkPacketClientSetMenu,
  type INetworkPacketClientRestock,
  type ITargetedNetworkPacket,
  PACKET_TYPE,
} from "./PacketTypes";
import Server from "../Server/Server";
import { EDirection } from "../../Shared/TileTypes";

export class ClientPacketHandler {
  public static schemaBasePacket = z.object({
    uuid: z.string().uuid(),
    type: z.enum([
      Object.values(PACKET_TYPE)[0],
      ...Object.values(PACKET_TYPE).slice(1),
    ]),
  });

  private static _schemaMove = ClientPacketHandler.schemaBasePacket.extend({
    data: z.object({ direction: z.nativeEnum(EDirection) }),
  });

  private static _schemaJoinGame = ClientPacketHandler.schemaBasePacket.extend({
    data: z.object({ index: z.number().nonnegative().int() }),
  });

  private static _schemaLeaveGame = ClientPacketHandler.schemaBasePacket;
  private static _schemaInteract = ClientPacketHandler.schemaBasePacket;
  private static _schemaGrab = ClientPacketHandler.schemaBasePacket;
  private static _schemaSelect = ClientPacketHandler.schemaBasePacket.extend({
    data: z.object({ variantIndex: z.number().nonnegative().int() }),
  });
  private static _schemaStop = ClientPacketHandler.schemaBasePacket;
  private static _schemaSetMenu = ClientPacketHandler.schemaBasePacket.extend({
    data: z.object({
      drinkKey: z.string(),
      enabled: z.boolean(),
      price: z.number().min(1),
    }),
  });
  private static _schemaRestock = ClientPacketHandler.schemaBasePacket.extend({
    data: z.object({
      applianceId: z.string(),
    }),
  });

  static handle<T extends ITargetedNetworkPacket>(packet: T) {
    switch (packet.type) {
      case PACKET_TYPE.CLIENT_MOVE: {
        const validPacket = ClientPacketHandler._schemaMove.parse(
          packet,
        ) as INetworkPacketClientMove;
        ClientPacketHandler._handleMove(validPacket);
        break;
      }
      case PACKET_TYPE.CLIENT_STOP: {
        const validPacket = ClientPacketHandler._schemaStop.parse(
          packet,
        ) as INetworkPacketClientStop;
        ClientPacketHandler._handleStop(validPacket);
        break;
      }
      case PACKET_TYPE.CLIENT_INTERACT: {
        const validPacket = ClientPacketHandler._schemaInteract.parse(
          packet,
        ) as INetworkPacketClientInteract;
        ClientPacketHandler._handleInteract(validPacket);
        break;
      }
      case PACKET_TYPE.CLIENT_GRAB: {
        const validPacket = ClientPacketHandler._schemaGrab.parse(
          packet,
        ) as INetworkPacketClientGrab;
        ClientPacketHandler._handleGrab(validPacket);
        break;
      }
      case PACKET_TYPE.CLIENT_SELECT: {
        const validPacket = ClientPacketHandler._schemaSelect.parse(
          packet,
        ) as INetworkPacketClientSelect;
        ClientPacketHandler._handleSelect(validPacket);
        break;
      }
      case PACKET_TYPE.CLIENT_JOIN_GAME: {
        const validPacket = ClientPacketHandler._schemaJoinGame.parse(
          packet,
        ) as INetworkPacketClientJoinGame;
        ClientPacketHandler._handleJoinGame(validPacket);
        break;
      }
      case PACKET_TYPE.CLIENT_LEAVE_GAME: {
        const validPacket = ClientPacketHandler._schemaLeaveGame.parse(
          packet,
        ) as INetworkPacketClientLeaveGame;
        ClientPacketHandler._handleLeaveGame(validPacket);
        break;
      }
      case PACKET_TYPE.CLIENT_SET_MENU: {
        const validPacket = ClientPacketHandler._schemaSetMenu.parse(
          packet,
        ) as INetworkPacketClientSetMenu;
        ClientPacketHandler._handleSetMenu(validPacket);
        break;
      }
      case PACKET_TYPE.CLIENT_RESTOCK: {
        const validPacket = ClientPacketHandler._schemaRestock.parse(
          packet,
        ) as INetworkPacketClientRestock;
        ClientPacketHandler._handleRestock(validPacket);
        break;
      }
      default:
        return null;
    }
  }

  private static _handleMove(packet: INetworkPacketClientMove) {
    Server.game?.engine.moveBartender(packet.uuid, packet.data.direction);
  }

  private static _handleStop(packet: INetworkPacketClientStop) {
    Server.game?.engine.stopBartender(packet.uuid);
  }

  private static _handleInteract(packet: INetworkPacketClientInteract) {
    Server.game?.engine.bartenderInteract(packet.uuid);
  }

  private static _handleGrab(packet: INetworkPacketClientGrab) {
    Server.game?.engine.bartenderGrab(packet.uuid);
  }

  private static _handleSelect(packet: INetworkPacketClientSelect) {
    Server.game?.engine.bartenderSelect(packet.uuid, packet.data.variantIndex);
  }

  private static _handleJoinGame(packet: INetworkPacketClientJoinGame) {
    Server.game?.joinAsPlayer(packet.uuid, packet.data.index);
    Server.game?.leaveAsSpectator(packet.uuid);
  }

  private static _handleLeaveGame(packet: INetworkPacketClientLeaveGame) {
    Server.game?.leaveAsPlayerByUUID(packet.uuid);
    Server.game?.joinAsSpectator(packet.uuid);
  }

  private static _handleSetMenu(packet: INetworkPacketClientSetMenu) {
    Server.game?.engine.setMenuDrink(packet.data.drinkKey, packet.data.enabled, packet.data.price);
  }

  private static _handleRestock(packet: INetworkPacketClientRestock) {
    Server.game?.engine.restockAppliance(packet.data.applianceId);
  }
}
