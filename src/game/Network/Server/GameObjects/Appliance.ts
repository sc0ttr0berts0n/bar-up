import {
  APPLIANCE_CONFIGS,
  EApplianceType,
  type IApplianceStateData,
} from "../../../Shared/ApplianceTypes";
import { Random } from "../../../Utils/Random";

export class Appliance {
  private _id: string;
  private _type: EApplianceType;
  private _gridX: number;
  private _gridY: number;
  private _sizeX: number;
  private _sizeY: number;
  private _slots: (string | null)[];
  private _maxSlots: number;
  private _seatIds: (string | null)[];
  private _maxSeats: number;

  constructor(type: EApplianceType, gridX: number, gridY: number) {
    const config = APPLIANCE_CONFIGS[type];
    this._id = Random.uuid();
    this._type = type;
    this._gridX = gridX;
    this._gridY = gridY;
    this._sizeX = config.sizeX;
    this._sizeY = config.sizeY;
    this._maxSlots = config.maxSlots;
    this._maxSeats = config.maxSeats;
    this._slots = new Array(this._maxSlots).fill(null);
    this._seatIds = new Array(this._maxSeats).fill(null);
  }

  get id() {
    return this._id;
  }
  get type() {
    return this._type;
  }
  get gridX() {
    return this._gridX;
  }
  get gridY() {
    return this._gridY;
  }
  get sizeX() {
    return this._sizeX;
  }
  get sizeY() {
    return this._sizeY;
  }
  get maxSeats() {
    return this._maxSeats;
  }

  hasOpenSlot(): boolean {
    return this._slots.some((s) => s === null);
  }

  getFirstOpenSlotIndex(): number {
    return this._slots.findIndex((s) => s === null);
  }

  setSlot(index: number, itemId: string | null) {
    if (index >= 0 && index < this._slots.length) {
      this._slots[index] = itemId;
    }
  }

  hasOpenSeat(): boolean {
    return this._seatIds.some((s) => s === null);
  }

  getFirstOpenSeatIndex(): number {
    return this._seatIds.findIndex((s) => s === null);
  }

  seatGuest(seatIndex: number, guestId: string) {
    if (seatIndex >= 0 && seatIndex < this._seatIds.length) {
      this._seatIds[seatIndex] = guestId;
    }
  }

  unseatGuest(guestId: string) {
    const idx = this._seatIds.indexOf(guestId);
    if (idx >= 0) this._seatIds[idx] = null;
  }

  get state(): IApplianceStateData {
    return {
      id: this._id,
      type: this._type,
      gridX: this._gridX,
      gridY: this._gridY,
      sizeX: this._sizeX,
      sizeY: this._sizeY,
      slots: [...this._slots],
      maxSlots: this._maxSlots,
      seatIds: this._seatIds.filter((s): s is string => s !== null),
      maxSeats: this._maxSeats,
    };
  }
}
