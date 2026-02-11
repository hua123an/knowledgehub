import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database'
import { IPC_CHANNELS } from '../constants'

interface TagRow {
  id: string
  name: string
  color: string
}

function rowToTag(row: TagRow) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  }
}

// 预定义的标签颜色
const TAG_COLORS = [
  '#409EFF', // 蓝色
  '#67C23A', // 绿色
  '#E6A23C', // 橙色
  '#F56C6C', // 红色
  '#909399', // 灰色
  '#9B59B6', // 紫色
  '#1ABC9C', // 青色
  '#E91E63', // 粉色
]

export function registerTagHandlers() {
  const db = getDatabase()

  // 创建标签
  ipcMain.handle(IPC_CHANNELS.TAG_CREATE, async (_event, tag) => {
    try {
      const id = uuidv4()
      
      // 随机选择一个颜色
      const color = tag.color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
      
      const stmt = db.prepare(`
        INSERT INTO tags (id, name, color)
        VALUES (?, ?, ?)
      `)
      
      stmt.run(id, tag.name, color)
      
      const created = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as TagRow
      return { success: true, data: rowToTag(created) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 更新标签
  ipcMain.handle(IPC_CHANNELS.TAG_UPDATE, async (_event, id, updates) => {
    try {
      const fields: string[] = []
      const values: any[] = []
      
      if (updates.name !== undefined) {
        fields.push('name = ?')
        values.push(updates.name)
      }
      if (updates.color !== undefined) {
        fields.push('color = ?')
        values.push(updates.color)
      }
      
      if (fields.length === 0) {
        const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as TagRow
        return { success: true, data: rowToTag(existing) }
      }
      
      values.push(id)
      
      const stmt = db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`)
      stmt.run(...values)
      
      const updated = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as TagRow
      return { success: true, data: rowToTag(updated) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 删除标签
  ipcMain.handle(IPC_CHANNELS.TAG_DELETE, async (_event, id) => {
    try {
      db.prepare('DELETE FROM tags WHERE id = ?').run(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 获取标签列表
  ipcMain.handle(IPC_CHANNELS.TAG_LIST, async () => {
    try {
      const rows = db.prepare('SELECT * FROM tags ORDER BY name').all() as TagRow[]
      return { success: true, data: rows.map(rowToTag) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 给笔记添加标签
  ipcMain.handle(IPC_CHANNELS.TAG_ADD_TO_NOTE, async (_event, noteId, tagId) => {
    try {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO note_tags (note_id, tag_id)
        VALUES (?, ?)
      `)
      stmt.run(noteId, tagId)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 从笔记移除标签
  ipcMain.handle(IPC_CHANNELS.TAG_REMOVE_FROM_NOTE, async (_event, noteId, tagId) => {
    try {
      db.prepare('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?').run(noteId, tagId)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}
