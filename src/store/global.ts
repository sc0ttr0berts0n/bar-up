import { reactive } from "vue";

export const store = reactive({
  visible: {
    hostOrJoin: true,
    hud: false,
    joinBar: false,
    recipeGuide: false,
  },
  money: 0,
  shiftPhase: "prep" as "prep" | "service" | "closing",
  shiftTimer: 0,
  heldItemType: null as string | null,
});
