import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database'
import { IPC_CHANNELS } from '../constants'

interface NoteRow {
  id: string
  title: string
  content: string
  type: string
  folder_id: string | null
  url: string | null
  favicon: string | null
  description: string | null
  language: string | null
  created_at: string
  updated_at: string
}

function rowToNote(row: NoteRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type as 'markdown' | 'bookmark' | 'snippet',
    folderId: row.folder_id,
    url: row.url || undefined,
    favicon: row.favicon || undefined,
    description: row.description || undefined,
    language: row.language || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function registerNoteHandlers() {
  const db = getDatabase()

  // 创建笔记
  ipcMain.handle(IPC_CHANNELS.NOTE_CREATE, async (_event, note) => {
    try {
      const id = uuidv4()
      const now = new Date().toISOString()
      
      const stmt = db.prepare(`
        INSERT INTO notes (id, title, content, type, folder_id, url, favicon, description, language, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      stmt.run(
        id,
        note.title || '无标题',
        note.content || '',
        note.type || 'markdown',
        note.folderId || null,
        note.url || null,
        note.favicon || null,
        note.description || null,
        note.language || null,
        now,
        now
      )
      
      const created = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow
      return { success: true, data: rowToNote(created) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 更新笔记
  ipcMain.handle(IPC_CHANNELS.NOTE_UPDATE, async (_event, id, updates) => {
    try {
      const fields: string[] = []
      const values: any[] = []
      
      if (updates.title !== undefined) {
        fields.push('title = ?')
        values.push(updates.title)
      }
      if (updates.content !== undefined) {
        fields.push('content = ?')
        values.push(updates.content)
      }
      if (updates.folderId !== undefined) {
        fields.push('folder_id = ?')
        values.push(updates.folderId)
      }
      if (updates.url !== undefined) {
        fields.push('url = ?')
        values.push(updates.url)
      }
      if (updates.favicon !== undefined) {
        fields.push('favicon = ?')
        values.push(updates.favicon)
      }
      if (updates.description !== undefined) {
        fields.push('description = ?')
        values.push(updates.description)
      }
      if (updates.language !== undefined) {
        fields.push('language = ?')
        values.push(updates.language)
      }
      
      fields.push('updated_at = ?')
      values.push(new Date().toISOString())
      values.push(id)
      
      const stmt = db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`)
      stmt.run(...values)
      
      const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow
      return { success: true, data: rowToNote(updated) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 删除笔记
  ipcMain.handle(IPC_CHANNELS.NOTE_DELETE, async (_event, id) => {
    try {
      db.prepare('DELETE FROM notes WHERE id = ?').run(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 获取单个笔记
  ipcMain.handle(IPC_CHANNELS.NOTE_GET, async (_event, id) => {
    try {
      const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | undefined
      if (row) {
        return { success: true, data: rowToNote(row) }
      }
      return { success: false, error: 'Note not found' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 获取笔记列表
  ipcMain.handle(IPC_CHANNELS.NOTE_LIST, async (_event, filters = {}) => {
    try {
      let sql = 'SELECT * FROM notes WHERE 1=1'
      const params: any[] = []
      
      if (filters.type) {
        sql += ' AND type = ?'
        params.push(filters.type)
      }
      if (filters.folderId !== undefined) {
        if (filters.folderId === null) {
          sql += ' AND folder_id IS NULL'
        } else {
          sql += ' AND folder_id = ?'
          params.push(filters.folderId)
        }
      }
      
      sql += ' ORDER BY updated_at DESC'
      
      const rows = db.prepare(sql).all(...params) as NoteRow[]
      return { success: true, data: rows.map(rowToNote) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 搜索笔记
  ipcMain.handle(IPC_CHANNELS.NOTE_SEARCH, async (_event, query) => {
    try {
      if (!query || query.trim() === '') {
        return { success: true, data: [] }
      }
      
      const rows = db.prepare(`
        SELECT n.*, 
               snippet(notes_fts, 0, '<mark>', '</mark>', '...', 32) as title_highlight,
               snippet(notes_fts, 1, '<mark>', '</mark>', '...', 64) as content_highlight
        FROM notes_fts fts
        JOIN notes n ON n.rowid = fts.rowid
        WHERE notes_fts MATCH ?
        ORDER BY rank
        LIMIT 50
      `).all(query) as any[]
      
      const results = rows.map(row => ({
        note: rowToNote(row),
        highlights: [row.title_highlight, row.content_highlight].filter(Boolean),
        score: 0,
      }))
      
      return { success: true, data: results }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}
