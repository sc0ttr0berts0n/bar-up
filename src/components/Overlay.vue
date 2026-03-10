<script setup lang="ts">
import Composite from "./UI/Composite.vue";
</script>

<template>
  <div class="overlay">
    <Composite />
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.overlay > :deep(*) {
  pointer-events: auto;
}
</style>
