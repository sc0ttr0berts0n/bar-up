import Singleton from "../../Utils/Singleton";
import Communicator, { type UUID } from "../Communicator/Communicator";
import { Game } from "./Game";
import { ClientPacketHandler } from "../Communicator/ClientPacketHandler";
import {
  type INetworkPacketServerMetadata,
  type ITargetedNetworkPacket,
  PACKET_TYPE,
} from "../Communicator/PacketTypes";
import config from "./server.settings";

class Server extends Singleton<Server>() {
  public game: Game | null = null;

  init() {
    this.game = new Game();
  }

  private _connect(uuid: UUID) {
    const packet: INetworkPacketServerMetadata = {
      type: PACKET_TYPE.SERVER_METADATA,
      uuid,
      data: {
        playerSlots: config.maxPlayers,
        gridWidth: config.gridWidth,
        gridHeight: config.gridHeight,
      },
    };
    this._send(packet);
  }

  private _disconnect(uuid: UUID) {
    this.game?.players.delete(uuid);
    this.game?.spectators.delete(uuid);
  }

  public receive(packet: unknown) {
    const validPacket = ClientPacketHandler.schemaBasePacket
      .passthrough()
      .parse(packet);
    switch (validPacket.type) {
      case PACKET_TYPE.CLIENT_CONNECTION: {
        this._connect(validPacket.uuid);
        break;
      }
      case PACKET_TYPE.CLIENT_DISCONNECTED: {
        this._disconnect(validPacket.uuid);
        break;
      }
      default: {
        ClientPacketHandler.handle(validPacket);
        break;
      }
    }
  }

  private _send<T extends ITargetedNetworkPacket>(packet: T): void {
    Communicator.sendToClient(packet);
  }
}

export default Server.getInstance();
