import { EApplianceType } from "../../../Shared/ApplianceTypes";
import { EItemType } from "../../../Shared/ItemTypes";
import type { Appliance } from "./Appliance";
import type { Item } from "./Item";

export interface ICraftResult {
  newItemType: EItemType | null;
  pickUpNewItem: boolean;
  consumed: boolean;
}

export class DrinkCrafter {
  /**
   * Resolve an interaction between a held item (or empty hands) and an appliance.
   * Returns what should happen.
   */
  static resolveInteraction(
    heldItem: Item | null,
    appliance: Appliance,
  ): ICraftResult {
    const appType = appliance.type;

    // No held item — pick up from appliance
    if (!heldItem) {
      switch (appType) {
        case EApplianceType.GLASS_SHELF:
          return {
            newItemType: EItemType.EMPTY_GLASS,
            pickUpNewItem: true,
            consumed: false,
          };
        default:
          return { newItemType: null, pickUpNewItem: false, consumed: false };
      }
    }

    const itemType = heldItem.type;

    // Holding an empty glass
    if (itemType === EItemType.EMPTY_GLASS) {
      switch (appType) {
        case EApplianceType.DRAFT_SYSTEM:
          return {
            newItemType: EItemType.BEER,
            pickUpNewItem: false,
            consumed: false,
          };
        case EApplianceType.LIQUOR_RAIL:
          return {
            newItemType: EItemType.DRAM,
            pickUpNewItem: false,
            consumed: false,
          };
        default:
          return { newItemType: null, pickUpNewItem: false, consumed: false };
      }
    }

    // Holding a dirty glass
    if (itemType === EItemType.DIRTY_GLASS) {
      switch (appType) {
        case EApplianceType.SINK:
          return {
            newItemType: EItemType.EMPTY_GLASS,
            pickUpNewItem: false,
            consumed: false,
          };
        case EApplianceType.BIN:
          return {
            newItemType: null,
            pickUpNewItem: false,
            consumed: true,
          };
        default:
          return { newItemType: null, pickUpNewItem: false, consumed: false };
      }
    }

    return { newItemType: null, pickUpNewItem: false, consumed: false };
  }
}
