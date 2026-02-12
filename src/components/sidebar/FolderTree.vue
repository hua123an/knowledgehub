<template>
  <div class="folder-tree">
    <!-- 根目录头部 -->
    <div class="tree-header">
      <span class="tree-title">文件夹</span>
      <button class="icon-btn icon-btn-sm" @click="showCreateDialog = true" title="新建文件夹">
        <el-icon><Plus /></el-icon>
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="foldersStore.folderTree.length === 0" class="empty-hint">
      <el-icon class="empty-icon"><FolderAdd /></el-icon>
      <p>还没有文件夹</p>
      <button class="btn btn-ghost btn-sm" @click="showCreateDialog = true">
        创建第一个文件夹
      </button>
    </div>

    <!-- 文件夹树 -->
    <div v-else class="tree-content">
      <FolderNode
        v-for="folder in foldersStore.folderTree"
        :key="folder.id"
        :folder="folder"
        :level="0"
        @select="handleSelectFolder"
        @create="handleCreateSubFolder"
        @rename="handleRename"
        @delete="handleDelete"
      />
    </div>

    <!-- 创建文件夹对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingFolder ? '重命名文件夹' : '新建文件夹'"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form @submit.prevent="handleSubmit">
        <el-form-item label="文件夹名称">
          <el-input
            v-model="folderName"
            placeholder="请输入文件夹名称"
            autofocus
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ editingFolder ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, h, defineComponent } from 'vue'
import { Plus, FolderAdd, Folder, FolderOpened, MoreFilled, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElDropdown, ElDropdownMenu, ElDropdownItem, ElIcon } from 'element-plus'
import { useFoldersStore } from '@/stores/folders'
import { useNotesStore } from '@/stores/notes'
import type { Folder as FolderType } from '@/types'

const foldersStore = useFoldersStore()
const notesStore = useNotesStore()

const showCreateDialog = ref(false)
const folderName = ref('')
const editingFolder = ref<FolderType | null>(null)
const parentFolderId = ref<string | null>(null)
const submitting = ref(false)

// 文件夹节点组件
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FolderNode: any = defineComponent({
  name: 'FolderNode',
  props: {
    folder: { type: Object as () => FolderType & { children?: FolderType[] }, required: true },
    level: { type: Number, default: 0 }
  },
  emits: ['select', 'create', 'rename', 'delete'],
  setup(props, { emit }) {
    const isExpanded = ref(foldersStore.isExpanded(props.folder.id))
    
    const hasChildren = props.folder.children && props.folder.children.length > 0
    
    const toggle = () => {
      foldersStore.toggleFolder(props.folder.id)
      isExpanded.value = foldersStore.isExpanded(props.folder.id)
    }
    
    const select = () => {
      emit('select', props.folder)
    }
    
    return () => h('div', { class: 'folder-node' }, [
      h('div', {
        class: ['folder-item', { selected: foldersStore.currentFolder?.id === props.folder.id }],
        style: { paddingLeft: `${props.level * 16 + 8}px` },
        onClick: select
      }, [
        // 展开/折叠按钮
        h('button', {
          class: ['expand-btn', { expanded: isExpanded.value, invisible: !hasChildren }],
          onClick: (e: Event) => { e.stopPropagation(); toggle() }
        }, [
          h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
            h('path', { d: 'M9 18l6-6-6-6' })
          ])
        ]),
        // 文件夹图标
        h(ElIcon, { class: 'folder-icon' }, () => isExpanded.value ? h(FolderOpened) : h(Folder)),
        // 文件夹名称
        h('span', { class: 'folder-name truncate' }, props.folder.name),
        // 操作菜单
        h(ElDropdown, {
          trigger: 'click',
          onCommand: (cmd: string) => {
            if (cmd === 'create') emit('create', props.folder.id)
            else if (cmd === 'rename') emit('rename', props.folder)
            else if (cmd === 'delete') emit('delete', props.folder)
          }
        }, {
          default: () => h('button', {
            class: 'more-btn',
            onClick: (e: Event) => e.stopPropagation()
          }, [h(ElIcon, null, () => h(MoreFilled))]),
          dropdown: () => h(ElDropdownMenu, null, () => [
            h(ElDropdownItem, { command: 'create' }, () => [
              h(ElIcon, null, () => h(Plus)),
              '新建子文件夹'
            ]),
            h(ElDropdownItem, { command: 'rename' }, () => [
              h(ElIcon, null, () => h(Edit)),
              '重命名'
            ]),
            h(ElDropdownItem, { command: 'delete', divided: true }, () => [
              h(ElIcon, null, () => h(Delete)),
              '删除'
            ])
          ])
        })
      ]),
      // 子文件夹
      isExpanded.value && hasChildren ? h('div', { class: 'folder-children' },
        props.folder.children!.map(child => 
          h(FolderNode, {
            key: child.id,
            folder: child,
            level: props.level + 1,
            onSelect: (f: FolderType) => emit('select', f),
            onCreate: (id: string) => emit('create', id),
            onRename: (f: FolderType) => emit('rename', f),
            onDelete: (f: FolderType) => emit('delete', f)
          })
        )
      ) : null
    ])
  }
})

