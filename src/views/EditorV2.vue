<template>
  <div class="editor-v2">
    <!-- 顶部状态栏 -->
    <header class="editor-header">
      <div class="breadcrumb">
        <el-dropdown trigger="click" @command="handleMoveToFolder">
          <div class="folder-selector clickable">
            <el-icon class="folder-icon"><Folder /></el-icon>
            <span>{{ folderName || '未分类' }}</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :command="null">未分类</el-dropdown-item>
              <el-dropdown-item 
                v-for="f in foldersStore.folders" 
                :key="f.id" 
                :command="f.id"
              >{{ f.name }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <span class="divider">/</span>
        <div class="title-edit-wrapper">
          <input
            v-if="isEditingTitle"
            ref="headerTitleInputRef"
            v-model="titleInput"
            class="header-title-input"
            @blur="finishHeaderEdit"
            @keydown.enter="finishHeaderEdit"
          />
          <span 
            v-else 
            class="note-title clickable" 
            @click="startHeaderEdit"
            title="点击重命名"
          >
            {{ note?.title || '无标题' }}
          </span>
        </div>
      </div>
      <div class="status">
        <span v-if="isSaving" class="status-text saving">保存中...</span>
        <span v-else class="status-text saved">已保存</span>
        <!-- 删除按钮 -->
        <el-button link type="danger" @click="handleDelete">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </header>

    <!-- 编辑区域 -->
    <div class="editor-container" @click="focusEditor">
      <!-- 标题输入 -->
      <input 
        v-model="titleInput" 
        class="document-title" 
        placeholder="无标题"
        @input="onTitleChange"
        @keydown.enter.prevent="focusEditorContent"
      />
      
      <!-- Tiptap 编辑器 -->
      <editor-content :editor="editor" class="tiptap-editor" />

      <!-- Slash Menu -->
      <div v-if="showSlashMenu" class="slash-menu" :style="menuStyle">
        <div class="menu-item" @click="insertBlock('heading', { level: 1 })">
          <span class="icon">H1</span> 大标题
        </div>
        <div class="menu-item" @click="insertBlock('heading', { level: 2 })">
          <span class="icon">H2</span> 中标题
        </div>
        <div class="menu-item" @click="insertBlock('bulletList')">
          <span class="icon">•</span> 列表
        </div>
        <div class="menu-item" @click="insertBlock('codeBlock')">
          <span class="icon">Code</span> 代码块
        </div>
        <div class="menu-item highlight" @click="insertMindMap">
          <span class="icon">🧠</span> 思维导图
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { Markdown } from 'tiptap-markdown'
import { Delete, Folder } from '@element-plus/icons-vue'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()
import { useAIStore } from '@/stores/ai'
const aiStore = useAIStore()

const noteId = computed(() => route.params.id as string)
const note = computed(() => notesStore.currentNote)
const folderName = computed(() => {
  if (!note.value?.folderId) return '未分类'
  const folder = foldersStore.folders.find(f => f.id === note.value?.folderId)
  return folder ? folder.name : '未分类'
})

const titleInput = ref('')
const isSaving = ref(false)
const showSlashMenu = ref(false)
const menuPosition = ref({ x: 0, y: 0 })
const isEditingTitle = ref(false)
const headerTitleInputRef = ref<HTMLInputElement | null>(null)
let saveTimer: any = null

const editor = useEditor({
  content: '',
  extensions: [
    StarterKit,
    Typography,
    Placeholder.configure({
      placeholder: '输入 / 以使用命令...',
    }),
    Markdown, // Enable markdown support
  ],
  onUpdate: ({ editor }) => {
    handleSlashMenu(editor)
    debouncedSave()
  }
})

// 加载笔记数据
async function loadNoteData() {
  if (!noteId.value) return

  try {
    console.log('Loading note:', noteId.value)
    const data = await notesStore.getNote(noteId.value)
    console.log('Loaded note data:', data)
    
    if (data) {
      // 强制更新标题
      titleInput.value = data.title
      
      // 确保编辑器已初始化
      if (editor.value) {
        editor.value.commands.setContent(data.content, true) 
      }
      
      // 更新 AI 上下文
      aiStore.setActiveNote(data)
    }
  } catch (error) {
    console.error('Failed to load note:', error)
    ElMessage.error('加载笔记失败')
  }
}

// 移动笔记到文件夹
async function handleMoveToFolder(folderId: string | null) {
  if (!noteId.value) return
  try {
    await notesStore.updateNote(noteId.value, { folderId })
    ElMessage.success('移动成功')
  } catch (e) {
    ElMessage.error('移动失败')
  }
}

// 监听外部更新 (例如 AI 操作或跨组件协同)
watch(() => notesStore.currentNote, (newNote) => {
  if (!newNote) {
    // 如果当前正在查看的笔记被删除了，回首页
    if (noteId.value) {
      router.push('/')
    }
    return
  }

  // 只有当 ID 匹配时才处理
  if (newNote.id === noteId.value) {
    // 1. 更新标题 (如果不同)
    if (newNote.title !== titleInput.value) {
      titleInput.value = newNote.title
    }
    
    // 2. 更新编辑器内容
    if (editor.value && !isSaving.value) {
      const currentMarkdown = (editor.value.storage as any).markdown?.getMarkdown()
      // 只有当实质内容发生变化时才更新，避免干扰用户输入
      if (newNote.content !== currentMarkdown) {
        // 使用 any 规避 Tiptap 版本不一致导致的 SetContentOptions 类型警告
        (editor.value.commands as any).setContent(newNote.content, false)
      }
    }
  }
}, { deep: true })

// 监听路由变化
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadNoteData()
  }
}, { immediate: true })

