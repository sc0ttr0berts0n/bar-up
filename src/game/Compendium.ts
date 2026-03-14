import { EGuestTrait, type IGuestStateData } from "./Shared/GuestTypes";
import { deriveTraits } from "./Shared/GuestTypes";
import { RECIPES } from "./Shared/DrinkRecipes";
import { EApplianceType, APPLIANCE_CONFIGS } from "./Shared/ApplianceTypes";
import { EEngineEventType } from "./Network/Communicator/PacketTypes";

const STORAGE_KEY = "drinkup-compendium";

/** Townsfolk tracking states */
export enum ETownsfolkStatus {
  UNKNOWN = "unknown",
  MET = "met",
  SERVED = "served",
  REGULAR = "regular",
}

export interface ITownsfolkEntry {
  name: string;
  status: ETownsfolkStatus;
  timesVisited: number;
  timesServed: number;
}

export interface ICompendiumData {
  /** Townsfolk by guest name */
  townsfolk: Record<string, ITownsfolkEntry>;
  /** Drink recipe keys that have been crafted */
  drinksCrafted: string[];
  /** Appliance types that have been placed in the bar */
  appliancesPlaced: string[];
  /** Highest upgrade level seen per upgrade id */
  upgradeLevels: Record<string, number>;
  /** Composite trait values that have been observed on guests */
  traitsSeen: string[];
  /** Engine event types that have been survived */
  eventsSurvived: number[];
}

/** All possible drink keys from RECIPES */
export function getAllDrinkKeys(): string[] {
  return Object.keys(RECIPES);
}

/** All possible appliance types (excluding non-purchasable structural ones) */
export function getAllApplianceTypes(): EApplianceType[] {
  return Object.values(EApplianceType);
}

/** All possible composite traits */
export function getAllTraits(): EGuestTrait[] {
  return Object.values(EGuestTrait);
}

/** Trackable event types (notable events the player can "survive") */
export const TRACKABLE_EVENTS: { type: EEngineEventType; label: string }[] = [
  { type: EEngineEventType.BAR_FIGHT_STARTED, label: "Bar Fight" },
  { type: EEngineEventType.GUEST_SLIPPED, label: "Guest Slipped" },
  { type: EEngineEventType.POLICE_RAID, label: "Police Raid" },
  { type: EEngineEventType.POLICE_WARNING, label: "Police Warning" },
  { type: EEngineEventType.GUEST_OVERSERVED, label: "Overserve" },
  { type: EEngineEventType.LAST_CALL, label: "Last Call" },
];

function createEmptyData(): ICompendiumData {
  return {
    townsfolk: {},
    drinksCrafted: [],
    appliancesPlaced: [],
    upgradeLevels: {},
    traitsSeen: [],
    eventsSurvived: [],
  };
}

class Compendium {
  private _data: ICompendiumData;

  constructor() {
    this._data = this._load();
  }

  // ── Persistence ──────────────────────────────────────────────

