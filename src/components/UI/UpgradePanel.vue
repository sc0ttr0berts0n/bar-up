<script setup lang="ts">
import { computed } from "vue";
import { store } from "../../store/global";
import { UPGRADE_CONFIGS } from "../../game/Shared/UpgradeTypes";

const availableUpgrades = computed(() => {
  return UPGRADE_CONFIGS.filter(c => {
    const level = store.upgrades.levels[c.id] ?? 0;
    return level < c.maxLevel;
  }).map(c => {
    const level = store.upgrades.levels[c.id] ?? 0;
    const nextLevel = c.levels[level];
    return {
      id: c.id,
      name: c.name,
      currentLevel: level,
      cost: nextLevel.cost,
      description: nextLevel.description,
      canAfford: store.money >= nextLevel.cost,
    };
  });
});

const ownedUpgrades = computed(() => {
  return UPGRADE_CONFIGS.flatMap(c => {
    const level = store.upgrades.levels[c.id] ?? 0;
    const owned = [];
    for (let i = 0; i < level; i++) {
      owned.push({
        name: c.name,
        level: i + 1,
        description: c.levels[i].description,
      });
    }
    return owned;
  });
});
</script>

<template>
  <Transition name="panel">
    <div v-if="store.upgradePanel.visible && store.shiftPhase === 'prep'" class="upgrade-panel">
      <div class="panel-header">
        <span class="panel-title">UPGRADES</span>
        <span class="panel-money">${{ store.money }}</span>
      </div>
      <div class="panel-divider"></div>

      <div v-if="availableUpgrades.length === 0" class="panel-empty">
        All upgrades purchased!
      </div>

      <div
        v-for="(upgrade, index) in availableUpgrades"
        :key="upgrade.id"
        class="upgrade-row"
        :class="{
          'upgrade-selected': index === store.upgradePanel.selectedIndex,
          'upgrade-cant-afford': !upgrade.canAfford,
        }"
      >
        <div class="upgrade-header">
          <span class="upgrade-arrow" v-if="index === store.upgradePanel.selectedIndex">&#9654;</span>
          <span class="upgrade-name">{{ upgrade.name }}</span>
          <span class="upgrade-level">Lv{{ upgrade.currentLevel + 1 }}</span>
          <span class="upgrade-cost" :class="{ 'cost-red': !upgrade.canAfford }">${{ upgrade.cost }}</span>
        </div>
        <div class="upgrade-desc">{{ upgrade.description }}</div>
      </div>

      <template v-if="ownedUpgrades.length > 0">
        <div class="panel-divider"></div>
        <div
          v-for="(owned, index) in ownedUpgrades"
          :key="'owned-' + index"
          class="owned-row"
        >
          <span class="owned-check">&#10003;</span>
          <span class="owned-name">{{ owned.name }} Lv{{ owned.level }}</span>
        </div>
      </template>

      <div class="panel-hint">&#8593;&#8595; select &middot; Space buy &middot; Esc close</div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.upgrade-panel {
  position: fixed;
  top: 10px;
  right: 200px;
  width: 220px;
  padding: 10px 12px;
  background: #1a1a2eee;
  border: 1px solid #444;
  border-radius: 8px;
  z-index: 50;
  pointer-events: none;
  font-family: monospace;
  color: #ccc;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.panel-title {
  font-size: 0.9rem;
  font-weight: bold;
  color: #cc8844;
  letter-spacing: 1px;
}

.panel-money {
  font-size: 1.1rem;
  font-weight: bold;
  color: #ffd93d;
}

.panel-divider {
  height: 1px;
  background: #444;
  margin: 6px 0;
}

.panel-empty {
  font-size: 0.8rem;
  color: #666;
  font-style: italic;
  padding: 8px 0;
}

.upgrade-row {
  padding: 6px 4px;
  border-radius: 4px;
  margin-bottom: 4px;
  transition: background 0.1s ease;
}

.upgrade-selected {
  background: rgba(204, 136, 68, 0.15);
  border: 1px solid rgba(204, 136, 68, 0.3);
}

.upgrade-cant-afford {
  opacity: 0.5;
}

.upgrade-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

.upgrade-arrow {
  font-size: 0.7rem;
  color: #cc8844;
}

.upgrade-name {
  font-weight: bold;
  color: #ddd;
  flex: 1;
}

.upgrade-level {
  font-size: 0.7rem;
  color: #888;
}

.upgrade-cost {
  font-weight: bold;
  color: #ffd93d;
}

.cost-red {
  color: #ff4444;
}

.upgrade-desc {
  font-size: 0.7rem;
  color: #888;
  margin-top: 2px;
  padding-left: 16px;
}

.owned-row {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 0.75rem;
  color: #666;
  padding: 2px 4px;
}

.owned-check {
  color: #44aa44;
  font-size: 0.8rem;
}

.owned-name {
  color: #777;
}

.panel-hint {
  margin-top: 8px;
  font-size: 0.65rem;
  color: #555;
  text-align: center;
}

.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}
</style>
