/**
 * 搜索工具函数
 */

import type { Note } from '../types'

/**
 * 高亮搜索关键词
 */
export function highlightKeyword(text: string, keyword: string): string {
  if (!keyword || !text) return text
  
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedKeyword})`, 'gi')
  
  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * 获取内容摘要
 */
export function getExcerpt(content: string, keyword?: string, maxLength = 150): string {
  if (!content) return ''
  
  // 移除 Markdown 语法
  let text = content
    .replace(/[#*`~_]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .trim()
  
  if (!keyword) {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
  }
  
  // 尝试找到关键词位置并提取上下文
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const index = lowerText.indexOf(lowerKeyword)
  
  if (index === -1) {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
  }
  
  // 提取关键词周围的上下文
  const contextStart = Math.max(0, index - 50)
  const contextEnd = Math.min(text.length, index + keyword.length + 100)
  
  let excerpt = text.slice(contextStart, contextEnd)
  
  if (contextStart > 0) excerpt = '...' + excerpt
  if (contextEnd < text.length) excerpt = excerpt + '...'
  
  return excerpt
}

/**
 * 计算搜索相关度分数
 */
export function calculateRelevance(note: Note, keyword: string): number {
  if (!keyword) return 0
  
  const lowerKeyword = keyword.toLowerCase()
  let score = 0
  
  // 标题匹配得分更高
  const titleLower = note.title.toLowerCase()
  if (titleLower === lowerKeyword) {
    score += 100
  } else if (titleLower.startsWith(lowerKeyword)) {
    score += 80
  } else if (titleLower.includes(lowerKeyword)) {
    score += 50
  }
  
  // 内容匹配
  const contentLower = note.content.toLowerCase()
  const matches = contentLower.split(lowerKeyword).length - 1
  score += matches * 5
  
  // 更新时间加权（最近更新的得分更高）
  const daysSinceUpdate = (Date.now() - new Date(note.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  score += Math.max(0, 10 - daysSinceUpdate * 0.1)
  
  return score
}

/**
 * 对搜索结果排序
 */
export function sortSearchResults(notes: Note[], keyword: string): Note[] {
  return [...notes].sort((a, b) => {
    const scoreA = calculateRelevance(a, keyword)
    const scoreB = calculateRelevance(b, keyword)
    return scoreB - scoreA
  })
}

/**
 * 解析搜索查询（支持高级语法）
 * 例如: type:markdown tag:工作 关键词
 */
export interface ParsedQuery {
  keywords: string[]
  type?: string
  tag?: string
  folder?: string
}

export function parseSearchQuery(query: string): ParsedQuery {
  const result: ParsedQuery = { keywords: [] }
  
  const parts = query.split(/\s+/)
  
  for (const part of parts) {
    if (part.startsWith('type:')) {
      result.type = part.slice(5)
    } else if (part.startsWith('tag:')) {
      result.tag = part.slice(4)
    } else if (part.startsWith('folder:')) {
      result.folder = part.slice(7)
    } else if (part.trim()) {
      result.keywords.push(part.trim())
    }
  }
  
  return result
}
