<template>
  <div class="search-view">
    <div class="search-header">
      <el-input
        v-model="searchQuery"
        placeholder="搜索笔记、收藏、代码片段..."
        size="large"
        clearable
        @input="debouncedSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      
      <div class="search-filters">
        <el-select v-model="filterType" placeholder="类型" clearable size="small">
          <el-option label="全部" value="" />
          <el-option label="笔记" value="markdown" />
          <el-option label="收藏" value="bookmark" />
          <el-option label="代码片段" value="snippet" />
        </el-select>
        
        <el-select v-model="filterTag" placeholder="标签" clearable size="small">
          <el-option
            v-for="tag in allTags"
            :key="tag.id"
            :label="tag.name"
            :value="tag.id"
          />
        </el-select>
        
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          size="small"
          @change="performSearch"
        />
      </div>
    </div>

    <div class="search-results" v-loading="loading">
      <div class="results-header" v-if="searchQuery">
        <span>找到 {{ searchResults.length }} 条结果</span>
      </div>

      <div class="results-list" v-if="searchResults.length > 0">
        <el-card
          v-for="note in searchResults"
          :key="note.id"
          class="result-card"
          shadow="hover"
          @click="openNote(note)"
        >
          <div class="result-header">
            <el-tag :type="getTypeTagType(note.type)" size="small">
              {{ getTypeLabel(note.type) }}
            </el-tag>
            <span class="result-title" v-html="highlightText(note.title)"></span>
          </div>
          <div class="result-content" v-html="highlightText(getExcerpt(note.content))"></div>
          <div class="result-footer">
            <span class="result-date">{{ formatDate(note.updatedAt) }}</span>
            <div class="result-tags">
              <el-tag
                v-for="tag in getNoteTags(note.id)"
                :key="tag.id"
                :color="tag.color"
                size="small"
                effect="plain"
              >
                {{ tag.name }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </div>

      <el-empty v-else-if="searchQuery && !loading" description="未找到匹配的内容" />
      
      <div class="search-tips" v-else-if="!searchQuery">
        <h3>搜索提示</h3>
        <ul>
          <li>输入关键词搜索笔记标题和内容</li>
          <li>使用筛选器按类型、标签或日期范围过滤</li>
          <li>支持双向链接语法 <code>[[笔记名]]</code> 搜索</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { useNotesStore } from '../stores/notes'
import { useTagsStore } from '../stores/tags'
import type { Note, NoteType, Tag } from '../types'

const router = useRouter()
const notesStore = useNotesStore()
const tagsStore = useTagsStore()

const searchQuery = ref('')
const filterType = ref('')
const filterTag = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const loading = ref(false)
const searchResults = ref<Note[]>([])

const allTags = computed(() => tagsStore.tags)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  loading.value = true
  try {
    const results = await notesStore.searchNotes(searchQuery.value)
    
    // Apply filters
    searchResults.value = results.filter(note => {
      if (filterType.value && note.type !== filterType.value) return false
      
      if (filterTag.value) {
        const noteTags = tagsStore.getTagsByNoteId(note.id)
        if (!noteTags.some(t => t.id === filterTag.value)) return false
      }
      
      if (dateRange.value) {
        const noteDate = new Date(note.updatedAt)
        if (noteDate < dateRange.value[0] || noteDate > dateRange.value[1]) return false
      }
      
      return true
    })
  } finally {
    loading.value = false
  }
}

function getTypeTagType(type: NoteType) {
  const map: Record<NoteType, string> = {
    markdown: 'primary',
    bookmark: 'success',
    snippet: 'warning'
  }
  return map[type] || 'info'
}

function getTypeLabel(type: NoteType) {
  const map: Record<NoteType, string> = {
    markdown: '笔记',
    bookmark: '收藏',
    snippet: '代码'
  }
  return map[type] || type
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('zh-CN')
}

function getExcerpt(content: string, maxLength = 150) {
  if (!content) return ''
  const text = content.replace(/[#*`\[\]]/g, ' ').trim()
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

function highlightText(text: string) {
  if (!searchQuery.value || !text) return text
  const regex = new RegExp(`(${searchQuery.value})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

function getNoteTags(noteId: string): Tag[] {
  return tagsStore.getTagsByNoteId(noteId)
}

function openNote(note: Note) {
  router.push({ name: 'editor', params: { id: note.id } })
}

onMounted(() => {
  tagsStore.fetchTags()
})
</script>

<style scoped>
.search-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.search-header {
  margin-bottom: 24px;
}

.search-filters {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.search-results {
  flex: 1;
  overflow-y: auto;
}

.results-header {
  margin-bottom: 16px;
  color: var(--el-text-color-secondary);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.result-card:hover {
  transform: translateX(4px);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.result-title {
  font-size: 16px;
  font-weight: 500;
}

.result-content {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.result-content :deep(mark) {
  background: var(--el-color-warning-light-5);
  padding: 0 2px;
  border-radius: 2px;
}

.result-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-date {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.result-tags {
  display: flex;
  gap: 4px;
}

.search-tips {
  text-align: center;
  color: var(--el-text-color-secondary);
  padding: 48px;
}

.search-tips h3 {
  margin-bottom: 16px;
}

.search-tips ul {
  list-style: none;
  padding: 0;
}

.search-tips li {
  margin: 8px 0;
}

.search-tips code {
  background: var(--el-fill-color);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
