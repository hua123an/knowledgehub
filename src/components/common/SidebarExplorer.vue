<template>
  <div class="sidebar-explorer">
    <!-- 顶部工作区信息 -->
    <div class="workspace-header">
      <div class="workspace-info">
        <el-icon class="ws-icon"><FolderOpened /></el-icon>
        <span class="ws-name" :title="currentWorkspace || ''">{{ workspaceName }}</span>
      </div>
      <div class="workspace-actions">
        <el-tooltip content="新建笔记" placement="bottom">
          <el-button link class="action-btn" @click="createNote">
            <el-icon><Plus /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="新建文件夹" placement="bottom">
          <el-button link class="action-btn" @click="createFolder">
            <el-icon><FolderAdd /></el-icon>
          </el-button>
        </el-tooltip>
        <el-dropdown trigger="click" @command="handleCommand">
          <el-button link class="action-btn">
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="switch">切换工作区</el-dropdown-item>
              <el-dropdown-item command="reveal">在系统打开</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 统一滚动区域 -->
    <div class="explorer-scroll-area">
      <!-- 核心文件树 -->
      <div class="section-container">
        <div class="section-header-lite">
          <el-icon><Files /></el-icon>
          <span>所有笔记</span>
        </div>
        <el-tree
          ref="treeRef"
          class="file-tree"
          :data="treeData"
          :props="defaultProps"
          :filter-node-method="filterNode"
          node-key="id"
          highlight-current
          :current-node-key="currentNodeId"
          :expand-on-click-node="false"
          @node-click="handleNodeClick"
        >
          <template #default="{ node, data }">
            <div class="custom-tree-node" @mouseenter="hoverNodeId = data.id" @mouseleave="hoverNodeId = null">
              <div class="node-content">
                <el-icon 
                  v-if="data.isFolder" 
                  class="expand-arrow" 
                  :class="{ 'is-expanded': node.expanded }"
                >
                  <ArrowRight />
                </el-icon>
                <el-icon v-if="data.isFolder" class="node-icon folder"><Folder /></el-icon>
                <el-icon v-else class="node-icon file"><Document /></el-icon>
                <span class="node-label">{{ node.label }}</span>
              </div>
              
              <div v-if="hoverNodeId === data.id" class="node-actions" @click.stop>
                <el-dropdown trigger="click" @command="(cmd: string) => handleNodeCommand(cmd, data)">
                   <span class="more-btn">
                     <el-icon><MoreFilled /></el-icon>
                   </span>
                   <template #dropdown>
                     <el-dropdown-menu>
                       <template v-if="data.isFolder">
                         <el-dropdown-item command="new-note">新建笔记</el-dropdown-item>
                         <el-dropdown-item command="new-folder">新建子文件夹</el-dropdown-item>
                         <el-dropdown-item command="rename-folder" divided>重命名</el-dropdown-item>
                         <el-dropdown-item command="delete-folder" style="color: var(--el-color-danger)">删除</el-dropdown-item>
                       </template>
                       <template v-else>
                         <el-dropdown-item command="rename">重命名</el-dropdown-item>
                         <el-dropdown-item command="move">移动到...</el-dropdown-item>
                         <el-dropdown-item command="reveal">在系统显示</el-dropdown-item>
                         <el-dropdown-item command="delete" divided style="color: var(--el-color-danger)">删除</el-dropdown-item>
                       </template>
                     </el-dropdown-menu>
                   </template>
                </el-dropdown>
              </div>
            </div>
          </template>
        </el-tree>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  FolderOpened, Plus, FolderAdd, MoreFilled, 
  Folder, Document, Files, ArrowRight
} from '@element-plus/icons-vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps<{
  filterText?: string
}>()

const router = useRouter()
const route = useRoute()
const workspaceStore = useWorkspaceStore()
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()

// State
const treeRef = ref()
const hoverNodeId = ref<string | null>(null)

// Computed
const currentWorkspace = computed(() => workspaceStore.currentWorkspace)
const workspaceName = computed(() => {
  const path = currentWorkspace.value
  return path ? path.split('/').pop() : '工作区'
})

const currentNodeId = computed(() => route.params.id as string)

