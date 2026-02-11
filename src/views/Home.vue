<template>
  <div class="home-view">
    <!-- 头部 -->
    <header class="home-header">
      <div>
        <h1 class="home-title">{{ getGreeting() }}</h1>
        <p class="home-subtitle">{{ notesStore.notes.length }} 篇笔记 · {{ tagsStore.tags.length }} 个标签</p>
      </div>
      <div class="home-actions">
        <button class="btn btn-primary" @click="createNote('markdown')">
          <el-icon><Plus /></el-icon>
          新建笔记
        </button>
      </div>
    </header>

    <!-- 统计 -->
    <section class="stats-row">
      <div class="stat-item" v-for="item in statItems" :key="item.label">
        <span class="stat-value">{{ item.value }}</span>
        <span class="stat-label">{{ item.label }}</span>
      </div>
    </section>

    <!-- 主内容 -->
    <div class="home-body">
      <!-- 最近编辑 -->
      <section class="home-section">
        <div class="section-header">
          <h2 class="section-title">最近编辑</h2>
          <router-link v-if="recentNotes.length" to="/search" class="section-link">查看全部</router-link>
        </div>

        <div v-if="recentNotes.length === 0" class="empty-hint">
          <p>还没有笔记</p>
          <button class="btn btn-secondary" @click="createNote('markdown')">
            <el-icon><Plus /></el-icon>
            创建第一篇笔记
          </button>
        </div>

        <div v-else class="notes-list">
          <div
            v-for="note in recentNotes"
            :key="note.id"
            class="note-row"
            @click="openNote(note.id)"
          >
            <div class="note-type-dot" :class="note.type"></div>
            <div class="note-row-info">
              <span class="note-row-title">{{ note.title || '无标题' }}</span>
              <span class="note-row-preview">{{ getPreview(note) }}</span>
            </div>
            <span class="note-row-time">{{ formatTime(note.updatedAt) }}</span>
          </div>
        </div>
      </section>

      <!-- 侧栏 -->
      <aside class="home-aside">
        <!-- 快速操作 -->
        <section class="aside-section">
          <h3 class="aside-title">快速操作</h3>
          <div class="quick-links">
            <button class="quick-link" @click="createNote('bookmark')">
              <el-icon><Link /></el-icon>
              添加书签
            </button>
            <button class="quick-link" @click="createNote('snippet')">
              <el-icon><Document /></el-icon>
              代码片段
            </button>
            <router-link to="/search" class="quick-link">
              <el-icon><Search /></el-icon>
              搜索
            </router-link>
            <router-link to="/graph" class="quick-link">
              <el-icon><Share /></el-icon>
              知识图谱
            </router-link>
          </div>
        </section>

        <!-- 标签 -->
        <section class="aside-section" v-if="popularTags.length">
          <h3 class="aside-title">标签</h3>
          <div class="aside-tags">
            <span
              v-for="item in popularTags"
              :key="item.tag.id"
              class="aside-tag"
              @click="filterByTag(item.tag)"
            >
              {{ item.tag.name }}
              <span class="aside-tag-count">{{ item.count }}</span>
            </span>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Link, Document, Search, Share } from '@element-plus/icons-vue'
import { useNotesStore } from '@/stores/notes'
import { useTagsStore } from '@/stores/tags'
import { useFoldersStore } from '@/stores/folders'
import type { Note, Tag } from '@/types'

const router = useRouter()
const notesStore = useNotesStore()
const tagsStore = useTagsStore()
const foldersStore = useFoldersStore()

const stats = computed(() => ({
  markdown: notesStore.notes.filter(n => n.type === 'markdown').length,
  bookmark: notesStore.notes.filter(n => n.type === 'bookmark').length,
  snippet: notesStore.notes.filter(n => n.type === 'snippet').length,
}))

const statItems = computed(() => [
  { value: stats.value.markdown, label: '笔记' },
  { value: stats.value.bookmark, label: '书签' },
  { value: stats.value.snippet, label: '代码' },
  { value: tagsStore.tags.length, label: '标签' },
])

const recentNotes = computed(() => {
  return [...notesStore.notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10)
})

const popularTags = computed(() => {
  const tagCounts = new Map<string, { tag: Tag; count: number }>()
  notesStore.notes.forEach(note => {
    note.tags?.forEach(tag => {
      if (tagCounts.has(tag.id)) {
        tagCounts.get(tag.id)!.count++
      } else {
        tagCounts.set(tag.id, { tag, count: 1 })
      }
    })
  })
  return [...tagCounts.values()].sort((a, b) => b.count - a.count).slice(0, 8)
})

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

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

function getPreview(note: Note): string {
  if (note.type === 'bookmark') return note.description || note.url || ''
  if (note.type === 'snippet') return note.content?.slice(0, 80) || ''
  return (note.content || '').replace(/[#*`\[\]]/g, '').trim().slice(0, 80)
}

async function createNote(type: 'markdown' | 'bookmark' | 'snippet') {
  const note = await notesStore.createNote({
    title: type === 'markdown' ? '新笔记' : type === 'bookmark' ? '新书签' : '新代码片段',
    type,
    content: '',
    folderId: foldersStore.currentFolder?.id || null,
  })
  if (note) router.push(`/editor/${note.id}`)
}

function openNote(id: string) { router.push(`/editor/${id}`) }

function filterByTag(tag: Tag) {
  notesStore.setFilter({ tagId: tag.id })
  router.push('/search')
}
</script>

<style scoped>
.home-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-xl) var(--space-2xl);
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-xl);
}

.home-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.home-subtitle {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}

/* 统计 */
.stats-row {
  display: flex;
  gap: var(--space-2xl);
  margin-bottom: var(--space-xl);
  padding-bottom: var(--space-xl);
  border-bottom: 1px solid var(--border-color);
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

/* 主体 */
.home-body {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: var(--space-2xl);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.section-title {
  font-size: 0.9375rem;
  font-weight: 600;
}

.section-link {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}

.section-link:hover {
  color: var(--text-primary);
  text-decoration: none;
}

.empty-hint {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--text-tertiary);
}

.empty-hint p {
  margin-bottom: var(--space-lg);
}

/* 笔记列表 */
.notes-list {
  display: flex;
  flex-direction: column;
}

.note-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-sm);
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.note-row:hover {
  background: var(--bg-secondary);
}

.note-row:last-child {
  border-bottom: none;
}

.note-type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.note-type-dot.markdown { background: var(--text-primary); }
.note-type-dot.bookmark { background: var(--accent-color); }
.note-type-dot.snippet { background: var(--warning-color); }

.note-row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.note-row-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-row-preview {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-row-time {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* 侧栏 */
.aside-section {
  margin-bottom: var(--space-xl);
}

.aside-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-md);
}

.quick-links {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quick-link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  font-size: 0.8125rem;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.quick-link:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  text-decoration: none;
}

.aside-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.aside-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.aside-tag:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.aside-tag-count {
  color: var(--text-tertiary);
  font-size: 0.6875rem;
}

@media (max-width: 900px) {
  .home-body { grid-template-columns: 1fr; }
  .stats-row { flex-wrap: wrap; }
}
</style>
