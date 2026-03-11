<script setup lang="ts">
import { computed } from "vue";
import { store } from "../../store/global";
import { ITEM_DISPLAY } from "../../game/Shared/ItemTypes";
import { EGuestStatus, EGuestTrait, TRAIT_DISPLAY } from "../../game/Shared/GuestTypes";
import GameSettings from "../../game/Shared/GameSettings";

const guest = computed(() => store.facingGuest);

const happinessPercent = computed(() => {
  if (!guest.value) return 0;
  return Math.round((guest.value.happiness / GameSettings.happinessMax) * 100);
});

const happinessColor = computed(() => {
  const p = happinessPercent.value / 100;
  if (p > 0.6) return "#00cc00";
  if (p > 0.3) return "#cccc00";
  return "#cc0000";
});

const drunkPercent = computed(() => {
  if (!guest.value) return 0;
  return Math.round(Math.min(100, guest.value.drunkenness * 100));
});

const drunkGoalPercent = computed(() => {
  if (!guest.value) return 0;
  return Math.round(Math.min(100, guest.value.drunkGoal * 100));
});

const statusLabel = computed(() => {
  if (!guest.value) return "";
  switch (guest.value.status) {
    case EGuestStatus.DECIDING: return "Deciding";
    case EGuestStatus.READY_TO_ORDER: return "Ready to order";
    case EGuestStatus.WAITING_FOR_ORDER: return "Waiting for drink";
    case EGuestStatus.DRINKING: return "Drinking";
    case EGuestStatus.FIGHTING: return "FIGHTING!";
    case EGuestStatus.SLIPPED: return "Slipped!";
    case EGuestStatus.LEAVING: return "Leaving";
    case EGuestStatus.WALKING_TO_SEAT: return "Finding seat";
    case EGuestStatus.WAITING_AT_DOOR: return "Waiting at door";
    case EGuestStatus.WALKING_TO_QUEUE: return "Walking to queue";
    case EGuestStatus.QUEUED: return "In queue";
    case EGuestStatus.RETURNING_TO_SEAT: return "Returning to seat";
    default: return "";
  }
});

const revealedTraits = computed(() => {
  if (!guest.value) return [];
  return (guest.value.revealedTraits ?? []).map((t: string) => {
    const display = TRAIT_DISPLAY[t as EGuestTrait];
    return display ? { key: t, ...display } : null;
  }).filter(Boolean) as { key: string; label: string; icon: string }[];
});

const unknownTraitCount = computed(() => {
  if (!guest.value) return 0;
  return (guest.value.traitCount ?? 0) - (guest.value.revealedTraits?.length ?? 0);
});

const preferredDrinkDisplay = computed(() => {
  if (!guest.value?.preferredDrink) return null;
  return ITEM_DISPLAY[guest.value.preferredDrink] ?? null;
});
</script>

<template>
  <Transition name="card">
    <div v-if="guest" class="guest-card">
      <div class="guest-card-name">{{ guest.name }}</div>
      <div class="guest-card-status">{{ statusLabel }}</div>

      <div class="guest-card-bars">
        <div class="bar-row">
          <span class="bar-label">Happy</span>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: happinessPercent + '%', background: happinessColor }"></div>
          </div>
          <span class="bar-value">{{ happinessPercent }}%</span>
        </div>
        <div class="bar-row">
          <span class="bar-label">Drunk</span>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: drunkPercent + '%', background: '#d47474' }"></div>
            <div class="bar-goal" :style="{ left: drunkGoalPercent + '%' }"></div>
          </div>
          <span class="bar-value">{{ drunkPercent }}%</span>
        </div>
      </div>

      <div class="guest-card-info">
        <div class="info-row">
          <span class="info-label">Orders</span>
          <span class="info-value">{{ guest.ordersCompleted }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Rounds left</span>
          <span class="info-value">{{ guest.roundsRemaining }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Chats</span>
          <span class="info-value">{{ guest.chatCount }}</span>
        </div>
      </div>

      <div v-if="revealedTraits.length > 0 || unknownTraitCount > 0" class="guest-card-traits">
        <div v-for="trait in revealedTraits" :key="trait.key" class="trait-row">
          <span class="trait-icon">{{ trait.icon }}</span>
          <span class="trait-label">{{ trait.label }}</span>
        </div>
        <div v-for="i in unknownTraitCount" :key="'unknown-' + i" class="trait-row trait-unknown">
          <span class="trait-icon">?</span>
          <span class="trait-label">Unknown</span>
        </div>
      </div>

      <div v-if="preferredDrinkDisplay" class="guest-card-pref">
        <span class="pref-heart">&#9829;</span>
        <span class="pref-label" :style="{ color: '#' + preferredDrinkDisplay.color.toString(16).padStart(6, '0') }">
          {{ preferredDrinkDisplay.label }}
        </span>
      </div>
      <div v-else-if="guest.chatCount > 0" class="guest-card-pref guest-card-pref-unknown">
        <span class="pref-heart">&#9825;</span>
        <span class="pref-label">Preference unknown</span>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.guest-card {
  position: fixed;
  top: 10px;
  right: 10px;
  width: 180px;
  padding: 10px 12px;
  background: #1a1a2eee;
  border: 1px solid #444;
  border-radius: 8px;
  z-index: 50;
  pointer-events: none;
  font-family: monospace;
  color: #ccc;
}

.guest-card-name {
  font-size: 1.1rem;
  font-weight: bold;
  color: #fff;
  margin-bottom: 2px;
}

.guest-card-status {
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 8px;
}

.guest-card-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bar-label {
  font-size: 0.7rem;
  color: #888;
  width: 36px;
  flex-shrink: 0;
}

.bar-track {
  position: relative;
  flex: 1;
  height: 6px;
  background: #333;
  border-radius: 3px;
  overflow: visible;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.15s ease;
}

.bar-goal {
  position: absolute;
  top: -1px;
  width: 2px;
  height: 8px;
  background: #fff;
  border-radius: 1px;
  opacity: 0.7;
  transition: left 0.15s ease;
}

.bar-value {
  font-size: 0.65rem;
  color: #666;
  width: 30px;
  text-align: right;
  flex-shrink: 0;
}

.guest-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 6px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.info-label {
  color: #666;
}

.info-value {
  color: #aaa;
}

.guest-card-traits {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid #333;
}

.trait-row {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 0.75rem;
}

.trait-icon { font-size: 0.85rem; }
.trait-label { color: #bbb; }
.trait-unknown {
  .trait-icon { color: #555; }
  .trait-label { color: #555; font-style: italic; }
}

.guest-card-pref {
  padding-top: 6px;
  border-top: 1px solid #333;
  font-size: 0.8rem;
  display: flex;
  gap: 4px;
  align-items: center;
}

.pref-heart {
  color: #ff6b6b;
}

.guest-card-pref-unknown {
  .pref-heart {
    color: #555;
  }
  .pref-label {
    color: #555;
    font-style: italic;
  }
}

.card-enter-active,
.card-leave-active {
  transition: opacity 0.2s ease;
}

.card-enter-from,
.card-leave-to {
  opacity: 0;
}
</style>
