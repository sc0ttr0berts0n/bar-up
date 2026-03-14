import { Container, Graphics, Text, type Ticker } from "pixi.js";
import type { IGuestStateData } from "../Shared/GuestTypes";
import { EGuestStatus, EGuestTrait, TRAIT_DISPLAY } from "../Shared/GuestTypes";
import { ITEM_DISPLAY } from "../Shared/ItemTypes";
import GameSettings from "../Shared/GameSettings";
import { lerp } from "../Utils/Lerp";

const STATUS_ICONS: Record<EGuestStatus, string> = {
  [EGuestStatus.WAITING_AT_DOOR]: "\uD83D\uDEAA",
  [EGuestStatus.WALKING_TO_SEAT]: "\uD83D\uDEB6",
  [EGuestStatus.DECIDING]: "\uD83E\uDD14",
  [EGuestStatus.READY_TO_ORDER]: "\u2757",
  [EGuestStatus.WALKING_TO_QUEUE]: "\uD83D\uDEB6",
  [EGuestStatus.QUEUED]: "\u23F3",
  [EGuestStatus.RETURNING_TO_SEAT]: "\uD83C\uDF7A",
  [EGuestStatus.WAITING_FOR_ORDER]: "\u23F3",
  [EGuestStatus.DRINKING]: "\uD83C\uDF7B",
  [EGuestStatus.FIGHTING]: "\uD83E\uDD4A",
  [EGuestStatus.SLIPPED]: "\uD83D\uDCAB",
  [EGuestStatus.LEAVING]: "\uD83D\uDC4B",
};

export class GuestView extends Container {
  private _body: Graphics;
  private _statusIcon: Text;
  private _patienceBar: Graphics;
  private _happinessBar: Graphics;
  private _drinkProgressBar: Graphics;
  private _orderBubbleBg: Graphics;
  private _orderBubbleText: Text;
  private _chatBubble: Text;
  private _lastChatCount: number = 0;
  private _chatBubbleTimer: number = 0;
  private _preferenceBubbleBg: Graphics;
  private _preferenceText: Text;
  private _drinkGlass: Graphics;
  private _traitIcons: Text;
  private _dangerIcon: Text;
  private _overservedIcon: Text;
  private _regularNameTag: Text;
  private _regularStar: Text;
  private _displayX: number = -1;
  private _displayY: number = -1;

