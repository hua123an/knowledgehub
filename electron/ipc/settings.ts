import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { IPC_CHANNELS } from '../../src/types'

export function registerSettingsHandlers() {
  const db = getDatabase()

  // 获取设置
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    try {
      const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
      
      const settings: Record<string, any> = {}
      rows.forEach(row => {
        try {
          settings[row.key] = JSON.parse(row.value)
        } catch {
          settings[row.key] = row.value
        }
      })
      
      return { success: true, data: settings }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 保存设置
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, settings) => {
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO settings (key, value)
        VALUES (?, ?)
      `)
      
      Object.entries(settings).forEach(([key, value]) => {
        stmt.run(key, JSON.stringify(value))
      })
      
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}
