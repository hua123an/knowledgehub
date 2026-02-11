<template>
  <div class="editor-view" v-if="note">
    <!-- 顶栏 -->
    <header class="editor-header">
      <div class="header-left">
        <button class="icon-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <span class="header-type">{{ typeLabels[note.type] }}</span>
        <span class="header-sep">&middot;</span>
        <span class="header-status" :class="{ unsaved: hasChanges }">
          {{ saving ? '保存中' : hasChanges ? '未保存' : '已保存' }}
        </span>
      </div>
      <div class="header-right">
        <!-- AI 工具按钮 -->
        <el-dropdown trigger="click" @command="handleAICommand" v-if="aiStore.isConfigured">
          <button class="icon-btn ai-btn" title="AI 助手">AI</button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="summarize">总结内容</el-dropdown-item>
              <el-dropdown-item command="polish">润色文本</el-dropdown-item>
              <el-dropdown-item command="continue">续写</el-dropdown-item>
              <el-dropdown-item command="explain">解释内容</el-dropdown-item>
              <el-dropdown-item command="suggestTags" divided>推荐标签</el-dropdown-item>
              <el-dropdown-item command="translate-en">翻译为英文</el-dropdown-item>
              <el-dropdown-item command="translate-zh">翻译为中文</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click" @command="handleCommand">
          <button class="icon-btn">
            <el-icon><More /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="export">
                <el-icon><Download /></el-icon>导出
              </el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                <el-icon><Delete /></el-icon>删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- AI 结果弹窗 -->
    <div v-if="aiResult" class="ai-result-bar">
      <div class="ai-result-header">
        <span>AI {{ aiResultLabel }}</span>
        <div class="ai-result-actions">
          <button class="btn btn-sm" @click="applyAIResult">应用</button>
          <button class="btn btn-sm btn-ghost" @click="copyAIResult">复制</button>
          <button class="btn btn-sm btn-ghost" @click="aiResult = ''">关闭</button>
        </div>
      </div>
      <div class="ai-result-content">{{ aiResult }}</div>
    </div>

    <!-- AI 推荐标签 -->
    <div v-if="suggestedTags.length" class="ai-result-bar">
      <div class="ai-result-header">
        <span>AI 推荐标签</span>
        <button class="btn btn-sm btn-ghost" @click="suggestedTags = []">关闭</button>
      </div>
      <div class="suggested-tags">
        <button v-for="tag in suggestedTags" :key="tag" class="suggested-tag" @click="createAndAddTag(tag)">
          + {{ tag }}
        </button>
      </div>
    </div>

    <!-- AI loading -->
    <div v-if="aiStore.loading" class="ai-loading-bar">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>AI 处理中...</span>
    </div>

    <!-- 编辑区 -->
    <div class="editor-main">
      <div class="editor-content">
        <input
          v-model="editTitle"
          class="title-input"
          placeholder="无标题"
          @input="handleTitleChange"
        />

        <!-- Markdown -->
        <div v-if="note.type === 'markdown'" class="markdown-editor">
          <div class="editor-toolbar">
            <button class="tb" @click="insertFormat('**', '**')" title="粗体"><strong>B</strong></button>
            <button class="tb" @click="insertFormat('*', '*')" title="斜体"><em>I</em></button>
            <button class="tb" @click="insertFormat('`', '`')" title="代码"><code>&lt;/&gt;</code></button>
            <button class="tb" @click="insertFormat('[[', ']]')" title="链接">[[</button>
            <span class="tb-sep"></span>
            <button class="tb" @click="insertFormat('\n# ', '')">H1</button>
            <button class="tb" @click="insertFormat('\n## ', '')">H2</button>
            <button class="tb" @click="insertFormat('\n- ', '')">-</button>
            <button class="tb" @click="insertFormat('\n> ', '')">&gt;</button>
            <span class="tb-spacer"></span>
            <button class="tb" :class="{ active: showPreview }" @click="showPreview = !showPreview">预览</button>
          </div>
          <div class="editor-body" :class="{ split: showPreview }">
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

        <!-- 书签 -->
        <div v-else-if="note.type === 'bookmark'" class="bookmark-editor">
          <div class="field">
            <label>网址</label>
            <div class="url-row">
              <el-input v-model="editUrl" placeholder="https://..." @input="handleUrlChange">
                <template #prefix><el-icon><Link /></el-icon></template>
              </el-input>
              <button class="btn btn-secondary" @click="openUrl" :disabled="!editUrl">打开</button>
            </div>
          </div>
          <div class="field">
            <label>描述</label>
            <el-input v-model="editDescription" type="textarea" :rows="3" placeholder="备注..." @input="handleDescriptionChange" />
          </div>
        </div>

        <!-- 代码 -->
        <div v-else-if="note.type === 'snippet'" class="snippet-editor">
          <div class="field">
            <label>语言</label>
            <el-select v-model="editLanguage" placeholder="选择" @change="handleLanguageChange" style="width: 160px">
              <el-option v-for="l in languages" :key="l.value" :label="l.label" :value="l.value" />
            </el-select>
          </div>
          <textarea
            v-model="editContent"
            class="code-textarea"
            placeholder="// 代码..."
            @input="handleContentChange"
          ></textarea>
        </div>
      </div>

      <!-- 右侧 -->
      <aside class="editor-sidebar">
        <section class="sidebar-section">
          <h4>标签</h4>
          <div class="tags-wrap">
            <span v-for="tag in note.tags" :key="tag.id" class="tag-chip">
              {{ tag.name }}
              <button @click="removeTag(tag.id)">&times;</button>
            </span>
          </div>
          <el-select v-model="selectedTagId" placeholder="添加标签" filterable clearable @change="addTag" size="small" style="width: 100%">
            <el-option v-for="tag in availableTags" :key="tag.id" :label="tag.name" :value="tag.id" />
          </el-select>
        </section>

        <section class="sidebar-section" v-if="note.type === 'markdown'">
          <h4>链接</h4>
          <div v-if="outLinks.length" class="links-group">
            <span class="links-label">链接到</span>
            <router-link v-for="l in outLinks" :key="l.id" :to="`/editor/${l.id}`" class="link-item">{{ l.title }}</router-link>
          </div>
          <div v-if="inLinks.length" class="links-group">
            <span class="links-label">被引用</span>
            <router-link v-for="l in inLinks" :key="l.id" :to="`/editor/${l.id}`" class="link-item">{{ l.title }}</router-link>
          </div>
          <p v-if="!outLinks.length && !inLinks.length" class="hint">用 [[名称]] 创建链接</p>
        </section>

        <section class="sidebar-section">
          <h4>信息</h4>
          <div class="info-row"><span>创建</span><span>{{ formatDate(note.createdAt) }}</span></div>
          <div class="info-row"><span>修改</span><span>{{ formatDate(note.updatedAt) }}</span></div>
          <div class="info-row" v-if="note.type === 'markdown'"><span>字数</span><span>{{ wordCount }}</span></div>
        </section>
      </aside>
    </div>
  </div>

  <div v-else class="loading-state">
    <el-icon class="is-loading" :size="24"><Loading /></el-icon>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ArrowLeft, More, Download, Delete, Link, Loading
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import { useNotesStore } from '@/stores/notes'
import { useTagsStore } from '@/stores/tags'
import { useAIStore } from '@/stores/ai'
import type { Note } from '@/types'

const router = useRouter()
const route = useRoute()
const notesStore = useNotesStore()
const tagsStore = useTagsStore()
const aiStore = useAIStore()

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

// AI
const aiResult = ref('')
const aiResultLabel = ref('')
const suggestedTags = ref<string[]>([])

const typeLabels: Record<string, string> = { markdown: 'Markdown', bookmark: '书签', snippet: '代码片段' }

const languages = [
  { value: 'javascript', label: 'JavaScript' }, { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' }, { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' }, { value: 'rust', label: 'Rust' },
  { value: 'cpp', label: 'C++' }, { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' }, { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' }, { value: 'bash', label: 'Bash' },
  { value: 'other', label: '其他' },
]

const availableTags = computed(() => {
  const ids = note.value?.tags?.map(t => t.id) || []
  return tagsStore.tags.filter(t => !ids.includes(t.id))
})

const renderedContent = computed(() => {
  if (!editContent.value) return ''
  const content = editContent.value.replace(/\[\[([^\]]+)\]\]/g, '<span class="wiki-link">$1</span>')
  return marked(content)
})

const wordCount = computed(() => editContent.value.replace(/\s/g, '').length)

async function loadNote() {
  const id = route.params.id as string
  if (!id) return
  const result = await notesStore.getNote(id)
  if (result) {
    note.value = result
    editTitle.value = result.title
    editContent.value = result.content || ''
    editUrl.value = result.url || ''
    editDescription.value = result.description || ''
    editLanguage.value = result.language || 'javascript'
    hasChanges.value = false
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
  } catch (e) { console.error(e) }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function scheduleAutoSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveNote, 1000)
}

