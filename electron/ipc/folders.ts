import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import fs from 'node:fs'
import path from 'node:path'
import { getDatabase } from '../database'
import { IPC_CHANNELS } from '../constants'
import { globalContext } from '../context'

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

/** 根据文件夹 id 递归获取真实文件系统路径 */
function getFolderFsPath(db: ReturnType<typeof getDatabase>, folderId: string): string | null {
  const workspace = globalContext.currentWorkspace
  if (!workspace) return null

  const parts: string[] = []
  let currentId: string | null = folderId

  while (currentId) {
    const row = db.prepare('SELECT id, name, parent_id FROM folders WHERE id = ?').get(currentId) as FolderRow | undefined
    if (!row) break
    parts.unshift(row.name)
    currentId = row.parent_id
  }

  return path.join(workspace, ...parts)
}

export function registerFolderHandlers() {
  const db = getDatabase()

  // 创建文件夹
  ipcMain.handle(IPC_CHANNELS.FOLDER_CREATE, async (_event, folder) => {
    try {
      const id = uuidv4()
      
      // 获取同级文件夹中的最大排序值
        const maxOrder = folder.parentId
          ? db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM folders WHERE parent_id = ?').get(folder.parentId) as { max_order: number }
          : db.prepare('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM folders WHERE parent_id IS NULL').get() as { max_order: number }
      
      const sortOrder = (maxOrder?.max_order ?? -1) + 1
      
      const stmt = db.prepare(`
        INSERT INTO folders (id, name, parent_id, sort_order)
        VALUES (?, ?, ?, ?)
      `)
      
      stmt.run(id, folder.name || '新文件夹', folder.parentId || null, sortOrder)

      // 在文件系统中创建真实目录
      const fsPath = getFolderFsPath(db, id)
      if (fsPath && !fs.existsSync(fsPath)) {
        fs.mkdirSync(fsPath, { recursive: true })
      }

      const created = db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as FolderRow
      return { success: true, data: rowToFolder(created) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 更新文件夹
  ipcMain.handle(IPC_CHANNELS.FOLDER_UPDATE, async (_event, id, updates) => {
    try {
      // 重命名时，先记录旧路径
      let oldFsPath: string | null = null
      if (updates.name !== undefined) {
        oldFsPath = getFolderFsPath(db, id)
      }

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

      // 重命名文件系统目录
      if (oldFsPath && updates.name !== undefined) {
        const newFsPath = getFolderFsPath(db, id)
        if (newFsPath && oldFsPath !== newFsPath && fs.existsSync(oldFsPath)) {
          fs.renameSync(oldFsPath, newFsPath)
        }
      }

      const updated = db.prepare('SELECT * FROM folders WHERE id = ?').get(id) as FolderRow
      return { success: true, data: rowToFolder(updated) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 删除文件夹
  ipcMain.handle(IPC_CHANNELS.FOLDER_DELETE, async (_event, id) => {
    try {
      // 先获取文件系统路径，再删数据库记录
      const fsPath = getFolderFsPath(db, id)

      db.prepare('DELETE FROM folders WHERE id = ?').run(id)

      // 删除文件系统目录
      if (fsPath && fs.existsSync(fsPath)) {
        fs.rmSync(fsPath, { recursive: true, force: true })
      }

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
