<script setup lang="ts">
import { ref, computed } from "vue";
import { store } from "../../store/global";
import compendium, {
  ETownsfolkStatus,
  getAllDrinkKeys,
  getAllApplianceTypes,
  getAllTraits,
  TRACKABLE_EVENTS,
  type ITownsfolkEntry,
} from "../../game/Compendium";
import { RECIPES } from "../../game/Shared/DrinkRecipes";
import { APPLIANCE_CONFIGS, EApplianceType } from "../../game/Shared/ApplianceTypes";
import { EGuestTrait, TRAIT_DISPLAY } from "../../game/Shared/GuestTypes";
import { UPGRADE_CONFIGS } from "../../game/Shared/UpgradeTypes";

type TabId = "townsfolk" | "drinks" | "appliances" | "traits" | "events";

const activeTab = ref<TabId>("townsfolk");

const tabs: { id: TabId; label: string }[] = [
  { id: "townsfolk", label: "Townsfolk" },
  { id: "drinks", label: "Drinks" },
  { id: "appliances", label: "Appliances" },
  { id: "traits", label: "Traits" },
  { id: "events", label: "Events" },
];

function close() {
  store.compendium.visible = false;
}

// ── Townsfolk ──────────────────────────────────────────────────

const townsfolkEntries = computed((): ITownsfolkEntry[] => {
  return Object.values(compendium.data.townsfolk).sort((a, b) => a.name.localeCompare(b.name));
});

const townsfolkStats = computed(() => ({
  met: compendium.townsfolkCount,
  served: compendium.townsfolkServedCount,
  regulars: compendium.townsfolkRegularCount,
}));

function statusColor(status: ETownsfolkStatus): string {
  switch (status) {
    case ETownsfolkStatus.REGULAR: return "#ffd700";
    case ETownsfolkStatus.SERVED: return "#4ecdc4";
    case ETownsfolkStatus.MET: return "#888888";
    default: return "#333333";
  }
}

function statusLabel(status: ETownsfolkStatus): string {
  switch (status) {
    case ETownsfolkStatus.REGULAR: return "Regular";
    case ETownsfolkStatus.SERVED: return "Served";
    case ETownsfolkStatus.MET: return "Met";
    default: return "Unknown";
  }
}

// ── Drinks ─────────────────────────────────────────────────────

const drinkEntries = computed(() => {
  const allKeys = getAllDrinkKeys();
  return allKeys.map((key) => ({
    key,
    name: RECIPES[key]?.name ?? key,
    unlocked: compendium.data.drinksCrafted.includes(key),
    steps: RECIPES[key]?.steps ?? [],
  }));
});

const drinksProgress = computed(() => compendium.drinksProgress);

// ── Appliances ─────────────────────────────────────────────────

const applianceEntries = computed(() => {
  const allTypes = getAllApplianceTypes();
  return allTypes.map((type) => ({
    type,
    label: APPLIANCE_CONFIGS[type]?.label ?? type,
    unlocked: compendium.data.appliancesPlaced.includes(type),
  }));
});

const appliancesProgress = computed(() => compendium.appliancesProgress);

// ── Upgrades ──────────────────────────────────────────────────

const upgradeEntries = computed(() => {
  return UPGRADE_CONFIGS.map((config) => ({
    id: config.id,
    name: config.name,
    maxLevel: config.maxLevel,
    currentLevel: compendium.data.upgradeLevels[config.id] ?? 0,
  }));
});

// ── Traits ─────────────────────────────────────────────────────

const traitEntries = computed(() => {
  const allTraits = getAllTraits();
  return allTraits.map((trait) => ({
    trait,
    label: TRAIT_DISPLAY[trait]?.label ?? trait,
    icon: TRAIT_DISPLAY[trait]?.icon ?? "?",
    unlocked: compendium.data.traitsSeen.includes(trait),
  }));
});

const traitsProgress = computed(() => compendium.traitsProgress);

// ── Events ─────────────────────────────────────────────────────

const eventEntries = computed(() => {
  return TRACKABLE_EVENTS.map((evt) => ({
    type: evt.type,
    label: evt.label,
    unlocked: compendium.data.eventsSurvived.includes(evt.type),
  }));
});

const eventsProgress = computed(() => compendium.eventsProgress);

// ── Helpers ────────────────────────────────────────────────────

function pct(unlocked: number, total: number): string {
  if (total === 0) return "0%";
  return Math.round((unlocked / total) * 100) + "%";
}
</script>

