<template>
  <div class="editor-view" v-if="note">
    <!-- 顶部工具栏 -->
    <header class="editor-header">
      <div class="header-left">
        <button class="icon-btn" @click="goBack" title="返回">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <div class="breadcrumb">
          <span v-if="currentFolder" class="breadcrumb-item">{{ currentFolder.name }}</span>
          <span class="breadcrumb-separator" v-if="currentFolder">/</span>
          <span class="breadcrumb-current">{{ note.title || '无标题' }}</span>
        </div>
      </div>
      
      <div class="header-center">
        <div class="type-badge" :class="note.type">
          <el-icon v-if="note.type === 'markdown'"><EditPen /></el-icon>
          <el-icon v-else-if="note.type === 'bookmark'"><Link /></el-icon>
          <el-icon v-else><Document /></el-icon>
          <span>{{ typeLabels[note.type] }}</span>
        </div>
      </div>
      
      <div class="header-right">
        <span class="save-status" :class="{ saving, saved: !saving && !hasChanges }">
          <el-icon v-if="saving" class="is-loading"><Loading /></el-icon>
          <el-icon v-else-if="!hasChanges"><Check /></el-icon>
          <el-icon v-else><EditPen /></el-icon>
          <span>{{ saving ? '保存中...' : hasChanges ? '未保存' : '已保存' }}</span>
        </span>
        
        <el-dropdown trigger="click" @command="handleCommand">
          <button class="icon-btn">
            <el-icon><More /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="move">
                <el-icon><FolderOpened /></el-icon>
                移动到文件夹
              </el-dropdown-item>
              <el-dropdown-item command="export">
                <el-icon><Download /></el-icon>
                导出
              </el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                <el-icon><Delete /></el-icon>
                删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- 主编辑区 -->
    <div class="editor-main">
      <!-- 左侧编辑区 -->
      <div class="editor-content">
        <!-- 标题输入 -->
        <input
          v-model="editTitle"
          class="title-input"
          placeholder="输入标题..."
          @input="handleTitleChange"
        />

        <!-- Markdown 编辑器 -->
        <div v-if="note.type === 'markdown'" class="markdown-editor">
          <div class="editor-toolbar">
            <button class="toolbar-btn" @click="insertFormat('**', '**')" title="粗体">
              <strong>B</strong>
            </button>
            <button class="toolbar-btn" @click="insertFormat('*', '*')" title="斜体">
              <em>I</em>
            </button>
            <button class="toolbar-btn" @click="insertFormat('`', '`')" title="代码">
              <code>&lt;/&gt;</code>
            </button>
            <button class="toolbar-btn" @click="insertFormat('[[', ']]')" title="双向链接">
              <el-icon><Connection /></el-icon>
            </button>
            <div class="toolbar-divider"></div>
            <button class="toolbar-btn" @click="insertFormat('\n# ', '')" title="标题1">
              H1
            </button>
            <button class="toolbar-btn" @click="insertFormat('\n## ', '')" title="标题2">
              H2
            </button>
            <button class="toolbar-btn" @click="insertFormat('\n### ', '')" title="标题3">
              H3
            </button>
            <div class="toolbar-divider"></div>
            <button class="toolbar-btn" @click="insertFormat('\n- ', '')" title="列表">
              <el-icon><List /></el-icon>
            </button>
            <button class="toolbar-btn" @click="insertFormat('\n> ', '')" title="引用">
              <el-icon><ChatLineSquare /></el-icon>
            </button>
            <div class="toolbar-spacer"></div>
            <button 
              class="toolbar-btn" 
              :class="{ active: showPreview }"
              @click="showPreview = !showPreview"
              title="预览"
            >
              <el-icon><View /></el-icon>
            </button>
          </div>
          
          <div class="editor-body" :class="{ 'split-view': showPreview }">
            <textarea
              ref="textareaRef"
              v-model="editContent"
              class="content-textarea"
              placeholder="开始写作..."
              @input="handleContentChange"
            ></textarea>
            
            <div v-if="showPreview" class="preview-pane">
              <div class="markdown-preview" v-html="renderedContent"></div>
            </div>
          </div>
        </div>

        <!-- 书签编辑器 -->
        <div v-else-if="note.type === 'bookmark'" class="bookmark-editor">
          <div class="form-group">
            <label class="form-label">网址</label>
            <div class="url-input-group">
              <el-input
                v-model="editUrl"
                placeholder="https://example.com"
                @input="handleUrlChange"
              >
                <template #prefix>
                  <el-icon><Link /></el-icon>
                </template>
              </el-input>
              <button class="btn btn-secondary" @click="openUrl" :disabled="!editUrl">
                <el-icon><TopRight /></el-icon>
                打开
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">描述</label>
            <el-input
              v-model="editDescription"
              type="textarea"
              :rows="4"
              placeholder="添加描述..."
              @input="handleDescriptionChange"
            />
          </div>
          
          <div class="bookmark-preview" v-if="editUrl">
            <div class="preview-card">
              <div class="preview-favicon">
                <img v-if="note.favicon" :src="note.favicon" alt="" />
                <el-icon v-else><Link /></el-icon>
              </div>
              <div class="preview-info">
                <div class="preview-title">{{ editTitle || '无标题' }}</div>
                <div class="preview-url">{{ editUrl }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 代码片段编辑器 -->
        <div v-else-if="note.type === 'snippet'" class="snippet-editor">
          <div class="form-group">
            <label class="form-label">编程语言</label>
            <el-select v-model="editLanguage" placeholder="选择语言" @change="handleLanguageChange">
              <el-option
                v-for="lang in languages"
                :key="lang.value"
                :label="lang.label"
                :value="lang.value"
              />
            </el-select>
          </div>
          
          <div class="form-group">
            <label class="form-label">代码</label>
            <textarea
              v-model="editContent"
              class="code-textarea"
              placeholder="// 粘贴或输入代码..."
              @input="handleContentChange"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- 右侧面板 -->
      <aside class="editor-sidebar">
        <!-- 标签管理 -->
        <section class="sidebar-section">
          <h3 class="section-title">
            <el-icon><PriceTag /></el-icon>
            标签
          </h3>
          <div class="tags-list">
            <div
              v-for="tag in note.tags"
              :key="tag.id"
              class="tag-chip"
              :style="{ '--tag-color': tag.color }"
            >
              <span class="tag-dot" :style="{ background: tag.color }"></span>
              <span>{{ tag.name }}</span>
              <button class="tag-remove" @click="removeTag(tag.id)">
                <el-icon><Close /></el-icon>
              </button>
            </div>
          </div>
          <el-select
            v-model="selectedTagId"
            placeholder="添加标签..."
            filterable
            clearable
            @change="addTag"
            class="tag-select"
          >
            <el-option
              v-for="tag in availableTags"
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
        </section>

        <!-- 双向链接 -->
        <section class="sidebar-section" v-if="note.type === 'markdown'">
          <h3 class="section-title">
            <el-icon><Connection /></el-icon>
            链接
          </h3>
          
          <div class="links-group" v-if="outLinks.length">
            <div class="links-label">链接到</div>
            <div class="links-list">
              <router-link
                v-for="link in outLinks"
                :key="link.id"
                :to="`/editor/${link.id}`"
                class="link-item"
              >
                <el-icon><Document /></el-icon>
                {{ link.title }}
              </router-link>
            </div>
          </div>
          
          <div class="links-group" v-if="inLinks.length">
            <div class="links-label">被引用</div>
            <div class="links-list">
              <router-link
                v-for="link in inLinks"
                :key="link.id"
                :to="`/editor/${link.id}`"
                class="link-item"
              >
                <el-icon><Document /></el-icon>
                {{ link.title }}
              </router-link>
            </div>
          </div>
          
          <div v-if="!outLinks.length && !inLinks.length" class="links-empty">
            使用 [[文档名]] 创建链接
          </div>
        </section>

        <!-- 笔记信息 -->
        <section class="sidebar-section">
          <h3 class="section-title">
            <el-icon><InfoFilled /></el-icon>
            信息
          </h3>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ formatDate(note.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">修改时间</span>
              <span class="info-value">{{ formatDate(note.updatedAt) }}</span>
            </div>
            <div class="info-item" v-if="note.type === 'markdown'">
              <span class="info-label">字数</span>
              <span class="info-value">{{ wordCount }} 字</span>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>

  <!-- 加载状态 -->
  <div v-else class="loading-state">
    <el-icon class="is-loading" :size="32"><Loading /></el-icon>
    <p>加载中...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  ArrowLeft, EditPen, Link, Document, More, FolderOpened, Download, Delete,
  Connection, List, ChatLineSquare, View, PriceTag, Close, InfoFilled,
  Loading, Check, TopRight
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import { useNotesStore } from '@/stores/notes'
import { useTagsStore } from '@/stores/tags'
import { useFoldersStore } from '@/stores/folders'
import type { Note, Tag } from '@/types'

const router = useRouter()
const route = useRoute()
const notesStore = useNotesStore()
const tagsStore = useTagsStore()
const foldersStore = useFoldersStore()

const note = ref<Note | null>(null)
const editTitle = ref('')
const editContent = ref('')
const editUrl = ref('')
const editDescription = ref('')
const editLanguage = ref('javascript')
const selectedTagId = ref('')
const showPreview = ref(false)
const saving = ref(false)
const hasChanges = ref(false)
const textareaRef = ref<HTMLTextAreaElement>()

const outLinks = ref<Array<{ id: string; title: string }>>([])
const inLinks = ref<Array<{ id: string; title: string }>>([])

const typeLabels: Record<string, string> = {
  markdown: 'Markdown',
  bookmark: '书签',
  snippet: '代码片段'
}

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'bash', label: 'Bash' },
  { value: 'other', label: '其他' },
]

