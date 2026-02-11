import { ipcMain, dialog, shell } from 'electron'
import { IPC_CHANNELS } from '../constants'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database'
import { globalContext } from '../context'

export function registerDialogHandlers() {
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    
    if (result.canceled) {
      return null
    }
    
    return result.filePaths[0]
  })

  // 设置当前工作区并同步文件
  ipcMain.handle('workspace:set', async (_event, workspacePath: string) => {
    console.log('[Main] Setting workspace:', workspacePath)
    globalContext.currentWorkspace = workspacePath
    
    // 立即扫描并同步
    try {
      if (!fs.existsSync(workspacePath)) return false
      
      const db = getDatabase()
      const files = fs.readdirSync(workspacePath)
      const mdFiles = files.filter(f => f.endsWith('.md'))
      
      console.log(`[Main] Found ${mdFiles.length} markdown files to sync`)
      
      const now = new Date().toISOString()
      
      // 简单同步逻辑：如果 DB 里没有同名文件，就插入
      // 如果 DB 里有，但文件内容变了，就更新 DB (简化起见先只做导入)
      for (const file of mdFiles) {
        const title = path.basename(file, '.md')
        const content = fs.readFileSync(path.join(workspacePath, file), 'utf-8')
        
        // 检查是否存在（按 title）
        const existing = db.prepare('SELECT id FROM notes WHERE title = ?').get(title) as any
        
        if (!existing) {
          const id = uuidv4()
          db.prepare(`
            INSERT INTO notes (id, title, content, type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(id, title, content, 'markdown', now, now)
          console.log(`[Main] Imported note: ${title}`)
        } else {
           // 可选：更新内容
           // db.prepare('UPDATE notes SET content = ? WHERE id = ?').run(content, existing.id)
        }
      }
      return true
    } catch (e) {
      console.error('[Main] Sync failed:', e)
      return false
    }
  })

  // 在文件资源管理器中显示
  ipcMain.handle(IPC_CHANNELS.SYSTEM_REVEAL, async (_event, filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        shell.showItemInFolder(filePath)
        return true
      }
      return false
    } catch (e) {
      console.error('[Main] Reveal failed:', e)
      return false
    }
  })
}
