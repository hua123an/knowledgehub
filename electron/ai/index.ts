import { ipcMain, BrowserWindow } from 'electron'
import { getDatabase } from '../database'
import { IPC_CHANNELS } from '../constants'
import {
  aiChat,
  aiChatStream,
  aiStop,
  aiSummarize,
  aiSuggestTags,
  aiPolish,
  aiContinue,
  aiTranslate,
  aiExplain,
  aiSearchEnhance,
  SYSTEM_PROMPTS,
} from './service'
import type { ChatMessage } from './service'

export function registerAIHandlers() {
  const db = getDatabase()

  // 初始化 AI 聊天历史表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    )
  `)

  // 非流式聊天
  ipcMain.handle(IPC_CHANNELS.AI_CHAT, async (_event, messages: ChatMessage[], systemPrompt?: string) => {
    try {
      const result = await aiChat(messages, systemPrompt)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 流式聊天
  ipcMain.handle(IPC_CHANNELS.AI_CHAT_STREAM, async (event, messages: ChatMessage[], systemPrompt?: string) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      await aiChatStream(
        messages,
        systemPrompt,
        (text) => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('ai:stream:chunk', text)
          }
        },
        () => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('ai:stream:done')
          }
        },
        (err) => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('ai:stream:error', err)
          }
        }
      )
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 停止生成
  ipcMain.handle(IPC_CHANNELS.AI_STOP, async () => {
    aiStop()
    return { success: true }
  })

  // 总结
  ipcMain.handle(IPC_CHANNELS.AI_SUMMARIZE, async (_event, content: string) => {
    try {
      const result = await aiSummarize(content)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 建议标签
  ipcMain.handle(IPC_CHANNELS.AI_SUGGEST_TAGS, async (_event, content: string) => {
    try {
      const result = await aiSuggestTags(content)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 润色
  ipcMain.handle(IPC_CHANNELS.AI_POLISH, async (_event, content: string) => {
    try {
      const result = await aiPolish(content)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 续写
  ipcMain.handle(IPC_CHANNELS.AI_CONTINUE, async (_event, content: string) => {
    try {
      const result = await aiContinue(content)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 翻译
  ipcMain.handle(IPC_CHANNELS.AI_TRANSLATE, async (_event, content: string, lang: string) => {
    try {
      const result = await aiTranslate(content, lang)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 解释
  ipcMain.handle(IPC_CHANNELS.AI_EXPLAIN, async (_event, content: string) => {
    try {
      const result = await aiExplain(content)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 搜索增强
  ipcMain.handle(IPC_CHANNELS.AI_SEARCH_ENHANCE, async (_event, query: string) => {
    try {
      const result = await aiSearchEnhance(query)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 聊天历史 - 列表
  ipcMain.handle(IPC_CHANNELS.AI_CHAT_HISTORY_LIST, async () => {
    try {
      const rows = db.prepare('SELECT * FROM ai_conversations ORDER BY updated_at DESC').all()
      return { success: true, data: rows }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 聊天历史 - 获取
  ipcMain.handle(IPC_CHANNELS.AI_CHAT_HISTORY_GET, async (_event, conversationId: string) => {
    try {
      const messages = db.prepare('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId)
      return { success: true, data: messages }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 聊天历史 - 保存
  ipcMain.handle(IPC_CHANNELS.AI_CHAT_HISTORY_SAVE, async (_event, conversationId: string, title: string, messages: { role: string; content: string }[]) => {
    try {
      // upsert conversation
      db.prepare(`
        INSERT INTO ai_conversations (id, title, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET title = ?, updated_at = CURRENT_TIMESTAMP
      `).run(conversationId, title, title)

      // delete old messages and re-insert
      db.prepare('DELETE FROM ai_messages WHERE conversation_id = ?').run(conversationId)
      const insert = db.prepare('INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)')
      for (const msg of messages) {
        insert.run(conversationId, msg.role, msg.content)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // 聊天历史 - 删除
  ipcMain.handle(IPC_CHANNELS.AI_CHAT_HISTORY_DELETE, async (_event, conversationId: string) => {
    try {
      db.prepare('DELETE FROM ai_conversations WHERE id = ?').run(conversationId)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}
