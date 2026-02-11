<template>
  <button 
    class="theme-switch" 
    :class="{ dark: isDark }"
    @click="toggleTheme"
    :title="isDark ? '切换到亮色模式' : '切换到暗色模式'"
  >
    <span class="switch-track">
      <span class="switch-icon sun">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      </span>
      <span class="switch-icon moon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </span>
      <span class="switch-thumb"></span>
    </span>
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
  
  // 更新 DOM class
  document.documentElement.classList.toggle('dark', newTheme === 'dark')
}
</script>

<style scoped>
.theme-switch {
  position: relative;
  width: 56px;
  height: 28px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.switch-track {
  position: absolute;
  inset: 0;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  padding: 3px;
  transition: background var(--transition-normal);
}

.theme-switch.dark .switch-track {
  background: var(--primary-dark);
}

.switch-icon {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  transition: all var(--transition-normal);
}

.switch-icon svg {
  width: 100%;
  height: 100%;
}

.switch-icon.sun {
  left: 6px;
  color: var(--warning-color);
  opacity: 1;
}

.switch-icon.moon {
  right: 6px;
  color: var(--primary-light);
  opacity: 0;
}

.theme-switch.dark .switch-icon.sun {
  opacity: 0;
}

.theme-switch.dark .switch-icon.moon {
  opacity: 1;
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-normal);
}

.theme-switch.dark .switch-thumb {
  transform: translateX(28px);
}

.theme-switch:hover .switch-track {
  box-shadow: 0 0 0 3px var(--primary-light);
}

.theme-switch:active .switch-thumb {
  width: 28px;
}

.theme-switch.dark:active .switch-thumb {
  transform: translateX(24px);
}
</style>
