/**
 * Widget — config-driven appliance with behavior-on-the-object.
 *
 * Extends Appliance so it's a drop-in replacement: instanceof Appliance still
 * works, state serialization unchanged, rendering unchanged.
 *
 * Engine checks `instanceof Widget` first → delegates handleGrab/handleInteract;
 * otherwise falls back to old switch logic. Appliances get migrated one-by-one
 * until old code is dead.
 */
import { Appliance } from "./Appliance";
import type { Bartender } from "./Bartender";
import type { Item } from "./Item";
import { EItemType } from "../../../Shared/ItemTypes";
import type { IWidgetConfig } from "../../../Shared/WidgetTypes";

// ── Widget Context (narrow Engine interface) ───────────────

export interface IWidgetContext {
  createItem(type: EItemType): Item;
  deleteItem(id: string): void;
  getItem(id: string): Item | null;
  startTimedInteract(bartender: Bartender, duration: number, onComplete: () => void): void;
  pushEvent(type: string, data: Record<string, unknown>): void;
}

// ── Widget Class ───────────────────────────────────────────

export class Widget extends Appliance {
  private _widgetConfig: IWidgetConfig;

  constructor(config: IWidgetConfig, gridX: number, gridY: number) {
    super(config.type, gridX, gridY);
    this._widgetConfig = config;
    // Override Appliance defaults with Widget config values so slot/seat
    // counts match the Widget definition (not APPLIANCE_CONFIGS).
    (this as any)._maxSlots = config.topSlots;
    (this as any)._slots = new Array(config.topSlots).fill(null);
  }

  get widgetConfig(): IWidgetConfig {
    return this._widgetConfig;
  }

  /**
   * E key handler — grab/drop/source/trash.
   * Returns true if this widget handled the interaction.
   */
  handleGrab(bartender: Bartender, heldItem: Item | null, ctx: IWidgetContext): boolean {
    const config = this._widgetConfig;

    // ── Trash collect mode ──────────────────────────────────
    if (config.collectMode === "trash") {
      if (heldItem && heldItem.type !== EItemType.TRASH_BAG) {
        // Toss held item into bin (if room)
        if (this.hasOpenSlot()) {
          const slot = this.getFirstOpenSlotIndex();
          ctx.deleteItem(heldItem.id);
          this.setSlot(slot, "trash");
          bartender.setHeldItem(null, null);
        }
        return true;
      }
      if (!heldItem && this.hasAnyItem()) {
        // Pick up trash bag (clear all slots)
        this.clearSlots();
        const bag = ctx.createItem(EItemType.TRASH_BAG);
        bag.pickUp(bartender.id!);
        bartender.setHeldItem(bag.id, bag.type);
        return true;
      }
      // BIN always consumes the grab (even if nothing happened)
      return true;
    }

    // ── Source item (infinite spawn, empty-handed) ──────────
    if (config.sourceItem && !heldItem) {
      if (!this.hasStock()) return true; // out of stock, but handled
      const item = ctx.createItem(config.sourceItem);
      item.pickUp(bartender.id!);
      bartender.setHeldItem(item.id, item.type);
      this.depleteStock();
      return true;
    }

    // ── Return items to source ─────────────────────────────
    if (heldItem && config.returnableItems?.includes(heldItem.type)) {
      ctx.deleteItem(heldItem.id);
      bartender.setHeldItem(null, null);
      return true;
    }

    // ── Place item on top slot ─────────────────────────────
    if (config.topSlotMode !== "pick_only" && heldItem && this.hasOpenSlot()) {
      const slot = this.getFirstOpenSlotIndex();
      heldItem.placeOnAppliance(this.id, slot);
      this.setSlot(slot, heldItem.id);
      bartender.setHeldItem(null, null);
      return true;
    }

    // ── Pick up item from top slot ─────────────────────────
    if (config.topSlotMode !== "place_only" && !heldItem && this.hasAnyItem()) {
      const slots = this.state.slots;
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] !== null && slots[i] !== "trash") {
          const item = ctx.getItem(slots[i]!);
          if (item) {
            item.pickUp(bartender.id!);
            this.setSlot(i, null);
            bartender.setHeldItem(item.id, item.type);
            return true;
          }
        }
      }
    }

    return false; // Widget didn't handle — let Engine fall through
  }

  /**
   * Space key handler — craft/transform items.
   * Returns true if this widget handled the interaction.
   */
  handleInteract(bartender: Bartender, heldItem: Item | null, ctx: IWidgetContext): boolean {
    const config = this._widgetConfig;

    // ── Transforms ─────────────────────────────────────────
    if (config.transforms && heldItem) {
      for (const transform of config.transforms) {
        if (transform.input.includes(heldItem.type)) {
          if (!this.hasStock()) return true; // out of stock, but handled

          if (transform.duration && transform.duration > 0) {
            // Timed transform (like sink wash)
            const capturedItem = heldItem;
            const capturedTransform = transform;
            ctx.startTimedInteract(bartender, transform.duration, () => {
              if (capturedTransform.output === null) {
                // Consumed (wash)
                ctx.deleteItem(capturedItem.id);
                bartender.setHeldItem(null, null);
              } else {
                capturedItem.setType(capturedTransform.output);
                bartender.setHeldItem(capturedItem.id, capturedItem.type);
              }
              this.depleteStock();
            });
          } else {
            // Instant transform
            if (transform.output === null) {
              ctx.deleteItem(heldItem.id);
              bartender.setHeldItem(null, null);
            } else {
              heldItem.setType(transform.output);
              bartender.setHeldItem(heldItem.id, heldItem.type);
              ctx.pushEvent("item_crafted", { itemType: transform.output });
            }
            this.depleteStock();
          }
          return true;
        }
      }
    }

    // ── Storage variants — handled by bartenderSelect, not here ──
    return false;
  }

  /**
   * Compute seat offsets from per-edge config.
   * Returns [dx, dy] pairs in fractions of tileSize.
   */
  getSeatOffsets(): [number, number][] {
    const { seats } = this._widgetConfig;
    const offsets: [number, number][] = [];
    const d = 0.6;

    // North seats (spread across top edge)
    for (let i = 0; i < seats.north; i++) {
      const spread = seats.north > 1 ? (i / (seats.north - 1) - 0.5) * 0.8 : 0;
      offsets.push([spread, -d]);
    }
    // South seats
    for (let i = 0; i < seats.south; i++) {
      const spread = seats.south > 1 ? (i / (seats.south - 1) - 0.5) * 0.8 : 0;
      offsets.push([spread, d]);
    }
    // East seats
    for (let i = 0; i < seats.east; i++) {
      const spread = seats.east > 1 ? (i / (seats.east - 1) - 0.5) * 0.8 : 0;
      offsets.push([d, spread]);
    }
    // West seats
    for (let i = 0; i < seats.west; i++) {
      const spread = seats.west > 1 ? (i / (seats.west - 1) - 0.5) * 0.8 : 0;
      offsets.push([-d, spread]);
    }

    return offsets;
  }
}
