import { reactive } from "vue";
import type { IGuestStateData } from "../game/Shared/GuestTypes";
import type { IApplianceStateData, EApplianceType } from "../game/Shared/ApplianceTypes";
import type { IUpgradeStateData } from "../game/Shared/UpgradeTypes";

export interface IToast {
  id: number;
  message: string;
  color: string;
  timer: number;
}

export interface ICenterFlash {
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
  tipsEarned: number;
  reputationChange: number;
  fights: number;
  slips: number;
  overserves: number;
  policeRaids: number;
  restockCost: number;
  breakageCost: number;
  wasteCost: number;
  totalExpenses: number;
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
  policeAttention: 0,
  atmosphere: 50,
  shiftPhase: "prep" as "prep" | "service" | "closing",
  shiftTimer: 0,
  isLastCall: false,
  isOvertime: false,
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
  centerFlash: null as ICenterFlash | null,
  shiftSummary: {
    visible: false,
    guestsServed: 0,
    guestsTotal: 0,
    moneyEarned: 0,
    tipsEarned: 0,
    reputationChange: 0,
    fights: 0,
    slips: 0,
    overserves: 0,
    policeRaids: 0,
    restockCost: 0,
    breakageCost: 0,
    wasteCost: 0,
    totalExpenses: 0,
  } as IShiftSummary,
  editMode: {
    active: false,
    heldType: null as EApplianceType | null,
    placementValid: false,
  },
  upgradePanel: {
    visible: false,
    selectedIndex: 0,
  },
  upgrades: { levels: {} } as IUpgradeStateData,
});
