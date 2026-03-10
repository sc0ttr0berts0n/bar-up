<script setup lang="ts">
import { nextTick, ref } from "vue";
import Game from "../game/View/Game";
import { delay } from "../game/Utils/Delay";
import Communicator, { EHost } from "../game/Network/Communicator/Communicator";
import { store } from "../store/global";

const choiceVisible = ref(true);
const peerIDFieldValue = ref("");
const peerIDFieldRef = ref<HTMLInputElement>();
const peerIDSubmitted = ref(false);
const hostOrJoinChoice = ref<EHost>(EHost.NONE);
const pasted = ref(false);

const makeChoice = async (choice: EHost) => {
  hostOrJoinChoice.value = choice;
  if (choice === EHost.LOCAL) {
    becomeHost();
  } else {
    choiceVisible.value = false;
    await nextTick();
    peerIDFieldRef.value?.focus();
    try {
      const clip = await navigator.clipboard.readText();
      const uuidTest =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      if (uuidTest.test(clip)) {
        peerIDFieldValue.value = clip;
        await nextTick();
        pasted.value = true;
        submitPeerID();
        peerIDFieldRef.value?.blur();
      }
    } catch {
      // clipboard access denied
    }
  }
};

const becomeHost = () => {
  Game.hostOrJoinResolver?.({ choice: EHost.LOCAL });
  choiceVisible.value = false;
  navigator.clipboard.writeText(Communicator.uuid).catch(() => {});
  store.visible.hostOrJoin = false;
  setTimeout(() => Game.focusCanvas(), 50);
};

const submitPeerID = async () => {
  const uuidTest =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const valid = uuidTest.test(peerIDFieldValue.value);
  if (valid) {
    Game.hostOrJoinResolver?.({
      choice: EHost.REMOTE,
      peerID: peerIDFieldValue.value,
    });
    await delay(2000);
    peerIDSubmitted.value = true;
    store.visible.hostOrJoin = false;
    setTimeout(() => Game.focusCanvas(), 50);
  }
};

// Auto-join via query string
const urlParams = new URLSearchParams(window.location.search);
const joinParam = urlParams.get("join");
if (joinParam) {
  setTimeout(async () => {
    hostOrJoinChoice.value = EHost.REMOTE;
    choiceVisible.value = false;
    await nextTick();
    await delay(200);
    peerIDFieldValue.value = joinParam;
    await nextTick();
    await delay(50);
    await submitPeerID();
  }, 100);
} else if (window.location.hostname === "localhost") {
  // Auto-host on localhost for dev
  setTimeout(() => {
    makeChoice(EHost.LOCAL);
  }, 100);
}
</script>

<template>
  <div class="wrapper">
    <div class="choice" v-if="choiceVisible">
      <h1>Drink Up!</h1>
      <div class="buttons">
        <button @click="makeChoice(EHost.LOCAL)">Host</button>
        <button @click="makeChoice(EHost.REMOTE)">Join</button>
      </div>
    </div>
    <div
      class="peer-id"
      v-if="
        hostOrJoinChoice === EHost.REMOTE && !choiceVisible && !peerIDSubmitted
      "
    >
      <label for="peer-id" class="peer-id-label">
        <span class="pasted" v-if="pasted">Pasted From Clipboard!<br /></span>
        Peer ID
      </label>
      <input
        @change="submitPeerID"
        @keyup="submitPeerID"
        class="peer-id-input"
        type="text"
        name="peer-id"
        ref="peerIDFieldRef"
        v-model="peerIDFieldValue"
        placeholder="[ENTER PEER ID]"
        pattern="^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
        required
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  background-color: #000000ee;
  pointer-events: auto;
}
h1 {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  color: #ffd93d;
}
.choice {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.buttons {
  display: flex;
  gap: 1rem;
}
button {
  padding: 0.75rem 2rem;
  font-size: 1.25rem;
  background: #4ecdc4;
  border: none;
  border-radius: 8px;
  color: #1a1a2e;
  cursor: pointer;
  font-weight: bold;
  &:hover {
    background: #45b7ae;
  }
}
.peer-id {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.peer-id-label {
  text-align: center;
  margin-bottom: 0.5rem;
}
.peer-id-input {
  padding: 0.5rem;
  font-family: monospace;
  font-size: 1rem;
  width: 400px;
  text-align: center;
  background: #2a2a3e;
  border: 2px solid #555;
  border-radius: 4px;
  color: white;
  &:valid {
    border-color: #50ff50;
  }
  &:not(:placeholder-shown):invalid {
    border-color: #ff5050;
  }
}
.pasted {
  color: #50ff50;
}
</style>
