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
            <div class="ai-msg-content">
          <!-- Text Content -->
          <div class="markdown-body" v-html="renderMarkdown(extractText(msg.content))"></div>
          
          <!-- Reference Hint -->
          <div v-if="msg.role === 'assistant' && i === aiStore.currentConversation.messages.length - 1 && aiStore.lastReference.length > 0" class="ai-ref-source">
            <el-icon><Document /></el-icon> 参考: {{ aiStore.lastReference.slice(0, 2).join(', ') }} {{ aiStore.lastReference.length > 2 ? '等' : '' }}
          </div>

          <!-- Action Card -->
           <!-- Action Card -->
          <div v-if="extractActions(msg.content).length > 0" class="ai-action-card">
             <div class="action-header">
               <el-icon><Promotion /></el-icon>
               <span>推荐操作</span>
               <el-button v-if="extractActions(msg.content).length > 1" type="primary" link size="small" @click="handleBatchActions(extractActions(msg.content))">全部执行</el-button>
             </div>
             <div class="action-body-list">
               <div v-for="(action, idx) in extractActions(msg.content)" :key="idx" class="action-item">
                 
                 <div v-if="action.type === 'create_note'">
                   <p>创建笔记: <strong>{{ action.data.title }}</strong></p>
                   <el-button type="primary" size="small" @click="handleAction(action)">立即创建</el-button>
                 </div>
                 <div v-if="action.type === 'open_note'">
                   <p>打开笔记: <strong>{{ action.data.title }}</strong></p>
                   <el-button type="primary" size="small" @click="handleAction(action)">打开</el-button>
                 </div>
                 <div v-if="action.type === 'delete_note'">
                    <p>删除笔记: <strong>{{ action.data.title }}</strong></p>
                    <el-button type="danger" size="small" @click="handleAction(action)">删除</el-button>
                  </div>
                  <div v-if="action.type === 'update_note'">
                    <p>更新笔记: <strong>{{ action.data.title || '当前笔记' }}</strong></p>
                    <el-button type="primary" size="small" @click="handleAction(action)">确认更新</el-button>
                  </div>
                  <div v-if="action.type === 'create_folder'">
                    <p>创建文件夹: <strong>{{ action.data.name }}</strong></p>
                    <el-button type="primary" size="small" @click="handleAction(action)">创建</el-button>
                  </div>
                  <div v-if="action.type === 'add_tag'">
                    <p>添加标签: <strong>{{ action.data.tag_name }}</strong> -> <strong>{{ action.data.title || '当前笔记' }}</strong></p>
                    <el-button type="primary" size="small" @click="handleAction(action)">添加</el-button>
                  </div>
                  <div v-if="action.type === 'remove_tag'">
                    <p>移除标签: <strong>{{ action.data.tag_name }}</strong> <- <strong>{{ action.data.title || '当前笔记' }}</strong></p>
                    <el-button type="danger" size="small" @click="handleAction(action)">移除</el-button>
                  </div>
                  <div v-if="action.type === 'move_note'">
                    <p>移动笔记: <strong>{{ action.data.title || '当前笔记' }}</strong> -> <strong>ID: {{ action.data.folder_id }}</strong></p>
                    <el-button type="primary" size="small" @click="handleAction(action)">确定移动</el-button>
                  </div>
                  <div v-if="action.type === 'search_notes'">
                    <p>正在检索知识库...</p>
                    <el-icon class="is-loading"><Loading /></el-icon>
                  </div>
                  <div v-if="action.type === 'list_folders'">
                    <p>正在获取目录结构...</p>
                    <el-icon class="is-loading"><Loading /></el-icon>
                  </div>

               </div>
             </div>
          </div>
        </div>    <div v-if="msg.role === 'assistant'" class="msg-actions">
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
        <div class="ai-rag-hint" v-if="!contextContent">
           <span v-if="aiStore.activeNoteContext" class="hint-tag active-note">
             <el-icon><Document /></el-icon>
             当前引用: {{ aiStore.activeNoteContext.title }}
           </span>
           <span v-else class="hint-tag search-mode">
             <el-icon><Search /></el-icon>
             自动检索模式
           </span>
        </div>
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
import { ref, nextTick, watch } from 'vue'
import { Plus, Close, Clock, Delete, Promotion, VideoPause, Document, Search, Loading } from '@element-plus/icons-vue'
import { marked } from 'marked'
import { useAIStore } from '@/stores/ai'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'
import { useTagsStore } from '@/stores/tags'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const aiStore = useAIStore()
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()
const tagsStore = useTagsStore()
const router = useRouter()

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

