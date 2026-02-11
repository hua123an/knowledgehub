import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useNotesStore } from './notes'
import { useTagsStore } from './tags'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  created_at?: string
  updated_at?: string
}

export const useAIStore = defineStore('ai', () => {
  const notesStore = useNotesStore()
  const tagsStore = useTagsStore()

  // 状态
  const chatOpen = ref(false)
  const settingsOpen = ref(false)
  const loading = ref(false)
  const streaming = ref(false)
  const streamContent = ref('')
  const error = ref('')
  
  // 当前激活的笔记上下文
  const activeNoteContext = ref<{ id: string, title: string, content: string } | null>(null)
  
  // 本次回答参考的来源 (用于 UI 显示)
  const lastReference = ref<string[]>([])

  // 当前对话
  const currentConversation = ref<Conversation>({
    id: genId(),
    title: '新对话',
    messages: [],
  })

  // 历史对话列表
  const conversations = ref<Conversation[]>([])

  // AI 配置
  const config = reactive({
    baseUrl: 'https://api.deepseek.com',
    apiKey: 'sk-376363b4a79e4bb5ae5f329706efc0f4',
    model: 'deepseek-chat',
  })

  // 配置是否已就绪
  const isConfigured = ref(false)

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  }

  // 加载 AI 配置
  async function loadConfig() {
    try {
      const result = await window.api.settingsGet()
      if (result.success && result.data) {
        const s = result.data as any
        if (s.ai_base_url) config.baseUrl = s.ai_base_url
        if (s.ai_api_key) config.apiKey = s.ai_api_key
        if (s.ai_model) config.model = s.ai_model
        isConfigured.value = !!config.apiKey
      }
    } catch (e) {
      console.error('Failed to load AI config:', e)
    }
  }

  // 保存 AI 配置
  async function saveConfig() {
    try {
      await window.api.settingsSet({
        ai_base_url: config.baseUrl,
        ai_api_key: config.apiKey,
        ai_model: config.model,
      } as any)
      isConfigured.value = !!config.apiKey
    } catch (e) {
      console.error('Failed to save AI config:', e)
    }
  }

  // 设置当前激活笔记
  function setActiveNote(note: { id: string, title: string, content: string } | null) {
    activeNoteContext.value = note
  }

  // 发送消息（流式）
  async function sendMessage(content: string, context?: string) {
    if (!content.trim() || loading.value) return

    error.value = ''
    lastReference.value = [] // Reset references
    
    const userMsg: ChatMessage = { role: 'user', content }
    currentConversation.value.messages.push(userMsg)

    // 自动设置标题
    if (currentConversation.value.messages.filter(m => m.role === 'user').length === 1) {
      currentConversation.value.title = content.slice(0, 30)
    }

    loading.value = true
    streaming.value = true
    streamContent.value = ''

    const messages = currentConversation.value.messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

     // 构建知识库概况 (Global Context)
    const recentTitles = notesStore.notes
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
      .map((n: any) => `《${n.title}》`)
      .join('、')

    const allTags = tagsStore.tags.map((t: any) => t.name).join('、')

    // 构建完整笔记目录 — 让 AI 拥有全局视野 (ID + Title)
    const notesCatalog = notesStore.notes
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 200) // 增加到200条
      .map((n: any) => `[ID:${n.id}] ${n.title}`)
      .join('\n')
    
    let baseSystemPrompt = `你是一个智能知识库助手，帮助用户管理和理解他们的笔记。
你拥有对整个知识库的读写权限，应当主动帮用户完成操作，禁止要求用户手动复制粘贴。

【当前知识库概况】：
- 笔记总数：${notesStore.notes.length} 篇
- 最近修改：${recentTitles || '无'}
- 所有标签：${allTags || '无'}

【笔记目录 (前200篇)】：
${notesCatalog || '(空知识库)'}

【能力与指令】：
你可以输出以下 JSON 动作：

1. 创建笔记：
:::action
{ "type": "create_note", "data": { "title": "标题", "content": "内容", "folder_id": "可选文件夹ID" } }
:::

2. 打开笔记：
:::action
{ "type": "open_note", "data": { "id": "笔记ID", "title": "笔记标题" } }
:::

3. 删除笔记：
:::action
{ "type": "delete_note", "data": { "id": "笔记ID", "title": "笔记标题" } }
:::

4. 修改/整理笔记内容（直接覆盖写入，用户无需手动复制）：
:::action
{ "type": "update_note", "data": { "id": "笔记ID", "title": "笔记标题", "content": "整理后的Markdown内容" } }
:::

5. 创建文件夹：
:::action
{ "type": "create_folder", "data": { "name": "文件夹名" } }
:::

6. 添加标签：
:::action
{ "type": "add_tag", "data": { "id": "笔记ID", "title": "笔记标题", "tag_name": "标签名" } }
:::

7. 移除标签：
:::action
{ "type": "remove_tag", "data": { "id": "笔记ID", "title": "笔记标题", "tag_name": "标签名" } }
:::

8. 搜索/读取笔记全文（用于检索或读取具体内容）：
:::action
{ "type": "search_notes", "data": { "query": "关键词或标题" } }
:::

9. 移动笔记到文件夹：
:::action
{ "type": "move_note", "data": { "id": "笔记ID", "folder_id": "目标文件夹ID" } }
:::

10. 列出所有文件夹（获取文件夹结构和ID）：
:::action
{ "type": "list_folders", "data": {} }
:::

11. 批量操作（一次执行多个动作）：
:::action
{ "type": "batch", "data": { "actions": [ {"type":"update_note","data":{"id":"xxx","content":"整理后的内容"}} ] } }
:::

【重要行为准则】：
- **主动权**：当用户说"整理一下"时，你应该先执行 list_folders 和 search_notes 了解全局，然后通过 batch 或连续的 update_note/move_note 直接完成，而不是提示用户去操作。
- **获取 ID**：你可以从之前提供的【笔记目录】中获取笔记 ID。如果目录里没有，先使用 search_notes 查找。
- **反馈闭环**：当你输出 search_notes 或 list_folders 时，系统会自动把结果作为对话下一轮的输入反馈给你。请在收到系统反馈后继续完成剩下的操作。
- **避免复制粘贴**：永远优先使用 update_note 修改笔记，而不是让用户自己复制你的回答。
- **多步操作**：你可以像一个真正的 Agent 一样思考，分步执行：查找 -> 分析 -> 修改 -> 整理。
- 用中文回答。`

    let systemPrompt = baseSystemPrompt
    
    if (context) {
      systemPrompt += `\n\n【上下文引用（用户选中）】：\n${context}`
      lastReference.value.push('选中的文本')
    } else if (activeNoteContext.value) {
      // 优先使用当前打开的笔记，注入完整内容
      const note = activeNoteContext.value
      const safeContent = (note.content || '').slice(0, 6000)
      systemPrompt += `\n\n【当前正在查看的笔记】：\nID: ${note.id}\n标题：《${note.title}》\n完整内容：\n${safeContent}\n\n指令：用户问题大概率与此笔记有关。如需修改此笔记，使用 update_note 并带上 ID "${note.id}"。`
      lastReference.value.push(`当前笔记: ${note.title}`)
    } else {
      // RAG 搜索 — 扩大搜索范围和内容长度
      try {
        const searchResult = await window.api.noteSearch(content)
        if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
          const topNotes = searchResult.data.slice(0, 5)
          const contextText = topNotes.map((n: any) => 
            `ID: ${n.note.id}\n标题：《${n.note.title}》\n内容：\n${(n.note.content || '').slice(0, 1500)}`
          ).join('\n---\n')
          
          if (contextText) {
             systemPrompt += `\n\n【搜索到的相关笔记（含全文）】：\n${contextText}`
             topNotes.forEach((n: any) => lastReference.value.push(n.note.title))
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 设置流式监听
    const offChunk = window.api.onAiStreamChunk((text) => {
      streamContent.value += text
    })

    const offDone = window.api.onAiStreamDone(() => {
      if (streamContent.value) {
        currentConversation.value.messages.push({
          role: 'assistant',
          content: streamContent.value,
        })
      }
      streaming.value = false
      loading.value = false
      streamContent.value = ''
      cleanup()
      saveConversation()
    })

    const offError = window.api.onAiStreamError((err) => {
      error.value = err
      streaming.value = false
      loading.value = false
      streamContent.value = ''
      cleanup()
    })

    function cleanup() {
      offChunk()
      offDone()
      offError()
    }

    try {
      const result = await window.api.aiChatStream(messages, systemPrompt)
      if (!result.success) {
        error.value = result.error || '请求失败'
        streaming.value = false
        loading.value = false
        cleanup()
      }
    } catch (e: any) {
      error.value = e.message || '请求失败'
      streaming.value = false
      loading.value = false
      cleanup()
    }
  }

  // 停止生成
  async function stopGeneration() {
    try {
      await window.api.aiStop()
    } catch {}
    if (streamContent.value) {
      currentConversation.value.messages.push({
        role: 'assistant',
        content: streamContent.value + '...(已中断)',
      })
    }
    streaming.value = false
    loading.value = false
    streamContent.value = ''
  }

  // 新建对话
  function newConversation() {
    currentConversation.value = {
      id: genId(),
      title: '新对话',
      messages: [],
    }
    error.value = ''
  }

  // 切换对话
  async function switchConversation(id: string) {
    try {
      const result = await window.api.aiChatHistoryGet(id)
      if (result.success && result.data) {
        const conv = conversations.value.find(c => c.id === id)
        currentConversation.value = {
          id,
          title: conv?.title || '对话',
          messages: result.data.map((m: any) => ({
            role: m.role as ChatMessage['role'],
            content: m.content,
          })),
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  // 保存对话
  async function saveConversation() {
    const conv = currentConversation.value
    if (conv.messages.length === 0) return
    try {
      await window.api.aiChatHistorySave(
        conv.id,
        conv.title,
        conv.messages.map(m => ({ role: m.role, content: m.content }))
      )
      await loadConversations()
    } catch (e) {
      console.error(e)
    }
  }

  // 删除对话
  async function deleteConversation(id: string) {
    try {
      await window.api.aiChatHistoryDelete(id)
      conversations.value = conversations.value.filter(c => c.id !== id)
      if (currentConversation.value.id === id) {
        newConversation()
      }
    } catch (e) {
      console.error(e)
    }
  }

  // 加载对话列表
  async function loadConversations() {
    try {
      const result = await window.api.aiChatHistoryList()
      if (result.success && result.data) {
        conversations.value = result.data.map((c: any) => ({
          id: c.id,
          title: c.title,
          messages: [],
          created_at: c.created_at,
          updated_at: c.updated_at,
        }))
      }
    } catch (e) {
      console.error(e)
    }
  }

  // 工具函数：总结
  async function summarize(content: string): Promise<string> {
    loading.value = true
    error.value = ''
    try {
      const result = await window.api.aiSummarize(content)
      if (result.success) return result.data || ''
      throw new Error(result.error)
    } catch (e: any) {
      error.value = e.message
      return ''
    } finally {
      loading.value = false
    }
  }

  // 工具函数：建议标签
  async function suggestTags(content: string): Promise<string[]> {
    loading.value = true
    error.value = ''
    try {
      const result = await window.api.aiSuggestTags(content)
      if (result.success) return result.data || []
      throw new Error(result.error)
    } catch (e: any) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  // 工具函数：润色
  async function polish(content: string): Promise<string> {
    loading.value = true
    error.value = ''
    try {
      const result = await window.api.aiPolish(content)
      if (result.success) return result.data || ''
      throw new Error(result.error)
    } catch (e: any) {
      error.value = e.message
      return ''
    } finally {
      loading.value = false
    }
  }

  // 工具函数：续写
  async function continueWriting(content: string): Promise<string> {
    loading.value = true
    error.value = ''
    try {
      const result = await window.api.aiContinue(content)
      if (result.success) return result.data || ''
      throw new Error(result.error)
    } catch (e: any) {
      error.value = e.message
      return ''
    } finally {
      loading.value = false
    }
  }

  // 工具函数：翻译
  async function translate(content: string, lang: string): Promise<string> {
    loading.value = true
    error.value = ''
    try {
      const result = await window.api.aiTranslate(content, lang)
      if (result.success) return result.data || ''
      throw new Error(result.error)
    } catch (e: any) {
      error.value = e.message
      return ''
    } finally {
      loading.value = false
    }
  }

  // 工具函数：解释
  async function explain(content: string): Promise<string> {
    loading.value = true
    error.value = ''
    try {
      const result = await window.api.aiExplain(content)
      if (result.success) return result.data || ''
      throw new Error(result.error)
    } catch (e: any) {
      error.value = e.message
      return ''
    } finally {
      loading.value = false
    }
  }

  // 工具函数：搜索增强
  async function searchEnhance(query: string): Promise<string[]> {
    try {
      const result = await window.api.aiSearchEnhance(query)
      if (result.success) return result.data || []
      return []
    } catch {
      return []
    }
  }

  return {
    // 状态
    chatOpen,
    settingsOpen,
    loading,
    streaming,
    streamContent,
    error,
    currentConversation,
    conversations,
    config,
    isConfigured,
    activeNoteContext,
    lastReference,
    // 对话操作
    sendMessage,
    setActiveNote,
    stopGeneration,
    newConversation,
    switchConversation,
    deleteConversation,
    loadConversations,
    saveConversation,
    // 配置
    loadConfig,
    saveConfig,
    // 工具
    summarize,
    suggestTags,
    polish,
    continueWriting,
    translate,
    explain,
    searchEnhance,
  }
})
