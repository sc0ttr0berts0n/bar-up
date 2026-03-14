<script setup lang="ts">
import { computed } from "vue";
import { store } from "../../store/global";
import GameSettings from "../../game/Shared/GameSettings";
import Communicator from "../../game/Network/Communicator/Communicator";
import { PACKET_TYPE } from "../../game/Network/Communicator/PacketTypes";

function skipPrepPhase() {
  Communicator.sendToServer({
    uuid: Communicator.uuid,
    type: PACKET_TYPE.CLIENT_SKIP_PHASE,
  });
}

function toggleUpgradePanel() {
  store.upgradePanel.visible = !store.upgradePanel.visible;
  store.upgradePanel.selectedIndex = 0;
}

function enterEditMode() {
  Communicator.sendToServer({
    uuid: Communicator.uuid,
    type: PACKET_TYPE.CLIENT_EDIT_ENTER,
  });
}

const ITEM_NAMES: Record<string, string> = {
  glass: "Glass",
  pilsner: "Pilsner",
  lager: "Lager",
  ale: "Ale",
  ipa: "IPA",
  merlot: "Merlot",
  chardonnay: "Chardonnay",
  pinot_noir: "Pinot Noir",
  rose: "Ros\u00e9",
  whiskey: "Whiskey",
  vodka: "Vodka",
  gin: "Gin",
  rum: "Rum",
  highball: "Highball",
  dirty_glass: "Dirty Glass",
  cut_off_card: "Cut Off Card",
  trash_bag: "Trash Bag",
};

const formattedTimer = computed(() => {
  const seconds = Math.ceil(store.shiftTimer);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
});

const phaseLabel = computed(() => {
  if (store.isOvertime) return "OVERTIME";
  switch (store.shiftPhase) {
    case "service":
      return "SERVICE";
    case "closing":
      return "CLOSING";
    case "prep":
      return "PREP";
    default:
      return "";
  }
});

const phaseColor = computed(() => {
  if (store.isOvertime) return "#ff3333";
  switch (store.shiftPhase) {
    case "service":
      return "#4ecdc4";
    case "closing":
      return "#ff6b6b";
    case "prep":
      return "#ffd93d";
    default:
      return "#ffffff";
  }
});

const showLastCall = computed(() => store.isLastCall && store.shiftPhase === "service");

const heldItemName = computed(() => {
  if (!store.heldItemType) return null;
  return ITEM_NAMES[store.heldItemType] ?? store.heldItemType;
});

const policeAttention = computed(() => store.policeAttention);
const showPolice = computed(() => policeAttention.value > 0);
const policeSegments = computed(() => {
  const max = GameSettings.policeRaidThreshold;
  const filled = Math.min(max, Math.ceil(policeAttention.value));
  return { filled, max };
});
const policeColor = computed(() => {
  const val = policeAttention.value;
  if (val >= GameSettings.policeRaidThreshold) return "#ff3333";
  if (val >= GameSettings.policeWarningThreshold) return "#ff8800";
  return "#ffd93d";
});
const policePulse = computed(() => {
  return policeAttention.value >= GameSettings.policeRaidThreshold;
});

const atmosphereValue = computed(() => store.atmosphere);
const atmosphereColor = computed(() => {
  const val = atmosphereValue.value;
  if (val >= 70) return "#44cc44";
  if (val >= 40) return "#ffd93d";
  return "#ff6b6b";
});
const atmosphereLabel = computed(() => {
  const val = atmosphereValue.value;
  if (val >= 80) return "Lively";
  if (val >= 60) return "Good";
  if (val >= 40) return "Okay";
  if (val >= 20) return "Tense";
  return "Hostile";
});
const showAtmosphere = computed(() => store.shiftPhase === "service" || store.shiftPhase === "closing");
</script>

