<template>
  <div class="search-view">
    <!-- 搜索头部 -->
    <header class="search-header">
      <div class="search-input-wrapper">
        <el-icon class="search-icon"><Search /></el-icon>
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="搜索笔记、书签、代码片段..."
          autofocus
          @input="handleSearch"
        />
        <button v-if="searchQuery" class="clear-btn" @click="clearSearch">
          <el-icon><Close /></el-icon>
        </button>
      </div>
      
      <!-- 筛选器 -->
      <div class="filters">
        <div class="filter-group">
          <button
            v-for="type in noteTypes"
            :key="type.value"
            class="filter-btn"
            :class="{ active: filterType === type.value }"
            @click="filterType = type.value"
          >
            <el-icon><component :is="type.icon" /></el-icon>
            {{ type.label }}
          </button>
        </div>
        
        <el-select
          v-model="filterTagId"
          placeholder="按标签筛选"
          clearable
          class="tag-filter"
        >
          <el-option
            v-for="tag in tagsStore.tags"
            :key="tag.id"
            :label="tag.name"
            :value="tag.id"
          >
            <span class="tag-option">
              <span class="tag-dot" :style="{ background: tag.color }"></span>
              {{ tag.name }}
            </span>
          </el-option>
        </el-select>
      </div>
    </header>

    <!-- 搜索结果 -->
    <div class="search-results">
      <!-- 结果统计 -->
      <div class="results-summary" v-if="searchQuery || filterType || filterTagId">
        <span class="results-count">{{ filteredResults.length }} 个结果</span>
        <div class="sort-options">
          <button
            class="sort-btn"
            :class="{ active: sortBy === 'relevance' }"
            @click="sortBy = 'relevance'"
          >
            相关性
          </button>
          <button
            class="sort-btn"
            :class="{ active: sortBy === 'date' }"
            @click="sortBy = 'date'"
          >
            最近修改
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!searchQuery && !filterType && !filterTagId" class="empty-state">
        <div class="empty-illustration">
          <svg viewBox="0 0 120 120" fill="none">
            <circle cx="50" cy="50" r="30" stroke="currentColor" stroke-width="2" opacity="0.3"/>
            <line x1="72" y1="72" x2="95" y2="95" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
            <circle cx="50" cy="50" r="10" fill="currentColor" opacity="0.1"/>
          </svg>
        </div>
        <h3 class="empty-title">开始搜索</h3>
        <p class="empty-desc">搜索你的笔记、书签和代码片段</p>
        <div class="search-tips">
          <div class="tip">
            <kbd>⌘</kbd> + <kbd>K</kbd>
            <span>快速搜索</span>
          </div>
        </div>
      </div>

      <!-- 无结果 -->
      <div v-else-if="filteredResults.length === 0" class="no-results">
        <el-icon class="no-results-icon"><SearchOutlined /></el-icon>
        <h3>没有找到结果</h3>
        <p>尝试不同的关键词或调整筛选条件</p>
      </div>

      <!-- 结果列表 -->
      <div v-else class="results-list">
        <div
          v-for="note in filteredResults"
          :key="note.id"
          class="result-card"
          @click="openNote(note.id)"
        >
          <div class="result-header">
            <div class="result-type" :class="note.type">
              <el-icon v-if="note.type === 'markdown'"><EditPen /></el-icon>
              <el-icon v-else-if="note.type === 'bookmark'"><Link /></el-icon>
              <el-icon v-else><Document /></el-icon>
            </div>
            <h3 class="result-title" v-html="highlightText(note.title)"></h3>
            <span class="result-time">{{ formatTime(note.updatedAt) }}</span>
          </div>
          
          <p class="result-preview" v-html="highlightText(getPreview(note))"></p>
          
          <div class="result-footer" v-if="note.tags?.length || note.url">
            <div class="result-tags" v-if="note.tags?.length">
              <span
                v-for="tag in note.tags.slice(0, 3)"
                :key="tag.id"
                class="mini-tag"
                :style="{ '--tag-color': tag.color }"
              >
                {{ tag.name }}
              </span>
            </div>
            <div class="result-url" v-if="note.url">
              <el-icon><Link /></el-icon>
              {{ getDomain(note.url) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, Close, EditPen, Link, Document, Grid } from '@element-plus/icons-vue'
import { useNotesStore } from '@/stores/notes'
import { useTagsStore } from '@/stores/tags'
import type { Note } from '@/types'

// 搜索图标组件 (Element Plus 没有 SearchOutlined)
const SearchOutlined = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`
}

const router = useRouter()
const route = useRoute()
const notesStore = useNotesStore()
const tagsStore = useTagsStore()

const searchQuery = ref('')
const filterType = ref<string>('')
const filterTagId = ref<string>('')
const sortBy = ref<'relevance' | 'date'>('relevance')
const searchResults = ref<Note[]>([])

const noteTypes = [
  { value: '', label: '全部', icon: Grid },
  { value: 'markdown', label: '笔记', icon: EditPen },
  { value: 'bookmark', label: '书签', icon: Link },
  { value: 'snippet', label: '代码', icon: Document },
]

const filteredResults = computed(() => {
  let results = searchQuery.value ? searchResults.value : notesStore.notes
  
  // 类型筛选
  if (filterType.value) {
    results = results.filter(n => n.type === filterType.value)
  }
  
  // 标签筛选
  if (filterTagId.value) {
    results = results.filter(n => n.tags?.some(t => t.id === filterTagId.value))
  }
  
  // 排序
  if (sortBy.value === 'date') {
    results = [...results].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }
  
  return results
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  
  searchTimer = setTimeout(async () => {
    if (searchQuery.value.trim()) {
      const results = await notesStore.searchNotes(searchQuery.value)
      searchResults.value = results
    } else {
      searchResults.value = []
    }
  }, 300)
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
}

function openNote(id: string) {
  router.push(`/editor/${id}`)
}

function getPreview(note: Note): string {
  if (note.type === 'bookmark') {
    return note.description || note.url || ''
  }
  const content = note.content || ''
  return content.replace(/[#*`\[\]]/g, '').slice(0, 200)
}

