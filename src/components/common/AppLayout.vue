<template>
  <div class="app-layout" :class="{ 'dark': isDark }">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <!-- Logo -->
      <div class="sidebar-header titlebar-drag-region">
        <div class="logo titlebar-no-drag" @click="router.push('/')">
          <img src="/logo.png" class="logo-img" alt="KnowledgeHub Logo" />
          <span v-if="!sidebarCollapsed" class="logo-text">KnowledgeHub</span>
        </div>
        <button v-if="!sidebarCollapsed" class="icon-btn titlebar-no-drag" @click="toggleSidebar">
          <el-icon><Fold /></el-icon>
        </button>
      </div>

      <!-- 搜索 -->
      <div class="sidebar-search" v-if="!sidebarCollapsed">
        <div class="search-box-wrapper">
          <el-popover
            v-model:visible="showSearchDropdown"
            placement="bottom-start"
            :width="280"
            trigger="manual"
            popper-class="search-results-popper"
          >
            <template #reference>
              <el-input
                ref="searchInputRef"
                v-model="sidebarSearchText"
                placeholder="搜索笔记内容..."
                prefix-icon="Search"
                @input="handleInputSearch"
                @keydown.enter="handleEnterSearch"
                @focus="handleSearchFocus"
                @blur="handleSearchBlur"
                class="global-search-input"
                clearable
                size="default"
              >
                <template #suffix>
                  <kbd class="shortcut-hint">⌘K</kbd>
                </template>
              </el-input>
            </template>
            
            <div class="search-results-dropdown">
              <div v-if="isSearching" class="search-loading">
                <el-icon class="is-loading"><Loading /></el-icon> 正在搜索...
              </div>
              <template v-else-if="quickSearchResults.length">
                <div 
                  v-for="res in quickSearchResults" 
                  :key="res.id" 
                  class="search-result-item"
                  @mousedown="selectSearchResult(res.id)"
                >
                  <div class="res-title" v-html="highlightText(res.title, sidebarSearchText)"></div>
                  <div class="res-snippet" v-html="highlightText(res.snippet, sidebarSearchText)"></div>
                </div>
              </template>
              <div v-else class="search-empty">未找到相关内容</div>
            </div>
          </el-popover>
        </div>
      </div>

      <!-- 导航 -->
      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item" :class="{ active: route.path === '/' }">
          <el-icon><HomeFilled /></el-icon>
          <span v-if="!sidebarCollapsed">首页</span>
        </router-link>
        <router-link to="/graph" class="nav-item" :class="{ active: route.path === '/graph' }">
          <el-icon><Share /></el-icon>
          <span v-if="!sidebarCollapsed">图谱</span>
        </router-link>
        <router-link to="/trash" class="nav-item" :class="{ active: route.path === '/trash' }">
          <el-icon><Delete /></el-icon>
          <span v-if="!sidebarCollapsed">回收站</span>
        </router-link>
      </nav>

      <!-- 资源管理器 (合并了文件/标签/最近) -->
      <div class="sidebar-content" v-if="!sidebarCollapsed">
        <SidebarExplorer :filterText="sidebarSearchText" />
      </div>

      <!-- 底部 -->
      <div class="sidebar-footer">
        <button v-if="sidebarCollapsed" class="icon-btn" @click="toggleSidebar">
          <el-icon><Expand /></el-icon>
        </button>
        <template v-else>
          <ThemeSwitch />
          <button class="icon-btn" title="设置" @click="router.push('/settings')">
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

    <!-- AI 浮动按钮 -->
    <button class="ai-fab" @click="toggleAIChat" :class="{ active: aiStore.chatOpen }">
      AI
    </button>

    <!-- AI 聊天面板 -->
    <AIChatPanel v-if="aiStore.chatOpen" />

    <!-- AI 设置弹窗 -->
    <AISettings v-if="showSettings" @close="showSettings = false" />

    <!-- 命令面板 -->
    <CommandPalette :visible="showCommandPalette" @close="showCommandPalette = false" @action="handlePaletteAction" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  HomeFilled, Share, Setting, Fold, Expand, Loading, Delete
} from '@element-plus/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import { useTagsStore } from '@/stores/tags'
import { useAIStore } from '@/stores/ai'
import SidebarExplorer from './SidebarExplorer.vue'
import ThemeSwitch from '@/components/common/ThemeSwitch.vue'
import AIChatPanel from '@/components/ai/AIChatPanel.vue'
import AISettings from '@/components/ai/AISettings.vue'
import CommandPalette from '@/components/common/CommandPalette.vue'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()
const tagsStore = useTagsStore()
const aiStore = useAIStore()

const sidebarCollapsed = ref(false)
const showSettings = ref(false)
const showCommandPalette = ref(false)
const sidebarSearchText = ref('')
const searchInputRef = ref<any>(null)
const showSearchDropdown = ref(false)
const quickSearchResults = ref<any[]>([])
const isSearching = ref(false)
let searchBatchTimer: any = null

function handleSearchFocus() {
  if (sidebarSearchText.value.trim()) {
    showSearchDropdown.value = true
  }
}

function handleSearchBlur() {
  // 延迟关闭，确保点击事件能触发
  setTimeout(() => {
    showSearchDropdown.value = false
  }, 200)
}