<template>
  <div class="hud">
    <div class="hud-held">
      <span class="hud-held-label">Holding:</span>
      <span v-if="heldItemName" class="hud-held-item">{{ heldItemName }}</span>
      <span v-else class="hud-held-empty">Empty</span>
    </div>
    <div class="hud-divider"></div>
    <div class="hud-money">${{ store.money }}</div>
    <div class="hud-rep" :class="{ 'rep-pos': store.reputation > 0, 'rep-neg': store.reputation < 0 }">
      {{ store.reputation >= 0 ? '+' : '' }}{{ store.reputation }}
    </div>
    <div class="hud-divider"></div>
    <div class="hud-phase" :style="{ color: phaseColor }">
      {{ phaseLabel }}
    </div>
    <div class="hud-timer">{{ formattedTimer }}</div>
    <template v-if="showAtmosphere">
      <div class="hud-divider"></div>
      <div class="hud-atmosphere">
        <span class="atmosphere-label" :style="{ color: atmosphereColor }">{{ atmosphereLabel }}</span>
        <div class="atmosphere-bar">
          <div class="atmosphere-fill" :style="{ width: atmosphereValue + '%', background: atmosphereColor }"></div>
        </div>
      </div>
    </template>
    <span v-if="showLastCall" class="hud-last-call">LAST CALL</span>
    <span v-if="store.isOvertime" class="hud-overtime-pulse">OVERTIME</span>
    <button v-if="store.shiftPhase === 'prep' && !store.editMode.active" class="hud-upgrade-btn" @click="toggleUpgradePanel">
      Upgrades
    </button>
    <button v-if="store.shiftPhase === 'prep' && !store.editMode.active" class="hud-edit-btn" @click="enterEditMode">
      Edit Layout
    </button>
    <button v-if="store.shiftPhase === 'prep' && !store.editMode.active" class="hud-skip-btn" @click="skipPrepPhase">
      Start Shift &#x25B6;
    </button>
    <button v-if="store.shiftPhase === 'service' || store.shiftPhase === 'closing'" class="hud-close-btn" @click="skipPrepPhase">
      {{ store.shiftPhase === 'service' ? 'Close Bar' : 'End Closing' }} &#x25B6;
    </button>
    <template v-if="showPolice">
      <div class="hud-divider"></div>
      <div class="hud-police" :class="{ 'police-pulse': policePulse }">
        <span class="police-icon">&#x1F6A8;</span>
        <div class="police-bar">
          <div
            v-for="i in policeSegments.max"
            :key="i"
            class="police-segment"
            :class="{ 'segment-filled': i <= policeSegments.filled }"
            :style="{ background: i <= policeSegments.filled ? policeColor : '#333' }"
          ></div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.hud {
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 8px 20px;
  background: #1a1a2ecc;
  border: 1px solid #333;
  border-radius: 8px;
  z-index: 50;
  pointer-events: none;
  font-family: monospace;
}
.hud-held {
  display: flex;
  gap: 6px;
  align-items: center;
}
.hud-held-label {
  font-size: 0.85rem;
  color: #888;
}
.hud-held-item {
  font-size: 1rem;
  font-weight: bold;
  color: #fff;
}
.hud-held-empty {
  font-size: 1rem;
  color: #555;
}
.hud-divider {
  width: 1px;
  height: 20px;
  background: #444;
}
.hud-money {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffd93d;
}
.hud-rep {
  font-size: 0.9rem;
  font-weight: bold;
  color: #888;
  &.rep-pos { color: #44cc44; }
  &.rep-neg { color: #ff4444; }
}
.hud-phase {
  font-size: 1.1rem;
  font-weight: bold;
  text-transform: uppercase;
}
.hud-timer {
  font-size: 1.3rem;
  color: #aaa;
}
.hud-upgrade-btn {
  pointer-events: auto;
  padding: 4px 12px;
  background: #cc8844;
  color: #111;
  border: none;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  &:hover { background: #dd9955; }
}
.hud-edit-btn {
  pointer-events: auto;
  padding: 4px 12px;
  background: #44aa44;
  color: #111;
  border: none;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  &:hover { background: #55cc55; }
}
.hud-skip-btn {
  pointer-events: auto;
  padding: 4px 12px;
  background: #4ecdc4;
  color: #111;
  border: none;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  &:hover { background: #5de0d7; }
}
.hud-close-btn {
  pointer-events: auto;
  padding: 4px 12px;
  background: #ff6b6b;
  color: #111;
  border: none;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  &:hover { background: #ff8888; }
}
.hud-police {
  display: flex;
  align-items: center;
  gap: 6px;
}
.police-icon {
  font-size: 1.1rem;
}
.police-bar {
  display: flex;
  gap: 2px;
  align-items: center;
}
.police-segment {
  width: 8px;
  height: 12px;
  border-radius: 2px;
  transition: background 0.3s ease;
}
.police-pulse {
  animation: pulse-police 0.8s ease-in-out infinite alternate;
}
@keyframes pulse-police {
  from { opacity: 1; }
  to { opacity: 0.5; }
}
.hud-atmosphere {
  display: flex;
  align-items: center;
  gap: 6px;
}
.atmosphere-label {
  font-size: 0.8rem;
  font-weight: bold;
  white-space: nowrap;
}
.atmosphere-bar {
  width: 60px;
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
}
.atmosphere-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease, background 0.5s ease;
}
.hud-last-call {
  font-size: 1rem;
  font-weight: bold;
  color: #ffd93d;
  animation: pulse-last-call 0.6s ease-in-out infinite alternate;
}
.hud-overtime-pulse {
  font-size: 1rem;
  font-weight: bold;
  color: #ff3333;
  animation: pulse-last-call 0.5s ease-in-out infinite alternate;
}
@keyframes pulse-last-call {
  from { opacity: 1; }
  to { opacity: 0.3; }
}
</style>
