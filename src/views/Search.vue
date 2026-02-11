<template>
  <div class="search-view">
    <header class="search-header">
      <div class="search-bar">
        <el-icon class="search-icon"><Search /></el-icon>
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="搜索笔记、书签、代码..."
          autofocus
          @input="handleSearch"
        />
        <button v-if="searchQuery" class="clear-btn" @click="clearSearch">
          <el-icon><Close /></el-icon>
        </button>
      </div>

      <div class="filters">
        <button
          v-for="t in noteTypes" :key="t.value"
          class="filter-btn" :class="{ active: filterType === t.value }"
          @click="filterType = t.value"
        >{{ t.label }}</button>

        <el-select v-model="filterTagId" placeholder="标签" clearable size="small" style="width: 120px">
          <el-option v-for="tag in tagsStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
        </el-select>
      </div>
    </header>

    <div class="search-body">
      <div v-if="!searchQuery && !filterType && !filterTagId" class="empty-hint">
        输入关键词开始搜索
      </div>

      <div v-else-if="filteredResults.length === 0" class="empty-hint">
        没有找到结果
      </div>

      <div v-else class="results">
        <p class="results-count">{{ filteredResults.length }} 个结果</p>
        <div
          v-for="note in filteredResults" :key="note.id"
          class="result-item"
          @click="router.push(`/editor/${note.id}`)"
        >
          <div class="result-dot" :class="note.type"></div>
          <div class="result-info">
            <div class="result-title" v-html="highlight(note.title)"></div>
            <div class="result-preview" v-html="highlight(getPreview(note))"></div>
          </div>
          <span class="result-time">{{ formatTime(note.updatedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search, Close } from '@element-plus/icons-vue'
import { useNotesStore } from '@/stores/notes'
import { useTagsStore } from '@/stores/tags'
import type { Note } from '@/types'

const router = useRouter()
const route = useRoute()
const notesStore = useNotesStore()
const tagsStore = useTagsStore()

const searchQuery = ref('')
const filterType = ref('')
const filterTagId = ref('')
const searchResults = ref<Note[]>([])

const noteTypes = [
  { value: '', label: '全部' },
  { value: 'markdown', label: '笔记' },
  { value: 'bookmark', label: '书签' },
  { value: 'snippet', label: '代码' },
]

const filteredResults = computed(() => {
  let results = searchQuery.value ? searchResults.value : notesStore.notes
  if (filterType.value) results = results.filter(n => n.type === filterType.value)
  if (filterTagId.value) results = results.filter(n => n.tags?.some(t => t.id === filterTagId.value))
  return [...results].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
})

let timer: ReturnType<typeof setTimeout> | null = null

function handleSearch() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(async () => {
    if (searchQuery.value.trim()) {
      searchResults.value = await notesStore.searchNotes(searchQuery.value)
    } else {
      searchResults.value = []
    }
  }, 300)
}

function clearSearch() { searchQuery.value = ''; searchResults.value = [] }

function getPreview(note: Note): string {
  if (note.type === 'bookmark') return note.description || note.url || ''
  return (note.content || '').replace(/[#*`\[\]]/g, '').slice(0, 150)
}

function highlight(text: string): string {
  if (!searchQuery.value || !text) return text
  return text.replace(new RegExp(`(${searchQuery.value})`, 'gi'), '<mark>$1</mark>')
}

function formatTime(t: string) {
  const d = new Date(t), now = new Date(), diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return '今天'
  if (days < 2) return '昨天'
  if (days < 7) return `${days}天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

onMounted(() => {
  const q = route.query.q as string
  if (q) { searchQuery.value = q; handleSearch() }
})

watch(() => route.query.q, (q) => {
  if (q && typeof q === 'string') { searchQuery.value = q; handleSearch() }
})
</script>

<style scoped>
.search-view { height: 100%; display: flex; flex-direction: column; }

.search-header {
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid var(--border-color);
}

.search-bar {
  position: relative;
  max-width: 480px;
  margin-bottom: var(--space-md);
}

.search-icon {
  position: absolute; left: var(--space-md); top: 50%; transform: translateY(-50%);
  color: var(--text-tertiary);
}

.search-input {
  width: 100%;
  padding: var(--space-sm) var(--space-lg);
  padding-left: 36px;
  font-size: 0.9375rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
}

.search-input:focus { border-color: var(--text-tertiary); background: var(--bg-primary); }

.clear-btn {
  position: absolute; right: var(--space-sm); top: 50%; transform: translateY(-50%);
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; color: var(--text-tertiary);
}
.clear-btn:hover { background: var(--bg-hover); }

.filters { display: flex; align-items: center; gap: var(--space-sm); }

.filter-btn {
  padding: 4px 12px;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}
.filter-btn:hover { color: var(--text-primary); }
.filter-btn.active { background: var(--bg-tertiary); color: var(--text-primary); }

.search-body { flex: 1; overflow-y: auto; padding: var(--space-lg) var(--space-xl); }

.empty-hint { text-align: center; padding: var(--space-2xl); color: var(--text-tertiary); font-size: 0.875rem; }

.results-count { font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-md); }

.results { max-width: 640px; }

.result-item {
  display: flex; align-items: flex-start; gap: var(--space-md);
  padding: var(--space-md) var(--space-sm);
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.result-item:hover { background: var(--bg-secondary); }
.result-item:last-child { border-bottom: none; }

.result-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
.result-dot.markdown { background: var(--text-primary); }
.result-dot.bookmark { background: var(--accent-color); }
.result-dot.snippet { background: var(--warning-color); }

.result-info { flex: 1; min-width: 0; }
.result-title { font-size: 0.875rem; font-weight: 500; margin-bottom: 2px; }
.result-preview { font-size: 0.75rem; color: var(--text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result-preview :deep(mark) { background: #fff3cd; border-radius: 2px; }
.result-time { font-size: 0.75rem; color: var(--text-tertiary); flex-shrink: 0; }
</style>
