<script setup lang="ts">
import { computed } from "vue";
import { store } from "../../store/global";
import { APPLIANCE_CONFIGS, type IApplianceStateData } from "../../game/Shared/ApplianceTypes";
import Communicator from "../../game/Network/Communicator/Communicator";
import { PACKET_TYPE, type INetworkPacketClientRestock } from "../../game/Network/Communicator/PacketTypes";

const isVisible = computed(() => store.shiftPhase === "prep" && store.visible.hud);

const stockAppliances = computed(() => {
  return store.appliances
    .filter((a: IApplianceStateData) => a.maxStock > 0)
    .map((a: IApplianceStateData) => {
      const config = APPLIANCE_CONFIGS[a.type];
      return {
        id: a.id,
        label: config?.label ?? a.type,
        currentStock: a.currentStock,
        maxStock: a.maxStock,
        restockCost: config?.restockCost ?? 0,
        isFull: a.currentStock >= a.maxStock,
        color: config?.color ?? 0x888888,
      };
    });
});

function restock(applianceId: string) {
  Communicator.sendToServer<INetworkPacketClientRestock>({
    uuid: Communicator.uuid,
    type: PACKET_TYPE.CLIENT_RESTOCK,
    data: { applianceId },
  });
}
</script>

<template>
  <Transition name="stock-panel">
    <div v-if="isVisible && stockAppliances.length > 0" class="stock-panel">
      <h3 class="stock-title">Stock</h3>
      <div class="stock-list">
        <div
          v-for="app in stockAppliances"
          :key="app.id"
          class="stock-item"
          :class="{ empty: app.currentStock === 0 }"
        >
          <span class="stock-label">{{ app.label }}</span>
          <div class="stock-bar-track">
            <div
              class="stock-bar-fill"
              :style="{
                width: (app.currentStock / app.maxStock * 100) + '%',
                background: '#' + app.color.toString(16).padStart(6, '0'),
              }"
            ></div>
          </div>
          <span class="stock-count">{{ app.currentStock }}/{{ app.maxStock }}</span>
          <button
            class="restock-btn"
            :disabled="app.isFull || store.money < app.restockCost"
            @click="restock(app.id)"
          >
            ${{ app.restockCost }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.stock-panel {
  position: fixed;
  top: 10px;
  left: 240px;
  width: 200px;
  padding: 10px 12px;
  background: #1a1a2eee;
  border: 1px solid #444;
  border-radius: 8px;
  z-index: 50;
  font-family: monospace;
  color: #ccc;
}

.stock-title {
  font-size: 1rem;
  color: #4ecdc4;
  margin: 0 0 8px;
  text-align: center;
}

.stock-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stock-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  &.empty .stock-label { color: #ff4444; }
}

.stock-label {
  width: 44px;
  flex-shrink: 0;
  color: #aaa;
}

.stock-bar-track {
  flex: 1;
  height: 6px;
  background: #333;
  border-radius: 3px;
  overflow: hidden;
}

.stock-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.15s ease;
}

.stock-count {
  font-size: 0.65rem;
  color: #666;
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.restock-btn {
  padding: 2px 6px;
  border: 1px solid #555;
  border-radius: 3px;
  background: #2a3a2a;
  color: #ffd93d;
  font-family: monospace;
  font-size: 0.65rem;
  font-weight: bold;
  cursor: pointer;
  flex-shrink: 0;
  &:hover:not(:disabled) { background: #3a4a3a; }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}

.stock-panel-enter-active,
.stock-panel-leave-active {
  transition: opacity 0.2s ease;
}
.stock-panel-enter-from,
.stock-panel-leave-to {
  opacity: 0;
}
</style>