function handleSelectFolder(folder: FolderType) {
  foldersStore.setCurrentFolder(folder)
  notesStore.setFilter({ folderId: folder.id })
}

function handleCreateSubFolder(parentId: string) {
  parentFolderId.value = parentId
  folderName.value = ''
  editingFolder.value = null
  showCreateDialog.value = true
}

function handleRename(folder: FolderType) {
  editingFolder.value = folder
  folderName.value = folder.name
  parentFolderId.value = folder.parentId
  showCreateDialog.value = true
}

async function handleDelete(folder: FolderType) {
  try {
    await ElMessageBox.confirm(
      `确定要删除文件夹 "${folder.name}" 吗？文件夹内的笔记不会被删除。`,
      '删除确认',
      { type: 'warning' }
    )
    await foldersStore.deleteFolder(folder.id)
    ElMessage.success('文件夹已删除')
  } catch {
    // 用户取消
  }
}

async function handleSubmit() {
  if (!folderName.value.trim()) {
    ElMessage.warning('请输入文件夹名称')
    return
  }
  
  submitting.value = true
  try {
    if (editingFolder.value) {
      await foldersStore.updateFolder(editingFolder.value.id, { name: folderName.value })
      ElMessage.success('文件夹已重命名')
    } else {
      await foldersStore.createFolder({
        name: folderName.value,
        parentId: parentFolderId.value
      })
      ElMessage.success('文件夹已创建')
    }
    closeDialog()
  } finally {
    submitting.value = false
  }
}

function closeDialog() {
  showCreateDialog.value = false
  folderName.value = ''
  editingFolder.value = null
  parentFolderId.value = null
}
</script>

<style scoped>
.folder-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-sm);
  margin-bottom: var(--space-sm);
}

.tree-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-xl);
  text-align: center;
}

.empty-icon {
  font-size: 32px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-md);
}

.empty-hint p {
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
  font-size: 0.875rem;
}

.btn-sm {
  font-size: 0.75rem;
  padding: var(--space-xs) var(--space-md);
}

.tree-content {
  flex: 1;
  overflow-y: auto;
}

.folder-node {
  user-select: none;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.folder-item:hover {
  background: var(--bg-hover);
}

.folder-item.selected {
  background: var(--primary-light);
  color: var(--primary-color);
}

.expand-btn {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.expand-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.expand-btn.invisible {
  visibility: hidden;
}

.expand-btn svg {
  width: 12px;
  height: 12px;
  transition: transform var(--transition-fast);
}

.expand-btn.expanded svg {
  transform: rotate(90deg);
}

.folder-icon {
  font-size: 16px;
  color: var(--warning-color);
  flex-shrink: 0;
}

.folder-name {
  flex: 1;
  font-size: 0.875rem;
  min-width: 0;
}

.more-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  opacity: 0;
  transition: all var(--transition-fast);
}

.folder-item:hover .more-btn {
  opacity: 1;
}

.more-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.folder-children {
  /* 子文件夹缩进由 padding-left 控制 */
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
</style>
