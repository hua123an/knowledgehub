<template>
  <div class="welcome-container">
    <div class="welcome-content">
      <div class="logo">
        <h1 class="app-title">Knowledge<span class="hub">Hub</span></h1>
        <p class="tagline">你的第二大脑</p>
      </div>
      
      <div class="actions">
        <div class="action-card" @click="handleOpenFolder">
          <div class="icon-wrapper">
            <el-icon><FolderOpened /></el-icon>
          </div>
          <h3>打开文件夹</h3>
          <p>选择一个本地文件夹作为你的知识库工作区。</p>
        </div>
        
        <div class="action-card create" @click="handleCreateFolder">
          <div class="icon-wrapper">
            <el-icon><Plus /></el-icon>
          </div>
          <h3>新建工作区</h3>
          <p>创建一个新的空文件夹开始记录。</p>
        </div>
      </div>
      
      <div class="recent-workspaces" v-if="recentWorkspaces.length > 0">
        <h4>最近打开</h4>
        <div 
          v-for="ws in recentWorkspaces" 
          :key="ws.path" 
          class="recent-item"
          @click="openWorkspace(ws.path)"
        >
          <el-icon><Folder /></el-icon>
          <span class="path">{{ ws.path }}</span>
          <span class="date">{{ ws.lastOpened }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { FolderOpened, Plus, Folder } from '@element-plus/icons-vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { ElMessage } from 'element-plus'

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const recentWorkspaces = ref<{ path: string; lastOpened: string }[]>([]) // TODO: Load from store

async function handleOpenFolder() {
  try {
    const path = await window.api.openDirectory()
    if (path) {
      await openWorkspace(path)
    }
  } catch (error) {
    console.error('Failed to open directory:', error)
    ElMessage.error('无法打开文件夹')
  }
}

async function handleCreateFolder() {
  // Demo: In web mock, just pretend we created one
  // In Electron, we might show a save dialog or create dir dialog
  if (!window.ipcRenderer) {
     await openWorkspace('/User/demo/new-workspace')
     return
  }
  ElMessage.info('新建功能开发中...')
}

async function openWorkspace(path: string) {
  workspaceStore.setWorkspace(path)
  ElMessage.success(`已加载工作区: ${path}`)
  router.push('/')
}
</script>

<style scoped>
.welcome-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.welcome-content {
  max-width: 800px;
  width: 100%;
  padding: 40px;
  text-align: center;
}

.app-title {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  letter-spacing: -1px;
}

.hub {
  color: var(--accent-color);
}

.tagline {
  font-size: 1.2rem;
  color: var(--text-tertiary);
  margin-bottom: 3rem;
}

.actions {
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-bottom: 3rem;
}

.action-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
  width: 280px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.action-card:hover {
  transform: translateY(-5px);
  border-color: var(--accent-color);
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  background: var(--bg-primary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.action-card.create .icon-wrapper {
  color: var(--accent-color);
}

.action-card h3 {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.action-card p {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.recent-workspaces {
  text-align: left;
  max-width: 500px;
  margin: 0 auto;
}

.recent-workspaces h4 {
  margin-bottom: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recent-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.recent-item:hover {
  background: var(--bg-hover);
}

.recent-item .path {
  flex: 1;
  margin: 0 12px;
  font-family: monospace;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-item .date {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}
</style>