// Build Tree Data
const treeData = computed(() => {
  const notesByFolder = notesStore.notesByFolder
  
  // 1. 获取所有文件夹并将它们映射为树节点，并按 sortOrder 排序
  const folderNodes = [...foldersStore.folders]
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map(f => ({
      id: f.id,
      label: f.name,
      isFolder: true,
      parentId: f.parentId,
      children: [] as any[]
    }))
  
  // 2. 将笔记作为叶子节点放入对应的文件夹节点中，并按更新时间排序
  folderNodes.forEach(fNode => {
    const notes = notesByFolder.get(fNode.id) || []
    fNode.children = notes
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map(n => ({
        id: n.id,
        label: n.title || '无标题',
        content: n.content || '',
        isFolder: false
      }))
  })
  
  // 3. 处理文件夹的层级嵌套
  const rootNodes: any[] = []
  const nodeMap = new Map(folderNodes.map(node => [node.id, node]))
  
  folderNodes.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!
      parent.children.unshift(node) // 文件夹排在笔记前面
    } else {
      rootNodes.push(node)
    }
  })
  
  // 4. 添加根目录下的笔记，并按更新时间排序
  const rootNotes = (notesByFolder.get(null) || [])
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map(n => ({
      id: n.id,
      label: n.title || '无标题',
      content: n.content || '',
      isFolder: false
    }))
  
  return [...rootNodes, ...rootNotes]
})

const defaultProps = {
  children: 'children',
  label: 'label',
}

// Methods
watch([() => currentNodeId.value, () => treeData.value], ([id]) => {
  if (id && treeRef.value) {
    // 延迟到下个 tick 确保 DOM 和数据已同步
    nextTick(() => {
      treeRef.value.setCurrentKey(id)
    })
  }
}, { immediate: true, deep: true })

watch(() => props.filterText, (val) => {
  if (treeRef.value) {
    treeRef.value.filter(val)
  }
})

const filterNode = (value: string, data: any) => {
  if (!value) return true
  const searchStr = value.toLowerCase()
  // 同时匹配标题和内容
  const matchTitle = data.label.toLowerCase().includes(searchStr)
  const matchContent = !data.isFolder && data.content && data.content.toLowerCase().includes(searchStr)
  
  return matchTitle || matchContent
}

async function handleNodeCommand(command: string, data: any) {
  if (command === 'new-note') {
    const note = await notesStore.createNote({
      title: '新笔记',
      type: 'markdown',
      content: '',
      folderId: data.id
    })
    if (note) openNote(note.id)
  } else if (command === 'new-folder') {
    ElMessageBox.prompt('请输入文件夹名称', '新建子文件夹', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    }).then((res: any) => {
      if (res.value) {
        foldersStore.createFolder({ name: res.value, parentId: data.id })
        ElMessage.success('文件夹已创建')
      }
    }).catch(() => null)
  } else if (command === 'rename-folder') {
    ElMessageBox.prompt('请输入新名称', '重命名文件夹', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: data.label,
    }).then((res: any) => {
      if (res.value && res.value !== data.label) {
        foldersStore.updateFolder(data.id, { name: res.value })
        ElMessage.success('重命名成功')
      }
    }).catch(() => null)
  } else if (command === 'delete-folder') {
    try {
      await ElMessageBox.confirm('确定要删除这个文件夹吗？其中的笔记将被标记为未分类。', '警告', {
        type: 'warning'
      })
      await foldersStore.deleteFolder(data.id)
      notesStore.fetchNotes() // 刷新笔记列表更新 folderId
      ElMessage.success('文件夹已删除')
    } catch {}
  } else if (command === 'rename') {
    try {
      const result: any = await ElMessageBox.prompt('请输入新名称', '重命名', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: data.label,
      })
      
      if (result.value && result.value !== data.label) {
        await notesStore.updateNote(data.id, { title: result.value })
        ElMessage.success('重命名成功')
        notesStore.fetchNotes()
      }
    } catch {
      // Cancelled
    }
  } else if (command === 'delete') {
    try {
      await ElMessageBox.confirm('确定要删除这个文件吗？此操作将删除本地文件，无法恢复。', '警告', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await notesStore.deleteNote(data.id)
      ElMessage.success('已删除')
      notesStore.fetchNotes()
      if (route.params.id === data.id) {
        router.push('/')
      }
    } catch {
      // Cancelled
    }
  } else if (command === 'reveal') {
    if (data.isFolder) {
       ElMessage.info('文件夹显示暂不支持')
    } else {
       if (currentWorkspace.value) {
         const fullPath = `${currentWorkspace.value}/${data.label}.md`
         window.api.revealInExplorer(fullPath)
       }
    }
  } else if (command === 'move') {
     // 触发移动逻辑
     handleMoveNote(data)
  }
}

