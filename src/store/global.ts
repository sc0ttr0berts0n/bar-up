import { reactive } from "vue";
import type { IGuestStateData } from "../game/Shared/GuestTypes";
import type { IApplianceStateData } from "../game/Shared/ApplianceTypes";

export interface IToast {
  id: number;
  message: string;
  color: string;
  timer: number;
}

export interface IShiftSummary {
  visible: boolean;
  guestsServed: number;
  guestsTotal: number;
  moneyEarned: number;
  reputationChange: number;
  fights: number;
  slips: number;
  overserves: number;
}

export const store = reactive({
  visible: {
    hostOrJoin: true,
    hud: false,
    joinBar: false,
    recipeGuide: false,
  },
  money: 0,
  reputation: 0,
  shiftPhase: "prep" as "prep" | "service" | "closing",
  shiftTimer: 0,
  heldItemType: null as string | null,
  facingGuest: null as IGuestStateData | null,
  submenu: {
    visible: false,
    options: [] as { label: string; color: number }[],
    selectedIndex: 0,
    screenX: 0,
    screenY: 0,
  },
  appliances: [] as IApplianceStateData[],
  menuConfig: [] as { drinkKey: string; enabled: boolean; price: number }[],
  toasts: [] as IToast[],
  toastCounter: 0,
  shiftSummary: {
    visible: false,
    guestsServed: 0,
    guestsTotal: 0,
    moneyEarned: 0,
    reputationChange: 0,
    fights: 0,
    slips: 0,
    overserves: 0,
  } as IShiftSummary,
});
