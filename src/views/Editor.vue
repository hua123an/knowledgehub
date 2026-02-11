<template>
  <div class="editor-view" v-loading="loading">
    <div class="editor-header" v-if="currentNote">
      <div class="title-row">
        <el-input
          v-model="currentNote.title"
          placeholder="输入标题..."
          class="title-input"
          @change="saveNote"
        />
        <div class="header-actions">
          <el-tag :type="getTypeTagType(currentNote.type)" size="small">
            {{ getTypeLabel(currentNote.type) }}
          </el-tag>
          <el-button-group>
            <el-button @click="togglePreview" :type="showPreview ? 'primary' : 'default'">
              <el-icon><View /></el-icon>
            </el-button>
            <el-button @click="showTagDialog = true">
              <el-icon><PriceTag /></el-icon>
            </el-button>
            <el-button type="danger" @click="handleDelete">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>
      
      <div class="note-tags" v-if="noteTags.length > 0">
        <el-tag
          v-for="tag in noteTags"
          :key="tag.id"
          :color="tag.color"
          closable
          @close="removeTag(tag.id)"
          size="small"
        >
          {{ tag.name }}
        </el-tag>
      </div>
    </div>

    <div class="editor-content" v-if="currentNote">
      <!-- Markdown Editor -->
      <template v-if="currentNote.type === 'markdown'">
        <div class="markdown-editor-container" :class="{ 'with-preview': showPreview }">
          <div class="editor-pane">
            <el-input
              type="textarea"
              v-model="currentNote.content"
              placeholder="开始写作..."
              :autosize="{ minRows: 20 }"
              @input="debouncedSave"
            />
          </div>
          <div class="preview-pane" v-if="showPreview">
            <div class="markdown-preview" v-html="renderedContent"></div>
          </div>
        </div>
      </template>

      <!-- Bookmark Editor -->
      <template v-else-if="currentNote.type === 'bookmark'">
        <BookmarkEditor
          :note="currentNote"
          @update="handleBookmarkUpdate"
        />
      </template>

      <!-- Snippet Editor -->
      <template v-else-if="currentNote.type === 'snippet'">
        <SnippetEditor
          :note="currentNote"
          @update="handleSnippetUpdate"
        />
      </template>
    </div>

    <el-empty v-else-if="!loading" description="请选择或创建一个笔记" />

    <!-- Tag Dialog -->
    <el-dialog v-model="showTagDialog" title="管理标签" width="400px">
      <div class="tag-selector">
        <div class="existing-tags">
          <el-check-tag
            v-for="tag in allTags"
            :key="tag.id"
            :checked="isTagSelected(tag.id)"
            @change="toggleTag(tag.id)"
          >
            {{ tag.name }}
          </el-check-tag>
        </div>
        <el-divider />
        <div class="new-tag-form">
          <el-input
            v-model="newTagName"
            placeholder="新标签名称"
            size="small"
            style="width: 200px"
          />
          <el-color-picker v-model="newTagColor" size="small" />
          <el-button type="primary" size="small" @click="createTag">
            添加
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { View, PriceTag, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useNotesStore } from '../stores/notes'
import { useTagsStore } from '../stores/tags'
import BookmarkEditor from '../components/editor/BookmarkEditor.vue'
import SnippetEditor from '../components/editor/SnippetEditor.vue'
import type { Note, NoteType, Tag } from '../types'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const tagsStore = useTagsStore()

const loading = ref(false)
const showPreview = ref(false)
const showTagDialog = ref(false)
const newTagName = ref('')
const newTagColor = ref('#409EFF')
const currentNote = ref<Note | null>(null)

const allTags = computed(() => tagsStore.tags)
const noteTags = computed(() => {
  if (!currentNote.value) return []
  return tagsStore.getTagsByNoteId(currentNote.value.id)
})

const renderedContent = computed(() => {
  if (!currentNote.value?.content) return ''
  return marked(currentNote.value.content)
})

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveNote()
  }, 500)
}

async function saveNote() {
  if (!currentNote.value) return
  await notesStore.updateNote(currentNote.value)
}

async function loadNote(id: string) {
  loading.value = true
  try {
    const note = await notesStore.fetchNoteById(id)
    if (note) {
      currentNote.value = { ...note }
    }
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

function togglePreview() {
  showPreview.value = !showPreview.value
}

function isTagSelected(tagId: string) {
  return noteTags.value.some(t => t.id === tagId)
}

async function toggleTag(tagId: string) {
  if (!currentNote.value) return
  if (isTagSelected(tagId)) {
    await tagsStore.removeTagFromNote(currentNote.value.id, tagId)
  } else {
    await tagsStore.addTagToNote(currentNote.value.id, tagId)
  }
}

async function removeTag(tagId: string) {
  if (!currentNote.value) return
  await tagsStore.removeTagFromNote(currentNote.value.id, tagId)
}

async function createTag() {
  if (!newTagName.value.trim()) return
  await tagsStore.createTag({
    name: newTagName.value.trim(),
    color: newTagColor.value
  })
  newTagName.value = ''
}

async function handleDelete() {
  if (!currentNote.value) return
  
  try {
    await ElMessageBox.confirm('确定要删除这个笔记吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await notesStore.deleteNote(currentNote.value.id)
    ElMessage.success('已删除')
    router.push({ name: 'home' })
  } catch {
    // cancelled
  }
}

function handleBookmarkUpdate(data: Partial<Note>) {
  if (!currentNote.value) return
  Object.assign(currentNote.value, data)
  saveNote()
}

function handleSnippetUpdate(data: Partial<Note>) {
  if (!currentNote.value) return
  Object.assign(currentNote.value, data)
  saveNote()
}

watch(
  () => route.params.id,
  (id) => {
    if (id && typeof id === 'string') {
      loadNote(id)
    }
  },
  { immediate: true }
)

onMounted(() => {
  tagsStore.fetchTags()
})
</script>

<style scoped>
.editor-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.editor-header {
  margin-bottom: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-input {
  flex: 1;
}

.title-input :deep(.el-input__inner) {
  font-size: 24px;
  font-weight: 600;
  border: none;
  background: transparent;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.note-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.editor-content {
  flex: 1;
  overflow: hidden;
}

.markdown-editor-container {
  height: 100%;
  display: flex;
  gap: 16px;
}

.markdown-editor-container.with-preview .editor-pane {
  width: 50%;
}

.editor-pane {
  flex: 1;
}

.editor-pane :deep(.el-textarea__inner) {
  height: 100%;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.preview-pane {
  width: 50%;
  overflow-y: auto;
  padding: 16px;
  background: var(--el-bg-color-page);
  border-radius: 8px;
}

.markdown-preview {
  font-size: 15px;
  line-height: 1.8;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3) {
  margin-top: 24px;
  margin-bottom: 12px;
}

.markdown-preview :deep(code) {
  background: var(--el-fill-color);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

.markdown-preview :deep(pre) {
  background: var(--el-fill-color-darker);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
}

.tag-selector .existing-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.new-tag-form {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
