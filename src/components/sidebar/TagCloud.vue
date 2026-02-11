<template>
  <div class="tag-cloud">
    <!-- 头部 -->
    <div class="cloud-header">
      <span class="cloud-title">标签</span>
      <button class="icon-btn icon-btn-sm" @click="showCreateDialog = true" title="新建标签">
        <el-icon><Plus /></el-icon>
      </button>
    </div>

    <!-- 空状态 -->
    <div v-if="tagsStore.tags.length === 0" class="empty-hint">
      <el-icon class="empty-icon"><PriceTag /></el-icon>
      <p>还没有标签</p>
      <button class="btn btn-ghost btn-sm" @click="showCreateDialog = true">
        创建第一个标签
      </button>
    </div>

    <!-- 标签云 -->
    <div v-else class="cloud-content">
      <div
        v-for="tag in sortedTags"
        :key="tag.id"
        class="tag-item"
        :class="{ active: selectedTagId === tag.id }"
        :style="{ '--tag-color': tag.color }"
        @click="handleSelectTag(tag)"
      >
        <span class="tag-dot" :style="{ background: tag.color }"></span>
        <span class="tag-name">{{ tag.name }}</span>
        <span class="tag-count" v-if="getTagCount(tag.id) > 0">{{ getTagCount(tag.id) }}</span>
        
        <!-- 操作菜单 -->
        <el-dropdown trigger="click" @command="handleCommand($event, tag)" @click.stop>
          <button class="more-btn" @click.stop>
            <el-icon><MoreFilled /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="edit">
                <el-icon><Edit /></el-icon>
                编辑
              </el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                <el-icon><Delete /></el-icon>
                删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 创建/编辑标签对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingTag ? '编辑标签' : '新建标签'"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form @submit.prevent="handleSubmit">
        <el-form-item label="标签名称">
          <el-input
            v-model="tagName"
            placeholder="请输入标签名称"
            autofocus
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="标签颜色">
          <div class="color-picker">
            <button
              v-for="color in presetColors"
              :key="color"
              type="button"
              class="color-option"
              :class="{ selected: tagColor === color }"
              :style="{ background: color }"
              @click="tagColor = color"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ editingTag ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, PriceTag, MoreFilled, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTagsStore } from '@/stores/tags'
import { useNotesStore } from '@/stores/notes'
import type { Tag } from '@/types'

const tagsStore = useTagsStore()
const notesStore = useNotesStore()

const showCreateDialog = ref(false)
const tagName = ref('')
const tagColor = ref('#6366f1')
const editingTag = ref<Tag | null>(null)
const submitting = ref(false)
const selectedTagId = ref<string | null>(null)

const presetColors = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  '#64748b', '#1e293b'
]

const sortedTags = computed(() => {
  return [...tagsStore.tags].sort((a, b) => {
    const countA = getTagCount(a.id)
    const countB = getTagCount(b.id)
    return countB - countA
  })
})

function getTagCount(tagId: string): number {
  return notesStore.notes.filter(note => 
    note.tags?.some(t => t.id === tagId)
  ).length
}

function handleSelectTag(tag: Tag) {
  if (selectedTagId.value === tag.id) {
    selectedTagId.value = null
    notesStore.setFilter({ tagId: null })
  } else {
    selectedTagId.value = tag.id
    notesStore.setFilter({ tagId: tag.id })
  }
}

function handleCommand(command: string, tag: Tag) {
  if (command === 'edit') {
    editingTag.value = tag
    tagName.value = tag.name
    tagColor.value = tag.color
    showCreateDialog.value = true
  } else if (command === 'delete') {
    handleDelete(tag)
  }
}

async function handleDelete(tag: Tag) {
  try {
    await ElMessageBox.confirm(
      `确定要删除标签 "${tag.name}" 吗？这将从所有笔记中移除该标签。`,
      '删除确认',
      { type: 'warning' }
    )
    await tagsStore.deleteTag(tag.id)
    ElMessage.success('标签已删除')
    if (selectedTagId.value === tag.id) {
      selectedTagId.value = null
      notesStore.setFilter({ tagId: null })
    }
  } catch {
    // 用户取消
  }
}

async function handleSubmit() {
  if (!tagName.value.trim()) {
    ElMessage.warning('请输入标签名称')
    return
  }
  
  submitting.value = true
  try {
    if (editingTag.value) {
      await tagsStore.updateTag(editingTag.value.id, {
        name: tagName.value,
        color: tagColor.value
      })
      ElMessage.success('标签已更新')
    } else {
      await tagsStore.createTag({
        name: tagName.value,
        color: tagColor.value
      })
      ElMessage.success('标签已创建')
    }
    closeDialog()
  } finally {
    submitting.value = false
  }
}

function closeDialog() {
  showCreateDialog.value = false
  tagName.value = ''
  tagColor.value = '#6366f1'
  editingTag.value = null
}
</script>

<style scoped>
.tag-cloud {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.cloud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.cloud-title {
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

.cloud-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tag-item:hover {
  background: var(--bg-hover);
}

.tag-item.active {
  background: color-mix(in srgb, var(--tag-color) 15%, transparent);
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.tag-item.active .tag-name {
  color: var(--tag-color);
  font-weight: 500;
}

.tag-count {
  font-size: 0.75rem;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  border-radius: var(--radius-full);
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

.tag-item:hover .more-btn {
  opacity: 1;
}

.more-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* 颜色选择器 */
.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.color-option {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all var(--transition-fast);
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px var(--bg-primary);
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
</style>
