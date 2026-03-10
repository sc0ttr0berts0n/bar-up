import { EApplianceType } from "./ApplianceTypes";
import { EItemType } from "./ItemTypes";

export interface IDrinkRecipe {
  name: string;
  resultType: EItemType;
  menuPrice: number;
  steps: IRecipeStep[];
}

export interface IRecipeStep {
  applianceType: EApplianceType;
  description: string;
}

export const RECIPES: Record<string, IDrinkRecipe> = {
  beer: {
    name: "Beer",
    resultType: EItemType.BEER,
    menuPrice: 5,
    steps: [
      {
        applianceType: EApplianceType.GLASS_SHELF,
        description: "Grab glass",
      },
      {
        applianceType: EApplianceType.DRAFT_SYSTEM,
        description: "Fill from tap",
      },
    ],
  },
  dram: {
    name: "Dram",
    resultType: EItemType.DRAM,
    menuPrice: 8,
    steps: [
      {
        applianceType: EApplianceType.GLASS_SHELF,
        description: "Grab glass",
      },
      {
        applianceType: EApplianceType.LIQUOR_RAIL,
        description: "Pour spirit",
      },
    ],
  },
};

/** Get the list of drink keys available on the menu */
export function getMenuDrinkKeys(): string[] {
  return Object.keys(RECIPES);
}
