<script setup lang="ts">
import { store } from "../../store/global";
import HostOrJoin from "../HostOrJoin.vue";
import JoinBar from "./JoinBar.vue";
import HUD from "./HUD.vue";
import RecipeGuide from "./RecipeGuide.vue";
</script>

<template>
  <HostOrJoin v-if="store.visible.hostOrJoin" />
  <JoinBar v-if="store.visible.joinBar" />
  <HUD v-if="store.visible.hud" />
  <RecipeGuide v-if="store.visible.recipeGuide" />
</template>
