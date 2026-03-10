import { EItemType, type IItemStateData } from "../../../Shared/ItemTypes";
import { Random } from "../../../Utils/Random";

export class Item {
  private _id: string;
  private _type: EItemType;
  private _locationApplianceId: string | null = null;
  private _locationSlotIndex: number = -1;
  private _heldByPlayerId: string | null = null;

  constructor(type: EItemType) {
    this._id = Random.uuid();
    this._type = type;
  }

  get id() {
    return this._id;
  }
  get type() {
    return this._type;
  }
  get locationApplianceId() {
    return this._locationApplianceId;
  }
  get locationSlotIndex() {
    return this._locationSlotIndex;
  }
  get heldByPlayerId() {
    return this._heldByPlayerId;
  }

  setType(type: EItemType) {
    this._type = type;
  }

  placeOnAppliance(applianceId: string, slotIndex: number) {
    this._locationApplianceId = applianceId;
    this._locationSlotIndex = slotIndex;
    this._heldByPlayerId = null;
  }

  pickUp(playerId: string) {
    this._locationApplianceId = null;
    this._locationSlotIndex = -1;
    this._heldByPlayerId = playerId;
  }

  drop() {
    this._heldByPlayerId = null;
  }

  get state(): IItemStateData {
    return {
      id: this._id,
      type: this._type,
      locationApplianceId: this._locationApplianceId,
      locationSlotIndex: this._locationSlotIndex,
      heldByPlayerId: this._heldByPlayerId,
    };
  }
}
