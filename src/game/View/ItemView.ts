import { Container, Graphics, Text } from "pixi.js";
import type { IItemStateData } from "../Shared/ItemTypes";
import { EItemType } from "../Shared/ItemTypes";
import GameSettings from "../Shared/GameSettings";

const ITEM_ICONS: Record<EItemType, string> = {
  [EItemType.EMPTY_GLASS]: "🥃",
  [EItemType.BEER]: "🍺",
  [EItemType.DRAM]: "🥃",
  [EItemType.DIRTY_GLASS]: "💀",
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
