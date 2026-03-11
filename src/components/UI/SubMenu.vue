<script setup lang="ts">
import { computed } from "vue";
import { store } from "../../store/global";

const submenuStyle = computed(() => ({
  left: `${store.submenu.screenX}px`,
  top: `${store.submenu.screenY - 50}px`,
}));
</script>

<template>
  <Transition name="submenu">
    <div v-if="store.submenu.visible" class="submenu" :style="submenuStyle">
      <div
        v-for="(option, i) in store.submenu.options"
        :key="i"
        :class="{ selected: i === store.submenu.selectedIndex }"
        class="submenu-option"
      >
        <span class="option-key">{{ i + 1 }}</span>
        <span
          class="option-swatch"
          :style="{ background: '#' + option.color.toString(16).padStart(6, '0') }"
        ></span>
        <span class="option-label">{{ option.label }}</span>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.submenu {
  position: fixed;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: #1a1a2eee;
  border: 1px solid #555;
  border-radius: 6px;
  z-index: 60;
  pointer-events: none;
  font-family: monospace;
}

.submenu-option {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: background 0.1s;
}

.submenu-option.selected {
  background: #ffffff18;
  border-color: #888;
}

.option-key {
  font-size: 0.7rem;
  color: #666;
  font-weight: bold;
  min-width: 12px;
}

.option-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.option-label {
  font-size: 0.85rem;
  color: #ccc;
  white-space: nowrap;
}

.submenu-option.selected .option-label {
  color: #fff;
}

.submenu-enter-active,
.submenu-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.submenu-enter-from,
.submenu-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}
</style>