<template>
  <div v-if="store.compendium.visible" class="compendium-overlay" @click.self="close">
    <div class="compendium-panel">
      <div class="compendium-header">
        <h2>Compendium</h2>
        <button class="close-btn" @click="close">X</button>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">

        <!-- Townsfolk Tab -->
        <div v-if="activeTab === 'townsfolk'" class="tab-pane">
          <div class="progress-row">
            <span>Met: {{ townsfolkStats.met }}</span>
            <span>Served: {{ townsfolkStats.served }}</span>
            <span>Regulars: {{ townsfolkStats.regulars }}</span>
          </div>
          <div class="grid townsfolk-grid">
            <div
              v-for="entry in townsfolkEntries"
              :key="entry.name"
              class="townsfolk-card"
              :style="{ borderColor: statusColor(entry.status) }"
            >
              <div class="townsfolk-avatar" :style="{ background: statusColor(entry.status) }">
                {{ entry.name.charAt(0).toUpperCase() }}
              </div>
              <div class="townsfolk-info">
                <div class="townsfolk-name">{{ entry.name }}</div>
                <div class="townsfolk-status" :style="{ color: statusColor(entry.status) }">
                  {{ statusLabel(entry.status) }}
                </div>
                <div class="townsfolk-visits">
                  {{ entry.timesVisited }} visits / {{ entry.timesServed }} served
                </div>
              </div>
            </div>
            <div v-if="townsfolkEntries.length === 0" class="empty-message">
              No townsfolk met yet. Start a shift to meet guests!
            </div>
          </div>
        </div>

        <!-- Drinks Tab -->
        <div v-if="activeTab === 'drinks'" class="tab-pane">
          <div class="progress-row">
            <span>{{ drinksProgress.unlocked }} / {{ drinksProgress.total }}</span>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: pct(drinksProgress.unlocked, drinksProgress.total) }"></div>
            </div>
            <span>{{ pct(drinksProgress.unlocked, drinksProgress.total) }}</span>
          </div>
          <div class="grid drinks-grid">
            <div
              v-for="drink in drinkEntries"
              :key="drink.key"
              class="drink-card"
              :class="{ locked: !drink.unlocked }"
            >
              <div class="drink-name">{{ drink.unlocked ? drink.name : '???' }}</div>
              <div v-if="drink.unlocked" class="drink-steps">
                <span v-for="(step, i) in drink.steps" :key="i" class="drink-step">
                  {{ step.description }}
                  <span v-if="i < drink.steps.length - 1" class="step-arrow">&rarr;</span>
                </span>
              </div>
              <div v-else class="drink-locked">Locked</div>
            </div>
          </div>
        </div>

        <!-- Appliances Tab -->
        <div v-if="activeTab === 'appliances'" class="tab-pane">
          <div class="progress-row">
            <span>{{ appliancesProgress.unlocked }} / {{ appliancesProgress.total }}</span>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: pct(appliancesProgress.unlocked, appliancesProgress.total) }"></div>
            </div>
            <span>{{ pct(appliancesProgress.unlocked, appliancesProgress.total) }}</span>
          </div>
          <div class="grid appliances-grid">
            <div
              v-for="app in applianceEntries"
              :key="app.type"
              class="appliance-card"
              :class="{ locked: !app.unlocked }"
            >
              <div class="appliance-name">{{ app.unlocked ? app.label : '???' }}</div>
              <div v-if="!app.unlocked" class="appliance-locked">Locked</div>
            </div>
          </div>

          <!-- Upgrades Section -->
          <div class="upgrade-section-header">Upgrades</div>
          <div class="grid appliances-grid">
            <div
              v-for="upg in upgradeEntries"
              :key="upg.id"
              class="appliance-card"
              :class="{ locked: upg.currentLevel === 0 }"
            >
              <div class="appliance-name">{{ upg.currentLevel > 0 ? upg.name : '???' }}</div>
              <div v-if="upg.currentLevel > 0" class="upgrade-level">
                Lv {{ upg.currentLevel }} / {{ upg.maxLevel }}
              </div>
              <div v-else class="appliance-locked">Locked</div>
            </div>
          </div>
        </div>

        <!-- Traits Tab -->
        <div v-if="activeTab === 'traits'" class="tab-pane">
          <div class="progress-row">
            <span>{{ traitsProgress.unlocked }} / {{ traitsProgress.total }}</span>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: pct(traitsProgress.unlocked, traitsProgress.total) }"></div>
            </div>
            <span>{{ pct(traitsProgress.unlocked, traitsProgress.total) }}</span>
          </div>
          <div class="grid traits-grid">
            <div
              v-for="t in traitEntries"
              :key="t.trait"
              class="trait-card"
              :class="{ locked: !t.unlocked }"
            >
              <span class="trait-icon">{{ t.unlocked ? t.icon : '?' }}</span>
              <span class="trait-label">{{ t.unlocked ? t.label : '???' }}</span>
            </div>
          </div>
        </div>

        <!-- Events Tab -->
        <div v-if="activeTab === 'events'" class="tab-pane">
          <div class="progress-row">
            <span>{{ eventsProgress.unlocked }} / {{ eventsProgress.total }}</span>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: pct(eventsProgress.unlocked, eventsProgress.total) }"></div>
            </div>
            <span>{{ pct(eventsProgress.unlocked, eventsProgress.total) }}</span>
          </div>
          <div class="grid events-grid">
            <div
              v-for="evt in eventEntries"
              :key="evt.type"
              class="event-card"
              :class="{ locked: !evt.unlocked }"
            >
              <span class="event-label">{{ evt.unlocked ? evt.label : '???' }}</span>
              <span v-if="evt.unlocked" class="event-check">&#10003;</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.compendium-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: auto;
}

