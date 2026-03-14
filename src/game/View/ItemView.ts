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
  // Wine extras
  [EItemType.PROSECCO]: "🍷",
  // Spirit extras
  [EItemType.TEQUILA]: "🥃",
  // Mixed / Cocktails
  [EItemType.HIGHBALL]: "🍹",
  [EItemType.GIN_TONIC]: "🍹",
  [EItemType.RUM_COLA]: "🍹",
  [EItemType.MARTINI_SHAKEN]: "🍸",
  [EItemType.OLD_FASHIONED_SHAKEN]: "🥃",
  [EItemType.MARGARITA_SHAKEN]: "🍹",
  [EItemType.LONG_ISLAND_BASE]: "🍹",
  [EItemType.LONG_ISLAND_SHAKEN]: "🍹",
  [EItemType.SPRITZ_MIX]: "🍹",
  [EItemType.SPRITZ]: "🍹",
  [EItemType.MARTINI]: "🍸",
  [EItemType.OLD_FASHIONED]: "🥃",
  [EItemType.MARGARITA]: "🍹",
  [EItemType.LONG_ISLAND]: "🍹",
  [EItemType.ESPRESSO_MARTINI]: "🍸",
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
