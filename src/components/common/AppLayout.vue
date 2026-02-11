<template>
  <div class="app-layout" :class="{ 'dark': isDark }">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <!-- Logo 区域 -->
      <div class="sidebar-header titlebar-drag-region">
        <div class="logo titlebar-no-drag" @click="router.push('/')">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span v-if="!sidebarCollapsed" class="logo-text">KnowledgeHub</span>
        </div>
        <button v-if="!sidebarCollapsed" class="icon-btn titlebar-no-drag" @click="toggleSidebar">
          <el-icon><Fold /></el-icon>
        </button>
      </div>

      <!-- 快速操作区 -->
      <div class="sidebar-actions" v-if="!sidebarCollapsed">
        <button class="action-btn primary" @click="createNote('markdown')">
          <el-icon><Plus /></el-icon>
          <span>新建笔记</span>
        </button>
        <div class="action-btn-group">
          <button class="action-btn small" @click="createNote('bookmark')" title="添加书签">
            <el-icon><Link /></el-icon>
          </button>
          <button class="action-btn small" @click="createNote('snippet')" title="添加代码">
            <el-icon><Document /></el-icon>
          </button>
        </div>
      </div>

      <!-- 搜索框 -->
      <div class="sidebar-search" v-if="!sidebarCollapsed">
        <el-input
          v-model="searchQuery"
          placeholder="搜索笔记..."
          :prefix-icon="Search"
          clearable
          @keyup.enter="handleSearch"
        />
      </div>

      <!-- 导航菜单 -->
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
          <span v-if="!sidebarCollapsed">知识图谱</span>
        </router-link>
      </nav>

      <!-- 内容区域切换 -->
      <div class="sidebar-tabs" v-if="!sidebarCollapsed">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'folders' }"
          @click="activeTab = 'folders'"
        >
          <el-icon><FolderOpened /></el-icon>
          文件夹
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'tags' }"
          @click="activeTab = 'tags'"
        >
          <el-icon><PriceTag /></el-icon>
          标签
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'recent' }"
          @click="activeTab = 'recent'"
        >
          <el-icon><Clock /></el-icon>
          最近
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="sidebar-content" v-if="!sidebarCollapsed">
        <FolderTree v-if="activeTab === 'folders'" />
        <TagCloud v-else-if="activeTab === 'tags'" />
        <NoteList v-else-if="activeTab === 'recent'" :limit="10" />
      </div>

      <!-- 底部工具栏 -->
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

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  HomeFilled, Search, Share, FolderOpened, PriceTag, Clock,
  Plus, Link, Document, Setting, Fold, Expand
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
const searchQuery = ref('')

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
  if (note) {
    router.push(`/editor/${note.id}`)
  }
}

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value } })
  }
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
  background: var(--bg-secondary);
}

/* 侧边栏 */
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

/* Logo 区域 */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  padding-top: 40px; /* macOS 红绿灯按钮空间 */
  border-bottom: 1px solid var(--border-light);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  cursor: pointer;
}

.logo-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  border-radius: var(--radius-md);
  color: white;
}

.logo-icon svg {
  width: 20px;
  height: 20px;
}

.logo-text {
  font-size: 1.125rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 快速操作区 */
.sidebar-actions {
  padding: var(--space-md) var(--space-lg);
  display: flex;
  gap: var(--space-sm);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: all var(--transition-fast);
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.action-btn:hover {
  background: var(--bg-hover);
}

.action-btn.primary {
  flex: 1;
  background: var(--primary-color);
  color: white;
}

.action-btn.primary:hover {
  background: var(--primary-hover);
}

.action-btn-group {
  display: flex;
  gap: 4px;
}

.action-btn.small {
  padding: var(--space-sm);
}

/* 搜索框 */
.sidebar-search {
  padding: 0 var(--space-lg) var(--space-md);
}

.sidebar-search :deep(.el-input__wrapper) {
  background: var(--bg-secondary);
  box-shadow: none !important;
  border: 1px solid var(--border-color);
}

.sidebar-search :deep(.el-input__wrapper:focus-within) {
  border-color: var(--primary-color);
}

/* 导航菜单 */
.sidebar-nav {
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-bottom: 1px solid var(--border-light);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  text-decoration: none;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--primary-light);
  color: var(--primary-color);
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: var(--space-sm);
}

/* 内容切换标签 */
.sidebar-tabs {
  display: flex;
  padding: var(--space-sm) var(--space-lg);
  gap: 4px;
  background: var(--bg-secondary);
  margin: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  background: var(--bg-primary);
  color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

/* 内容区域 */
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm) var(--space-md);
}

/* 底部工具栏 */
.sidebar-footer {
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.sidebar.collapsed .sidebar-footer {
  justify-content: center;
  padding: var(--space-md);
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
