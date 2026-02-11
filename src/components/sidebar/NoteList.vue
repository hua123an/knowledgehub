<template>
  <div class="note-list">
    <!-- 头部 -->
    <div class="list-header" v-if="showHeader">
      <span class="list-title">{{ title }}</span>
      <span class="list-count" v-if="displayNotes.length">{{ displayNotes.length }}</span>
    </div>

    <!-- 空状态 -->
    <div v-if="displayNotes.length === 0" class="empty-hint">
      <el-icon class="empty-icon"><Document /></el-icon>
      <p>{{ emptyText }}</p>
    </div>

    <!-- 笔记列表 -->
    <div v-else class="list-content">
      <div
        v-for="note in displayNotes"
        :key="note.id"
        class="note-item"
        :class="{ active: currentNoteId === note.id }"
        @click="handleSelectNote(note)"
      >
        <!-- 类型图标 -->
        <div class="note-icon" :class="note.type">
          <el-icon v-if="note.type === 'markdown'"><EditPen /></el-icon>
          <el-icon v-else-if="note.type === 'bookmark'"><Link /></el-icon>
          <el-icon v-else><Document /></el-icon>
        </div>
        
        <!-- 笔记信息 -->
        <div class="note-info">
          <div class="note-title truncate">{{ note.title || '无标题' }}</div>
          <div class="note-meta">
            <span class="note-time">{{ formatTime(note.updatedAt) }}</span>
            <span v-if="note.tags && note.tags.length" class="note-tags">
              <el-icon><PriceTag /></el-icon>
              {{ note.tags.length }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Document, EditPen, Link, PriceTag } from '@element-plus/icons-vue'
import { useNotesStore } from '@/stores/notes'
import type { Note } from '@/types'

interface Props {
  title?: string
  showHeader?: boolean
  limit?: number
  emptyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '最近笔记',
  showHeader: true,
  limit: 0,
  emptyText: '暂无笔记'
})

const router = useRouter()
const route = useRoute()
const notesStore = useNotesStore()

const currentNoteId = computed(() => route.params.id as string)

const displayNotes = computed(() => {
  const notes = [...notesStore.filteredNotes].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
  return props.limit > 0 ? notes.slice(0, props.limit) : notes
})

function formatTime(time: string): string {
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function handleSelectNote(note: Note) {
  router.push(`/editor/${note.id}`)
}
</script>

<style scoped>
.note-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.list-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.list-count {
  font-size: 0.625rem;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: var(--radius-full);
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
  font-size: 0.875rem;
}

.list-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.note-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.note-item:hover {
  background: var(--bg-hover);
}

.note-item.active {
  background: var(--primary-light);
}

.note-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  font-size: 14px;
}

.note-icon.markdown {
  background: rgba(99, 102, 241, 0.1);
  color: var(--type-markdown);
}

.note-icon.bookmark {
  background: rgba(16, 185, 129, 0.1);
  color: var(--type-bookmark);
}

.note-icon.snippet {
  background: rgba(245, 158, 11, 0.1);
  color: var(--type-snippet);
}

.note-info {
  flex: 1;
  min-width: 0;
}

.note-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.note-item.active .note-title {
  color: var(--primary-color);
}

.note-meta {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.note-tags {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