const currentFolder = computed(() => {
  if (!note.value?.folderId) return null
  return foldersStore.findFolder(note.value.folderId)
})

const availableTags = computed(() => {
  const noteTagIds = note.value?.tags?.map(t => t.id) || []
  return tagsStore.tags.filter(t => !noteTagIds.includes(t.id))
})

const renderedContent = computed(() => {
  if (!editContent.value) return ''
  // 处理双向链接
  const content = editContent.value.replace(
    /\[\[([^\]]+)\]\]/g,
    '<span class="wiki-link">$1</span>'
  )
  return marked(content)
})

const wordCount = computed(() => {
  return editContent.value.replace(/\s/g, '').length
})

// 加载笔记
async function loadNote() {
  const id = route.params.id as string
  if (!id) return
  
  const result = await notesStore.fetchNote(id)
  if (result) {
    note.value = result
    editTitle.value = result.title
    editContent.value = result.content || ''
    editUrl.value = result.url || ''
    editDescription.value = result.description || ''
    editLanguage.value = result.language || 'javascript'
    hasChanges.value = false
    
    // 加载链接
    await loadLinks()
  }
}

async function loadLinks() {
  if (!note.value) return
  try {
    const result = await window.api.linkGetByNote(note.value.id)
    if (result.success && result.data) {
      outLinks.value = result.data.outLinks
      inLinks.value = result.data.inLinks
    }
  } catch (e) {
    console.error('Failed to load links:', e)
  }
}

