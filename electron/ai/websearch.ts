import { getDatabase } from '../database'
import https from 'https'

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
}

interface SearchConfig {
  tavilyKey?: string
  googleKey?: string
  googleCx?: string
  bochaKey?: string
  serperKey?: string
}

export function getSearchConfig(): SearchConfig {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings WHERE key LIKE ?').all('search_%') as { key: string; value: string }[]
  const config: Record<string, string> = {}
  rows.forEach((r: { key: string; value: string }) => {
    try { config[r.key] = JSON.parse(r.value) } catch { config[r.key] = r.value }
  })
  return {
    tavilyKey: config['search_tavily_key'] || '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',
    googleKey: config['search_google_key'] || 'AIzaSyBVX6rTEuPciJ87n87fkY70Y_lZess2XXc',
    googleCx: config['search_google_cx'] || undefined,
    bochaKey: config['search_bocha_key'] || 'sk-8d34ebe45906488499ed771af68d1a43',
    serperKey: config['search_serper_key'] || '1c70b54b855778cb90ea5d2e168b9bed16f6eb6f',
  }
}

// 封装 https.request 为 Promise
function httpsRequest(options: https.RequestOptions, body?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => resolve(data))
    })
    req.on('error', (e: Error) => reject(new Error('请求失败: ' + e.message)))
    if (body) req.write(body)
    req.end()
  })
}

// 封装 https.get 为 Promise
function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => resolve(data))
    }).on('error', (e: Error) => reject(new Error('请求失败: ' + e.message)))
  })
}

// --- 搜索提供商 ---

async function searchTavily(query: string, apiKey: string): Promise<WebSearchResult[]> {
  const body = JSON.stringify({
    api_key: apiKey,
    query,
    search_depth: 'basic',
    max_results: 5,
  })

  const data = await httpsRequest({
    hostname: 'api.tavily.com',
    path: '/search',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  }, body)

  const json = JSON.parse(data)
  if (json.error) throw new Error(json.error)
  return json.results.map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }))
}

async function searchSerper(query: string, apiKey: string): Promise<WebSearchResult[]> {
  const body = JSON.stringify({
    q: query,
    num: 5,
  })

  const data = await httpsRequest({
    hostname: 'google.serper.dev',
    path: '/search',
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
  }, body)

  const json = JSON.parse(data)
  if (json.error) throw new Error(json.error)
  return json.organic.map((r: any) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
  }))
}

async function searchGoogle(query: string, apiKey: string, cx: string): Promise<WebSearchResult[]> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`

  const data = await httpsGet(url)
  const json = JSON.parse(data)
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error))
  return (json.items || []).map((r: any) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
  }))
}

async function searchBocha(query: string, apiKey: string): Promise<WebSearchResult[]> {
  const body = JSON.stringify({
    query,
    freshness: 'noLimit',
    summary: true,
    count: 5,
  })

  const data = await httpsRequest({
    hostname: 'api.bochaai.com',
    path: '/v1/web-search',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  }, body)

  const json = JSON.parse(data)
  if (json.error) throw new Error(json.error)
  return json.data?.webPages?.value?.map((r: any) => ({
    title: r.name,
    url: r.url,
    snippet: r.snippet,
  })) || []
}

// --- 主搜索函数 ---

export async function webSearch(query: string): Promise<WebSearchResult[]> {
  const config = getSearchConfig()

  const providers: { name: string; fn: () => Promise<WebSearchResult[]> }[] = []

  if (config.tavilyKey) {
    providers.push({ name: 'Tavily', fn: () => searchTavily(query, config.tavilyKey!) })
  }
  if (config.serperKey) {
    providers.push({ name: 'Serper', fn: () => searchSerper(query, config.serperKey!) })
  }
  if (config.googleKey && config.googleCx) {
    providers.push({ name: 'Google', fn: () => searchGoogle(query, config.googleKey!, config.googleCx!) })
  }
  if (config.bochaKey) {
    providers.push({ name: 'Bocha', fn: () => searchBocha(query, config.bochaKey!) })
  }

  if (providers.length === 0) {
    throw new Error('未配置搜索 API，请在设置中添加搜索 API Key')
  }

  let lastError: Error | null = null
  for (const provider of providers) {
    try {
      const results = await provider.fn()
      return results
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      console.error(`[WebSearch] ${provider.name} 搜索失败:`, lastError.message)
    }
  }

  throw lastError || new Error('未配置搜索 API，请在设置中添加搜索 API Key')
}
