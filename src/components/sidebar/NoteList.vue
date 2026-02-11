<template>
  <div class="note-list">
    <div class="list-header">
      <span class="list-title">{{ title }}</span>
      <el-dropdown @command="handleCreate" trigger="click">
        <el-button type="primary" size="small" circle>
          <el-icon><Plus /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="markdown">
              <el-icon><Document /></el-icon>
              新建笔记
            </el-dropdown-item>
            <el-dropdown-item command="bookmark">
              <el-icon><Link /></el-icon>
              添加收藏
            </el-dropdown-item>
            <el-dropdown-item command="snippet">
              <el-icon><Memo /></el-icon>
              新建代码片段
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <el-input
      v-model="filterText"
      placeholder="筛选..."
      size="small"
      clearable
      class="filter-input"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>

    <div class="notes-container">
      <div
        v-for="note in filteredNotes"
        :key="note.id"
        class="note-item"
        :class="{ active: currentNoteId === note.id }"
        @click="selectNote(note)"
      >
        <div class="note-icon">
          <el-icon v-if="note.type === 'markdown'"><Document /></el-icon>
          <el-icon v-else-if="note.type === 'bookmark'"><Link /></el-icon>
          <el-icon v-else-if="note.type === 'snippet'"><Memo /></el-icon>
        </div>
        <div class="note-info">
          <span class="note-title">{{ note.title || '无标题' }}</span>
          <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
        </div>
        <el-dropdown @command="(cmd: string) => handleCommand(cmd, note)" trigger="click" @click.stop>
          <el-button link class="more-btn">
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="delete">
                <el-icon><Delete /></el-icon>
                删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <el-empty v-if="filteredNotes.length === 0" description="暂无笔记" :image-size="60" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Plus, Document, Link, Memo, Search, MoreFilled, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useNotesStore } from '../../stores/notes'
import type { Note, NoteType } from '../../types'

const props = withDefaults(defineProps<{
  title?: string
  folderId?: string | null
}>(), {
  title: '所有笔记',
  folderId: null
})

const router = useRouter()
const route = useRoute()
const notesStore = useNotesStore()

const filterText = ref('')

const currentNoteId = computed(() => route.params.id as string)

const filteredNotes = computed(() => {
  let notes = notesStore.notes
  
  // Filter by folder if specified
  if (props.folderId) {
    notes = notes.filter(n => n.folderId === props.folderId)
  }
  
  // Filter by search text
  if (filterText.value) {
    const query = filterText.value.toLowerCase()
    notes = notes.filter(n => 
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query)
    )
  }
  
  // Sort by update time
  return [...notes].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
})

function formatDate(date: string) {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  
  return d.toLocaleDateString('zh-CN')
}

function selectNote(note: Note) {
  router.push({ name: 'editor', params: { id: note.id } })
}

async function handleCreate(type: NoteType) {
  const note = await notesStore.createNote({
    title: type === 'markdown' ? '无标题笔记' : 
           type === 'bookmark' ? '新收藏' : '代码片段',
    content: '',
    type,
    folderId: props.folderId || undefined
  })
  if (note) {
    router.push({ name: 'editor', params: { id: note.id } })
  }
}

async function handleCommand(command: string, note: Note) {
  if (command === 'delete') {
    try {
      await ElMessageBox.confirm('确定要删除这个笔记吗？', '确认删除', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      })
      
      await notesStore.deleteNote(note.id)
      ElMessage.success('已删除')
      
      if (currentNoteId.value === note.id) {
        router.push({ name: 'home' })
      }
    } catch {
      // cancelled
    }
  }
}
</script>

<style scoped>
.note-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.list-title {
  font-weight: 500;
  font-size: 14px;
}

.filter-input {
  margin: 8px 12px;
}

.notes-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.note-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.note-item:hover {
  background: var(--el-fill-color-light);
}

.note-item.active {
  background: var(--el-color-primary-light-9);
}

.note-icon {
  color: var(--el-text-color-secondary);
}

.note-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.note-title {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-date {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.more-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.note-item:hover .more-btn {
  opacity: 1;
}
</style>
