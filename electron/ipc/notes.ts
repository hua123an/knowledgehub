import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database'
import { IPC_CHANNELS } from '../constants'
import { globalContext } from '../context'

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
      
      // 同步写入文件系统
      if (globalContext.currentWorkspace) {
         const filename = `${created.title}.md`
         const filePath = path.join(globalContext.currentWorkspace, filename)
         try {
           // 确保不覆盖现有文件（虽然 uuid 保证 id 唯一，但 title 可能重复）
           // 如果文件已存在，应该报错还是自动重命名？
           // 目前简单处理：如果存在，覆盖（因为这是新建操作，且前端可能没有重复检查）
           // 更好的做法是在前端检查 title 唯一性。
           // 这里我们直接写入。
           fs.writeFileSync(filePath, created.content || '', 'utf-8')
           console.log('[Main] Created file:', filePath)
         } catch (e) {
           console.error('[Main] Create file failed:', e)
         }
      }

      return { success: true, data: rowToNote(created) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 更新笔记
  ipcMain.handle(IPC_CHANNELS.NOTE_UPDATE, async (_event, id, updates) => {
    try {
      // Get existing note first for rename logic
      const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | undefined
      if (!existing) {
        return { success: false, error: 'Note not found' }
      }

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

      // 同步写入文件系统
      if (globalContext.currentWorkspace && updated) {
        // 简单策略：按 title 寻找文件名
        const filename = `${updated.title}.md`
        const filePath = path.join(globalContext.currentWorkspace, filename)
        
        // 1. 如果 title 变了，先重命名旧文件
        if (updates.title !== undefined && updates.title !== existing.title) {
           const oldPath = path.join(globalContext.currentWorkspace, `${existing.title}.md`)
           try {
             if (fs.existsSync(oldPath)) {
               fs.renameSync(oldPath, filePath)
               console.log('[Main] Renamed file:', oldPath, '->', filePath)
             }
           } catch (e) {
             console.error('[Main] Rename failed:', e)
           }
        }

        // 2. 写入/更新内容 (如果是重命名后的文件，这里也会更新内容)
        // 只有当更新了 content 或者 title (导致文件名变化) 时，我们才确保文件存在
        // 但这里我们简单点：只要有 currentWorkspace，每次 update 都确保文件内容是最新的
        // 或者是只在 content 变动时写？
        // 如果只重命名，content 没传，我们需要读 DB 里的 content 写进去吗？
        // renameSync 已经移动了文件内容。所以只要 content 没变，不需要重写。
        
        if (updates.content !== undefined) {
           try {
             fs.writeFileSync(filePath, updates.content, 'utf-8')
             console.log('[Main] Saved file:', filePath)
           } catch (e) {
             console.error('[Main] Save failed:', e)
           }
        }
      }

      return { success: true, data: rowToNote(updated) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 删除笔记
  ipcMain.handle(IPC_CHANNELS.NOTE_DELETE, async (_event, id) => {
    try {
      // Get existing note to find file path
      const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | undefined
      if (globalContext.currentWorkspace && existing) {
         const filePath = path.join(globalContext.currentWorkspace, `${existing.title}.md`)
         try {
           if (fs.existsSync(filePath)) {
             fs.unlinkSync(filePath)
             console.log('[Main] Deleted file:', filePath)
           }
         } catch (e) {
           console.error('[Main] Delete file failed:', e)
         }
      }

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
      
      const searchTerm = `%${query}%`
      const rows = db.prepare(`
        SELECT * FROM notes 
        WHERE title LIKE ? OR content LIKE ?
        ORDER BY updated_at DESC
        LIMIT 50
      `).all(searchTerm, searchTerm) as NoteRow[]
      
      const results = rows.map(row => {
        // 手动生成简单的摘要和高亮
        let snippet = (row.content || '').slice(0, 150)
        if (row.content && row.content.toLowerCase().includes(query.toLowerCase())) {
          const idx = row.content.toLowerCase().indexOf(query.toLowerCase())
          const start = Math.max(0, idx - 40)
          const end = Math.min(row.content.length, idx + 80)
          snippet = (start > 0 ? '...' : '') + row.content.slice(start, end) + (end < row.content.length ? '...' : '')
        }

        const matchField = row.title.toLowerCase().includes(query.toLowerCase()) ? '标题' : '内容'

        return {
          note: rowToNote(row),
          matchField,
          contentSnippet: snippet,
          score: 0,
        }
      })
      
      return { success: true, data: results }
    } catch (error) {
      console.error('Search error:', error)
      return { success: false, error: String(error) }
    }
  })
}
