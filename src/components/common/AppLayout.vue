<template>
  <div class="app-layout" :class="{ 'dark': isDark }">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <!-- Logo -->
      <div class="sidebar-header titlebar-drag-region">
        <div class="logo titlebar-no-drag" @click="router.push('/')">
          <span class="logo-mark">K</span>
          <span v-if="!sidebarCollapsed" class="logo-text">KnowledgeHub</span>
        </div>
        <button v-if="!sidebarCollapsed" class="icon-btn titlebar-no-drag" @click="toggleSidebar">
          <el-icon><Fold /></el-icon>
        </button>
      </div>

      <!-- 搜索 -->
      <div class="sidebar-search" v-if="!sidebarCollapsed">
        <div class="search-box" @click="router.push('/search')">
          <el-icon><Search /></el-icon>
          <span>搜索...</span>
          <kbd>⌘K</kbd>
        </div>
      </div>

      <!-- 导航 -->
      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item" :class="{ active: route.path === '/' }">
          <el-icon><HomeFilled /></el-icon>
          <span v-if="!sidebarCollapsed">首页</span>
        </router-link>
        <router-link to="/search" class="nav-item" :class="{ active: route.path === '/search' }">
          <el-icon><Search /></el-icon>
          <span v-if="!sidebarCollapsed">搜索</span>
        </router-link>
        <router-link to="/graph" class="nav-item" :class="{ active: route.path === '/graph' }">
          <el-icon><Share /></el-icon>
          <span v-if="!sidebarCollapsed">图谱</span>
        </router-link>
      </nav>

      <!-- 新建按钮 -->
      <div class="sidebar-create" v-if="!sidebarCollapsed">
        <button class="create-btn" @click="createNote('markdown')">
          <el-icon><Plus /></el-icon>
          新建笔记
        </button>
      </div>

      <!-- Tab 切换 -->
      <div class="sidebar-tabs" v-if="!sidebarCollapsed">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'folders' }"
          @click="activeTab = 'folders'"
        >文件夹</button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'tags' }"
          @click="activeTab = 'tags'"
        >标签</button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'recent' }"
          @click="activeTab = 'recent'"
        >最近</button>
      </div>

      <!-- 内容 -->
      <div class="sidebar-content" v-if="!sidebarCollapsed">
        <FolderTree v-if="activeTab === 'folders'" />
        <TagCloud v-else-if="activeTab === 'tags'" />
        <NoteList v-else-if="activeTab === 'recent'" :limit="10" />
      </div>

      <!-- 底部 -->
      <div class="sidebar-footer">
        <button v-if="sidebarCollapsed" class="icon-btn" @click="toggleSidebar">
          <el-icon><Expand /></el-icon>
        </button>
        <template v-else>
          <ThemeSwitch />
          <button class="icon-btn" title="设置">
            <el-icon><Setting /></el-icon>
          </button>
        </template>
      </div>
    </aside>

    <!-- 主内容 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  HomeFilled, Search, Share, Plus, Setting, Fold, Expand
} from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import { useTagsStore } from '@/stores/tags'
import FolderTree from '@/components/sidebar/FolderTree.vue'
import TagCloud from '@/components/sidebar/TagCloud.vue'
import NoteList from '@/components/sidebar/NoteList.vue'
import ThemeSwitch from '@/components/common/ThemeSwitch.vue'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()
const tagsStore = useTagsStore()

const sidebarCollapsed = ref(false)
const activeTab = ref<'folders' | 'tags' | 'recent'>('folders')

const isDark = computed(() => settingsStore.settings.theme === 'dark')

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

async function createNote(type: 'markdown' | 'bookmark' | 'snippet') {
  const note = await notesStore.createNote({
    title: type === 'markdown' ? '新笔记' : type === 'bookmark' ? '新书签' : '新代码片段',
    type,
    content: '',
    folderId: foldersStore.currentFolder?.id || null,
  })
  if (note) router.push(`/editor/${note.id}`)
}

onMounted(async () => {
  await Promise.all([
    foldersStore.fetchFolders(),
    tagsStore.fetchTags(),
    notesStore.fetchNotes(),
    settingsStore.fetchSettings(),
  ])
})
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  background: var(--bg-primary);
}

.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

/* Logo */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  padding-top: 36px;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
}

.logo-mark {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--text-primary);
  color: var(--bg-primary);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  font-weight: 700;
}

.logo-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* 搜索 */
.sidebar-search {
  padding: var(--space-sm) var(--space-md);
}

.search-box {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px var(--space-md);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.search-box:hover {
  border-color: var(--text-tertiary);
}

.search-box span {
  flex: 1;
}

.search-box kbd {
  font-family: inherit;
  font-size: 0.6875rem;
  padding: 1px 5px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  color: var(--text-tertiary);
}

/* 导航 */
.sidebar-nav {
  padding: var(--space-xs) var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px var(--space-md);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.8125rem;
  transition: all var(--transition-fast);
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--bg-hover);
  color: var(--text-primary);
  font-weight: 500;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 6px;
}

/* 新建 */
.sidebar-create {
  padding: var(--space-sm) var(--space-md);
}

.create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  width: 100%;
  padding: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.create-btn:hover {
  border-color: var(--text-tertiary);
  color: var(--text-primary);
  background: var(--bg-hover);
}

/* Tab */
.sidebar-tabs {
  display: flex;
  padding: var(--space-xs) var(--space-md);
  gap: 0;
  border-bottom: 1px solid var(--border-color);
}

.tab-btn {
  flex: 1;
  padding: 6px 0;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--text-secondary);
}

.tab-btn.active {
  color: var(--text-primary);
  border-bottom-color: var(--text-primary);
}

/* 内容 */
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm);
}

/* 底部 */
.sidebar-footer {
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar.collapsed .sidebar-footer {
  justify-content: center;
}

/* 主内容 */
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