function handleInputSearch() {
  const query = sidebarSearchText.value.trim()
  if (!query) {
    showSearchDropdown.value = false
    quickSearchResults.value = []
    return
  }
  
  showSearchDropdown.value = true
  isSearching.value = true
  
  if (searchBatchTimer) clearTimeout(searchBatchTimer)
  searchBatchTimer = setTimeout(async () => {
    try {
      const results = await notesStore.searchNotes(query)
      quickSearchResults.value = results.slice(0, 6) // 快搜只取前6
    } finally {
      isSearching.value = false
    }
  }, 300)
}

function handleEnterSearch() {
  showSearchDropdown.value = false
  if (sidebarSearchText.value) {
    router.push({ path: '/search', query: { q: sidebarSearchText.value } })
  }
}

function selectSearchResult(id: string) {
  showSearchDropdown.value = false
  router.push(`/editor/${id}`)
}

function highlightText(text: string, query: string) {
  if (!text || !query) return text || ''
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

const isDark = computed(() => settingsStore.settings.theme === 'dark')

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function toggleAIChat() {
  aiStore.chatOpen = !aiStore.chatOpen
}

async function handlePaletteAction(action: { type: string; payload: any }) {
  if (action.type === 'navigate') {
    router.push(action.payload)
  } else if (action.type === 'openNote') {
    router.push(`/editor/${action.payload}`)
  } else if (action.type === 'create') {
    if (action.payload === 'note') {
      const note = await notesStore.createNote({ title: '无标题', type: 'markdown' })
      if (note) router.push(`/editor/${note.id}`)
    } else if (action.payload === 'folder') {
      await foldersStore.createFolder({ name: '新文件夹' })
    }
  } else if (action.type === 'theme') {
    settingsStore.setTheme(action.payload)
  }
}

onMounted(async () => {
  // 快捷键支持
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      showCommandPalette.value = true
    }
  })

  await Promise.all([
    foldersStore.fetchFolders(),
    tagsStore.fetchTags(),
    notesStore.fetchNotes(),
    settingsStore.fetchSettings(),
  ])
  // 加载 AI 配置
  await aiStore.loadConfig()
  await aiStore.loadConversations()
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
.sidebar.collapsed { width: var(--sidebar-collapsed-width); }

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  padding-top: 36px;
}

.logo { display: flex; align-items: center; gap: var(--space-sm); cursor: pointer; }
.logo-img {
  width: 24px; height: 24px;
  border-radius: var(--radius-sm);
  object-fit: contain;
  background: var(--text-primary);
}
.logo-text { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }

.sidebar-search { padding: 0 16px 12px; }

.search-box-wrapper .global-search-input {
  --el-input-bg-color: var(--bg-secondary);
  --el-input-border-color: transparent;
  --el-input-hover-border-color: var(--border-color);
  --el-input-focus-border-color: var(--text-primary);
}
.search-box-wrapper :deep(.el-input__wrapper) {
  padding-left: 8px;
  border-radius: 6px !important;
  box-shadow: none !important;
  border: 1px solid var(--border-color);
}
.search-box-wrapper :deep(.el-input__wrapper.is-focus) {
  border-color: var(--text-primary);
}

.shortcut-hint {
  font-size: 10px;
  color: var(--text-tertiary);
  padding: 2px 4px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  line-height: 1;
}

.sidebar-nav { padding: var(--space-xs) var(--space-sm); display: flex; flex-direction: column; gap: 1px; }
.nav-item {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: 6px var(--space-md); border-radius: var(--radius-md);
  color: var(--text-secondary); text-decoration: none; font-size: 0.8125rem;
}
.nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.nav-item.active { background: var(--bg-hover); color: var(--text-primary); font-weight: 500; }
.sidebar.collapsed .nav-item { justify-content: center; padding: 6px; }

.sidebar-create { padding: var(--space-sm) var(--space-md); }
.create-btn {
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  width: 100%; padding: 6px; font-size: 0.8125rem; font-weight: 500;
  color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: var(--radius-md);
}
.create-btn:hover { border-color: var(--text-tertiary); color: var(--text-primary); background: var(--bg-hover); }

.sidebar-tabs { display: flex; padding: var(--space-xs) var(--space-md); border-bottom: 1px solid var(--border-color); }
.tab-btn {
  flex: 1; padding: 6px 0; font-size: 0.75rem; color: var(--text-tertiary);
  border-bottom: 2px solid transparent;
}
.tab-btn:hover { color: var(--text-secondary); }
.tab-btn.active { color: var(--text-primary); border-bottom-color: var(--text-primary); }

.sidebar-content { flex: 1; overflow-y: auto; padding: var(--space-sm); }

.sidebar-footer {
  padding: var(--space-sm) var(--space-md); border-top: 1px solid var(--border-color);
  display: flex; align-items: center; justify-content: space-between;
}
.sidebar.collapsed .sidebar-footer { justify-content: center; }

.main-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

/* 搜索下拉框样式 */
.search-results-dropdown {
  max-height: 400px;
  overflow-y: auto;
  padding: 4px 0;
}

.search-result-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}

.search-result-item:hover {
  background: var(--bg-hover);
}

.res-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.res-snippet {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.search-result-item mark) {
  background: transparent;
  color: var(--text-primary);
  text-decoration: underline;
  font-weight: 600;
  padding: 0;
}

.search-loading, .search-empty {
  padding: 20px;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}

/* AI 浮动按钮 */
.ai-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--text-primary);
  color: var(--bg-primary);
  font-size: 0.8125rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  z-index: 1000;
  transition: all 0.2s;
}
.ai-fab:hover { transform: scale(1.08); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); }
.ai-fab.active { background: var(--accent-color); color: #fff; }
</style>
