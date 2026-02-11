import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database'
import { IPC_CHANNELS } from '../../src/types'

interface FolderRow {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
}

function rowToFolder(row: FolderRow) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
  }
}

export function registerFolderHandlers() {
  const db = getDatabase()

  // 创建文件夹
  ipcMain.handle(IPC_CHANNELS.FOLDER_CREATE, async (_event, folder) => {
    try {
      const id = uuidv4()
      
      // 获取同级文件夹中的最大排序值
      const maxOrder = db.prepare(`
        SELECT COALESCE(MAX(sort_order), -1) as max_order 
        FROM folders 
        WHERE parent_id ${folder.parentId ? '= ?' : 'IS NULL'}
      `).get(folder.parentId ? folder.parentId : undefined) as { max_order: number }
      
      const sortOrder = (maxOrder?.max_order ?? -1) + 1
      
      const stmt = db.prepare(`
        INSERT INTO folders (id, name, parent_id, sort_order)
        VALUES (?, ?, ?, ?)
      `)
      
      stmt.run(id, folder.name || '新文件夹', folder.parentId || null, sortOrder)
      
      const created = db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as FolderRow
      return { success: true, data: rowToFolder(created) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 更新文件夹
  ipcMain.handle(IPC_CHANNELS.FOLDER_UPDATE, async (_event, id, updates) => {
    try {
      const fields: string[] = []
      const values: any[] = []
      
      if (updates.name !== undefined) {
        fields.push('name = ?')
        values.push(updates.name)
      }
      if (updates.parentId !== undefined) {
        fields.push('parent_id = ?')
        values.push(updates.parentId)
      }
      if (updates.sortOrder !== undefined) {
        fields.push('sort_order = ?')
        values.push(updates.sortOrder)
      }
      
      if (fields.length === 0) {
        const existing = db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as FolderRow
        return { success: true, data: rowToFolder(existing) }
      }
      
      values.push(id)
      
      const stmt = db.prepare(`UPDATE folders SET ${fields.join(', ')} WHERE id = ?`)
      stmt.run(...values)
      
      const updated = db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as FolderRow
      return { success: true, data: rowToFolder(updated) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 删除文件夹
  ipcMain.handle(IPC_CHANNELS.FOLDER_DELETE, async (_event, id) => {
    try {
      db.prepare('DELETE FROM folders WHERE id = ?').run(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 获取文件夹列表
  ipcMain.handle(IPC_CHANNELS.FOLDER_LIST, async () => {
    try {
      const rows = db.prepare('SELECT * FROM folders ORDER BY sort_order').all() as FolderRow[]
      return { success: true, data: rows.map(rowToFolder) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}