function highlightText(text: string): string {
  if (!searchQuery.value || !text) return text
  const regex = new RegExp(`(${searchQuery.value})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

function formatTime(time: string): string {
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)
  
  if (days < 1) return '今天'
  if (days < 2) return '昨天'
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

// 从 URL 获取搜索词
onMounted(() => {
  const q = route.query.q as string
  if (q) {
    searchQuery.value = q
    handleSearch()
  }
})

watch(() => route.query.q, (q) => {
  if (q && typeof q === 'string') {
    searchQuery.value = q
    handleSearch()
  }
})
</script>

<style scoped>
.search-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

/* 搜索头部 */
.search-header {
  padding: var(--space-xl);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.search-input-wrapper {
  position: relative;
  max-width: 600px;
  margin: 0 auto var(--space-lg);
}

.search-icon {
  position: absolute;
  left: var(--space-lg);
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: var(--text-tertiary);
}

.search-input {
  width: 100%;
  padding: var(--space-md) var(--space-xl);
  padding-left: 52px;
  font-size: 1.125rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-xl);
  background: var(--bg-secondary);
  color: var(--text-primary);
  outline: none;
  transition: all var(--transition-fast);
}

.search-input:focus {
  border-color: var(--primary-color);
  background: var(--bg-primary);
  box-shadow: 0 0 0 4px var(--primary-light);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.clear-btn {
  position: absolute;
  right: var(--space-md);
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
}

.clear-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 筛选器 */
.filters {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-lg);
}

.filter-group {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.filter-btn:hover {
  color: var(--text-primary);
}

.filter-btn.active {
  background: var(--bg-primary);
  color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.tag-filter {
  width: 160px;
}

.tag-option {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* 搜索结果 */
.search-results {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-xl);
}

.results-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.results-count {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.sort-options {
  display: flex;
  gap: var(--space-xs);
}

.sort-btn {
  padding: var(--space-xs) var(--space-sm);
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.sort-btn:hover {
  color: var(--text-primary);
}

.sort-btn.active {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* 空状态 */
.empty-state, .no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
  text-align: center;
}

.empty-illustration {
  width: 120px;
  height: 120px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-lg);
}

.empty-title, .no-results h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}

.empty-desc, .no-results p {
  color: var(--text-secondary);
  margin-bottom: var(--space-lg);
}

.search-tips {
  display: flex;
  gap: var(--space-lg);
}

.tip {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}

kbd {
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 0.75rem;
}

.no-results-icon {
  font-size: 48px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-lg);
}

/* 结果列表 */
.results-list {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.result-card {
  padding: var(--space-lg);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.result-card:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-md);
}

.result-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.result-type {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: 14px;
  flex-shrink: 0;
}

.result-type.markdown {
  background: rgba(99, 102, 241, 0.1);
  color: var(--type-markdown);
}

.result-type.bookmark {
  background: rgba(16, 185, 129, 0.1);
  color: var(--type-bookmark);
}

.result-type.snippet {
  background: rgba(245, 158, 11, 0.1);
  color: var(--type-snippet);
}

.result-title {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.result-time {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.result-preview {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-md);
}

.result-preview :deep(mark) {
  background: var(--warning-color);
  color: var(--text-primary);
  padding: 0 2px;
  border-radius: 2px;
}

.result-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.result-tags {
  display: flex;
  gap: var(--space-xs);
}

.mini-tag {
  font-size: 0.6875rem;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--tag-color) 15%, transparent);
  color: var(--tag-color);
  border-radius: var(--radius-full);
}

.result-url {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
</style>