async function saveNote() {
  if (!note.value || !hasChanges.value) return
  saving.value = true
  try {
    const updates: Partial<Note> = { title: editTitle.value, content: editContent.value }
    if (note.value.type === 'bookmark') { updates.url = editUrl.value; updates.description = editDescription.value }
    if (note.value.type === 'snippet') { updates.language = editLanguage.value }
    await notesStore.updateNote(note.value.id, updates)
    hasChanges.value = false
    await loadLinks()
  } finally { saving.value = false }
}

function handleTitleChange() { hasChanges.value = true; scheduleAutoSave() }
function handleContentChange() { hasChanges.value = true; scheduleAutoSave() }
function handleUrlChange() { hasChanges.value = true; scheduleAutoSave() }
function handleDescriptionChange() { hasChanges.value = true; scheduleAutoSave() }
function handleLanguageChange() { hasChanges.value = true; scheduleAutoSave() }

function insertFormat(before: string, after: string) {
  const ta = textareaRef.value
  if (!ta) return
  const s = ta.selectionStart, e = ta.selectionEnd
  const sel = editContent.value.substring(s, e)
  editContent.value = editContent.value.substring(0, s) + before + sel + after + editContent.value.substring(e)
  setTimeout(() => { ta.focus(); ta.setSelectionRange(s + before.length, s + before.length + sel.length) }, 0)
  handleContentChange()
}

