<template>
  <div class="ai-panel" :class="{ open: aiStore.chatOpen }">
    <!-- 遮罩 -->
    <div class="ai-overlay" @click="aiStore.chatOpen = false"></div>

    <div class="ai-drawer">
      <!-- 头部 -->
      <div class="ai-header">
        <div class="ai-header-left">
          <span class="ai-title">AI 助手</span>
          <button
            v-if="!aiStore.isConfigured"
            class="config-hint"
            @click="aiStore.settingsOpen = true; aiStore.chatOpen = false"
          >未配置</button>
        </div>
        <div class="ai-header-right">
          <button class="icon-btn" title="新对话" @click="aiStore.newConversation()">
            <el-icon><Plus /></el-icon>
          </button>
          <button class="icon-btn" title="历史" @click="showHistory = !showHistory">
            <el-icon><Clock /></el-icon>
          </button>
          <button class="icon-btn" @click="aiStore.chatOpen = false">
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </div>

      <!-- 历史列表 -->
      <div v-if="showHistory" class="ai-history">
        <div class="history-title">历史对话</div>
        <div v-if="aiStore.conversations.length === 0" class="history-empty">暂无历史</div>
        <div
          v-for="conv in aiStore.conversations" :key="conv.id"
          class="history-item"
          :class="{ active: conv.id === aiStore.currentConversation.id }"
          @click="loadConversation(conv.id)"
        >
          <span class="history-item-title">{{ conv.title }}</span>
          <button class="history-del" @click.stop="aiStore.deleteConversation(conv.id)">
            <el-icon :size="12"><Delete /></el-icon>
          </button>
        </div>
      </div>

      <!-- 消息区 -->
      <div v-else class="ai-messages" ref="messagesRef">
        <!-- 空状态 -->
        <div v-if="aiStore.currentConversation.messages.length === 0 && !aiStore.streaming" class="ai-empty">
          <div class="ai-empty-icon">AI</div>
          <p>有什么可以帮你的？</p>
          <div class="ai-quick-actions">
            <button v-if="contextContent" @click="askAboutContext">解释当前内容</button>
            <button v-if="contextContent" @click="summarizeContext">总结当前内容</button>
            <button @click="sendQuick('帮我整理一下知识库的使用技巧')">使用技巧</button>
          </div>
        </div>

        <!-- 消息列表 -->
        <template v-for="(msg, i) in aiStore.currentConversation.messages" :key="i">
          <div class="msg" :class="msg.role">
            <div class="msg-label">{{ msg.role === 'user' ? '你' : 'AI' }}</div>
            <div class="msg-content" v-html="renderMarkdown(msg.content)"></div>
            <div v-if="msg.role === 'assistant'" class="msg-actions">
              <button @click="copyContent(msg.content)" title="复制">复制</button>
              <button v-if="contextContent" @click="insertToEditor(msg.content)" title="插入">插入到编辑器</button>
            </div>
          </div>
        </template>

        <!-- 流式输出 -->
        <div v-if="aiStore.streaming" class="msg assistant">
          <div class="msg-label">AI</div>
          <div class="msg-content" v-html="renderMarkdown(aiStore.streamContent || '思考中...')"></div>
        </div>

        <!-- 错误 -->
        <div v-if="aiStore.error" class="ai-error">
          {{ aiStore.error }}
          <button @click="aiStore.error = ''">关闭</button>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="ai-input-area">
        <div v-if="contextContent" class="ai-context-hint">
          <span>上下文: {{ contextTitle }}</span>
          <button @click="clearContext">&times;</button>
        </div>
        <div class="ai-input-row">
          <textarea
            ref="inputRef"
            v-model="inputText"
            class="ai-input"
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows="1"
            @keydown="handleKeydown"
            @input="autoResize"
          ></textarea>
          <button
            v-if="aiStore.streaming"
            class="ai-send-btn stop"
            @click="aiStore.stopGeneration()"
          >
            <el-icon><VideoPause /></el-icon>
          </button>
          <button
            v-else
            class="ai-send-btn"
            :disabled="!inputText.trim() || aiStore.loading"
            @click="send"
          >
            <el-icon><Promotion /></el-icon>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { Plus, Close, Clock, Delete, Promotion, VideoPause } from '@element-plus/icons-vue'
import { marked } from 'marked'
import { useAIStore } from '@/stores/ai'
import { ElMessage } from 'element-plus'

const aiStore = useAIStore()

const inputText = ref('')
const inputRef = ref<HTMLTextAreaElement>()
const messagesRef = ref<HTMLDivElement>()
const showHistory = ref(false)

// 上下文
const contextContent = ref('')
const contextTitle = ref('')

// 对外暴露设置上下文的方法
function setContext(title: string, content: string) {
  contextTitle.value = title
  contextContent.value = content
}

function clearContext() {
  contextContent.value = ''
  contextTitle.value = ''
}

defineExpose({ setContext, clearContext })

