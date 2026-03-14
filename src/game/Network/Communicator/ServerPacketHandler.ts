import { z } from "zod";
import {
  type INetworkPacket,
  type INetworkPacketServerMetadata,
  type INetworkPacketServerUpdate,
  PACKET_TYPE,
} from "./PacketTypes";
import Communicator from "./Communicator";
import { EGuestStatus, EGuestTier } from "../../Shared/GuestTypes";
import { EDirection } from "../../Shared/TileTypes";
import { EApplianceType } from "../../Shared/ApplianceTypes";
import { EItemType } from "../../Shared/ItemTypes";

export class ServerPacketHandler {
  public static schemaBasePacket = z.object({
    uuid: z.string().uuid().optional(),
    type: z.enum([
      Object.values(PACKET_TYPE)[0],
      ...Object.values(PACKET_TYPE).slice(1),
    ]),
  });

  private static _playerSchema = z.object({
    id: z.union([z.string().uuid(), z.null()]),
    number: z.number(),
    gridX: z.number(),
    gridY: z.number(),
    targetX: z.number(),
    targetY: z.number(),
    moveProgress: z.number(),
    facing: z.nativeEnum(EDirection),
    heldItemId: z.union([z.string(), z.null()]),
    heldItemType: z.union([z.string(), z.null()]),
    isInteracting: z.boolean(),
    interactProgress: z.number(),
    color: z.number(),
  });

  private static _guestSchema = z.object({
    id: z.string(),
    partyId: z.string(),
    name: z.string(),
    gridX: z.number(),
    gridY: z.number(),
    targetX: z.number(),
    targetY: z.number(),
    moveProgress: z.number(),
    status: z.nativeEnum(EGuestStatus),
    order: z.union([z.object({ drinkKey: z.string() }), z.null()]),
    patience: z.number(),
    happiness: z.number(),
    roundsRemaining: z.number(),
    seatApplianceId: z.union([z.string(), z.null()]),
    seatApplianceGridX: z.number(),
    seatApplianceGridY: z.number(),
    seatIndex: z.number(),
    drinkProgress: z.number(),
    statusTimer: z.number(),
    drunkenness: z.number(),
    drunkGoal: z.number(),
    ordersCompleted: z.number(),
    chatCount: z.number(),
    chatAvailable: z.boolean(),
    preferredDrink: z.union([z.string(), z.null()]),
    preferenceRevealed: z.boolean(),
    traitCount: z.number(),
    revealedTraits: z.array(z.string()),
    queuePosition: z.number(),
    carryingDirtyGlass: z.boolean(),
    wasOverserved: z.boolean(),
    lastCallDecision: z.string(),
    isChugging: z.boolean(),
    tier: z.nativeEnum(EGuestTier),
    personality: z.object({
      wrath: z.number(),
      greed: z.number(),
      gluttony: z.number(),
      sloth: z.number(),
      pride: z.number(),
      envy: z.number(),
      lust: z.number(),
    }),
    isDesignatedDriver: z.boolean(),
    slots: z.tuple([
      z.object({ itemType: z.union([z.string(), z.null()]), progress: z.number(), isFood: z.boolean() }),
      z.object({ itemType: z.union([z.string(), z.null()]), progress: z.number(), isFood: z.boolean() }),
    ]),
  });

  private static _applianceSchema = z.object({
    id: z.string(),
    type: z.nativeEnum(EApplianceType),
    gridX: z.number(),
    gridY: z.number(),
    sizeX: z.number(),
    sizeY: z.number(),
    slots: z.array(z.union([z.string(), z.null()])),
    maxSlots: z.number(),
    seatIds: z.array(z.string()),
    maxSeats: z.number(),
    currentStock: z.number(),
    maxStock: z.number(),
  });

  private static _itemSchema = z.object({
    id: z.string(),
    type: z.nativeEnum(EItemType),
    locationApplianceId: z.union([z.string(), z.null()]),
    locationSlotIndex: z.number(),
    heldByPlayerId: z.union([z.string(), z.null()]),
  });

  private static _schemaServerMetadata = z.object({
    type: z.literal("server-metadata"),
    uuid: z.string().uuid(),
    data: z.object({
      playerSlots: z.number().nonnegative().int(),
      gridWidth: z.number().nonnegative().int(),
      gridHeight: z.number().nonnegative().int(),
    }),
  });

  private static _schemaServerUpdate = z.object({
    type: z.literal("server-update"),
    data: z.object({
      players: z.array(ServerPacketHandler._playerSchema),
      guests: z.array(ServerPacketHandler._guestSchema),
      appliances: z.array(ServerPacketHandler._applianceSchema),
      items: z.array(ServerPacketHandler._itemSchema),
      events: z.array(
        z.object({
          type: z.number(),
          data: z.any(),
          ttl: z.number().optional(),
          spawnId: z.number(),
        }),
      ),
      money: z.number(),
      shiftPhase: z.string(),
      shiftTimer: z.number(),
      messes: z.array(z.object({ x: z.number(), y: z.number() })),
      reputation: z.number(),
      menuConfig: z.array(z.object({ drinkKey: z.string(), enabled: z.boolean(), price: z.number() })),
      policeAttention: z.number(),
      isLastCall: z.boolean(),
      isOvertime: z.boolean(),
      atmosphere: z.number(),
      editMode: z.union([
        z.object({
          active: z.boolean(),
          heldApplianceId: z.union([z.string(), z.null()]),
          heldApplianceType: z.union([z.nativeEnum(EApplianceType), z.null()]),
          heldByUuid: z.union([z.string(), z.null()]),
          previewX: z.number(),
          previewY: z.number(),
          placementValid: z.boolean(),
        }),
        z.null(),
      ]),
      upgrades: z.object({
        levels: z.record(z.string(), z.number()),
      }),
    }),
  });

  static handle<T extends INetworkPacket>(packet: T) {
    switch (packet.type) {
      case PACKET_TYPE.SERVER_METADATA: {
        const result =
          ServerPacketHandler._schemaServerMetadata.safeParse(packet);
        if (!result.success) {
          console.warn(
            "[ServerPacketHandler] Invalid SERVER_METADATA packet:",
            result.error,
          );
          break;
        }
        ServerPacketHandler._handleMetadata(
          result.data as INetworkPacketServerMetadata,
        );
        break;
      }
      case PACKET_TYPE.SERVER_UPDATE: {
        const result =
          ServerPacketHandler._schemaServerUpdate.safeParse(packet);
        if (!result.success) {
          console.warn(
            "[ServerPacketHandler] Invalid SERVER_UPDATE packet:",
            result.error,
          );
          break;
        }
        ServerPacketHandler._handleServerUpdate(
          result.data as INetworkPacketServerUpdate,
        );
        break;
      }
      default:
        return null;
    }
  }

  private static _handleServerUpdate(packet: INetworkPacketServerUpdate) {
    Communicator.state = packet;
  }

  private static _handleMetadata(packet: INetworkPacketServerMetadata) {
    Communicator.playerSlots = packet.data.playerSlots;
    Communicator.gridWidth = packet.data.gridWidth;
    Communicator.gridHeight = packet.data.gridHeight;
  }
}
