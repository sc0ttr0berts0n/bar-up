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
</template>

<style lang="scss" scoped>
.toast-stack {
  position: fixed;
  bottom: 60px;
  right: 10px;
  display: flex;
  flex-direction: column-reverse;
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
  transform: translateX(20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
