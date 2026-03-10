<script setup lang="ts">
import { RECIPES } from "../../game/Shared/DrinkRecipes";
import { APPLIANCE_CONFIGS } from "../../game/Shared/ApplianceTypes";

const recipes = Object.entries(RECIPES).map(([key, recipe]) => ({
  key,
  name: recipe.name,
  price: recipe.menuPrice,
  steps: recipe.steps.map(
    (s) => APPLIANCE_CONFIGS[s.applianceType].label,
  ),
}));
</script>

<template>
  <div class="recipe-guide">
    <div class="recipe-title">RECIPES</div>
    <div v-for="r in recipes" :key="r.key" class="recipe">
      <div class="recipe-name">{{ r.name }} <span class="recipe-price">${{ r.price }}</span></div>
      <div class="recipe-steps">{{ r.steps.join(" → ") }}</div>
    </div>
    <div class="recipe-hint">
      [E] / [Space] to interact
    </div>
  </div>
</template>

<style lang="scss" scoped>
.recipe-guide {
  position: fixed;
  bottom: 60px;
  right: 10px;
  padding: 10px 14px;
  background: #1a1a2ecc;
  border: 1px solid #333;
  border-radius: 8px;
  z-index: 50;
  pointer-events: none;
  font-family: monospace;
  min-width: 160px;
}
.recipe-title {
  font-size: 0.75rem;
  font-weight: bold;
  color: #888;
  margin-bottom: 6px;
  letter-spacing: 1px;
}
.recipe {
  margin-bottom: 6px;
}
.recipe-name {
  font-size: 0.9rem;
  font-weight: bold;
  color: #fff;
}
.recipe-price {
  color: #ffd93d;
  font-weight: normal;
}
.recipe-steps {
  font-size: 0.75rem;
  color: #aaa;
  padding-left: 4px;
}
.recipe-hint {
  margin-top: 8px;
  font-size: 0.7rem;
  color: #666;
  border-top: 1px solid #333;
  padding-top: 6px;
}
</style>
