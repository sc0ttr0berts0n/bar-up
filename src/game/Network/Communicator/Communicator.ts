import Peer, { type DataConnection } from "peerjs";
import Singleton from "../../Utils/Singleton";
import {
  type INetworkPacket,
  type INetworkPacketServerMetadata,
  type INetworkPacketServerUpdate,
  type ITargetedNetworkPacket,
  PACKET_TYPE,
} from "./PacketTypes";
import Server from "../Server/Server";
import { ServerPacketHandler } from "./ServerPacketHandler";
import config from "../Server/server.settings";

export enum EHost {
  NONE,
  LOCAL,
  REMOTE,
}

export type UUID = string;

class Communicator extends Singleton<Communicator>() {
  public hostType = EHost.NONE;
  public uuid = window.crypto.randomUUID();
  public peer = new Peer(this.uuid, { debug: 2 });
  private _state: INetworkPacketServerUpdate | null = null;
  private _hostPeerID: string | null = null;
  public peerConnections: Map<UUID, DataConnection> | null = null;
  public hostConnection: DataConnection | null = null;
  public playerSlots = 0;
  public gridWidth = 0;
  public gridHeight = 0;

  public set state(val: INetworkPacketServerUpdate) {
    this._state = val;
  }
  public get state(): INetworkPacketServerUpdate | null {
    return this._state;
  }

  connect(opts: { choice: EHost; peerID?: string }) {
    if (this.hostType !== EHost.NONE) {
      return console.error("Disconnect First");
    }

    this.hostType = opts.choice;

    switch (opts.choice) {
      case EHost.LOCAL:
        Server.init();
        Server.receive({
          uuid: this.uuid,
          type: PACKET_TYPE.CLIENT_CONNECTION,
        });
        Server.game?.joinAsSpectator(this.uuid);
        this.playerSlots = config.maxPlayers ?? 0;

        this.peer.on("connection", (conn) => {
          conn.on("open", () => {
            if (!this.peerConnections) {
              this.peerConnections = new Map();
            }
            this.peerConnections.set(conn.peer, conn);
            Server.game?.joinAsSpectator(conn.peer);
            this._sendToPeer<INetworkPacketServerMetadata>({
              uuid: conn.peer,
              type: PACKET_TYPE.SERVER_METADATA,
              data: {
                playerSlots: this.playerSlots,
                gridWidth: config.gridWidth,
                gridHeight: config.gridHeight,
              },
            });
            conn.on("data", (inboundData: unknown) => {
              Server.receive(inboundData);
            });
          });
        });

        this.peer.on("disconnected", (uuid: string) => {
          Server.receive({
            uuid,
            type: PACKET_TYPE.CLIENT_DISCONNECTED,
          });
          Server.game?.leaveAsSpectator(uuid);
        });

        break;

      case EHost.REMOTE:
        if (!opts.peerID) break;
        this._hostPeerID = opts.peerID;
        this.hostConnection = this.peer.connect(opts.peerID);
        this.hostConnection.on("open", () => {
          this.hostConnection!.send({
            uuid: this.uuid,
            type: PACKET_TYPE.CLIENT_CONNECTION,
          });
          this.hostConnection!.on("data", (data: unknown) => {
            const cleanedPacket = ServerPacketHandler.schemaBasePacket
              .passthrough()
              .parse(data);
            ServerPacketHandler.handle(cleanedPacket);
          });
          this.hostConnection!.on("close", () => {
            this.reconnectToHost();
          });
          const _healthCheck = setInterval(() => {
            if (this.hostType !== EHost.REMOTE) {
              clearInterval(_healthCheck);
              return;
            }
            if (!this.hostConnection?.open) {
              clearInterval(_healthCheck);
              this.reconnectToHost();
            }
          }, 500);
        });
        break;

      case EHost.NONE:
        throw new Error('Cannot connect to host type "NONE"');
    }
  }

  disconnect() {
    this.hostType = EHost.NONE;
  }

  reconnectToHost() {
    const peerID = this._hostPeerID;
    if (!peerID) return;
    this._state = null;
    this.hostType = EHost.NONE;
    this.hostConnection = null;
    setTimeout(() => this.connect({ choice: EHost.REMOTE, peerID }), 200);
  }

  sendToServer<T extends ITargetedNetworkPacket>(packet: T) {
    switch (this.hostType) {
      case EHost.REMOTE:
        if (!this.hostConnection) {
          throw new Error("Host Connection undefined");
        }
        if (this.hostConnection.open) {
          this.hostConnection.send(packet);
        }
        break;
      case EHost.LOCAL:
        Server.receive(packet);
        break;
      case EHost.NONE:
        return;
    }
  }

  emit(state: INetworkPacketServerUpdate) {
    switch (this.hostType) {
      case EHost.REMOTE:
        break;
      case EHost.LOCAL:
        this.state = state;
        return this._sendToAllPeers(state);
      case EHost.NONE:
        return;
    }
  }

  sendToClient<T extends ITargetedNetworkPacket>(packet: T) {
    switch (this.hostType) {
      case EHost.REMOTE:
        break;
      case EHost.LOCAL:
        this._sendToPeer(packet);
        break;
      case EHost.NONE:
        return;
    }
  }

  private _sendToPeer<T extends ITargetedNetworkPacket>(packet: T) {
    this.peerConnections?.get(packet.uuid)?.send(packet);
  }

  private _sendToAllPeers<T extends INetworkPacket>(packet: T) {
    this.peerConnections?.forEach((conn) => {
      conn.send(packet);
    });
  }
}

export default Communicator.getInstance();
