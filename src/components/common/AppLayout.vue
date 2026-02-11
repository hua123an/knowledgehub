<template>
  <div class="app-layout">
    <AppSidebar 
      :collapsed="sidebarCollapsed" 
      @toggle="toggleSidebar"
    />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppSidebar from './AppSidebar.vue'
import { useNotesStore } from '../../stores/notes'
import { useFoldersStore } from '../../stores/folders'
import { useTagsStore } from '../../stores/tags'
import { useSettingsStore } from '../../stores/settings'

const notesStore = useNotesStore()
const foldersStore = useFoldersStore()
const tagsStore = useTagsStore()
const settingsStore = useSettingsStore()

const sidebarCollapsed = ref(false)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

onMounted(async () => {
  // 初始化数据
  await Promise.all([
    notesStore.fetchNotes(),
    foldersStore.fetchFolders(),
    tagsStore.fetchTags(),
    settingsStore.fetchSettings(),
  ])
})
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: auto;
  background: var(--el-bg-color-page);
}
</style>
