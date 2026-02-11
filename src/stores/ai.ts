import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

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
  // 状态
  const chatOpen = ref(false)
  const settingsOpen = ref(false)
  const loading = ref(false)
  const streaming = ref(false)
  const streamContent = ref('')
  const error = ref('')

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
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo',
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

  // 发送消息（流式）
  async function sendMessage(content: string, context?: string) {
    if (!content.trim() || loading.value) return

    error.value = ''
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

    let systemPrompt = '你是一个智能知识库助手，帮助用户管理和理解他们的笔记、书签和代码片段。用中文回答。'
    if (context) {
      systemPrompt += `\n\n以下是当前的上下文内容，请基于此回答：\n${context}`
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
    // 对话操作
    sendMessage,
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