// 保存笔记
let saveTimer: ReturnType<typeof setTimeout> | null = null

function scheduleAutoSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveNote, 1000)
}

async function saveNote() {
  if (!note.value || !hasChanges.value) return
  
  saving.value = true
  try {
    const updates: Partial<Note> = {
      title: editTitle.value,
      content: editContent.value,
    }
    
    if (note.value.type === 'bookmark') {
      updates.url = editUrl.value
      updates.description = editDescription.value
    }
    
    if (note.value.type === 'snippet') {
      updates.language = editLanguage.value
    }
    
    await notesStore.updateNote(note.value.id, updates)
    hasChanges.value = false
    
    // 更新链接
    await loadLinks()
  } finally {
    saving.value = false
  }
}

// 输入处理
function handleTitleChange() {
  hasChanges.value = true
  scheduleAutoSave()
}

function handleContentChange() {
  hasChanges.value = true
  scheduleAutoSave()
}

function handleUrlChange() {
  hasChanges.value = true
  scheduleAutoSave()
}

function handleDescriptionChange() {
  hasChanges.value = true
  scheduleAutoSave()
}

function handleLanguageChange() {
  hasChanges.value = true
  scheduleAutoSave()
}

// 格式化插入
function insertFormat(before: string, after: string) {
  const textarea = textareaRef.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = editContent.value.substring(start, end)
  
  const newText = before + selected + after
  editContent.value = editContent.value.substring(0, start) + newText + editContent.value.substring(end)
  
  // 恢复光标位置
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
  }, 0)
  
  handleContentChange()
}

// 标签操作
async function addTag(tagId: string) {
  if (!note.value || !tagId) return
  await notesStore.addTagToNote(note.value.id, tagId)
  await loadNote()
  selectedTagId.value = ''
}

async function removeTag(tagId: string) {
  if (!note.value) return
  await notesStore.removeTagFromNote(note.value.id, tagId)
  await loadNote()
}

// 命令处理
async function handleCommand(command: string) {
  if (command === 'delete') {
    await deleteNote()
  } else if (command === 'export') {
    exportNote()
  }
}