.compendium-panel {
  background: #1a1a2e;
  border: 1px solid #444;
  border-radius: 12px;
  width: 640px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  font-family: monospace;
  color: #ccc;
}

.compendium-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;

  h2 {
    margin: 0;
    font-size: 1.3rem;
    color: #ffd93d;
  }
}

.close-btn {
  background: none;
  border: 1px solid #555;
  color: #aaa;
  font-family: monospace;
  font-size: 1rem;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #333;
    color: #fff;
  }
}

.tab-bar {
  display: flex;
  gap: 2px;
  padding: 8px 12px 0;
  border-bottom: 1px solid #333;
}

.tab-btn {
  background: #222;
  border: 1px solid #333;
  border-bottom: none;
  color: #888;
  font-family: monospace;
  font-size: 0.85rem;
  padding: 6px 14px;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: #2a2a3e;
    color: #ccc;
  }

  &.active {
    background: #1a1a2e;
    color: #ffd93d;
    border-color: #444;
    border-bottom: 1px solid #1a1a2e;
    margin-bottom: -1px;
  }
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: #aaa;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #ffd93d;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.grid {
  display: grid;
  gap: 8px;
}

.empty-message {
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  padding: 24px 0;
}

// ── Townsfolk ──────────────────────────────────────────────────

.townsfolk-grid {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.townsfolk-card {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  background: #222;
  border: 1px solid #444;
  border-left: 3px solid;
  border-radius: 6px;
}

.townsfolk-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: bold;
  color: #111;
  flex-shrink: 0;
}

.townsfolk-info {
  min-width: 0;
}

.townsfolk-name {
  font-weight: bold;
  color: #eee;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.townsfolk-status {
  font-size: 0.75rem;
  font-weight: bold;
}

.townsfolk-visits {
  font-size: 0.7rem;
  color: #666;
}

// ── Drinks ─────────────────────────────────────────────────────

.drinks-grid {
  grid-template-columns: 1fr;
}

.drink-card {
  padding: 8px 12px;
  background: #222;
  border: 1px solid #444;
  border-radius: 6px;

  &.locked {
    opacity: 0.5;
  }
}

.drink-name {
  font-weight: bold;
  color: #eee;
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.drink-steps {
  font-size: 0.75rem;
  color: #888;
}

.drink-step {
  white-space: nowrap;
}

.step-arrow {
  color: #555;
  margin: 0 4px;
}

.drink-locked {
  font-size: 0.75rem;
  color: #555;
  font-style: italic;
}

// ── Appliances ─────────────────────────────────────────────────

.appliances-grid {
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.appliance-card {
  padding: 10px 12px;
  background: #222;
  border: 1px solid #444;
  border-radius: 6px;
  text-align: center;

  &.locked {
    opacity: 0.5;
  }
}

.appliance-name {
  font-weight: bold;
  color: #eee;
  font-size: 0.85rem;
}

.appliance-locked {
  font-size: 0.7rem;
  color: #555;
  font-style: italic;
}

.upgrade-section-header {
  font-size: 0.9rem;
  color: #aaa;
  font-weight: bold;
  margin-top: 8px;
}

.upgrade-level {
  font-size: 0.7rem;
  color: #ffd93d;
}

// ── Traits ─────────────────────────────────────────────────────

.traits-grid {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.trait-card {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  background: #222;
  border: 1px solid #444;
  border-radius: 6px;

  &.locked {
    opacity: 0.5;
  }
}

.trait-icon {
  font-size: 1.2rem;
}

.trait-label {
  font-size: 0.85rem;
  color: #eee;
}

// ── Events ─────────────────────────────────────────────────────

.events-grid {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.event-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #222;
  border: 1px solid #444;
  border-radius: 6px;

  &.locked {
    opacity: 0.5;
  }
}

.event-label {
  font-size: 0.85rem;
  color: #eee;
}

.event-check {
  color: #4ecdc4;
  font-size: 1.1rem;
  font-weight: bold;
}
</style>