  constructor() {
    super();

    const size = GameSettings.tileSize * 0.75;
    const r = size / 2;

    // Guest body (circle, 75% of tile)
    this._body = new Graphics()
      .circle(0, 0, r)
      .fill(0xd4a574);
    this._body.stroke({ color: 0x333333, width: 1 });
    this.addChild(this._body);

    // Status icon centered on body
    this._statusIcon = new Text({
      text: "",
      style: { fontSize: 16 },
    });
    this._statusIcon.anchor.set(0.5);
    this._statusIcon.y = 0;
    this.addChild(this._statusIcon);

    // Order bubble background
    this._orderBubbleBg = new Graphics();
    this._orderBubbleBg.visible = false;
    this.addChild(this._orderBubbleBg);

    // Order bubble text
    this._orderBubbleText = new Text({
      text: "",
      style: {
        fontFamily: "monospace",
        fontSize: 12,
        fill: 0xffffff,
        fontWeight: "bold",
      },
    });
    this._orderBubbleText.anchor.set(0.5);
    this._orderBubbleText.y = -r - 16;
    this._orderBubbleText.visible = false;
    this.addChild(this._orderBubbleText);

    // Patience bar (urgency — green/yellow/red)
    this._patienceBar = new Graphics();
    this._patienceBar.y = r + 4;
    this.addChild(this._patienceBar);

    // Happiness bar (satisfaction — blue/teal)
    this._happinessBar = new Graphics();
    this._happinessBar.y = r + 11;
    this.addChild(this._happinessBar);

    // Drink progress bar
    this._drinkProgressBar = new Graphics();
    this._drinkProgressBar.y = r + 18;
    this._drinkProgressBar.visible = false;
    this.addChild(this._drinkProgressBar);

    // Chat bubble (shows briefly after chatting)
    this._chatBubble = new Text({
      text: "\uD83D\uDCAC",
      style: { fontSize: 18 },
    });
    this._chatBubble.anchor.set(0.5);
    this._chatBubble.x = r + 10;
    this._chatBubble.y = -r;
    this._chatBubble.visible = false;
    this.addChild(this._chatBubble);

    // Preference bubble (shows when revealed)
    this._preferenceBubbleBg = new Graphics();
    this._preferenceBubbleBg.visible = false;
    this.addChild(this._preferenceBubbleBg);

    this._preferenceText = new Text({
      text: "",
      style: {
        fontFamily: "monospace",
        fontSize: 10,
        fill: 0xffffff,
        fontWeight: "bold",
      },
    });
    this._preferenceText.anchor.set(0.5);
    this._preferenceText.visible = false;
    this.addChild(this._preferenceText);

    // Drink glass visual (shows during DRINKING with depleting fill)
    this._drinkGlass = new Graphics();
    this._drinkGlass.visible = false;
    this.addChild(this._drinkGlass);

    // Trait icons (small row above guest)
    this._traitIcons = new Text({
      text: "",
      style: { fontSize: 10 },
    });
    this._traitIcons.anchor.set(0.5);
    this._traitIcons.visible = false;
    this.addChild(this._traitIcons);

    // Danger icon — pulsing warning when near overserve threshold
    this._dangerIcon = new Text({
      text: "\u26A0",
      style: { fontSize: 14 },
    });
    this._dangerIcon.anchor.set(0.5);
    this._dangerIcon.x = r + 6;
    this._dangerIcon.y = -r + 2;
    this._dangerIcon.visible = false;
    this.addChild(this._dangerIcon);

    // Overserved icon — persistent dizzy indicator
    this._overservedIcon = new Text({
      text: "\uD83D\uDCAB",
      style: { fontSize: 12 },
    });
    this._overservedIcon.anchor.set(0.5);
    this._overservedIcon.x = -r - 6;
    this._overservedIcon.y = -r + 2;
    this._overservedIcon.visible = false;
    this.addChild(this._overservedIcon);

    // Regular name tag — visible without chatting
    this._regularNameTag = new Text({
      text: "",
      style: {
        fontFamily: "monospace",
        fontSize: 9,
        fill: 0xffd700,
        fontWeight: "bold",
      },
    });
    this._regularNameTag.anchor.set(0.5);
    this._regularNameTag.y = -r - 38;
    this._regularNameTag.visible = false;
    this.addChild(this._regularNameTag);

    // Regular star icon — small star next to name
    this._regularStar = new Text({
      text: "\u2B50",
      style: { fontSize: 10 },
    });
    this._regularStar.anchor.set(0.5);
    this._regularStar.y = -r - 38;
    this._regularStar.visible = false;
    this.addChild(this._regularStar);
  }

