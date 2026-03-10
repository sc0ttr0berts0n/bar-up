import { Container, Ticker } from "pixi.js";
import GameSettings from "../Shared/GameSettings";
import { TileGridView } from "./TileGridView";
import { ApplianceView } from "./ApplianceView";
import { DEFAULT_BAR_LAYOUT } from "../Shared/BarLayout";
import { APPLIANCE_CONFIGS } from "../Shared/ApplianceTypes";

export class Level extends Container {
  private _scaleContainer = new Container();
  private _entityContainer = new Container();
  private _tileGridView: TileGridView;
  private _applianceViews: ApplianceView[] = [];

  public get entityContainer() {
    return this._entityContainer;
  }

  constructor() {
    super();

    this._scaleContainer.label = "Scale Container";
    this._entityContainer.label = "Entity Container";

    this.addChild(this._scaleContainer);

    // Create tile grid
    const layout = DEFAULT_BAR_LAYOUT;
    this._tileGridView = new TileGridView(
      layout.width,
      layout.height,
      GameSettings.tileSize,
      layout.zones,
    );
    this._scaleContainer.addChild(this._tileGridView);

    // Create appliance visuals
    for (const placement of layout.appliances) {
      const config = APPLIANCE_CONFIGS[placement.type];
      const view = new ApplianceView(
        config,
        placement.gridX,
        placement.gridY,
        GameSettings.tileSize,
      );
      this._scaleContainer.addChild(view);
      this._applianceViews.push(view);
    }

    // Entity container goes on top
    this._scaleContainer.addChild(this._entityContainer);

    // Center the level in the viewport
    this._centerLevel();
  }

  private _centerLevel() {
    const totalWidth = DEFAULT_BAR_LAYOUT.width * GameSettings.tileSize;
    const totalHeight = DEFAULT_BAR_LAYOUT.height * GameSettings.tileSize;

    // Scale to fit window with some padding
    const padding = 40;
    const scaleX = (window.innerWidth - padding * 2) / totalWidth;
    const scaleY = (window.innerHeight - padding * 2) / totalHeight;
    const scale = Math.min(scaleX, scaleY, 1.5);

    this._scaleContainer.scale.set(scale);

    // Center
    const scaledWidth = totalWidth * scale;
    const scaledHeight = totalHeight * scale;
    this._scaleContainer.x = (window.innerWidth - scaledWidth) / 2;
    this._scaleContainer.y = (window.innerHeight - scaledHeight) / 2;
  }

  update(_delta: Ticker) {
    // Could add camera tracking here later
  }
}