const extractText = (content: string) => {
  return content.replace(/:::action[\s\S]*?:::/g, '').trim()
}

const extractActions = (content: string) => {
  const regex = /:::action\n([\s\S]*?)\n:::/g
  const matches = [...content.matchAll(regex)]
  const actions: any[] = []
  
  for (const match of matches) {
    try {
      let jsonStr = match[1].trim()
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '')
      else if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '')
      
      const parsed = JSON.parse(jsonStr)
      if (parsed.type === 'batch' && Array.isArray(parsed.data?.actions)) {
        actions.push(...parsed.data.actions)
      } else {
        actions.push(parsed)
      }
    } catch (e) {
      console.warn('Action parsing failed:', e)
    }
  }
  return actions
}

// 自动执行 Search 动作 — 防止重复触发
const searchHandledMsgIds = new Set<number>()

watch(() => aiStore.currentConversation.messages, (newVal: any[]) => {
  if (newVal.length === 0) return
  const lastIdx = newVal.length - 1
  const lastMsg = newVal[lastIdx]
  if (lastMsg.role === 'assistant' && !aiStore.streaming && !searchHandledMsgIds.has(lastIdx)) {
     const actions = extractActions(lastMsg.content)
     const autoActions = actions.filter(a => ['search_notes', 'list_folders'].includes(a.type))
     if (autoActions.length > 0) {
       searchHandledMsgIds.add(lastIdx)
       autoActions.forEach(a => handleAction(a))
     }
  }
}, { deep: true })


async function handleBatchActions(actions: any[]) {
  try {
    await ElMessageBox.confirm(`确定要执行这 ${actions.length} 个操作吗？`, '批量操作', {
        confirmButtonText: '全部执行',
        cancelButtonText: '取消',
        type: 'warning'
    })
    
    for (const action of actions) {
      await handleAction(action, true)
      await new Promise(r => setTimeout(r, 200)) 
    }
    ElMessage.success('批量操作完成')
  } catch (e) {
    //
  }
}

