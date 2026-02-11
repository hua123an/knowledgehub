import { getDatabase } from '../database'
import https from 'https'
import http from 'http'

interface AIConfig {
  baseUrl: string
  apiKey: string
  model: string
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// 当前活跃的请求，用于取消
let activeRequest: any = null

function getAIConfig(): AIConfig {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings WHERE key LIKE ?').all('ai_%') as { key: string; value: string }[]
  const config: Record<string, string> = {}
  rows.forEach((r: { key: string; value: string }) => {
    try { config[r.key] = JSON.parse(r.value) } catch { config[r.key] = r.value }
  })
  return {
    baseUrl: config['ai_base_url'] || 'https://api.deepseek.com',
    apiKey: config['ai_api_key'] || 'sk-376363b4a79e4bb5ae5f329706efc0f4',
    model: config['ai_model'] || 'deepseek-chat',
  }
}

export async function aiChat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
  const config = getAIConfig()
  if (!config.apiKey) throw new Error('请先在设置中配置 AI API Key')

  const allMessages: ChatMessage[] = []
  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt })
  }
  allMessages.push(...messages)

  const body = JSON.stringify({
    model: config.model,
    messages: allMessages,
    temperature: 0.7,
    max_tokens: 2048,
  })

  return new Promise((resolve, reject) => {
    const url = new URL(config.baseUrl.replace(/\/$/, '') + '/chat/completions')
    const isHttps = url.protocol === 'https:'
    const transport = isHttps ? https : http

    const req = transport.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
    }, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)))
            return
          }
          resolve(json.choices?.[0]?.message?.content || '')
        } catch (e) {
          reject(new Error('AI 响应解析失败: ' + data.slice(0, 200)))
        }
      })
    })

    activeRequest = req
    req.on('error', (e: Error) => reject(new Error('AI 请求失败: ' + e.message)))
    req.write(body)
    req.end()
  })
}

export async function aiChatStream(
  messages: ChatMessage[],
  systemPrompt: string | undefined,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const config = getAIConfig()
  if (!config.apiKey) {
    onError('请先在设置中配置 AI API Key')
    return
  }

  const allMessages: ChatMessage[] = []
  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt })
  }
  allMessages.push(...messages)

  const body = JSON.stringify({
    model: config.model,
    messages: allMessages,
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
  })

  const url = new URL(config.baseUrl.replace(/\/$/, '') + '/chat/completions')
  const isHttps = url.protocol === 'https:'
  const transport = isHttps ? https : http

  const req = transport.request({
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
  }, (res) => {
    let buffer = ''
    res.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          onDone()
          return
        }
        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content
          if (content) onChunk(content)
        } catch {
          // ignore parse errors in stream
        }
      }
    })
    res.on('end', () => onDone())
  })

  activeRequest = req
  req.on('error', (e: Error) => onError('AI 请求失败: ' + e.message))
  req.write(body)
  req.end()
}

export function aiStop() {
  if (activeRequest) {
    activeRequest.destroy()
    activeRequest = null
  }
}

// --- Utility AI functions ---

const SYSTEM_PROMPTS = {
  summarize: '你是一个知识库助手。请用简洁的语言总结以下内容，提取核心要点。用中文回答。',
  suggestTags: '你是一个知识库助手。请根据以下内容建议 3-5 个合适的标签。只输出标签名，用逗号分隔，不要其他内容。用中文回答。',
  polish: '你是一个写作助手。请润色以下文字，使其更加通顺、专业，保持原意不变。直接输出润色后的内容，不要其他说明。',
  continue: '你是一个写作助手。请根据以下内容继续往下写，保持风格一致，自然地扩展内容。直接输出续写内容，不要重复已有内容。',
  translate: '你是一个翻译助手。请将以下内容翻译成{lang}。直接输出翻译结果，不要其他说明。',
  explain: '你是一个知识库助手。请用通俗易懂的语言解释以下内容。用中文回答。',
  searchEnhance: '你是一个搜索助手。用户想搜索以下内容，请帮忙扩展搜索关键词，生成 3-5 个相关的搜索词。只输出关键词，用逗号分隔。',
  knowledgeChat: '你是一个智能知识库助手。用户会向你提问关于他们知识库中内容的问题。以下是相关的知识库内容，请基于这些内容回答用户的问题。如果知识库中没有相关信息，请如实告知。用中文回答。',
}

export async function aiSummarize(content: string): Promise<string> {
  return aiChat([{ role: 'user', content }], SYSTEM_PROMPTS.summarize)
}

export async function aiSuggestTags(content: string): Promise<string[]> {
  const result = await aiChat([{ role: 'user', content }], SYSTEM_PROMPTS.suggestTags)
  return result.split(/[,，、]/).map(t => t.trim()).filter(Boolean)
}

export async function aiPolish(content: string): Promise<string> {
  return aiChat([{ role: 'user', content }], SYSTEM_PROMPTS.polish)
}

export async function aiContinue(content: string): Promise<string> {
  return aiChat([{ role: 'user', content }], SYSTEM_PROMPTS.continue)
}

export async function aiTranslate(content: string, lang: string): Promise<string> {
  const prompt = SYSTEM_PROMPTS.translate.replace('{lang}', lang)
  return aiChat([{ role: 'user', content }], prompt)
}

export async function aiExplain(content: string): Promise<string> {
  return aiChat([{ role: 'user', content }], SYSTEM_PROMPTS.explain)
}

export async function aiSearchEnhance(query: string): Promise<string[]> {
  const result = await aiChat([{ role: 'user', content: query }], SYSTEM_PROMPTS.searchEnhance)
  return result.split(/[,，、]/).map(t => t.trim()).filter(Boolean)
}

export { SYSTEM_PROMPTS }
export type { ChatMessage, AIConfig }
