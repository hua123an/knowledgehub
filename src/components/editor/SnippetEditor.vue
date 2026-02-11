<template>
  <div class="snippet-editor">
    <div class="snippet-header">
      <el-select v-model="language" placeholder="选择语言" @change="emitUpdate">
        <el-option
          v-for="lang in languages"
          :key="lang.value"
          :label="lang.label"
          :value="lang.value"
        />
      </el-select>
      
      <el-button @click="copyCode">
        <el-icon><CopyDocument /></el-icon>
        复制代码
      </el-button>
    </div>

    <div class="code-editor-container">
      <div class="line-numbers">
        <div v-for="n in lineCount" :key="n" class="line-number">{{ n }}</div>
      </div>
      <textarea
        ref="codeArea"
        v-model="code"
        class="code-textarea"
        placeholder="// 在这里粘贴或输入代码..."
        spellcheck="false"
        @input="emitUpdate"
        @keydown="handleKeydown"
      ></textarea>
    </div>

    <div class="snippet-footer">
      <span class="code-stats">
        {{ lineCount }} 行 | {{ code.length }} 字符 | {{ language || '纯文本' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { Note, SnippetMeta } from '../../types'

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits<{
  update: [data: Partial<Note>]
}>()

const codeArea = ref<HTMLTextAreaElement | null>(null)
const code = ref('')
const language = ref('javascript')

const languages = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'SQL', value: 'sql' },
  { label: 'Shell', value: 'shell' },
  { label: 'JSON', value: 'json' },
  { label: 'Markdown', value: 'markdown' },
  { label: '纯文本', value: 'text' }
]

const lineCount = computed(() => {
  return code.value.split('\n').length
})

function parseContent() {
  try {
    const meta: SnippetMeta = JSON.parse(props.note.content || '{}')
    code.value = meta.code || ''
    language.value = meta.language || 'javascript'
  } catch {
    code.value = props.note.content || ''
  }
}

function emitUpdate() {
  const meta: SnippetMeta = {
    code: code.value,
    language: language.value
  }
  emit('update', {
    content: JSON.stringify(meta)
  })
}

async function copyCode() {
  await navigator.clipboard.writeText(code.value)
  ElMessage.success('代码已复制')
}

function handleKeydown(e: KeyboardEvent) {
  // Handle Tab key for indentation
  if (e.key === 'Tab') {
    e.preventDefault()
    const textarea = codeArea.value
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    
    code.value = code.value.substring(0, start) + '  ' + code.value.substring(end)
    
    // Move cursor after the tab
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2
    }, 0)
    
    emitUpdate()
  }
}

watch(() => props.note, parseContent, { immediate: true })

onMounted(parseContent)
</script>

<style scoped>
.snippet-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.snippet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.code-editor-container {
  flex: 1;
  display: flex;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.line-numbers {
  padding: 16px 12px;
  background: #252526;
  color: #858585;
  text-align: right;
  user-select: none;
  min-width: 40px;
}

.line-number {
  height: 22.4px; /* line-height * font-size */
}

.code-textarea {
  flex: 1;
  padding: 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  tab-size: 2;
}

.code-textarea::placeholder {
  color: #5a5a5a;
}

.snippet-footer {
  margin-top: 12px;
}

.code-stats {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