async function handleMoveNote(noteData: any) {
  // 简单的实现：点击后弹出一个选择列表（或者可以用弹出层树）
  // 这里我们先用最简单的 MessageBox 选择
  const folderOptions = foldersStore.folders.map(f => f.name)
  if (folderOptions.length === 0) {
    ElMessage.info('没有文件夹可移动')
    return
  }

  try {
    // 这里简单弹出一个提示选择，更好的做法是 UI 选框
    // 我们先复用 EditorV2 的逻辑思维
    // 在这里由于 MessageBox 不支持复杂列表，我们直接跳转或者之后实现专门的弹窗
    ElMessage.info('请在编辑器顶部选择文件夹移动')
    openNote(noteData.id)
  } catch (e) {}
}

function handleNodeClick(data: any, node: any) {
  if (data.isFolder) {
    node.expanded = !node.expanded
  } else {
    openNote(data.id)
  }
}

function openNote(id: string) {
  // 查找笔记所属文件夹并展开
  const note = notesStore.notes.find(n => n.id === id)
  if (note && note.folderId) {
    foldersStore.expandFolder(note.folderId)
  }
  router.push({ name: 'editor', params: { id } })
}

async function createNote() {
  const note = await notesStore.createNote({
    title: '新笔记',
    type: 'markdown',
    content: '',
    folderId: null
  })
  if (note) {
    ElMessage.success('笔记已创建')
    openNote(note.id)
  }
}

async function createFolder() {
  ElMessageBox.prompt('请输入文件夹名称', '新建文件夹', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then((res: any) => {
    if (res.value) {
      foldersStore.createFolder({ name: res.value, parentId: null })
      ElMessage.success('文件夹已创建')
    }
  }).catch(() => null)
}

function handleCommand(command: string) {
  if (command === 'switch') {
    workspaceStore.clearWorkspace()
    router.push('/welcome')
  }
}

onMounted(() => {
  // Refresh data
  foldersStore.fetchFolders()
  notesStore.fetchNotes()
})
</script>

<style scoped>
.sidebar-explorer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  user-select: none;
}

.workspace-header {
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: transparent;
}

.workspace-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  font-size: 0.95rem;
}

.ws-icon {
  color: var(--text-secondary);
}

.ws-name {
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 140px;
}

.workspace-actions {
  display: flex;
  gap: 2px;
}

.action-btn {
  padding: 6px;
  height: 28px;
  width: 28px;
  color: var(--text-tertiary);
  transition: all 0.2s;
}
.action-btn:hover { color: var(--text-primary); background: var(--bg-hover); border-radius: 6px; }

.explorer-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.section-container {
  margin-bottom: 24px;
}

.section-header-lite {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
}

.section-header-lite .el-icon {
  transition: transform 0.2s;
}

.section-header-lite .rotated {
  transform: rotate(-90deg);
}

.file-tree {
  background: transparent;
  color: var(--text-secondary);
}

:deep(.el-tree-node__content) {
  height: 34px;
  border-radius: 6px;
  margin: 1px 0;
  padding: 0 4px !important;
}
:deep(.el-tree-node__content:hover) { background: var(--bg-hover); }
:deep(.el-tree-node.is-current > .el-tree-node__content) { 
  background: var(--bg-active) !important; 
  color: var(--text-primary);
  font-weight: 500;
}

/* 隐藏树自带的展开图标，改用我们自定义的 */
:deep(.el-tree-node__expand-icon) {
  display: none;
}

.custom-tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-size: 0.875rem;
  overflow: hidden;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  flex: 1;
}

.expand-arrow {
  font-size: 10px;
  color: var(--text-tertiary);
  transition: transform 0.2s;
  width: 14px;
}

.expand-arrow.is-expanded {
  transform: rotate(90deg);
}

.node-icon { 
  font-size: 1.1em; 
  opacity: 0.7;
}

.node-icon.folder { color: var(--text-secondary); }
.node-icon.file { color: var(--text-tertiary); }

.node-label { 
  text-overflow: ellipsis; 
  overflow: hidden; 
  white-space: nowrap; 
}

.node-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.custom-tree-node:hover .node-actions {
  opacity: 1;
}

.more-btn {
  padding: 2px;
  border-radius: 4px;
  color: var(--text-tertiary);
}

.more-btn {
  padding: 2px;
  border-radius: 4px;
  color: var(--text-tertiary);
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
