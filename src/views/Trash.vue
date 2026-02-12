<template>
  <div class="trash-view">
    <!-- 头部 -->
    <header class="trash-header">
      <div class="trash-header-left">
        <h1 class="trash-title">回收站</h1>
        <span class="trash-count">{{ trashNotes.length }} 篇笔记</span>
      </div>
      <button
        v-if="trashNotes.length > 0"
        class="btn btn-danger-text"
        @click="handleEmptyTrash"
      >
        <el-icon><Delete /></el-icon>
        清空回收站
      </button>
    </header>

    <!-- 笔记列表 -->
    <div v-if="trashNotes.length > 0" class="trash-list">
      <div
        v-for="note in trashNotes"
        :key="note.id"
        class="trash-item"
      >
        <div class="trash-item-left">
          <el-icon class="trash-item-icon" :class="note.type">
            <component :is="typeIcon(note.type)" />
          </el-icon>
          <span class="trash-item-title">{{ note.title || '无标题' }}</span>
        </div>
        <div class="trash-item-right">
          <span class="trash-item-time">{{ formatDeletedTime(note.deletedAt) }}</span>
          <button class="action-btn restore-btn" @click="handleRestore(note)">恢复</button>
          <button class="action-btn delete-btn" @click="handlePermanentDelete(note)">永久删除</button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="trash-empty">
      <el-icon class="trash-empty-icon"><Delete /></el-icon>
      <p class="trash-empty-text">回收站为空</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, markRaw } from 'vue'
import { Delete, Document, Link, DocumentCopy } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface TrashNote {
  id: string
  title: string
  content: string
  type: string
  folderId: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string
  isStarred: boolean
}

const trashNotes = ref<TrashNote[]>([])

const typeIconMap: Record<string, any> = {
  markdown: markRaw(Document),
  bookmark: markRaw(Link),
  snippet: markRaw(DocumentCopy),
}

function typeIcon(type: string) {
  return typeIconMap[type] || typeIconMap.markdown
}

function formatDeletedTime(time: string): string {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚删除'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

async function loadTrash() {
  try {
    const res = await window.api.noteTrashList()
    if (res.success && res.data) {
      trashNotes.value = res.data as TrashNote[]
    }
  } catch (e) {
    console.error('加载回收站失败:', e)
  }
}

async function handleRestore(note: TrashNote) {
  try {
    const res = await window.api.noteRestore(note.id)
    if (res.success) {
      trashNotes.value = trashNotes.value.filter(n => n.id !== note.id)
      ElMessage.success(`已恢复「${note.title || '无标题'}」`)
    }
  } catch (e) {
    ElMessage.error('恢复失败')
  }
}

async function handlePermanentDelete(note: TrashNote) {
  try {
    await ElMessageBox.confirm(
      `确定永久删除「${note.title || '无标题'}」吗？此操作不可撤销。`,
      '永久删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    const res = await window.api.notePermanentDelete(note.id)
    if (res.success) {
      trashNotes.value = trashNotes.value.filter(n => n.id !== note.id)
      ElMessage.success('已永久删除')
    }
  } catch {
    // 用户取消，不做处理
  }
}

async function handleEmptyTrash() {
  try {
    await ElMessageBox.confirm(
      `确定清空回收站吗？将永久删除 ${trashNotes.value.length} 篇笔记，此操作不可撤销。`,
      '清空回收站',
      {
        confirmButtonText: '全部删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    const ids = trashNotes.value.map(n => n.id)
    for (const id of ids) {
      await window.api.notePermanentDelete(id)
    }
    trashNotes.value = []
    ElMessage.success('回收站已清空')
  } catch {
    // 用户取消，不做处理
  }
}

onMounted(() => {
  loadTrash()
})
</script>

<style scoped>
.trash-view {
  height: 100%;
  overflow-y: auto;
  padding: 40px 60px;
  max-width: 900px;
  margin: 0 auto;
}

.trash-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
}

.trash-header-left {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
}

.trash-title {
  font-size: 1.5rem;
  font-weight: 600;
}

.trash-count {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}

.btn-danger-text {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 6px 14px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--danger-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.btn-danger-text:hover {
  background: rgba(220, 53, 69, 0.08);
}

/* 列表 */
.trash-list {
  display: flex;
  flex-direction: column;
}

.trash-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-sm);
  border-bottom: 1px solid var(--border-light);
  transition: background var(--transition-fast);
}

.trash-item:hover {
  background: var(--bg-hover);
}

.trash-item:last-child {
  border-bottom: none;
}

.trash-item-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
  flex: 1;
}

.trash-item-icon {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--text-tertiary);
}

.trash-item-icon.markdown { color: var(--type-markdown); }
.trash-item-icon.bookmark { color: var(--type-bookmark); }
.trash-item-icon.snippet { color: var(--type-snippet); }

.trash-item-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trash-item-right {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  flex-shrink: 0;
  margin-left: var(--space-lg);
}

.trash-item-time {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.action-btn {
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 2px 0;
  transition: opacity var(--transition-fast);
}

.action-btn:hover {
  opacity: 0.8;
}

.restore-btn {
  color: #16a34a;
}

.delete-btn {
  color: var(--danger-color);
}

/* 空状态 */
.trash-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  text-align: center;
}

.trash-empty-icon {
  font-size: 48px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-lg);
  opacity: 0.4;
}

.trash-empty-text {
  font-size: 0.875rem;
  color: var(--text-tertiary);
}
</style>
