import { ipcMain, dialog, shell } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import fs from 'node:fs'
import path from 'node:path'
import { getDatabase } from '../database'
import { IPC_CHANNELS } from '../constants'
import { globalContext } from '../context'

interface AttachmentRow {
  id: string
  note_id: string
  filename: string
  stored_name: string
  mime_type: string
  category: string
  size: number
  width: number | null
  height: number | null
  duration: number | null
  created_at: string
}

function rowToAttachment(row: AttachmentRow) {
  return {
    id: row.id,
    noteId: row.note_id,
    filename: row.filename,
    storedName: row.stored_name,
    mimeType: row.mime_type,
    category: row.category,
    size: row.size,
    width: row.width,
    height: row.height,
    duration: row.duration,
    createdAt: row.created_at,
  }
}

function getAttachmentsDir(category: string): string | null {
  const workspace = globalContext.currentWorkspace
  if (!workspace) return null
  const dir = path.join(workspace, '_attachments', category)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getExtFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  return ext || '.bin'
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp', '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.webm': 'audio/webm', '.flac': 'audio/flac', '.aac': 'audio/aac',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4', '.avi': 'video/x-msvideo', '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain', '.csv': 'text/csv',
  }
  return map[ext] || 'application/octet-stream'
}

export function registerAttachmentHandlers() {
  const db = getDatabase()

  // 上传附件
  ipcMain.handle(IPC_CHANNELS.ATTACHMENT_UPLOAD, async (_event, params) => {
    try {
      const { noteId, filename, buffer, mimeType, category, width, height, duration } = params
      const dir = getAttachmentsDir(category)
      if (!dir) return { success: false, error: 'No workspace set' }

      const id = uuidv4()
      const ext = getExtFromFilename(filename)
      const storedName = `${id}${ext}`
      const filePath = path.join(dir, storedName)

      // 写入文件 - buffer 从 IPC 传来是 ArrayBuffer 或 Uint8Array
      const data = Buffer.from(buffer)
      fs.writeFileSync(filePath, data)

      const size = data.length

      // 插入 DB
      db.prepare(`
        INSERT INTO attachments (id, note_id, filename, stored_name, mime_type, category, size, width, height, duration)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, noteId, filename, storedName, mimeType, category, size, width || null, height || null, duration || null)

      const relativePath = `_attachments/${category}/${storedName}`
      return {
        success: true,
        data: {
          id,
          storedName,
          relativePath,
          absolutePath: filePath,
          url: `attachment://${filePath}`,
        }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 删除附件
  ipcMain.handle(IPC_CHANNELS.ATTACHMENT_DELETE, async (_event, id: string) => {
    try {
      const row = db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as AttachmentRow | undefined
      if (!row) return { success: false, error: 'Attachment not found' }

      // 删除文件
      const workspace = globalContext.currentWorkspace
      if (workspace) {
        const filePath = path.join(workspace, '_attachments', row.category, row.stored_name)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }

      // 删除 DB 记录
      db.prepare('DELETE FROM attachments WHERE id = ?').run(id)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 获取单个附件
  ipcMain.handle(IPC_CHANNELS.ATTACHMENT_GET, async (_event, id: string) => {
    try {
      const row = db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as AttachmentRow | undefined
      if (!row) return { success: false, error: 'Not found' }
      return { success: true, data: rowToAttachment(row) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 列出笔记附件
  ipcMain.handle(IPC_CHANNELS.ATTACHMENT_LIST, async (_event, noteId: string, category?: string) => {
    try {
      let rows: AttachmentRow[]
      if (category) {
        rows = db.prepare('SELECT * FROM attachments WHERE note_id = ? AND category = ? ORDER BY created_at DESC')
          .all(noteId, category) as AttachmentRow[]
      } else {
        rows = db.prepare('SELECT * FROM attachments WHERE note_id = ? ORDER BY created_at DESC')
          .all(noteId) as AttachmentRow[]
      }
      return { success: true, data: rows.map(rowToAttachment) }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 获取附件路径
  ipcMain.handle(IPC_CHANNELS.ATTACHMENT_GET_PATH, async (_event, id: string) => {
    try {
      const row = db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as AttachmentRow | undefined
      if (!row) return { success: false, error: 'Not found' }

      const workspace = globalContext.currentWorkspace
      if (!workspace) return { success: false, error: 'No workspace' }

      const absolutePath = path.join(workspace, '_attachments', row.category, row.stored_name)
      return { success: true, data: { absolutePath, url: `attachment://${absolutePath}` } }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 用系统程序打开
  ipcMain.handle(IPC_CHANNELS.ATTACHMENT_OPEN, async (_event, id: string) => {
    try {
      const row = db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as AttachmentRow | undefined
      if (!row) return { success: false, error: 'Not found' }

      const workspace = globalContext.currentWorkspace
      if (!workspace) return { success: false, error: 'No workspace' }

      const filePath = path.join(workspace, '_attachments', row.category, row.stored_name)
      await shell.openPath(filePath)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 文件选择器
  ipcMain.handle(IPC_CHANNELS.ATTACHMENT_PICK_FILE, async (_event, options?: { category?: string; multiple?: boolean }) => {
    try {
      const filters: Electron.FileFilter[] = []

      if (options?.category === 'image') {
        filters.push({ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'] })
      } else if (options?.category === 'audio') {
        filters.push({ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'webm', 'flac', 'aac', 'm4a'] })
      } else if (options?.category === 'video') {
        filters.push({ name: 'Video', extensions: ['mp4', 'webm', 'avi', 'mov', 'mkv'] })
      } else if (options?.category === 'document') {
        filters.push({ name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'] })
      }
      filters.push({ name: 'All Files', extensions: ['*'] })

      const properties: Electron.OpenDialogOptions['properties'] = ['openFile']
      if (options?.multiple) {
        properties.push('multiSelections')
      }

      const result = await dialog.showOpenDialog({
        properties,
        filters,
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: [] }
      }

      const files = result.filePaths.map(fp => {
        const fileBuffer = fs.readFileSync(fp)
        const filename = path.basename(fp)
        const ext = path.extname(fp).toLowerCase()
        const mimeType = getMimeType(ext)
        return {
          filename,
          buffer: fileBuffer.buffer,
          mimeType,
          size: fileBuffer.length,
        }
      })

      return { success: true, data: files }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}
