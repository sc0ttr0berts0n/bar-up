<script setup lang="ts">
import { store } from "../../store/global";
</script>

<template>
  <div class="toast-stack">
    <TransitionGroup name="toast">
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        class="toast-item"
        :style="{ borderLeftColor: toast.color, opacity: Math.min(1, toast.timer / 0.5) }"
      >
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </div>

  <!-- Center-screen flash for critical events -->
  <Transition name="flash">
    <div
      v-if="store.centerFlash"
      class="center-flash"
      :style="{ color: store.centerFlash.color, textShadow: `0 0 20px ${store.centerFlash.color}, 0 2px 8px rgba(0,0,0,0.8)` }"
    >
      {{ store.centerFlash.message }}
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.toast-stack {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 60;
  pointer-events: none;
}

.toast-item {
  padding: 6px 12px;
  background: #1a1a2eee;
  border-left: 3px solid #fff;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
  font-weight: bold;
  color: #eee;
  white-space: nowrap;
}

.toast-enter-active {
  transition: all 0.2s ease;
}
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Center-screen flash */
.center-flash {
  position: fixed;
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: monospace;
  font-size: 2.2rem;
  font-weight: bold;
  letter-spacing: 2px;
  text-transform: uppercase;
  z-index: 70;
  pointer-events: none;
  white-space: nowrap;
}

.flash-enter-active {
  transition: all 0.15s ease-out;
}
.flash-leave-active {
  transition: all 0.4s ease-in;
}
.flash-enter-from {
  opacity: 0;
  transform: translate(-50%, -50%) scale(1.5);
}
.flash-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.9);
}
</style>
