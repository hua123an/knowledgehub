import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { IPC_CHANNELS } from '../constants'

interface LinkRow {
  source_id: string
  target_id: string
}

interface NoteBasic {
  id: string
  title: string
  type: string
}

export function registerLinkHandlers() {
  const db = getDatabase()

  // 创建链接
  ipcMain.handle(IPC_CHANNELS.LINK_CREATE, async (_event, sourceId, targetId) => {
    try {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO links (source_id, target_id)
        VALUES (?, ?)
      `)
      stmt.run(sourceId, targetId)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 删除链接
  ipcMain.handle(IPC_CHANNELS.LINK_DELETE, async (_event, sourceId, targetId) => {
    try {
      db.prepare('DELETE FROM links WHERE source_id = ? AND target_id = ?').run(sourceId, targetId)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 获取笔记的所有链接
  ipcMain.handle(IPC_CHANNELS.LINK_GET_BY_NOTE, async (_event, noteId) => {
    try {
      // 获取出链（当前笔记链接到的笔记）
      const outLinks = db.prepare(`
        SELECT n.id, n.title, n.type
        FROM links l
        JOIN notes n ON n.id = l.target_id
        WHERE l.source_id = ?
      `).all(noteId) as NoteBasic[]

      // 获取入链（链接到当前笔记的笔记）
      const inLinks = db.prepare(`
        SELECT n.id, n.title, n.type
        FROM links l
        JOIN notes n ON n.id = l.source_id
        WHERE l.target_id = ?
      `).all(noteId) as NoteBasic[]

      return {
        success: true,
        data: {
          outLinks: outLinks.map(n => ({ id: n.id, title: n.title, type: n.type })),
          inLinks: inLinks.map(n => ({ id: n.id, title: n.title, type: n.type })),
        },
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 获取知识图谱数据
  ipcMain.handle(IPC_CHANNELS.LINK_GET_GRAPH, async () => {
    try {
      // 获取所有笔记作为节点
      const notes = db.prepare(`
        SELECT id, title, type FROM notes
      `).all() as NoteBasic[]

      // 获取所有链接作为边
      const links = db.prepare(`
        SELECT source_id, target_id FROM links
      `).all() as LinkRow[]

      const edges = links.map(l => ({
          source: l.source_id,
          target: l.target_id,
        }))

        return { success: true, data: { nodes: notes.map(n => ({ id: n.id, label: n.title, type: n.type as 'markdown' | 'bookmark' | 'snippet' })), edges } }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}
