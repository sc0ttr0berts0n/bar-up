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
  private _currentStock: number;
  private _maxStock: number;
  private _restockCost: number;

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
    this._maxStock = config.stockCapacity;
    this._currentStock = config.stockCapacity;
    this._restockCost = config.restockCost;
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

  isFull(): boolean {
    return this._slots.every((s) => s !== null);
  }

  hasAnyItem(): boolean {
    return this._slots.some((s) => s !== null);
  }

  clearSlots(): string[] {
    const ids = this._slots.filter((s): s is string => s !== null);
    this._slots.fill(null);
    return ids;
  }

  hasOpenSeat(): boolean {
    return this._seatIds.some((s) => s === null);
  }

  getFirstOpenSeatIndex(): number {
    return this._seatIds.findIndex((s) => s === null);
  }

  getOpenSeatCount(): number {
    return this._seatIds.filter((s) => s === null).length;
  }

  getOpenSeatIndices(): number[] {
    return this._seatIds
      .map((s, i) => (s === null ? i : -1))
      .filter((i) => i >= 0);
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

  get currentStock() { return this._currentStock; }
  get maxStock() { return this._maxStock; }
  get restockCost() { return this._restockCost; }

  hasStock(): boolean {
    return this._maxStock === 0 || this._currentStock > 0;
  }

  depleteStock() {
    if (this._maxStock > 0 && this._currentStock > 0) {
      this._currentStock--;
    }
  }

  restock() {
    this._currentStock = this._maxStock;
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
      currentStock: this._currentStock,
      maxStock: this._maxStock,
    };
  }
}
