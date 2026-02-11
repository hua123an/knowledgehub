<template>
  <div class="folder-tree">
    <div class="section-header">
      <span>文件夹</span>
      <el-button type="primary" link size="small" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>

    <el-tree
      :data="folderTree"
      :props="treeProps"
      :expand-on-click-node="false"
      :default-expand-all="true"
      node-key="id"
      @node-click="handleNodeClick"
      @node-contextmenu="handleContextMenu"
    >
      <template #default="{ node, data }">
        <div class="tree-node">
          <el-icon><Folder /></el-icon>
          <span class="node-label">{{ node.label }}</span>
        </div>
      </template>
    </el-tree>

    <div 
      class="all-notes" 
      :class="{ active: selectedFolderId === null }"
      @click="selectAllNotes"
    >
      <el-icon><Document /></el-icon>
      <span>所有笔记</span>
    </div>

    <!-- Create Folder Dialog -->
    <el-dialog v-model="showCreateDialog" title="新建文件夹" width="360px">
      <el-form :model="newFolder" label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="newFolder.name" placeholder="输入文件夹名称" />
        </el-form-item>
        <el-form-item label="位置">
          <el-tree-select
            v-model="newFolder.parentId"
            :data="folderOptionsTree"
            :props="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="根目录"
            clearable
            check-strictly
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createFolder">创建</el-button>
      </template>
    </el-dialog>

    <!-- Context Menu -->
    <el-dropdown
      ref="contextMenuRef"
      trigger="contextmenu"
      :visible="contextMenuVisible"
      @visible-change="(v: boolean) => contextMenuVisible = v"
    >
      <span></span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="editFolder">
            <el-icon><Edit /></el-icon>
            重命名
          </el-dropdown-item>
          <el-dropdown-item @click="deleteFolder" divided>
            <el-icon><Delete /></el-icon>
            删除
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Folder, Document, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFoldersStore } from '../../stores/folders'
import type { Folder as FolderType } from '../../types'

const emit = defineEmits<{
  'select-folder': [folderId: string | null]
}>()

const foldersStore = useFoldersStore()

const showCreateDialog = ref(false)
const contextMenuVisible = ref(false)
const contextMenuFolder = ref<FolderType | null>(null)
const selectedFolderId = ref<string | null>(null)
const newFolder = ref({
  name: '',
  parentId: null as string | null
})

const folderTree = computed(() => foldersStore.folderTree)

const folderOptionsTree = computed(() => {
  const root = { id: null, name: '根目录', children: folderTree.value }
  return [root]
})

const treeProps = {
  label: 'name',
  children: 'children'
}

function handleNodeClick(data: FolderType) {
  selectedFolderId.value = data.id
  emit('select-folder', data.id)
}

function handleContextMenu(event: MouseEvent, data: FolderType) {
  event.preventDefault()
  contextMenuFolder.value = data
  contextMenuVisible.value = true
}

function selectAllNotes() {
  selectedFolderId.value = null
  emit('select-folder', null)
}

async function createFolder() {
  if (!newFolder.value.name.trim()) {
    ElMessage.warning('请输入文件夹名称')
    return
  }

  await foldersStore.createFolder({
    name: newFolder.value.name.trim(),
    parentId: newFolder.value.parentId
  })

  showCreateDialog.value = false
  newFolder.value = { name: '', parentId: null }
  ElMessage.success('文件夹已创建')
}

async function editFolder() {
  if (!contextMenuFolder.value) return
  
  try {
    const { value } = await ElMessageBox.prompt('输入新名称', '重命名文件夹', {
      inputValue: contextMenuFolder.value.name,
      inputPattern: /.+/,
      inputErrorMessage: '名称不能为空'
    })
    
    await foldersStore.updateFolder(contextMenuFolder.value.id, { name: value })
    ElMessage.success('已重命名')
  } catch {
    // cancelled
  }
}

async function deleteFolder() {
  if (!contextMenuFolder.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除文件夹 "${contextMenuFolder.value.name}" 吗？文件夹内的笔记不会被删除。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await foldersStore.deleteFolder(contextMenuFolder.value.id)
    ElMessage.success('文件夹已删除')
    
    if (selectedFolderId.value === contextMenuFolder.value.id) {
      selectedFolderId.value = null
      emit('select-folder', null)
    }
  } catch {
    // cancelled
  }
}

onMounted(() => {
  foldersStore.fetchFolders()
})
</script>

<style scoped>
.folder-tree {
  padding: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
  font-size: 14px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-label {
  font-size: 14px;
}

.all-notes {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-top: 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.all-notes:hover {
  background: var(--el-fill-color-light);
}

.all-notes.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
</style>
