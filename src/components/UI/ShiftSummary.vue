<script setup lang="ts">
import { store } from "../../store/global";

function dismiss() {
  store.shiftSummary.visible = false;
}
</script>

<template>
  <Transition name="summary">
    <div v-if="store.shiftSummary.visible" class="summary-overlay" @click="dismiss">
      <div class="summary-card" @click.stop>
        <h2 class="summary-title">Shift Summary</h2>

        <div class="summary-rows">
          <div class="summary-row">
            <span class="row-label">Guests Served</span>
            <span class="row-value">{{ store.shiftSummary.guestsServed }} / {{ store.shiftSummary.guestsTotal }}</span>
          </div>
          <div class="summary-row">
            <span class="row-label">Money Earned</span>
            <span class="row-value money">${{ store.shiftSummary.moneyEarned }}</span>
          </div>
          <div class="summary-row">
            <span class="row-label">Reputation</span>
            <span class="row-value" :class="store.shiftSummary.reputationChange >= 0 ? 'positive' : 'negative'">
              {{ store.shiftSummary.reputationChange >= 0 ? '+' : '' }}{{ store.shiftSummary.reputationChange }}
            </span>
          </div>
        </div>

        <div v-if="store.shiftSummary.fights || store.shiftSummary.slips || store.shiftSummary.overserves || store.shiftSummary.policeRaids" class="summary-events">
          <div class="events-title">Events</div>
          <div v-if="store.shiftSummary.fights" class="event-row">Bar fights: {{ store.shiftSummary.fights }}</div>
          <div v-if="store.shiftSummary.slips" class="event-row">Slips: {{ store.shiftSummary.slips }}</div>
          <div v-if="store.shiftSummary.overserves" class="event-row">Overserves: {{ store.shiftSummary.overserves }}</div>
          <div v-if="store.shiftSummary.policeRaids" class="event-row event-row-raid">Police raids: {{ store.shiftSummary.policeRaids }}</div>
        </div>

        <button class="summary-btn" @click="dismiss">Continue</button>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.summary-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.summary-card {
  background: #1a1a2e;
  border: 1px solid #555;
  border-radius: 12px;
  padding: 24px 32px;
  min-width: 280px;
  font-family: monospace;
  color: #ccc;
}

.summary-title {
  font-size: 1.3rem;
  color: #fff;
  margin: 0 0 16px;
  text-align: center;
}

.summary-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.row-label { color: #888; }
.row-value { color: #eee; font-weight: bold; }
.row-value.money { color: #ffd93d; }
.row-value.positive { color: #44cc44; }
.row-value.negative { color: #ff4444; }

.summary-events {
  border-top: 1px solid #333;
  padding-top: 12px;
  margin-bottom: 16px;
}

.events-title {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 6px;
}

.event-row {
  font-size: 0.85rem;
  color: #ff8844;
}
.event-row-raid {
  color: #ff3333;
}

.summary-btn {
  display: block;
  width: 100%;
  padding: 8px;
  background: #4ecdc4;
  color: #111;
  border: none;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  &:hover { background: #5de0d7; }
}

.summary-enter-active,
.summary-leave-active {
  transition: opacity 0.3s ease;
}
.summary-enter-from,
.summary-leave-to {
  opacity: 0;
}
</style>