async function addTag(tagId: string) {
  if (!note.value || !tagId) return
  try {
    await window.api.tagAddToNote(note.value.id, tagId)
    await loadNote()
  } catch (e) { console.error(e) }
  selectedTagId.value = ''
}

async function removeTag(tagId: string) {
  if (!note.value) return
  try {
    await window.api.tagRemoveFromNote(note.value.id, tagId)
    await loadNote()
  } catch (e) { console.error(e) }
}

// AI commands
async function handleAICommand(cmd: string) {
  const content = editContent.value || editTitle.value
  if (!content) {
    ElMessage.warning('没有内容可以处理')
    return
  }

  aiResult.value = ''
  suggestedTags.value = []

  if (cmd === 'summarize') {
    aiResultLabel.value = '总结'
    aiResult.value = await aiStore.summarize(content)
  } else if (cmd === 'polish') {
    aiResultLabel.value = '润色'
    aiResult.value = await aiStore.polish(content)
  } else if (cmd === 'continue') {
    aiResultLabel.value = '续写'
    aiResult.value = await aiStore.continueWriting(content)
  } else if (cmd === 'explain') {
    aiResultLabel.value = '解释'
    aiResult.value = await aiStore.explain(content)
  } else if (cmd === 'suggestTags') {
    suggestedTags.value = await aiStore.suggestTags(content)
  } else if (cmd.startsWith('translate-')) {
    const lang = cmd === 'translate-en' ? 'English' : '中文'
    aiResultLabel.value = '翻译'
    aiResult.value = await aiStore.translate(content, lang)
  }

  if (aiStore.error) {
    ElMessage.error(aiStore.error)
  }
}

function applyAIResult() {
  if (!aiResult.value) return
  if (aiResultLabel.value === '续写') {
    editContent.value += '\n' + aiResult.value
  } else {
    editContent.value = aiResult.value
  }
  handleContentChange()
  aiResult.value = ''
}

function copyAIResult() {
  navigator.clipboard.writeText(aiResult.value)
  ElMessage.success('已复制')
}

async function createAndAddTag(tagName: string) {
  if (!note.value) return
  try {
    // 先查找或创建标签
    let tag = tagsStore.tags.find(t => t.name === tagName)
    if (!tag) {
      const result = await window.api.tagCreate({ name: tagName })
      if (result.success && result.data) {
        tag = result.data
        await tagsStore.fetchTags()
      }
    }
    if (tag) {
      await window.api.tagAddToNote(note.value.id, tag.id)
      await loadNote()
    }
    suggestedTags.value = suggestedTags.value.filter(t => t !== tagName)
  } catch (e) { console.error(e) }
}

