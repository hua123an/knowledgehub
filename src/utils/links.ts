/**
 * 双向链接解析工具
 * 支持 [[链接]] 语法
 */

// 匹配 [[链接名称]] 的正则表达式
const LINK_PATTERN = /\[\[([^\]]+)\]\]/g

/**
 * 从文本中提取所有双向链接
 */
export function extractLinks(content: string): string[] {
  const links: string[] = []
  let match: RegExpExecArray | null
  
  while ((match = LINK_PATTERN.exec(content)) !== null) {
    const linkText = match[1].trim()
    if (linkText && !links.includes(linkText)) {
      links.push(linkText)
    }
  }
  
  return links
}

/**
 * 将双向链接转换为可点击的 HTML
 */
export function renderLinks(content: string, linkClickHandler?: string): string {
  return content.replace(LINK_PATTERN, (_, linkText) => {
    const trimmed = linkText.trim()
    const handler = linkClickHandler || `window.openNoteLink('${trimmed}')`
    return `<a href="javascript:void(0)" class="wiki-link" onclick="${handler}">${trimmed}</a>`
  })
}

/**
 * 检查文本中是否包含双向链接
 */
export function hasLinks(content: string): boolean {
  return LINK_PATTERN.test(content)
}

/**
 * 获取指向特定笔记的所有反向链接
 */
export function findBacklinks(
  targetTitle: string,
  allNotes: { id: string; title: string; content: string }[]
): { id: string; title: string }[] {
  const backlinks: { id: string; title: string }[] = []
  
  for (const note of allNotes) {
    const links = extractLinks(note.content)
    if (links.some(link => link.toLowerCase() === targetTitle.toLowerCase())) {
      backlinks.push({ id: note.id, title: note.title })
    }
  }
  
  return backlinks
}

/**
 * 解析笔记内容，返回链接关系图数据
 */
export function buildLinkGraph(
  notes: { id: string; title: string; content: string }[]
): { nodes: string[]; edges: [string, string][] } {
  const titleToId = new Map<string, string>()
  notes.forEach(note => {
    titleToId.set(note.title.toLowerCase(), note.id)
  })
  
  const nodes = notes.map(n => n.id)
  const edges: [string, string][] = []
  
  for (const note of notes) {
    const links = extractLinks(note.content)
    for (const linkTitle of links) {
      const targetId = titleToId.get(linkTitle.toLowerCase())
      if (targetId && targetId !== note.id) {
        // 避免重复边
        const edgeExists = edges.some(
          ([s, t]) => (s === note.id && t === targetId) || (s === targetId && t === note.id)
        )
        if (!edgeExists) {
          edges.push([note.id, targetId])
        }
      }
    }
  }
  
  return { nodes, edges }
}

/**
 * 自动补全链接建议
 */
export function getLinkSuggestions(
  query: string,
  notes: { id: string; title: string }[],
  limit = 10
): { id: string; title: string }[] {
  if (!query) return notes.slice(0, limit)
  
  const lowerQuery = query.toLowerCase()
  
  return notes
    .filter(note => note.title.toLowerCase().includes(lowerQuery))
    .sort((a, b) => {
      // 优先匹配开头
      const aStarts = a.title.toLowerCase().startsWith(lowerQuery)
      const bStarts = b.title.toLowerCase().startsWith(lowerQuery)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return a.title.localeCompare(b.title)
    })
    .slice(0, limit)
}
