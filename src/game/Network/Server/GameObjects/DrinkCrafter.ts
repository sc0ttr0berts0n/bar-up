import { EApplianceType } from "../../../Shared/ApplianceTypes";
import { EItemType } from "../../../Shared/ItemTypes";
import { SPIRIT_TYPES } from "../../../Shared/DrinkRecipes";
import type { Appliance } from "./Appliance";
import type { Item } from "./Item";

export interface ICraftResult {
  newItemType: EItemType | null;
  pickUpNewItem: boolean;
  consumed: boolean;
}

export class DrinkCrafter {
  /**
   * Resolve an interaction between a held item and an appliance.
   * NOTE: Draft/Liquor/Wine are now handled via sub-menu (bartenderSelect),
   * so they are excluded here.
   */
  static resolveInteraction(
    heldItem: Item | null,
    appliance: Appliance,
  ): ICraftResult {
    const appType = appliance.type;

    if (!heldItem) {
      return { newItemType: null, pickUpNewItem: false, consumed: false };
    }

    const itemType = heldItem.type;

    // Holding a spirit (any variant) — can mix into highball at ice well
    if (SPIRIT_TYPES.has(itemType)) {
      if (appType === EApplianceType.ICE_WELL) {
        return {
          newItemType: EItemType.HIGHBALL,
          pickUpNewItem: false,
          consumed: false,
        };
      }
      return { newItemType: null, pickUpNewItem: false, consumed: false };
    }

    // Holding a dirty glass — wash at sink (consumed)
    if (itemType === EItemType.DIRTY_GLASS) {
      if (appType === EApplianceType.SINK) {
        return {
          newItemType: null,
          pickUpNewItem: false,
          consumed: true,
        };
      }
      return { newItemType: null, pickUpNewItem: false, consumed: false };
    }

    return { newItemType: null, pickUpNewItem: false, consumed: false };
  }
}
