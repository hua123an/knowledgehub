import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useWorkspaceStore = defineStore('workspace', () => {
  const currentWorkspace = ref<string | null>(localStorage.getItem('currentWorkspace'))
  const recentWorkspaces = ref<string[]>([])

  async function setWorkspace(path: string) {
    currentWorkspace.value = path
    localStorage.setItem('currentWorkspace', path)
    
    // Add to recent
    if (!recentWorkspaces.value.includes(path)) {
      recentWorkspaces.value.unshift(path)
      // Limit to 5
      if (recentWorkspaces.value.length > 5) {
        recentWorkspaces.value.pop()
      }
    }

    // Sync with backend (trigger scan)
    try {
      if (window.api && window.api.setWorkspace) {
        await window.api.setWorkspace(path)
      }
    } catch (e) {
      console.error('Backend workspace sync failed:', e)
    }
  }

  // Initialize backend state on app load
  async function init() {
    console.log('WorkspaceStore: initializing...')
    if (currentWorkspace.value && window.api && window.api.setWorkspace) {
       try {
         await window.api.setWorkspace(currentWorkspace.value)
       } catch (e) {
         console.error('Backend workspace init failed:', e)
       }
    }
  }

  function clearWorkspace() {
    currentWorkspace.value = null
    localStorage.removeItem('currentWorkspace')
  }

  return {
    currentWorkspace,
    recentWorkspaces,
    setWorkspace,
    clearWorkspace,
    init
  }
})
