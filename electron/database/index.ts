import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { createRequire } from 'module'

// 使用 createRequire 加载原生模块
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

type DatabaseType = ReturnType<typeof Database>
let db: DatabaseType | null = null

export function getDatabase(): DatabaseType {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function initDatabase(): DatabaseType {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'knowledge.db')
  
  // 确保目录存在
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }
  
  db = new Database(dbPath)
  
  // 启用外键约束
  db.pragma('foreign_keys = ON')
  
  // 创建表结构
  const schema = `
    -- 笔记/文档表
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      type TEXT CHECK(type IN ('markdown', 'bookmark', 'snippet')) NOT NULL DEFAULT 'markdown',
      folder_id TEXT,
      url TEXT,
      favicon TEXT,
      description TEXT,
      language TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    -- 标签表
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#409EFF'
    );

    -- 笔记-标签关联表
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- 双向链接表
    CREATE TABLE IF NOT EXISTS links (
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      PRIMARY KEY (source_id, target_id),
      FOREIGN KEY (source_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    -- 文件夹表
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    );

    -- 设置表
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- 附件表
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      category TEXT CHECK(category IN ('image','audio','video','document','other')) NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      width INTEGER,
      height INTEGER,
      duration REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `
  
  db.exec(schema)

  // 为已有数据库添加新列（软删除 + 收藏）
  try {
    db.exec(`ALTER TABLE notes ADD COLUMN deleted_at TEXT DEFAULT NULL`)
  } catch (e) {
    // 列可能已存在
  }
  try {
    db.exec(`ALTER TABLE notes ADD COLUMN is_starred INTEGER DEFAULT 0`)
  } catch (e) {
    // 列可能已存在
  }

  // 创建全文搜索表（如果不存在）
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title,
        content,
        content='notes',
        content_rowid='rowid'
      );
    `)
  } catch (e) {
    // FTS表可能已存在
  }
  
  // 创建触发器
  try {
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, title, content) VALUES (NEW.rowid, NEW.title, NEW.content);
      END;
    `)
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', OLD.rowid, OLD.title, OLD.content);
        INSERT INTO notes_fts(rowid, title, content) VALUES (NEW.rowid, NEW.title, NEW.content);
      END;
    `)
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', OLD.rowid, OLD.title, OLD.content);
      END;
    `)
  } catch (e) {
    // 触发器可能已存在
  }
  
  // 创建索引
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
      CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
      CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
      CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
      CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id);
      CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);
      CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id);
      CREATE INDEX IF NOT EXISTS idx_attachments_category ON attachments(category);
    `)
  } catch (e) {
    // 索引可能已存在
  }
  
  return db
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}
