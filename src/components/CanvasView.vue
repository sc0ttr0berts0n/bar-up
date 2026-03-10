<script setup lang="ts">
import { ref, onMounted } from "vue";
import Game from "../game/View/Game";

const canvas = ref<HTMLCanvasElement>();
onMounted(async () => {
  Game.init(canvas.value!);
});
</script>

<template>
  <canvas ref="canvas" tabindex="0"></canvas>
</template>

<style scoped>
canvas {
  position: absolute;
  inset: 0;
  outline: none;
}

canvas:focus {
  outline: none;
}
</style>
