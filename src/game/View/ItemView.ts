import { Container, Graphics, Text } from "pixi.js";
import type { IItemStateData } from "../Shared/ItemTypes";
import { EItemType } from "../Shared/ItemTypes";
import GameSettings from "../Shared/GameSettings";

const ITEM_ICONS: Record<EItemType, string> = {
  // Glass
  [EItemType.GLASS]: "🥛",
  // Beer variants
  [EItemType.PILSNER]: "🍺",
  [EItemType.LAGER]: "🍺",
  [EItemType.ALE]: "🍺",
  [EItemType.IPA]: "🍺",
  // Wine variants
  [EItemType.MERLOT]: "🍷",
  [EItemType.CHARDONNAY]: "🍷",
  [EItemType.PINOT_NOIR]: "🍷",
  [EItemType.ROSE]: "🍷",
  // Spirit variants
  [EItemType.WHISKEY]: "🥃",
  [EItemType.VODKA]: "🥃",
  [EItemType.GIN]: "🥃",
  [EItemType.RUM]: "🥃",
  // Mixed
  [EItemType.HIGHBALL]: "🍹",
  // Food
  [EItemType.PRETZELS]: "🥨",
  [EItemType.NACHOS]: "🧀",
  [EItemType.SLIDERS]: "🍔",
  // Other
  [EItemType.DIRTY_GLASS]: "💀",
  [EItemType.CUT_OFF_CARD]: "🚫",
  [EItemType.TRASH_BAG]: "🗑️",
};

export class ItemView extends Container {
  private _icon: Text;

  constructor() {
    super();

    this._icon = new Text({
      text: "",
      style: { fontSize: 12 },
    });
    this._icon.anchor.set(0.5);
    this.addChild(this._icon);
  }

  updateFromState(state: IItemStateData, tileSize: number) {
    this._icon.text = ITEM_ICONS[state.type] ?? "?";
  }
}
