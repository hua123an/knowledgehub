<template>
  <div class="search-view">
    <div class="search-bar">
      <el-input
        v-model="query"
        placeholder="搜索笔记..."
        :prefix-icon="SearchIcon"
        clearable
        @input="handleSearch"
        size="large"
      />
      <div class="search-filters">
        <button
          v-for="f in filters"
          :key="f.value"
          class="filter-btn"
          :class="{ active: activeFilter === f.value }"
          @click="activeFilter = f.value; handleSearch()"
        >{{ f.label }}</button>
      </div>
    </div>

    <!-- AI 搜索建议 -->
    <div v-if="aiSuggestions.length && !results.length" class="ai-suggestions">
      <span class="ai-suggestions-label">AI 建议搜索：</span>
      <button v-for="s in aiSuggestions" :key="s" class="ai-suggestion" @click="query = s; handleSearch()">{{ s }}</button>
    </div>

    <div class="search-results" v-if="results.length">
      <p class="result-count">找到 {{ results.length }} 条结果</p>
      <div
        v-for="item in results"
        :key="item.id"
        class="result-item"
        @click="openNote(item.id)"
      >
        <div class="result-title">{{ item.title }}</div>
        <div class="result-meta">
          <span class="result-type">{{ typeLabels[item.type] }}</span>
          <span v-if="item.matchField">&middot; 匹配: {{ item.matchField }}</span>
        </div>
        <div v-if="item.snippet" class="result-snippet">{{ item.snippet }}</div>
      </div>
    </div>

    <div v-else-if="query && !loading" class="empty-state">
      <p>没有找到相关结果</p>
      <button v-if="aiStore.isConfigured && !aiSuggestions.length" class="btn btn-secondary" @click="getAISuggestions">
        让 AI 帮你优化搜索词
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search as SearchIcon } from '@element-plus/icons-vue'
import { useNotesStore } from '@/stores/notes'
import { useAIStore } from '@/stores/ai'

const router = useRouter()
const notesStore = useNotesStore()
const aiStore = useAIStore()

const query = ref('')
const activeFilter = ref('all')
const results = ref<any[]>([])
const loading = ref(false)
const aiSuggestions = ref<string[]>([])

const filters = [
  { label: '全部', value: 'all' },
  { label: '笔记', value: 'markdown' },
  { label: '书签', value: 'bookmark' },
  { label: '代码', value: 'snippet' },
]

const typeLabels: Record<string, string> = { markdown: '笔记', bookmark: '书签', snippet: '代码' }

let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  aiSuggestions.value = []
  searchTimer = setTimeout(doSearch, 300)
}

async function doSearch() {
  if (!query.value.trim()) { results.value = []; return }
  loading.value = true
  try {
    const all = await notesStore.searchNotes(query.value)
    results.value = activeFilter.value === 'all'
      ? all
      : all.filter((r: any) => r.type === activeFilter.value)
  } finally {
    loading.value = false
  }
}

async function getAISuggestions() {
  if (!query.value.trim()) return
  aiSuggestions.value = await aiStore.searchEnhance(query.value)
}

function openNote(id: string) {
  router.push(`/editor/${id}`)
}
</script>

<style scoped>
.search-view { padding: var(--space-xl); max-width: 680px; }

.search-bar { margin-bottom: var(--space-lg); }

.search-filters {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.filter-btn {
  padding: 4px 12px;
  font-size: 0.75rem;
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  background: none;
  cursor: pointer;
}
.filter-btn.active {
  background: var(--text-primary);
  color: var(--bg-primary);
  border-color: var(--text-primary);
}

.ai-suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-lg);
  font-size: 0.8125rem;
}
.ai-suggestions-label { color: var(--text-tertiary); }
.ai-suggestion {
  padding: 3px 10px;
  font-size: 0.75rem;
  border: 1px dashed var(--accent-color);
  border-radius: var(--radius-full);
  color: var(--accent-color);
  cursor: pointer;
  background: none;
}
.ai-suggestion:hover { background: var(--accent-color); color: #fff; }

.result-count { font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-md); }

.result-item {
  padding: var(--space-md);
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
}
.result-item:hover { background: var(--bg-secondary); }

.result-title { font-weight: 500; margin-bottom: 4px; }
.result-meta { font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 4px; }
.result-type { background: var(--bg-tertiary); padding: 1px 6px; border-radius: 3px; }
.result-snippet { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; }

.empty-state {
  text-align: center;
  padding: var(--space-2xl) 0;
  color: var(--text-tertiary);
}
.empty-state .btn { margin-top: var(--space-md); }
</style>