async function handleAction(action: any, skipConfirm = false) {
  if (!action || !action.type) return

  // Search Logic — 自动搜索并把全文反馈给AI
  if (action.type === 'search_notes') {
    const { query } = action.data
    try {
       const results = await window.api.noteSearch(query)
       let resultText = "没有找到相关笔记。"
       if (results.success && results.data && results.data.length > 0) {
          const top = results.data.slice(0, 15)
          // 包含完整笔记内容和更多元数据
          resultText = `找到 ${top.length} 篇笔记：\n` + top.map((n: any) => 
            `--- 笔记 ---\nID: ${n.note.id}\n标题：《${n.note.title}》\n文件夹: ${n.note.folderId || '根目录'}\n标签: ${n.note.tags?.join(', ') || '无'}\n内容(前3000字)：\n${(n.note.content || '').slice(0, 3000)}\n--- 结束 ---`
          ).join('\n\n')
       }
       
       // 以"系统观察"身份反馈，引导 AI 进一步整理
       await aiStore.sendMessage(`【系统反馈 - 搜索结果】针对 "${query}" 找到了 ${results.data?.length || 0} 条结果，展示前15条：\n${resultText}\n\n请分析以上内容，直接输出 batch 或 update_note 动作执行整理操作。如果结果过多，你可以继续使用 search_notes 加上更精确的关键词。`, undefined)
    } catch (e) {
       await aiStore.sendMessage(`【系统反馈】搜索失败，请换个关键词重试。`, undefined)
    }
    return
  }

  // List Folders Logic — 自动获取目录结构反馈给AI
  if (action.type === 'list_folders') {
    try {
      const folders = foldersStore.folders
      const treeText = folders.map(f => `- [${f.id}] ${f.name} (Parent: ${f.parentId || 'None'})`).join('\n')
      await aiStore.sendMessage(`【系统反馈 - 目录结构】：\n${treeText || '暂无文件夹'}\n\n请根据以上目录结构继续操作。若需创建新文件夹，请使用 create_folder。若需移动笔记，请使用 move_note。`, undefined)
    } catch (e) {
      await aiStore.sendMessage(`【系统反馈】获取目录失败。`, undefined)
    }
    return
  }


  if (action.type === 'create_note') {
    const { title, content } = action.data
    try {
      if (!skipConfirm) {
        await ElMessageBox.confirm(`确定要创建笔记《${title}》吗？`, '创建笔记', {
            confirmButtonText: '创建并打开',
            cancelButtonText: '取消',
            type: 'info'
        })
      }
      
      const note = await notesStore.createNote({
        title,
        content: content || '',
        type: 'markdown'
      })
      
      if (note) {
        if (!skipConfirm) ElMessage.success('笔记已创建')
        // Only navigate if it's a single action
        if (!skipConfirm) router.push(`/editor/${note.id}`)
      }
    } catch (e) {
      // Cancelled
    }
  } else if (action.type === 'open_note') {
    const { id, title } = action.data
    // 如果有 ID 直接跳转，否则搜索 Title
    let targetId = id
    if (!targetId && title) {
      // 简单查找
      const found = notesStore.notes.find((n: any) => n.title === title || n.title.includes(title))
      if (found) targetId = found.id
    }
    
    if (targetId) {
      router.push(`/editor/${targetId}`)
      ElMessage.success(`已打开笔记：${title || targetId}`)
    } else {
      ElMessage.warning(`未找到笔记：${title}`)
    }
  } else if (action.type === 'delete_note') {
    const { id, title } = action.data
    let targetId = id
    if (!targetId && title) {
      const found = notesStore.notes.find((n: any) => n.title === title || n.title.includes(title))
      if (found) targetId = found.id
    }

    if (!targetId) {
       // Only warn if manual trigger
       if(!skipConfirm) ElMessage.warning(`未找到要删除的笔记：${title}`)
       return
    }

    try {
      if (!skipConfirm) {
        await ElMessageBox.confirm(`确定要删除笔记《${title || targetId}》吗？此操作不可恢复。`, '删除笔记', {
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            type: 'warning'
        })
      }
      
      const success = await notesStore.deleteNote(targetId)
      if (success) {
        if(!skipConfirm) ElMessage.success('笔记已删除')
      } else {
        if(!skipConfirm) ElMessage.error('删除失败')
      }
    } catch (e) {
      // Cancelled
    }
  } else if (action.type === 'update_note') {
    const { id, title, content } = action.data
    let targetId = id
    
    // 尝试查找
    if (!targetId && aiStore.activeNoteContext) {
      targetId = aiStore.activeNoteContext.id
    }
    if (!targetId && title) {
      const found = notesStore.notes.find((n: any) => n.title === title || n.title.includes(title))
      if (found) targetId = found.id
    }

    if (!targetId) {
       if(!skipConfirm) ElMessage.warning('未找到要更新的笔记')
       return
    }

    try {
      if(!skipConfirm) {
         await ElMessageBox.confirm(`确定要更新笔记《${title || targetId}》的内容吗？此操作将覆盖原内容。`, '更新笔记', {
            confirmButtonText: '更新',
            cancelButtonText: '取消',
            type: 'warning'
         })
      }
      
      const updated = await notesStore.updateNote(targetId, { content })
      if (updated) {
          if(!skipConfirm) ElMessage.success('笔记已更新')
      }
    } catch (e) {}
  } else if (action.type === 'create_folder') {
     const { name } = action.data
     if (name) {
       try {
         const folder = await foldersStore.createFolder({ name })
         if (folder) {
             ElMessage.success(`文件夹 ${name} 已创建`)
         } else {
             ElMessage.error('创建失败')
         }
       } catch (e) {
         ElMessage.error('创建文件夹失败')
       }
     }
  } else if (action.type === 'add_tag') {
        const { id, title, tag_name } = action.data
        if (!tag_name) return
        
        let targetId = id
        // 尝试查找
        if (!targetId && aiStore.activeNoteContext) {
            targetId = aiStore.activeNoteContext.id
        }
        if (!targetId && title) {
            const found = notesStore.notes.find((n: any) => n.title === title || n.title.includes(title))
            if (found) targetId = found.id
        }

        if (!targetId) {
            ElMessage.warning('未找到目标笔记')
            return
        }
        
        // Find or create tag
        let tag = tagsStore.findTagByName(tag_name)
        if (!tag) {
           try {
              tag = await tagsStore.createTag({ name: tag_name })
              if (tag) ElMessage.success(`创建了新标签: ${tag_name}`)
           } catch {
              ElMessage.error('创建标签失败')
              return
           }
        }
        
        if (tag && targetId) {
           const success = await tagsStore.addTagToNote(targetId, tag.id)
           if (success) ElMessage.success(`添加标签 ${tag_name} 成功`)
           else ElMessage.warning('添加标签失败或已存在')
        }
  } else if (action.type === 'remove_tag') {
        const { id, title, tag_name } = action.data
        let targetId = id
        if (!targetId && aiStore.activeNoteContext) targetId = aiStore.activeNoteContext.id
        if (!targetId && title) {
            const found = notesStore.notes.find((n: any) => n.title === title || n.title.includes(title))
            if (found) targetId = found.id
        }
        
        if (!targetId) {
            ElMessage.warning('未找到目标笔记')
            return
        }

        const tag = tagsStore.findTagByName(tag_name)
        if (tag) {
           const success = await tagsStore.removeTagFromNote(targetId, tag.id)
           if (success) ElMessage.success(`移除标签 ${tag_name} 成功`)
           else ElMessage.warning('移除标签失败')
        } else {
           ElMessage.warning(`未找到标签: ${tag_name}`)
        }
  } else if (action.type === 'move_note') {
        const { id, title, folder_id } = action.data
        let targetId = id
        if (!targetId && aiStore.activeNoteContext) targetId = aiStore.activeNoteContext.id
        if (!targetId && title) {
            const found = notesStore.notes.find((n: any) => n.title === title || n.title.includes(title))
            if (found) targetId = found.id
        }

        if (!targetId) {
            if(!skipConfirm) ElMessage.warning('未找到目标笔记')
            return
        }

        try {
            if (!skipConfirm) {
                await ElMessageBox.confirm(`确定要移动笔记到目标文件夹吗？`, '移动笔记', {
                    confirmButtonText: '确定移动',
                    cancelButtonText: '取消',
                    type: 'info'
                })
            }
            const success = await notesStore.updateNote(targetId, { folderId: folder_id })
            if (success) {
                if(!skipConfirm) ElMessage.success('笔记已移动')
            }
        } catch (e) {}
  }
}
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

.ai-rag-hint {
  padding: 0 4px 8px;
  font-size: 0.7rem;
  display: flex;
  gap: 8px;
}

.hint-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-tertiary);
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.hint-tag.active-note {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9, rgba(64, 158, 255, 0.1));
}
.ai-action-card {
  margin-top: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.9em;
}
.action-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: bold;
  color: var(--accent-color);
  margin-bottom: 6px;
}
.action-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ai-ref-source {
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
