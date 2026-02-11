<template>
  <div class="home-view">
    <!-- 顶部欢迎区 -->
    <header class="welcome-section">
      <div class="welcome-content">
        <h1 class="welcome-title">欢迎回来</h1>
        <p class="welcome-subtitle">{{ getGreeting() }}，继续探索你的知识库吧</p>
      </div>
      <div class="quick-actions">
        <button class="quick-btn" @click="createNote('markdown')">
          <el-icon><EditPen /></el-icon>
          <span>新笔记</span>
        </button>
        <button class="quick-btn" @click="createNote('bookmark')">
          <el-icon><Link /></el-icon>
          <span>添加书签</span>
        </button>
        <button class="quick-btn" @click="createNote('snippet')">
          <el-icon><Document /></el-icon>
          <span>代码片段</span>
        </button>
      </div>
    </header>

    <!-- 统计卡片 -->
    <section class="stats-section">
      <div class="stat-card">
        <div class="stat-icon markdown">
          <el-icon><EditPen /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.markdown }}</div>
          <div class="stat-label">Markdown 笔记</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon bookmark">
          <el-icon><Link /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.bookmark }}</div>
          <div class="stat-label">网页书签</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon snippet">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.snippet }}</div>
          <div class="stat-label">代码片段</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon tags">
          <el-icon><PriceTag /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ tagsStore.tags.length }}</div>
          <div class="stat-label">标签</div>
        </div>
      </div>
    </section>

    <!-- 主要内容区 -->
    <div class="main-sections">
      <!-- 最近笔记 -->
      <section class="content-section">
        <div class="section-header">
          <h2 class="section-title">
            <el-icon><Clock /></el-icon>
            最近编辑
          </h2>
          <router-link to="/search" class="view-all">查看全部</router-link>
        </div>
        
        <div v-if="recentNotes.length === 0" class="empty-state">
          <div class="empty-illustration">
            <svg viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="50" stroke="currentColor" stroke-width="2" opacity="0.2"/>
              <path d="M40 50h40M40 60h30M40 70h35" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
              <circle cx="85" cy="85" r="15" fill="currentColor" opacity="0.1"/>
              <path d="M85 80v10M80 85h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <p class="empty-text">还没有笔记，开始创建吧！</p>
          <button class="btn btn-primary" @click="createNote('markdown')">
            <el-icon><Plus /></el-icon>
            创建第一篇笔记
          </button>
        </div>
        
        <div v-else class="notes-grid">
          <div
            v-for="note in recentNotes"
            :key="note.id"
            class="note-card card-interactive"
            @click="openNote(note.id)"
          >
            <div class="note-card-header">
              <div class="note-type-badge" :class="note.type">
                <el-icon v-if="note.type === 'markdown'"><EditPen /></el-icon>
                <el-icon v-else-if="note.type === 'bookmark'"><Link /></el-icon>
                <el-icon v-else><Document /></el-icon>
              </div>
              <span class="note-time">{{ formatTime(note.updatedAt) }}</span>
            </div>
            
            <h3 class="note-card-title">{{ note.title || '无标题' }}</h3>
            
            <p class="note-card-preview line-clamp-2">
              {{ getPreview(note) }}
            </p>
            
            <div class="note-card-footer" v-if="note.tags && note.tags.length">
              <div class="note-tags">
                <span
                  v-for="tag in note.tags.slice(0, 3)"
                  :key="tag.id"
                  class="mini-tag"
                  :style="{ '--tag-color': tag.color }"
                >
                  {{ tag.name }}
                </span>
                <span v-if="note.tags.length > 3" class="more-tags">
                  +{{ note.tags.length - 3 }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 侧边小组件 -->
      <aside class="sidebar-widgets">
        <!-- 热门标签 -->
        <section class="widget">
          <h3 class="widget-title">
            <el-icon><PriceTag /></el-icon>
            热门标签
          </h3>
          <div v-if="popularTags.length === 0" class="widget-empty">
            暂无标签
          </div>
          <div v-else class="tag-list">
            <div
              v-for="item in popularTags"
              :key="item.tag.id"
              class="tag-row"
              @click="filterByTag(item.tag)"
            >
              <span class="tag-dot" :style="{ background: item.tag.color }"></span>
              <span class="tag-name">{{ item.tag.name }}</span>
              <span class="tag-count">{{ item.count }}</span>
            </div>
          </div>
        </section>

        <!-- 快速跳转 -->
        <section class="widget">
          <h3 class="widget-title">
            <el-icon><Compass /></el-icon>
            快速导航
          </h3>
          <div class="nav-links">
            <router-link to="/search" class="nav-link">
              <el-icon><Search /></el-icon>
              <span>搜索笔记</span>
              <el-icon class="arrow"><ArrowRight /></el-icon>
            </router-link>
            <router-link to="/graph" class="nav-link">
              <el-icon><Share /></el-icon>
              <span>知识图谱</span>
              <el-icon class="arrow"><ArrowRight /></el-icon>
            </router-link>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  EditPen, Link, Document, PriceTag, Clock, Plus,
  Search, Share, Compass, ArrowRight
} from '@element-plus/icons-vue'
import { useNotesStore } from '@/stores/notes'
import { useTagsStore } from '@/stores/tags'
import { useFoldersStore } from '@/stores/folders'
import type { Note, Tag } from '@/types'