  update(_delta: Ticker, state: IGuestStateData) {
    const tileSize = GameSettings.tileSize;
    const size = tileSize * 0.75;
    const r = size / 2;

    // Smooth client-side interpolation toward server position
    const targetPixelX = lerp(state.gridX, state.targetX, state.moveProgress) * tileSize + tileSize / 2;
    const targetPixelY = lerp(state.gridY, state.targetY, state.moveProgress) * tileSize + tileSize / 2;
    if (this._displayX < 0) {
      this._displayX = targetPixelX;
      this._displayY = targetPixelY;
    } else {
      const smoothing = 0.25;
      this._displayX = lerp(this._displayX, targetPixelX, smoothing);
      this._displayY = lerp(this._displayY, targetPixelY, smoothing);
    }
    this.x = this._displayX;
    this.y = this._displayY;

    // Tint body based on drunkenness (sober → flushed red)
    const drunk = Math.min(1, state.drunkenness);
    const soberR = 0xd4, soberG = 0xa5, soberB = 0x74;
    const flushR = 0xd4, flushG = 0x74, flushB = 0x74;
    const tintR = Math.round(soberR + (flushR - soberR) * drunk);
    const tintG = Math.round(soberG + (flushG - soberG) * drunk);
    const tintB = Math.round(soberB + (flushB - soberB) * drunk);
    const tintColor = (tintR << 16) | (tintG << 8) | tintB;

    // Danger zone: red stroke when drunkenness is at or above overserve threshold
    const inDanger = state.drunkenness >= GameSettings.overserveDrunkennessThreshold;
    const isVIP = state.tier === "high";
    const strokeColor = inDanger ? 0xff3333 : isVIP ? 0xffd700 : 0x333333;
    const strokeWidth = inDanger ? 2 : isVIP ? 2 : 1;

    this._body.clear();
    this._body.circle(0, 0, r).fill(tintColor);
    this._body.stroke({ color: strokeColor, width: strokeWidth });

    // Danger icon — pulsing warning triangle
    if (inDanger) {
      this._dangerIcon.visible = true;
      this._dangerIcon.alpha = 0.5 + 0.5 * Math.sin(Date.now() / 200);
    } else {
      this._dangerIcon.visible = false;
    }

    // Overserved icon — persistent
    this._overservedIcon.visible = state.wasOverserved;

    // Chugging visual — body shakes
    if (state.isChugging && state.status === EGuestStatus.DRINKING) {
      this._body.x = Math.sin(Date.now() / 50) * 2;
    } else {
      this._body.x = 0;
    }

    // Status icon
    this._statusIcon.text = STATUS_ICONS[state.status] ?? "";

    // Regular name tag — always visible for regulars
    if (state.isRegular) {
      this._regularNameTag.text = state.name;
      this._regularNameTag.visible = true;
      // Position star to the right of name
      this._regularStar.visible = true;
      this._regularStar.x = this._regularNameTag.width / 2 + 8;
      this._regularStar.y = this._regularNameTag.y;
    } else {
      this._regularNameTag.visible = false;
      this._regularStar.visible = false;
    }

    // Order bubble — show during READY_TO_ORDER, QUEUED, and WAITING_FOR_ORDER
    const showOrder =
      state.status === EGuestStatus.READY_TO_ORDER ||
      state.status === EGuestStatus.QUEUED ||
      state.status === EGuestStatus.WAITING_FOR_ORDER;

    if (showOrder) {
      let label: string;
      let pillColor: number;
      if (state.status === EGuestStatus.READY_TO_ORDER || state.status === EGuestStatus.QUEUED) {
        // Regulars show "The Usual" instead of "Order?"
        if (state.isRegular && state.preferredDrink) {
          const prefDisplay = ITEM_DISPLAY[state.preferredDrink];
          label = prefDisplay ? `Usual: ${prefDisplay.label}` : "The Usual";
          pillColor = prefDisplay?.color ?? 0xffd700;
        } else {
          label = "Order?";
          pillColor = 0x888888;
        }
      } else {
        const drinkKey = state.order?.drinkKey ?? "";
        label = ITEM_DISPLAY[drinkKey]?.label ?? drinkKey.toUpperCase();
        pillColor = ITEM_DISPLAY[drinkKey]?.color ?? 0x888888;
      }

      this._orderBubbleText.text = label;
      this._orderBubbleText.visible = true;

      // Background pill (color-coded by drink)
      const pillW = Math.max(40, this._orderBubbleText.width + 10);
      const pillH = 18;
      const pillY = -r - 25;
      this._orderBubbleBg.clear();
      this._orderBubbleBg.roundRect(-pillW / 2, pillY, pillW, pillH, 4).fill(pillColor);
      // Red border on order bubble if guest is in danger zone
      if (inDanger) {
        this._orderBubbleBg.stroke({ color: 0xff3333, width: 2 });
      }
      this._orderBubbleBg.visible = true;

      this._orderBubbleText.y = pillY + pillH / 2;
    } else {
      this._orderBubbleText.visible = false;
      this._orderBubbleBg.visible = false;
    }

    // Patience bar (urgency — green/yellow/red)
    this._patienceBar.clear();
    const barWidth = 30;
    const barHeight = 4;
    const patienceRatio = state.patience / GameSettings.patienceMax;
    const patienceColor =
      patienceRatio > 0.6 ? 0x00cc00 : patienceRatio > 0.3 ? 0xcccc00 : 0xcc0000;
    this._patienceBar
      .rect(-barWidth / 2, 0, barWidth, barHeight)
      .fill(0x333333);
    this._patienceBar
      .rect(-barWidth / 2, 0, barWidth * patienceRatio, barHeight)
      .fill(patienceColor);

    // Happiness bar (satisfaction — blue/teal)
    this._happinessBar.clear();
    const happinessRatio = state.happiness / GameSettings.happinessMax;
    const happinessColor =
      happinessRatio > 0.6 ? 0x4488cc : happinessRatio > 0.3 ? 0x886644 : 0xcc4444;
    this._happinessBar
      .rect(-barWidth / 2, 0, barWidth, barHeight)
      .fill(0x333333);
    this._happinessBar
      .rect(-barWidth / 2, 0, barWidth * happinessRatio, barHeight)
      .fill(happinessColor);

    // Drink progress bars — one per active slot (color-coded by slot item type)
    const hasActiveSlot = state.status === EGuestStatus.DRINKING &&
      state.slots.some(s => s.itemType !== null && s.progress > 0);
    if (hasActiveSlot) {
      this._drinkProgressBar.visible = true;
      this._drinkProgressBar.clear();
      let barYOffset = 0;
      for (let si = 0; si < 2; si++) {
        const slot = state.slots[si];
        if (slot.itemType === null || slot.progress <= 0) continue;
        const slotColor = ITEM_DISPLAY[slot.itemType]?.color ?? 0x4ecdc4;
        this._drinkProgressBar
          .rect(-barWidth / 2, barYOffset, barWidth, 3)
          .fill(0x333333);
        this._drinkProgressBar
          .rect(-barWidth / 2, barYOffset, barWidth * slot.progress, 3)
          .fill(slotColor);
        barYOffset += 5; // stack second bar below first
      }
    } else {
      this._drinkProgressBar.visible = false;
    }

    // Drink glass visuals — one per active slot, offset side-by-side on the appliance tile
    if (hasActiveSlot) {
      this._drinkGlass.clear();
      const gw = 8;
      const gh = 14;
      const offsetX = (state.seatApplianceGridX - state.gridX) * tileSize;
      const offsetY = (state.seatApplianceGridY - state.gridY) * tileSize;
      // Count active slots to decide spacing
      const activeSlots = state.slots.filter(s => s.itemType !== null && s.progress > 0);
      const spacing = activeSlots.length > 1 ? gw + 2 : 0;
      let slotDrawIndex = 0;
      for (let si = 0; si < 2; si++) {
        const slot = state.slots[si];
        if (slot.itemType === null || slot.progress <= 0) continue;
        const drinkColor = ITEM_DISPLAY[slot.itemType]?.color ?? 0x4ecdc4;
        const xShift = activeSlots.length > 1
          ? (slotDrawIndex - 0.5) * spacing
          : 0;
        const gx = offsetX + xShift - gw / 2;
        const gy = offsetY - gh / 2;
        const fillRatio = 1 - slot.progress;

        // Glass outline
        this._drinkGlass.roundRect(gx, gy, gw, gh, 2).fill(0x222222);
        // Fill from bottom
        const fillH = Math.max(0, (gh - 2) * fillRatio);
        if (fillH > 0) {
          this._drinkGlass.rect(gx + 1, gy + gh - 1 - fillH, gw - 2, fillH).fill(drinkColor);
        }
        // Glass rim highlight
        this._drinkGlass.rect(gx, gy, gw, 1).fill(0x666666);
        slotDrawIndex++;
      }
      this._drinkGlass.visible = true;
    } else {
      this._drinkGlass.visible = false;
    }

    // Chat bubble — show when chatAvailable during DRINKING, or briefly after chatting
    const dt = 1 / 60; // approximate frame dt
    if (state.chatCount > this._lastChatCount) {
      this._chatBubbleTimer = 1.5; // show "just chatted" flash for 1.5 seconds
      this._lastChatCount = state.chatCount;
    }
    if (this._chatBubbleTimer > 0) {
      this._chatBubbleTimer -= dt;
      this._chatBubble.visible = true;
      this._chatBubble.alpha = Math.min(1, this._chatBubbleTimer / 0.3); // fade out
    } else if (state.chatAvailable && state.status === EGuestStatus.DRINKING) {
      // Show steady chat-available indicator
      this._chatBubble.visible = true;
      this._chatBubble.alpha = 0.6 + 0.2 * Math.sin(Date.now() / 500); // gentle pulse
    } else {
      this._chatBubble.visible = false;
    }

    // Preference indicator — show below drink bar when revealed
    if (state.preferenceRevealed && state.preferredDrink) {
      const prefDisplay = ITEM_DISPLAY[state.preferredDrink];
      if (prefDisplay) {
        const prefLabel = `\u2665 ${prefDisplay.label}`;
        this._preferenceText.text = prefLabel;
        this._preferenceText.visible = true;

        const prefW = Math.max(36, this._preferenceText.width + 8);
        const prefH = 14;
        const prefY = r + 24;
        this._preferenceBubbleBg.clear();
        this._preferenceBubbleBg.roundRect(-prefW / 2, prefY, prefW, prefH, 3).fill(prefDisplay.color);
        this._preferenceBubbleBg.visible = true;
        this._preferenceText.y = prefY + prefH / 2;
      }
    } else {
      this._preferenceText.visible = false;
      this._preferenceBubbleBg.visible = false;
    }

    // Trait icons — show revealed traits as small emoji row
    if (state.revealedTraits && state.revealedTraits.length > 0) {
      const icons = state.revealedTraits
        .map((t) => TRAIT_DISPLAY[t as EGuestTrait]?.icon ?? "")
        .filter(Boolean)
        .join(" ");
      this._traitIcons.text = icons;
      this._traitIcons.y = -r - 8;
      this._traitIcons.visible = true;
    } else {
      this._traitIcons.visible = false;
    }
  }
}