function renderMarkdown(text: string): string {
  if (!text) return ''
  try {
    return marked(text) as string
  } catch {
    return text
  }
}

async function send() {
  if (!inputText.value.trim() || aiStore.loading) return
  const msg = inputText.value
  inputText.value = ''
  resetTextarea()
  await aiStore.sendMessage(msg, contextContent.value || undefined)
  scrollToBottom()
}

function sendQuick(msg: string) {
  inputText.value = msg
  send()
}

function askAboutContext() {
  inputText.value = '请解释一下这段内容'
  send()
}

function summarizeContext() {
  inputText.value = '请总结这段内容的要点'
  send()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function resetTextarea() {
  const el = inputRef.value
  if (el) el.style.height = 'auto'
}

function scrollToBottom() {
  nextTick(() => {
    const el = messagesRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function copyContent(content: string) {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

function insertToEditor(content: string) {
  // 通过自定义事件通知编辑器插入内容
  window.dispatchEvent(new CustomEvent('ai-insert', { detail: content }))
  ElMessage.success('已插入')
}

async function loadConversation(id: string) {
  await aiStore.switchConversation(id)
  showHistory.value = false
}

// 消息变化时滚动
watch(
  () => aiStore.streamContent,
  () => scrollToBottom()
)

watch(
  () => aiStore.currentConversation.messages.length,
  () => scrollToBottom()
)

onMounted(async () => {
  await aiStore.loadConfig()
  await aiStore.loadConversations()
})
</script>

<style scoped>
.ai-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
}

.ai-panel.open {
  pointer-events: auto;
  opacity: 1;
}

.ai-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
}

.ai-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.25s ease;
}

.ai-panel.open .ai-drawer {
  transform: translateX(0);
}

/* Header */
.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--border-color);
}

.ai-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.ai-title {
  font-size: 0.875rem;
  font-weight: 600;
}

.config-hint {
  font-size: 0.6875rem;
  color: var(--warning-color);
  padding: 1px 6px;
  border: 1px solid var(--warning-color);
  border-radius: var(--radius-full);
}

.ai-header-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* History */
.ai-history {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md);
}

.history-title {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-weight: 600;
  margin-bottom: var(--space-sm);
}

.history-empty {
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.8125rem;
  padding: var(--space-xl);
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.history-item:hover { background: var(--bg-hover); }
.history-item.active { background: var(--bg-active); }

.history-item-title {
  font-size: 0.8125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.history-del {
  opacity: 0;
  color: var(--text-tertiary);
  padding: 2px;
}

.history-item:hover .history-del { opacity: 1; }
.history-del:hover { color: var(--danger-color); }

/* Messages */
.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
}

.ai-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--space-md);
  color: var(--text-tertiary);
}

.ai-empty-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.ai-empty p {
  font-size: 0.875rem;
}

.ai-quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  justify-content: center;
}

.ai-quick-actions button {
  padding: 4px 10px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}

.ai-quick-actions button:hover {
  border-color: var(--text-tertiary);
  background: var(--bg-hover);
}

/* Message bubbles */
.msg {
  margin-bottom: var(--space-lg);
}

.msg-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.msg.user .msg-content {
  background: var(--bg-tertiary);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.msg.assistant .msg-content {
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--text-primary);
}

.msg.assistant .msg-content :deep(p) { margin: 0 0 var(--space-sm); }
.msg.assistant .msg-content :deep(p:last-child) { margin-bottom: 0; }
.msg.assistant .msg-content :deep(code) {
  background: var(--bg-tertiary);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.8em;
}
.msg.assistant .msg-content :deep(pre) {
  background: var(--bg-secondary);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: var(--space-sm) 0;
  font-size: 0.8em;
}

.msg-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: 4px;
}

.msg-actions button {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  padding: 2px 6px;
  border-radius: 3px;
  transition: all var(--transition-fast);
}

.msg-actions button:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.ai-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: #fef2f2;
  color: var(--danger-color);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  margin-top: var(--space-sm);
}

.ai-error button {
  color: var(--danger-color);
  font-size: 0.6875rem;
}

/* Input */
.ai-input-area {
  border-top: 1px solid var(--border-color);
  padding: var(--space-md);
}

.ai-context-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px var(--space-sm);
  margin-bottom: var(--space-xs);
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

.ai-context-hint button {
  color: var(--text-tertiary);
  font-size: 0.875rem;
  line-height: 1;
}

.ai-input-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-sm);
  transition: border-color var(--transition-fast);
}

.ai-input-row:focus-within {
  border-color: var(--text-tertiary);
}

.ai-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  line-height: 1.5;
  resize: none;
  outline: none;
  color: var(--text-primary);
  max-height: 120px;
}

.ai-input::placeholder { color: var(--text-tertiary); }

.ai-send-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.ai-send-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.ai-send-btn:disabled {
  opacity: 0.3;
}

.ai-send-btn.stop {
  color: var(--danger-color);
}
</style>
