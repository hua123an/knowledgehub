import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { AppSettings } from '../types'

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  editorFontSize: 14,
  autoSave: true,
  autoSaveInterval: 30000, // 30秒
  dataPath: '',
}

export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const loading = ref(false)

  // 监听主题变化
  watch(
    () => settings.value.theme,
    (theme) => {
      applyTheme(theme)
    },
    { immediate: true }
  )

  // 应用主题
  function applyTheme(theme: 'light' | 'dark' | 'system') {
    const root = document.documentElement
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }

  // 方法
  async function fetchSettings() {
    loading.value = true
    try {
      const result = await window.api.settingsGet()
      if (result.success && result.data) {
        settings.value = { ...DEFAULT_SETTINGS, ...result.data }
      }
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(updates: Partial<AppSettings>) {
    const newSettings = { ...settings.value, ...updates }
    const result = await window.api.settingsSet(newSettings)
    if (result.success) {
      settings.value = newSettings
      return true
    }
    return false
  }

  function setTheme(theme: 'light' | 'dark' | 'system') {
    updateSettings({ theme })
  }

  function setEditorFontSize(size: number) {
    updateSettings({ editorFontSize: size })
  }

  function setAutoSave(enabled: boolean) {
    updateSettings({ autoSave: enabled })
  }

  function setAutoSaveInterval(interval: number) {
    updateSettings({ autoSaveInterval: interval })
  }

  return {
    // 状态
    settings,
    loading,
    // 方法
    fetchSettings,
    updateSettings,
    setTheme,
    setEditorFontSize,
    setAutoSave,
    setAutoSaveInterval,
  }
})
