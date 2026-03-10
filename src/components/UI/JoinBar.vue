<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import Communicator from "../../game/Network/Communicator/Communicator";
import Game from "../../game/View/Game";
import {
  type INetworkPacketClientJoinGame,
  type INetworkPacketClientLeaveGame,
  PACKET_TYPE,
} from "../../game/Network/Communicator/PacketTypes";
import { EHost } from "../../game/Network/Communicator/Communicator";
import GameSettings from "../../game/Shared/GameSettings";
import { PLAYER_COLORS } from "../../game/Shared/PlayerTypes";

const slots = ref<(boolean)[]>([]);
const mySlot = ref<number | null>(null);
const copied = ref(false);
let pollInterval: number | undefined;

const isHost = Communicator.hostType === EHost.LOCAL;

const getInviteUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.set("join", Communicator.uuid);
  return url.toString();
};

const copyInviteUrl = () => {
  navigator.clipboard.writeText(getInviteUrl()).then(() => {
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  });
};

const updateSlots = () => {
  const playerSlots = Game.playerSlots;
  slots.value = playerSlots.map((p) => p !== undefined);
  // Check if I'm in a slot
  mySlot.value = null;
  playerSlots.forEach((p, i) => {
    if (p?.id === Communicator.uuid) {
      mySlot.value = i;
    }
  });
};

const joinSlot = (index: number) => {
  if (mySlot.value !== null) return;
  Communicator.sendToServer<INetworkPacketClientJoinGame>({
    uuid: Communicator.uuid,
    type: PACKET_TYPE.CLIENT_JOIN_GAME,
    data: { index },
  });
  setTimeout(() => Game.focusCanvas(), 50);
};

const leaveSlot = () => {
  if (mySlot.value === null) return;
  Communicator.sendToServer<INetworkPacketClientLeaveGame>({
    uuid: Communicator.uuid,
    type: PACKET_TYPE.CLIENT_LEAVE_GAME,
  });
};

const getSlotColor = (index: number): string => {
  const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
  return "#" + color.toString(16).padStart(6, "0");
};

onMounted(() => {
  pollInterval = window.setInterval(updateSlots, 300);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<template>
  <div class="join-bar">
    <div
      v-for="(occupied, index) in slots"
      :key="index"
      class="slot"
      :class="{
        occupied,
        mine: mySlot === index,
      }"
      :style="{ borderColor: getSlotColor(index) }"
      @click="
        mySlot === index ? leaveSlot() : !occupied ? joinSlot(index) : null
      "
    >
      <div
        class="slot-color"
        :style="{ backgroundColor: getSlotColor(index) }"
      ></div>
      <span v-if="mySlot === index">Leave</span>
      <span v-else-if="occupied">Taken</span>
      <span v-else>Join P{{ index + 1 }}</span>
    </div>
    <div v-if="isHost" class="slot invite" @click="copyInviteUrl">
      <span>{{ copied ? "Copied!" : "Invite" }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.join-bar {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 50;
  pointer-events: auto;
}
.slot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 2px solid #555;
  border-radius: 6px;
  background: #1a1a2ecc;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: bold;
  color: white;
  user-select: none;

  &.occupied {
    opacity: 0.5;
    cursor: default;
  }
  &.mine {
    opacity: 1;
    cursor: pointer;
    background: #2a2a4ecc;
  }
  &:hover:not(.occupied) {
    background: #2a2a4ecc;
  }
}
.slot-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.invite {
  border-color: #4ecdc4 !important;
  color: #4ecdc4;
  &:hover {
    background: #2a2a4ecc;
  }
}
</style>
