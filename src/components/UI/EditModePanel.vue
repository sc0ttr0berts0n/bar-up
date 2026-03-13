<script setup lang="ts">
import { computed } from "vue";
import { store } from "../../store/global";

const APPLIANCE_NAMES: Record<string, string> = {
  counter: "Counter",
  service_bar: "Service Bar",
  ice_well: "Ice Well",
  liquor_rail: "Liquor Rail",
  glass_shelf: "Glass Shelf",
  draft_system: "Draft System",
  sink: "Sink",
  bin: "Bin",
  wine_rack: "Wine Rack",
  card_holder: "Card Holder",
  hightop: "Hi-Top",
  table: "Table",
  bar_queue: "Bar Queue",
};

const heldName = computed(() => {
  if (!store.editMode.heldType) return null;
  return APPLIANCE_NAMES[store.editMode.heldType] ?? store.editMode.heldType;
});
</script>

<template>
  <div v-if="store.editMode.active" class="edit-panel">
    <div class="edit-badge">EDIT MODE</div>
    <div v-if="heldName" class="edit-holding">
      Holding: <strong>{{ heldName }}</strong>
    </div>
    <div class="edit-controls">
      <span v-if="!heldName">E: Pick up</span>
      <span v-else>E: Place</span>
      <span class="sep">|</span>
      <span>ESC: {{ heldName ? 'Cancel' : 'Exit' }}</span>
      <span class="sep">|</span>
      <span>Enter: Save</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.edit-panel {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 6px 16px;
  background: #1a2a1acc;
  border: 2px solid #44aa44;
  border-radius: 8px;
  z-index: 60;
  font-family: monospace;
  color: #ddd;
}
.edit-badge {
  font-size: 1rem;
  font-weight: bold;
  color: #44ff44;
  letter-spacing: 2px;
}
.edit-holding {
  font-size: 0.85rem;
  strong {
    color: #fff;
  }
}
.edit-controls {
  font-size: 0.75rem;
  color: #999;
  .sep {
    margin: 0 4px;
    color: #555;
  }
}
</style>
