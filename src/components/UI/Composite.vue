<script setup lang="ts">
import { store } from "../../store/global";
import HostOrJoin from "../HostOrJoin.vue";
import JoinBar from "./JoinBar.vue";
import HUD from "./HUD.vue";
import RecipeGuide from "./RecipeGuide.vue";
import GuestCardHUD from "./GuestCardHUD.vue";
import SubMenu from "./SubMenu.vue";
import EventToast from "./EventToast.vue";
import ShiftSummary from "./ShiftSummary.vue";
import MenuConfig from "./MenuConfig.vue";
import StockPanel from "./StockPanel.vue";
</script>

<template>
  <HostOrJoin v-if="store.visible.hostOrJoin" />
  <JoinBar v-if="store.visible.joinBar" />
  <HUD v-if="store.visible.hud" />
  <RecipeGuide v-if="store.visible.recipeGuide" />
  <GuestCardHUD v-if="store.visible.hud" />
  <SubMenu v-if="store.visible.hud" />
  <EventToast v-if="store.visible.hud" />
  <MenuConfig />
  <StockPanel />
  <ShiftSummary />
</template>
