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

-- 全文搜索虚拟表
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title,
  content,
  content='notes',
  content_rowid='rowid'
);

-- 触发器：插入笔记时同步到FTS
CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, content) VALUES (NEW.rowid, NEW.title, NEW.content);
END;

-- 触发器：更新笔记时同步到FTS
CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', OLD.rowid, OLD.title, OLD.content);
  INSERT INTO notes_fts(rowid, title, content) VALUES (NEW.rowid, NEW.title, NEW.content);
END;

-- 触发器：删除笔记时同步到FTS
CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', OLD.rowid, OLD.title, OLD.content);
END;

-- 索引
CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);
