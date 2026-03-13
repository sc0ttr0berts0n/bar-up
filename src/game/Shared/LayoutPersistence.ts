/**
 * Layout Persistence — save/load bar layouts to localStorage.
 *
 * Stores appliance placements as named slots with an "active" pointer.
 * On game start, `getActiveLayout()` returns the active slot's placements
 * or falls back to DEFAULT_BAR_LAYOUT.appliances.
 */
import { DEFAULT_BAR_LAYOUT, type IAppliancePlacement } from "./BarLayout";
import { EApplianceType } from "./ApplianceTypes";

// ── Schema version — bump when IAppliancePlacement shape changes ──
const LAYOUT_VERSION = 1;
const STORAGE_KEY = "drinkup_layouts";

// ── Types ─────────────────────────────────────────────────────────

export interface ISavedLayout {
  version: number;
  name: string;
  timestamp: number;
  placements: IAppliancePlacement[];
}

interface ILayoutStore {
  activeSlot: string | null;
  layouts: Record<string, ISavedLayout>;
}

// ── Internal helpers ──────────────────────────────────────────────

function readStore(): ILayoutStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeSlot: null, layouts: {} };
    const parsed = JSON.parse(raw) as ILayoutStore;
    if (!parsed.layouts || typeof parsed.layouts !== "object") {
      return { activeSlot: null, layouts: {} };
    }
    return parsed;
  } catch {
    return { activeSlot: null, layouts: {} };
  }
}

function writeStore(store: ILayoutStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Validate that a saved layout's placements contain valid EApplianceType values */
function isValidPlacements(placements: unknown): placements is IAppliancePlacement[] {
  if (!Array.isArray(placements)) return false;
  const validTypes = new Set(Object.values(EApplianceType));
  return placements.every(
    (p) =>
      p &&
      typeof p === "object" &&
      typeof p.gridX === "number" &&
      typeof p.gridY === "number" &&
      validTypes.has(p.type),
  );
}

// ── Public API ────────────────────────────────────────────────────

/** Save a layout under the given name. Overwrites if name exists. */
export function saveLayout(name: string, placements: IAppliancePlacement[]): void {
  const store = readStore();
  store.layouts[name] = {
    version: LAYOUT_VERSION,
    name,
    timestamp: Date.now(),
    placements: placements.map((p) => ({ type: p.type, gridX: p.gridX, gridY: p.gridY })),
  };
  writeStore(store);
}

/** Load a layout by name. Returns placements or null if not found / invalid. */
export function loadLayout(name: string): IAppliancePlacement[] | null {
  const store = readStore();
  const saved = store.layouts[name];
  if (!saved) return null;
  if (saved.version !== LAYOUT_VERSION) {
    console.warn(`[LayoutPersistence] Layout "${name}" has version ${saved.version}, expected ${LAYOUT_VERSION}. Discarding.`);
    return null;
  }
  if (!isValidPlacements(saved.placements)) {
    console.warn(`[LayoutPersistence] Layout "${name}" has invalid placements. Discarding.`);
    return null;
  }
  return saved.placements;
}

/** Get the active layout's placements, or DEFAULT_BAR_LAYOUT.appliances if none. */
export function getActiveLayout(): IAppliancePlacement[] {
  const store = readStore();
  if (store.activeSlot) {
    const placements = loadLayout(store.activeSlot);
    if (placements) return placements;
  }
  return DEFAULT_BAR_LAYOUT.appliances;
}

/** Set which layout slot is active (auto-loaded on next game start). */
export function setActiveSlot(name: string | null): void {
  const store = readStore();
  store.activeSlot = name;
  writeStore(store);
}

/** List all saved layouts (name + timestamp). */
export function listLayouts(): { name: string; timestamp: number }[] {
  const store = readStore();
  return Object.values(store.layouts).map((l) => ({
    name: l.name,
    timestamp: l.timestamp,
  }));
}

/** Delete a saved layout by name. Clears activeSlot if it was the deleted one. */
export function deleteLayout(name: string): void {
  const store = readStore();
  delete store.layouts[name];
  if (store.activeSlot === name) {
    store.activeSlot = null;
  }
  writeStore(store);
}

/** Clear all saved layouts. */
export function clearAllLayouts(): void {
  localStorage.removeItem(STORAGE_KEY);
}