async function handleCommand(cmd: string) {
  if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm('确定删除？此操作不可恢复。', '删除', { type: 'warning' })
      await notesStore.deleteNote(note.value!.id)
      ElMessage.success('已删除')
      router.push('/')
    } catch {}
  } else if (cmd === 'export') {
    const content = editContent.value
    const ext = note.value!.type === 'snippet' ? editLanguage.value : 'md'
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${editTitle.value || 'note'}.${ext}`; a.click()
    URL.revokeObjectURL(url)
  }
}

function openUrl() { if (editUrl.value) window.open(editUrl.value, '_blank') }
function goBack() { router.back() }

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

watch(() => route.params.id, loadNote, { immediate: true })
onMounted(loadNote)
onUnmounted(() => { if (saveTimer) clearTimeout(saveTimer); if (hasChanges.value) saveNote() })
</script>

<style scoped>
.editor-view { height: 100%; display: flex; flex-direction: column; }

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-lg);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.8125rem;
}

.header-left { display: flex; align-items: center; gap: var(--space-sm); }
.header-type { color: var(--text-secondary); }
.header-sep { color: var(--border-color); }
.header-status { color: var(--text-tertiary); font-size: 0.75rem; }
.header-status.unsaved { color: var(--warning-color, #e6a23c); }
.header-right { display: flex; align-items: center; gap: var(--space-xs); }

.ai-btn {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-color);
  padding: 4px 10px;
  border: 1px solid var(--accent-color);
  border-radius: var(--radius-md);
}
.ai-btn:hover { background: var(--accent-color); color: #fff; }

/* AI result */
.ai-result-bar {
  border-bottom: 1px solid var(--border-color);
  padding: var(--space-sm) var(--space-lg);
  background: var(--bg-secondary);
  font-size: 0.8125rem;
}
.ai-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs);
  font-weight: 500;
}
.ai-result-actions { display: flex; gap: var(--space-xs); }
.ai-result-content {
  white-space: pre-wrap;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  color: var(--text-secondary);
}
.btn-sm { padding: 2px 8px; font-size: 0.75rem; }
.btn-ghost { background: none; color: var(--text-secondary); }
.btn-ghost:hover { color: var(--text-primary); }

.suggested-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.suggested-tag {
  padding: 3px 10px;
  font-size: 0.75rem;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  cursor: pointer;
}
.suggested-tag:hover { border-color: var(--accent-color); color: var(--accent-color); }

.ai-loading-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}

.editor-main { flex: 1; display: flex; overflow: hidden; }

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-xl);
  overflow-y: auto;
}

.title-input {
  font-size: 1.5rem;
  font-weight: 600;
  border: none;
  background: transparent;
  width: 100%;
  margin-bottom: var(--space-lg);
  outline: none;
  color: var(--text-primary);
}
.title-input::placeholder { color: var(--text-tertiary); }

.markdown-editor { flex: 1; display: flex; flex-direction: column; }

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--border-color);
  border-bottom: none;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  background: var(--bg-secondary);
}

.tb {
  padding: 4px 8px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  border-radius: 3px;
  transition: all 0.15s;
}
.tb:hover { background: var(--bg-hover); color: var(--text-primary); }
.tb.active { background: var(--bg-active); color: var(--text-primary); }
.tb-sep { width: 1px; height: 16px; background: var(--border-color); margin: 0 4px; }
.tb-spacer { flex: 1; }

.editor-body {
  flex: 1;
  display: flex;
  border: 1px solid var(--border-color);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  overflow: hidden;
  min-height: 300px;
}

.editor-body.split .content-textarea { width: 50%; border-right: 1px solid var(--border-color); }

.content-textarea {
  flex: 1;
  padding: var(--space-lg);
  border: none;
  resize: none;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.7;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
}

.preview-pane { width: 50%; padding: var(--space-lg); overflow-y: auto; background: var(--bg-secondary); }

.field { margin-bottom: var(--space-lg); }
.field label { display: block; font-size: 0.75rem; font-weight: 500; color: var(--text-tertiary); margin-bottom: var(--space-xs); text-transform: uppercase; letter-spacing: 0.5px; }
.url-row { display: flex; gap: var(--space-sm); }
.url-row .el-input { flex: 1; }
.bookmark-editor, .snippet-editor { max-width: 560px; }

.code-textarea {
  width: 100%;
  min-height: 300px;
  padding: var(--space-lg);
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  resize: vertical;
  color: var(--text-primary);
}

.editor-sidebar {
  width: 240px;
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
  padding: var(--space-lg);
}

.sidebar-section { margin-bottom: var(--space-xl); }
.sidebar-section h4 { font-size: 0.6875rem; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--space-sm); }

.tags-wrap { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: var(--space-sm); }

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 0.75rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
}

.tag-chip button {
  font-size: 0.875rem;
  color: var(--text-tertiary);
  line-height: 1;
}
.tag-chip button:hover { color: var(--danger-color); }

.links-group { margin-bottom: var(--space-sm); }
.links-label { display: block; font-size: 0.6875rem; color: var(--text-tertiary); margin-bottom: 4px; }

.link-item {
  display: block;
  font-size: 0.8125rem;
  color: var(--accent-color);
  padding: 2px 0;
  text-decoration: none;
}
.link-item:hover { text-decoration: underline; }

.hint { font-size: 0.75rem; color: var(--text-tertiary); }

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  padding: 3px 0;
  color: var(--text-tertiary);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
}

:deep(.el-dropdown-menu__item) { display: flex; align-items: center; gap: var(--space-sm); }
</style>