// 监听 editor 就绪
watch(() => editor.value, (newEditor) => {
  if (newEditor && noteId.value) {
    loadNoteData() // 编辑器就绪后再次尝试加载数据
  }
})

// 标题变更处理
function onTitleChange() {
  if (!noteId.value) return
  isSaving.value = true
  
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await notesStore.updateNote(noteId.value, { title: titleInput.value })
      isSaving.value = false
    } catch (e) {
      console.error(e)
      isSaving.value = false
    }
  }, 1000)
}

// 防抖保存内容
function debouncedSave() {
  if (!noteId.value || !editor.value) return
  isSaving.value = true
  
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      const markdown = (editor.value as any)?.storage.markdown.getMarkdown()
      await notesStore.updateNote(noteId.value, { content: markdown })
      isSaving.value = false
    } catch (e) {
      console.error(e)
      isSaving.value = false
    }
  }, 1000)
}

// Slash Menu Logic
function handleSlashMenu(editor: any) {
  const { state } = editor
  const { selection } = state
  const { $from } = selection
  const currentLineText = $from.nodeBefore?.text || ''
  
  if (currentLineText.endsWith('/')) {
    const coords = editor.view.coordsAtPos($from.pos)
    // Adjust position relative to viewport
    const domRect = editor.view.dom.getBoundingClientRect()
    menuPosition.value = { 
      x: coords.left, 
      y: coords.bottom + 10 
    }
    showSlashMenu.value = true
  } else {
    showSlashMenu.value = false
  }
}

function focusEditor() {
  if (!editor.value?.isFocused) {
    editor.value?.commands.focus()
  }
}

function focusEditorContent() {
  editor.value?.commands.focus()
}

const menuStyle = computed(() => ({
  top: `${menuPosition.value.y}px`,
  left: `${menuPosition.value.x}px`
}))

function insertBlock(type: string, attrs = {}) {
  if (!editor.value) return
  editor.value.commands.deleteRange({ from: editor.value.state.selection.from - 1, to: editor.value.state.selection.from })
  
  if (type === 'heading') {
    editor.value.commands.toggleHeading(attrs as any)
  } else if (type === 'bulletList') {
    editor.value.commands.toggleBulletList()
  } else if (type === 'codeBlock') {
    editor.value.commands.toggleCodeBlock()
  }
  
  showSlashMenu.value = false
  editor.value.commands.focus()
}

function insertMindMap() {
   if (!editor.value) return
   editor.value.commands.deleteRange({ from: editor.value.state.selection.from - 1, to: editor.value.state.selection.from })
   editor.value.commands.insertContent('```mindmap\n# Root\n## Node 1\n## Node 2\n```')
   showSlashMenu.value = false
}

// 删除笔记
async function handleDelete() {
  if (!noteId.value) return
  try {
    await ElMessageBox.confirm('确定要删除这篇笔记吗？', '警告', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await notesStore.deleteNote(noteId.value)
    ElMessage.success('笔记已删除')
    router.push('/')
  } catch (e) {
    // Cancelled
  }
}

function startHeaderEdit() {
  isEditingTitle.value = true
  // Next tick focus
  setTimeout(() => {
    headerTitleInputRef.value?.focus()
  }, 0)
}

function finishHeaderEdit() {
  isEditingTitle.value = false
  onTitleChange()
}

onBeforeUnmount(() => {
  aiStore.setActiveNote(null)
  editor.value?.destroy()
  if (saveTimer) clearTimeout(saveTimer)
})
</script>

<style scoped>
.editor-v2 {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
}

.editor-header {
  height: 48px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
}

.folder-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
  cursor: pointer;
}

.folder-selector:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.folder-icon { font-size: 1.1em; }
.divider { color: var(--text-tertiary); }
.note-title { font-weight: 500; color: var(--text-primary); }
.note-title.clickable:hover { 
  background: var(--bg-hover); 
  border-radius: 4px; 
  cursor: text; 
}

.title-edit-wrapper {
  display: flex;
  align-items: center;
}

.header-title-input {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  border: 1px solid var(--accent-color);
  border-radius: 4px;
  padding: 0 4px;
  background: var(--bg-primary);
  outline: none;
  min-width: 100px;
}

.status {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
}

.status-text {
  color: var(--text-tertiary);
  transition: all 0.3s;
}

.status-text.saving {
  color: var(--accent-color);
}

.editor-container {
  flex: 1;
  overflow-y: auto;
  padding: 40px 60px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  position: relative;
}

.document-title {
  width: 100%;
  border: none;
  background: none;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 24px;
  color: var(--text-primary);
  outline: none;
}
.document-title::placeholder { color: var(--text-tertiary); opacity: 0.3; }

/* Tiptap Styles */
:deep(.tiptap) {
  outline: none;
  min-height: 300px;
}

:deep(.tiptap p.is-editor-empty:first-child::before) {
  color: var(--text-tertiary);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.tiptap h1) { font-size: 2em; margin-top: 1em; margin-bottom: 0.5em; }
:deep(.tiptap h2) { font-size: 1.5em; margin-top: 1em; margin-bottom: 0.5em; }
:deep(.tiptap ul) { padding-left: 1.5em; }
:deep(.tiptap pre) { 
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  font-family: monospace;
}

/* Slash Menu */
.slash-menu {
  position: fixed;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-radius: 6px;
  padding: 6px;
  width: 200px;
  z-index: 100;
  animation: slideIn 0.1s ease-out;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.menu-item:hover {
  background: var(--bg-hover);
}

.menu-item .icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.menu-item.highlight .icon {
  background: var(--accent-color);
  color: white;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