async function deleteNote() {
  if (!note.value) return
  
  try {
    await ElMessageBox.confirm(
      '确定要删除这篇笔记吗？此操作不可恢复。',
      '删除确认',
      { type: 'warning' }
    )
    await notesStore.deleteNote(note.value.id)
    ElMessage.success('笔记已删除')
    router.push('/')
  } catch {
    // 用户取消
  }
}

function exportNote() {
  if (!note.value) return
  
  let content = editContent.value
  let filename = `${editTitle.value || 'note'}.md`
  let mimeType = 'text/markdown'
  
  if (note.value.type === 'snippet') {
    filename = `${editTitle.value || 'code'}.${editLanguage.value}`
    mimeType = 'text/plain'
  }
  
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function openUrl() {
  if (editUrl.value) {
    window.open(editUrl.value, '_blank')
  }
}

function goBack() {
  router.back()
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 生命周期
watch(() => route.params.id, loadNote, { immediate: true })

onMounted(() => {
  loadNote()
})

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
  if (hasChanges.value) saveNote()
})
</script>

<style scoped>
.editor-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

/* 顶部工具栏 */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 500;
}

.type-badge {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
}

.type-badge.markdown {
  background: rgba(99, 102, 241, 0.1);
  color: var(--type-markdown);
}

.type-badge.bookmark {
  background: rgba(16, 185, 129, 0.1);
  color: var(--type-bookmark);
}

.type-badge.snippet {
  background: rgba(245, 158, 11, 0.1);
  color: var(--type-snippet);
}

.save-status {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 0.75rem;
  color: var(--text-tertiary);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
}

.save-status.saving {
  color: var(--primary-color);
}

.save-status.saved {
  color: var(--accent-color);
}

/* 主编辑区 */
.editor-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-xl);
  overflow-y: auto;
}

.title-input {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  border: none;
  background: transparent;
  width: 100%;
  margin-bottom: var(--space-lg);
  outline: none;
}

.title-input::placeholder {
  color: var(--text-tertiary);
}

/* Markdown 编辑器 */
.markdown-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--space-sm);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-bottom: none;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.875rem;
  transition: all var(--transition-fast);
}

.toolbar-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toolbar-btn.active {
  background: var(--primary-light);
  color: var(--primary-color);
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 var(--space-xs);
}

.toolbar-spacer {
  flex: 1;
}

.editor-body {
  flex: 1;
  display: flex;
  border: 1px solid var(--border-color);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  overflow: hidden;
}

.editor-body.split-view .content-textarea {
  width: 50%;
  border-right: 1px solid var(--border-color);
}

.content-textarea {
  flex: 1;
  padding: var(--space-lg);
  border: none;
  resize: none;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 0.9375rem;
  line-height: 1.7;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
}

.preview-pane {
  width: 50%;
  padding: var(--space-lg);
  overflow-y: auto;
  background: var(--bg-secondary);
}

/* 书签编辑器 */
.bookmark-editor, .snippet-editor {
  max-width: 600px;
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.url-input-group {
  display: flex;
  gap: var(--space-sm);
}

.url-input-group .el-input {
  flex: 1;
}

.bookmark-preview {
  margin-top: var(--space-xl);
}

.preview-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.preview-favicon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
}

.preview-favicon img {
  width: 24px;
  height: 24px;
}

.preview-title {
  font-weight: 600;
  color: var(--text-primary);
}

.preview-url {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}

/* 代码编辑器 */
.code-textarea {
  width: 100%;
  min-height: 300px;
  padding: var(--space-lg);
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  resize: vertical;
}

/* 右侧面板 */
.editor-sidebar {
  width: 280px;
  border-left: 1px solid var(--border-color);
  background: var(--bg-secondary);
  overflow-y: auto;
}

.sidebar-section {
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.tag-chip {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 4px 8px;
  background: color-mix(in srgb, var(--tag-color) 15%, transparent);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
}

.tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.tag-remove {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
}

.tag-remove:hover {
  background: var(--bg-hover);
  color: var(--danger-color);
}

.tag-select {
  width: 100%;
}

.tag-option {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

/* 链接 */
.links-group {
  margin-bottom: var(--space-md);
}

.links-label {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-bottom: var(--space-xs);
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.link-item:hover {
  background: var(--bg-hover);
  color: var(--primary-color);
}

.links-empty {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  text-align: center;
  padding: var(--space-md);
}

/* 信息列表 */
.info-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
}

.info-label {
  color: var(--text-tertiary);
}

.info-value {
  color: var(--text-secondary);
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--space-md);
  color: var(--text-secondary);
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
</style>
