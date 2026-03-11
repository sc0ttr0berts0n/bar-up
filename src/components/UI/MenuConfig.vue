<script setup lang="ts">
import { computed } from "vue";
import { store } from "../../store/global";
import { RECIPES } from "../../game/Shared/DrinkRecipes";
import { ITEM_DISPLAY } from "../../game/Shared/ItemTypes";
import Communicator from "../../game/Network/Communicator/Communicator";
import { PACKET_TYPE, type INetworkPacketClientSetMenu } from "../../game/Network/Communicator/PacketTypes";

const isVisible = computed(() => store.shiftPhase === "prep" && store.visible.hud);

const menuItems = computed(() => {
  return store.menuConfig.map((cfg) => {
    const recipe = RECIPES[cfg.drinkKey];
    const display = ITEM_DISPLAY[cfg.drinkKey];
    return {
      drinkKey: cfg.drinkKey,
      name: recipe?.name ?? cfg.drinkKey,
      baseCost: recipe?.baseCost ?? 0,
      price: cfg.price,
      enabled: cfg.enabled,
      color: display?.color ?? 0x888888,
    };
  });
});

function toggleDrink(drinkKey: string, enabled: boolean) {
  Communicator.sendToServer<INetworkPacketClientSetMenu>({
    uuid: Communicator.uuid,
    type: PACKET_TYPE.CLIENT_SET_MENU,
    data: {
      drinkKey,
      enabled,
      price: store.menuConfig.find((c) => c.drinkKey === drinkKey)?.price ?? 5,
    },
  });
}

function adjustPrice(drinkKey: string, delta: number) {
  const current = store.menuConfig.find((c) => c.drinkKey === drinkKey);
  if (!current) return;
  const newPrice = Math.max(1, current.price + delta);
  Communicator.sendToServer<INetworkPacketClientSetMenu>({
    uuid: Communicator.uuid,
    type: PACKET_TYPE.CLIENT_SET_MENU,
    data: {
      drinkKey,
      enabled: current.enabled,
      price: newPrice,
    },
  });
}
</script>

<template>
  <Transition name="menu-config">
    <div v-if="isVisible" class="menu-config">
      <h3 class="menu-title">Menu</h3>
      <div class="menu-list">
        <div
          v-for="item in menuItems"
          :key="item.drinkKey"
          class="menu-item"
          :class="{ disabled: !item.enabled }"
        >
          <button
            class="toggle-btn"
            :class="{ on: item.enabled }"
            @click="toggleDrink(item.drinkKey, !item.enabled)"
          >
            {{ item.enabled ? "ON" : "OFF" }}
          </button>
          <span
            class="drink-name"
            :style="{ color: '#' + item.color.toString(16).padStart(6, '0') }"
          >
            {{ item.name }}
          </span>
          <span class="drink-cost">${{ item.baseCost }}</span>
          <div class="price-control">
            <button class="price-btn" @click="adjustPrice(item.drinkKey, -1)">-</button>
            <span class="price-value">${{ item.price }}</span>
            <button class="price-btn" @click="adjustPrice(item.drinkKey, 1)">+</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.menu-config {
  position: fixed;
  top: 10px;
  left: 10px;
  width: 220px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 10px 12px;
  background: #1a1a2eee;
  border: 1px solid #444;
  border-radius: 8px;
  z-index: 50;
  font-family: monospace;
  color: #ccc;
}

.menu-title {
  font-size: 1rem;
  color: #ffd93d;
  margin: 0 0 8px;
  text-align: center;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  padding: 3px 0;
  &.disabled {
    opacity: 0.5;
  }
}

.toggle-btn {
  width: 32px;
  padding: 2px 0;
  border: 1px solid #555;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.65rem;
  font-weight: bold;
  cursor: pointer;
  background: #333;
  color: #888;
  flex-shrink: 0;
  &.on {
    background: #2a5a2a;
    color: #44cc44;
    border-color: #44cc44;
  }
}

.drink-name {
  flex: 1;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drink-cost {
  color: #666;
  font-size: 0.65rem;
  flex-shrink: 0;
}

.price-control {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.price-btn {
  width: 18px;
  height: 18px;
  border: 1px solid #555;
  border-radius: 3px;
  background: #333;
  color: #ccc;
  font-family: monospace;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  &:hover {
    background: #444;
  }
}

.price-value {
  font-weight: bold;
  color: #ffd93d;
  min-width: 24px;
  text-align: center;
}

.menu-config-enter-active,
.menu-config-leave-active {
  transition: opacity 0.2s ease;
}
.menu-config-enter-from,
.menu-config-leave-to {
  opacity: 0;
}
</style>
