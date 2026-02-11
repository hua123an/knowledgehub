<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <div class="logo" v-if="!collapsed">
        <h1>KnowledgeHub</h1>
      </div>
      <el-button link @click="emit('toggle')">
        <el-icon :size="20">
          <Fold v-if="!collapsed" />
          <Expand v-else />
        </el-icon>
      </el-button>
    </div>

    <nav class="sidebar-nav">
      <router-link to="/" class="nav-item" :class="{ active: route.name === 'home' }">
        <el-icon><HomeFilled /></el-icon>
        <span v-if="!collapsed">首页</span>
      </router-link>
      
      <router-link to="/search" class="nav-item" :class="{ active: route.name === 'search' }">
        <el-icon><Search /></el-icon>
        <span v-if="!collapsed">搜索</span>
      </router-link>
      
      <router-link to="/graph" class="nav-item" :class="{ active: route.name === 'graph' }">
        <el-icon><Share /></el-icon>
        <span v-if="!collapsed">知识图谱</span>
      </router-link>
    </nav>

    <el-divider v-if="!collapsed" />

    <div class="sidebar-content" v-if="!collapsed">
      <FolderTree @select-folder="handleFolderSelect" />
      
      <el-divider />
      
      <NoteList :folder-id="selectedFolderId" />
      
      <el-divider />
      
      <TagCloud @select="handleTagSelect" />
    </div>

    <div class="sidebar-footer" v-if="!collapsed">
      <ThemeSwitch />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { HomeFilled, Search, Share, Fold, Expand } from '@element-plus/icons-vue'
import FolderTree from '../sidebar/FolderTree.vue'
import NoteList from '../sidebar/NoteList.vue'
import TagCloud from '../sidebar/TagCloud.vue'
import ThemeSwitch from './ThemeSwitch.vue'

defineProps<{
  collapsed?: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const route = useRoute()
const selectedFolderId = ref<string | null>(null)
const selectedTagId = ref<string | null>(null)

function handleFolderSelect(folderId: string | null) {
  selectedFolderId.value = folderId
}

function handleTagSelect(tagId: string | null) {
  selectedTagId.value = tagId
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  height: 100%;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.logo h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sidebar-nav {
  padding: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--el-text-color-regular);
  text-decoration: none;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.nav-item:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.nav-item.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: center;
}
</style>
