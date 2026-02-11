<template>
  <div class="home-view">
    <div class="home-header">
      <h1>欢迎使用 KnowledgeHub</h1>
      <p class="subtitle">您的个人知识管理中心</p>
    </div>

    <div class="stats-cards">
      <el-card class="stat-card" shadow="hover">
        <div class="stat-icon notes">
          <el-icon :size="32"><Document /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ notesStore.notes.length }}</span>
          <span class="stat-label">笔记</span>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-icon bookmarks">
          <el-icon :size="32"><Link /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ bookmarkCount }}</span>
          <span class="stat-label">收藏</span>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-icon snippets">
          <el-icon :size="32"><Memo /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ snippetCount }}</span>
          <span class="stat-label">代码片段</span>
        </div>
      </el-card>

      <el-card class="stat-card" shadow="hover">
        <div class="stat-icon tags">
          <el-icon :size="32"><PriceTag /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ tagsStore.tags.length }}</span>
          <span class="stat-label">标签</span>
        </div>
      </el-card>
    </div>

    <div class="recent-section">
      <h2>最近编辑</h2>
      <el-table :data="recentNotes" style="width: 100%" v-if="recentNotes.length > 0">
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link @click="openNote(row)">
              打开
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无笔记，开始创建第一篇吧" />
    </div>

    <div class="quick-actions">
      <h2>快速操作</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="createNote('markdown')">
          <el-icon><Document /></el-icon>
          新建笔记
        </el-button>
        <el-button @click="createNote('bookmark')">
          <el-icon><Link /></el-icon>
          添加收藏
        </el-button>
        <el-button @click="createNote('snippet')">
          <el-icon><Memo /></el-icon>
          新建代码片段
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Document, Link, Memo, PriceTag } from '@element-plus/icons-vue'
import { useNotesStore } from '../stores/notes'
import { useTagsStore } from '../stores/tags'
import type { Note, NoteType } from '../types'

const router = useRouter()
const notesStore = useNotesStore()
const tagsStore = useTagsStore()

const bookmarkCount = computed(() => 
  notesStore.notes.filter(n => n.type === 'bookmark').length
)

const snippetCount = computed(() => 
  notesStore.notes.filter(n => n.type === 'snippet').length
)

const recentNotes = computed(() => 
  [...notesStore.notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
)

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
  return new Date(date).toLocaleString('zh-CN')
}

function openNote(note: Note) {
  router.push({ name: 'editor', params: { id: note.id } })
}

async function createNote(type: NoteType) {
  const note = await notesStore.createNote({
    title: type === 'markdown' ? '无标题笔记' : 
           type === 'bookmark' ? '新收藏' : '代码片段',
    content: '',
    type
  })
  if (note) {
    router.push({ name: 'editor', params: { id: note.id } })
  }
}
</script>

<style scoped>
.home-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.home-header {
  text-align: center;
  margin-bottom: 32px;
}

.home-header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.subtitle {
  color: var(--el-text-color-secondary);
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 8px;
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon.notes { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-icon.bookmarks { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
.stat-icon.snippets { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-icon.tags { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
}

.stat-label {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.recent-section,
.quick-actions {
  margin-bottom: 32px;
}

.recent-section h2,
.quick-actions h2 {
  font-size: 18px;
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}
</style>
