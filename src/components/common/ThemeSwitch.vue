<template>
  <el-switch
    v-model="isDark"
    :active-icon="Moon"
    :inactive-icon="Sunny"
    @change="toggleTheme"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Moon, Sunny } from '@element-plus/icons-vue'
import { useSettingsStore } from '../../stores/settings'

const settingsStore = useSettingsStore()
const isDark = ref(false)

function toggleTheme(value: boolean) {
  const theme = value ? 'dark' : 'light'
  settingsStore.setTheme(theme)
  applyTheme(theme)
}

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDark.value = prefersDark
    root.classList.toggle('dark', prefersDark)
  } else {
    isDark.value = theme === 'dark'
    root.classList.toggle('dark', theme === 'dark')
  }
}

onMounted(() => {
  const theme = settingsStore.settings.theme
  applyTheme(theme)
  
  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (settingsStore.settings.theme === 'system') {
      isDark.value = e.matches
      document.documentElement.classList.toggle('dark', e.matches)
    }
  })
})
</script>