const router = useRouter()
const notesStore = useNotesStore()
const tagsStore = useTagsStore()
const foldersStore = useFoldersStore()

// 统计数据
const stats = computed(() => ({
  markdown: notesStore.notes.filter(n => n.type === 'markdown').length,
  bookmark: notesStore.notes.filter(n => n.type === 'bookmark').length,
  snippet: notesStore.notes.filter(n => n.type === 'snippet').length,
}))

// 最近笔记
const recentNotes = computed(() => {
  return [...notesStore.notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)
})

// 热门标签
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
  
  return [...tagCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
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
  if (note.type === 'bookmark') {
    return note.description || note.url || '暂无描述'
  }
  if (note.type === 'snippet') {
    return note.content?.slice(0, 100) || '暂无代码'
  }
  // Markdown - 移除标题和格式
  const content = note.content || ''
  return content
    .replace(/^#+\s+.*/gm, '')
    .replace(/\*\*|__|`|#|\[|\]|\(|\)/g, '')
    .trim()
    .slice(0, 100) || '暂无内容'
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

function openNote(id: string) {
  router.push(`/editor/${id}`)
}

function filterByTag(tag: Tag) {
  notesStore.setFilter({ tagId: tag.id })
  router.push('/search')
}
</script>

<style scoped>
.home-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-xl);
  background: var(--bg-secondary);
}

/* 欢迎区 */
.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
  padding: var(--space-xl);
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  border-radius: var(--radius-xl);
  color: white;
}

.welcome-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: var(--space-xs);
}

.welcome-subtitle {
  opacity: 0.9;
  font-size: 0.9375rem;
}

.quick-actions {
  display: flex;
  gap: var(--space-sm);
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-md);
  color: white;
  font-weight: 500;
  transition: all var(--transition-fast);
  backdrop-filter: blur(4px);
}

.quick-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

/* 统计卡片 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  font-size: 20px;
}

.stat-icon.markdown {
  background: rgba(99, 102, 241, 0.1);
  color: var(--type-markdown);
}

.stat-icon.bookmark {
  background: rgba(16, 185, 129, 0.1);
  color: var(--type-bookmark);
}

.stat-icon.snippet {
  background: rgba(245, 158, 11, 0.1);
  color: var(--type-snippet);
}

.stat-icon.tags {
  background: rgba(236, 72, 153, 0.1);
  color: #ec4899;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

/* 主内容区 */
.main-sections {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: var(--space-xl);
}

.content-section {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.view-all {
  font-size: 0.875rem;
  color: var(--primary-color);
}

.view-all:hover {
  text-decoration: underline;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2xl);
  text-align: center;
}

.empty-illustration {
  width: 120px;
  height: 120px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-lg);
}

.empty-text {
  color: var(--text-secondary);
  margin-bottom: var(--space-lg);
}

/* 笔记网格 */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.note-card {
  padding: var(--space-lg);
  cursor: pointer;
}

.note-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.note-type-badge {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: 14px;
}

.note-type-badge.markdown {
  background: rgba(99, 102, 241, 0.1);
  color: var(--type-markdown);
}

.note-type-badge.bookmark {
  background: rgba(16, 185, 129, 0.1);
  color: var(--type-bookmark);
}

.note-type-badge.snippet {
  background: rgba(245, 158, 11, 0.1);
  color: var(--type-snippet);
}

.note-time {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.note-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}

.note-card-preview {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-md);
}

.note-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.note-tags {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.mini-tag {
  font-size: 0.6875rem;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--tag-color) 15%, transparent);
  color: var(--tag-color);
  border-radius: var(--radius-full);
}

.more-tags {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

/* 侧边小组件 */
.sidebar-widgets {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.widget {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.widget-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}

.widget-empty {
  text-align: center;
  padding: var(--space-lg);
  color: var(--text-tertiary);
  font-size: 0.875rem;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.tag-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tag-row:hover {
  background: var(--bg-hover);
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

.tag-count {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  text-decoration: none;
}

.nav-link:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-link span {
  flex: 1;
}

.nav-link .arrow {
  font-size: 12px;
  opacity: 0;
  transform: translateX(-4px);
  transition: all var(--transition-fast);
}

.nav-link:hover .arrow {
  opacity: 1;
  transform: translateX(0);
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .main-sections {
    grid-template-columns: 1fr;
  }
  
  .sidebar-widgets {
    flex-direction: row;
  }
  
  .widget {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .welcome-section {
    flex-direction: column;
    text-align: center;
    gap: var(--space-lg);
  }
  
  .quick-actions {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .notes-grid {
    grid-template-columns: 1fr;
  }
  
  .sidebar-widgets {
    flex-direction: column;
  }
}
</style>
