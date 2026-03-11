<script setup lang="ts">
import { computed } from "vue";
import { store } from "../../store/global";

const ITEM_NAMES: Record<string, string> = {
  pint_glass: "Pint Glass",
  shot_glass: "Shot Glass",
  stem_glass: "Stem Glass",
  highball_glass: "Highball Glass",
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

const heldItemName = computed(() => {
  if (!store.heldItemType) return null;
  return ITEM_NAMES[store.heldItemType] ?? store.heldItemType;
});
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
</style>