  private _load(): ICompendiumData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ICompendiumData>;
        return {
          townsfolk: parsed.townsfolk ?? {},
          drinksCrafted: parsed.drinksCrafted ?? [],
          appliancesPlaced: parsed.appliancesPlaced ?? [],
          upgradeLevels: parsed.upgradeLevels ?? {},
          traitsSeen: parsed.traitsSeen ?? [],
          eventsSurvived: parsed.eventsSurvived ?? [],
        };
      }
    } catch {
      // Corrupted data — start fresh
    }
    return createEmptyData();
  }

  private _save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    } catch {
      // Storage full or unavailable
    }
  }

  // ── Getters ──────────────────────────────────────────────────

  get data(): ICompendiumData {
    return this._data;
  }

  // ── Tracking Methods ─────────────────────────────────────────

  /** Track a guest appearing at the bar (met) */
  trackGuestMet(guest: IGuestStateData): void {
    const name = guest.name;
    if (!this._data.townsfolk[name]) {
      this._data.townsfolk[name] = {
        name,
        status: ETownsfolkStatus.MET,
        timesVisited: 1,
        timesServed: 0,
      };
      this._save();
    } else {
      const entry = this._data.townsfolk[name];
      entry.timesVisited++;
      this._save();
    }
  }

  /** Track a guest being served a drink */
  trackGuestServed(guestName: string): void {
    const entry = this._data.townsfolk[guestName];
    if (!entry) return;
    entry.timesServed++;
    if (entry.status === ETownsfolkStatus.MET) {
      entry.status = ETownsfolkStatus.SERVED;
    }
    // Become a regular after 3+ visits and 3+ serves
    if (entry.timesVisited >= 3 && entry.timesServed >= 3 && entry.status !== ETownsfolkStatus.REGULAR) {
      entry.status = ETownsfolkStatus.REGULAR;
    }
    this._save();
  }

  /** Track a drink being crafted */
  trackDrinkCrafted(drinkKey: string): void {
    if (!this._data.drinksCrafted.includes(drinkKey)) {
      this._data.drinksCrafted.push(drinkKey);
      this._save();
    }
  }

  /** Track an appliance being placed/used */
  trackAppliancePlaced(applianceType: string): void {
    if (!this._data.appliancesPlaced.includes(applianceType)) {
      this._data.appliancesPlaced.push(applianceType);
      this._save();
    }
  }

  /** Track upgrade levels (stores highest level seen per upgrade id) */
  trackUpgradeLevel(upgradeId: string, level: number): void {
    const current = this._data.upgradeLevels[upgradeId] ?? 0;
    if (level > current) {
      this._data.upgradeLevels[upgradeId] = level;
      this._save();
    }
  }

  /** Track composite traits seen on a guest */
  trackTraitsSeen(guest: IGuestStateData): void {
    const traits = deriveTraits(guest.personality, guest.isDesignatedDriver);
    let changed = false;
    for (const trait of traits) {
      if (!this._data.traitsSeen.includes(trait)) {
        this._data.traitsSeen.push(trait);
        changed = true;
      }
    }
    if (changed) this._save();
  }

  /** Track an event being survived */
  trackEvent(eventType: number): void {
    const trackable = TRACKABLE_EVENTS.find((e) => e.type === eventType);
    if (!trackable) return;
    if (!this._data.eventsSurvived.includes(eventType)) {
      this._data.eventsSurvived.push(eventType);
      this._save();
    }
  }

  // ── Progress Calculations ────────────────────────────────────

  get townsfolkCount(): number {
    return Object.keys(this._data.townsfolk).length;
  }

  get townsfolkServedCount(): number {
    return Object.values(this._data.townsfolk).filter(
      (t) => t.status === ETownsfolkStatus.SERVED || t.status === ETownsfolkStatus.REGULAR,
    ).length;
  }

  get townsfolkRegularCount(): number {
    return Object.values(this._data.townsfolk).filter(
      (t) => t.status === ETownsfolkStatus.REGULAR,
    ).length;
  }

  get drinksProgress(): { unlocked: number; total: number } {
    return {
      unlocked: this._data.drinksCrafted.length,
      total: getAllDrinkKeys().length,
    };
  }

  get appliancesProgress(): { unlocked: number; total: number } {
    return {
      unlocked: this._data.appliancesPlaced.length,
      total: getAllApplianceTypes().length,
    };
  }

  get traitsProgress(): { unlocked: number; total: number } {
    return {
      unlocked: this._data.traitsSeen.length,
      total: getAllTraits().length,
    };
  }

  get eventsProgress(): { unlocked: number; total: number } {
    return {
      unlocked: this._data.eventsSurvived.length,
      total: TRACKABLE_EVENTS.length,
    };
  }

  /** Reset all data (for testing/debug) */
  reset(): void {
    this._data = createEmptyData();
    this._save();
  }
}

/** Singleton compendium instance */
const compendium = new Compendium();
export default compendium;
