<template>
  <button class="theme-toggle" @click="toggleTheme" :title="isDark ? '亮色' : '暗色'">
    <span v-if="isDark">☀</span>
    <span v-else>☾</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.settings.theme === 'dark')

function toggleTheme() {
  const newTheme = isDark.value ? 'light' : 'dark'
  settingsStore.updateSettings({ theme: newTheme })
  document.documentElement.classList.toggle('dark', newTheme === 'dark')
}
</script>

<style scoped>
.theme-toggle {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.875rem;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
