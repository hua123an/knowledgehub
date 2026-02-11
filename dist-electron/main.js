import { app, ipcMain, BrowserWindow } from "electron";
import { createRequire as createRequire$1 } from "node:module";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import * as path from "path";
import * as fs from "fs";
import { createRequire } from "module";
import { randomFillSync, randomUUID } from "node:crypto";
import https from "https";
import http from "http";
const require$1 = createRequire(import.meta.url);
const Database = require$1("better-sqlite3");
let db = null;
function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}
function initDatabase() {
  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "knowledge.db");
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
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
  `;
  db.exec(schema);
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title,
        content,
        content='notes',
        content_rowid='rowid'
      );
    `);
  } catch (e) {
  }
  try {
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, title, content) VALUES (NEW.rowid, NEW.title, NEW.content);
      END;
    `);
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', OLD.rowid, OLD.title, OLD.content);
        INSERT INTO notes_fts(rowid, title, content) VALUES (NEW.rowid, NEW.title, NEW.content);
      END;
    `);
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', OLD.rowid, OLD.title, OLD.content);
      END;
    `);
  } catch (e) {
  }
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
    `);
  } catch (e) {
  }
  return db;
}
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}
const native = { randomUUID };
function _v4(options, buf, offset) {
  var _a;
  options = options || {};
  const rnds = options.random ?? ((_a = options.rng) == null ? void 0 : _a.call(options)) ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return unsafeStringify(rnds);
}
function v4(options, buf, offset) {
  if (native.randomUUID && true && !options) {
    return native.randomUUID();
  }
  return _v4(options);
}
const IPC_CHANNELS = {
  // 笔记操作
  NOTE_CREATE: "note:create",
  NOTE_UPDATE: "note:update",
  NOTE_DELETE: "note:delete",
  NOTE_GET: "note:get",
  NOTE_LIST: "note:list",
  NOTE_SEARCH: "note:search",
  // 文件夹操作
  FOLDER_CREATE: "folder:create",
  FOLDER_UPDATE: "folder:update",
  FOLDER_DELETE: "folder:delete",
  FOLDER_LIST: "folder:list",
  // 标签操作
  TAG_CREATE: "tag:create",
  TAG_UPDATE: "tag:update",
  TAG_DELETE: "tag:delete",
  TAG_LIST: "tag:list",
  TAG_ADD_TO_NOTE: "tag:addToNote",
  TAG_REMOVE_FROM_NOTE: "tag:removeFromNote",
  // 链接操作
  LINK_CREATE: "link:create",
  LINK_DELETE: "link:delete",
  LINK_GET_BY_NOTE: "link:getByNote",
  LINK_GET_GRAPH: "link:getGraph",
  // 设置
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",
  // AI
  AI_CHAT: "ai:chat",
  AI_CHAT_STREAM: "ai:chatStream",
  AI_STOP: "ai:stop",
  AI_SUMMARIZE: "ai:summarize",
  AI_SUGGEST_TAGS: "ai:suggestTags",
  AI_POLISH: "ai:polish",
  AI_CONTINUE: "ai:continue",
  AI_TRANSLATE: "ai:translate",
  AI_EXPLAIN: "ai:explain",
  AI_SEARCH_ENHANCE: "ai:searchEnhance",
  AI_CHAT_HISTORY_LIST: "ai:chatHistoryList",
  AI_CHAT_HISTORY_GET: "ai:chatHistoryGet",
  AI_CHAT_HISTORY_SAVE: "ai:chatHistorySave",
  AI_CHAT_HISTORY_DELETE: "ai:chatHistoryDelete"
};
function rowToNote(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    folderId: row.folder_id,
    url: row.url || void 0,
    favicon: row.favicon || void 0,
    description: row.description || void 0,
    language: row.language || void 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function registerNoteHandlers() {
  const db2 = getDatabase();
  ipcMain.handle(IPC_CHANNELS.NOTE_CREATE, async (_event, note) => {
    try {
      const id = v4();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const stmt = db2.prepare(`
        INSERT INTO notes (id, title, content, type, folder_id, url, favicon, description, language, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        note.title || "无标题",
        note.content || "",
        note.type || "markdown",
        note.folderId || null,
        note.url || null,
        note.favicon || null,
        note.description || null,
        note.language || null,
        now,
        now
      );
      const created = db2.prepare("SELECT * FROM notes WHERE id = ?").get(id);
      return { success: true, data: rowToNote(created) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.NOTE_UPDATE, async (_event, id, updates) => {
    try {
      const fields = [];
      const values = [];
      if (updates.title !== void 0) {
        fields.push("title = ?");
        values.push(updates.title);
      }
      if (updates.content !== void 0) {
        fields.push("content = ?");
        values.push(updates.content);
      }
      if (updates.folderId !== void 0) {
        fields.push("folder_id = ?");
        values.push(updates.folderId);
      }
      if (updates.url !== void 0) {
        fields.push("url = ?");
        values.push(updates.url);
      }
      if (updates.favicon !== void 0) {
        fields.push("favicon = ?");
        values.push(updates.favicon);
      }
      if (updates.description !== void 0) {
        fields.push("description = ?");
        values.push(updates.description);
      }
      if (updates.language !== void 0) {
        fields.push("language = ?");
        values.push(updates.language);
      }
      fields.push("updated_at = ?");
      values.push((/* @__PURE__ */ new Date()).toISOString());
      values.push(id);
      const stmt = db2.prepare(`UPDATE notes SET ${fields.join(", ")} WHERE id = ?`);
      stmt.run(...values);
      const updated = db2.prepare("SELECT * FROM notes WHERE id = ?").get(id);
      return { success: true, data: rowToNote(updated) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.NOTE_DELETE, async (_event, id) => {
    try {
      db2.prepare("DELETE FROM notes WHERE id = ?").run(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.NOTE_GET, async (_event, id) => {
    try {
      const row = db2.prepare("SELECT * FROM notes WHERE id = ?").get(id);
      if (row) {
        return { success: true, data: rowToNote(row) };
      }
      return { success: false, error: "Note not found" };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.NOTE_LIST, async (_event, filters = {}) => {
    try {
      let sql = "SELECT * FROM notes WHERE 1=1";
      const params = [];
      if (filters.type) {
        sql += " AND type = ?";
        params.push(filters.type);
      }
      if (filters.folderId !== void 0) {
        if (filters.folderId === null) {
          sql += " AND folder_id IS NULL";
        } else {
          sql += " AND folder_id = ?";
          params.push(filters.folderId);
        }
      }
      sql += " ORDER BY updated_at DESC";
      const rows = db2.prepare(sql).all(...params);
      return { success: true, data: rows.map(rowToNote) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.NOTE_SEARCH, async (_event, query) => {
    try {
      if (!query || query.trim() === "") {
        return { success: true, data: [] };
      }
      const rows = db2.prepare(`
        SELECT n.*, 
               snippet(notes_fts, 0, '<mark>', '</mark>', '...', 32) as title_highlight,
               snippet(notes_fts, 1, '<mark>', '</mark>', '...', 64) as content_highlight
        FROM notes_fts fts
        JOIN notes n ON n.rowid = fts.rowid
        WHERE notes_fts MATCH ?
        ORDER BY rank
        LIMIT 50
      `).all(query);
      const results = rows.map((row) => ({
        note: rowToNote(row),
        highlights: [row.title_highlight, row.content_highlight].filter(Boolean),
        score: 0
      }));
      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
function rowToFolder(row) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    sortOrder: row.sort_order
  };
}
function registerFolderHandlers() {
  const db2 = getDatabase();
  ipcMain.handle(IPC_CHANNELS.FOLDER_CREATE, async (_event, folder) => {
    try {
      const id = v4();
      const maxOrder = folder.parentId ? db2.prepare("SELECT COALESCE(MAX(sort_order), -1) as max_order FROM folders WHERE parent_id = ?").get(folder.parentId) : db2.prepare("SELECT COALESCE(MAX(sort_order), -1) as max_order FROM folders WHERE parent_id IS NULL").get();
      const sortOrder = ((maxOrder == null ? void 0 : maxOrder.max_order) ?? -1) + 1;
      const stmt = db2.prepare(`
        INSERT INTO folders (id, name, parent_id, sort_order)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(id, folder.name || "新文件夹", folder.parentId || null, sortOrder);
      const created = db2.prepare("SELECT * FROM folders WHERE id = ?").get(id);
      return { success: true, data: rowToFolder(created) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.FOLDER_UPDATE, async (_event, id, updates) => {
    try {
      const fields = [];
      const values = [];
      if (updates.name !== void 0) {
        fields.push("name = ?");
        values.push(updates.name);
      }
      if (updates.parentId !== void 0) {
        fields.push("parent_id = ?");
        values.push(updates.parentId);
      }
      if (updates.sortOrder !== void 0) {
        fields.push("sort_order = ?");
        values.push(updates.sortOrder);
      }
      if (fields.length === 0) {
        const existing = db2.prepare("SELECT * FROM folders WHERE id = ?").get(id);
        return { success: true, data: rowToFolder(existing) };
      }
      values.push(id);
      const stmt = db2.prepare(`UPDATE folders SET ${fields.join(", ")} WHERE id = ?`);
      stmt.run(...values);
      const updated = db2.prepare("SELECT * FROM folders WHERE id = ?").get(id);
      return { success: true, data: rowToFolder(updated) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.FOLDER_DELETE, async (_event, id) => {
    try {
      db2.prepare("DELETE FROM folders WHERE id = ?").run(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.FOLDER_LIST, async () => {
    try {
      const rows = db2.prepare("SELECT * FROM folders ORDER BY sort_order").all();
      return { success: true, data: rows.map(rowToFolder) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
function rowToTag(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color
  };
}
const TAG_COLORS = [
  "#409EFF",
  // 蓝色
  "#67C23A",
  // 绿色
  "#E6A23C",
  // 橙色
  "#F56C6C",
  // 红色
  "#909399",
  // 灰色
  "#9B59B6",
  // 紫色
  "#1ABC9C",
  // 青色
  "#E91E63"
  // 粉色
];
function registerTagHandlers() {
  const db2 = getDatabase();
  ipcMain.handle(IPC_CHANNELS.TAG_CREATE, async (_event, tag) => {
    try {
      const id = v4();
      const color = tag.color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      const stmt = db2.prepare(`
        INSERT INTO tags (id, name, color)
        VALUES (?, ?, ?)
      `);
      stmt.run(id, tag.name, color);
      const created = db2.prepare("SELECT * FROM tags WHERE id = ?").get(id);
      return { success: true, data: rowToTag(created) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.TAG_UPDATE, async (_event, id, updates) => {
    try {
      const fields = [];
      const values = [];
      if (updates.name !== void 0) {
        fields.push("name = ?");
        values.push(updates.name);
      }
      if (updates.color !== void 0) {
        fields.push("color = ?");
        values.push(updates.color);
      }
      if (fields.length === 0) {
        const existing = db2.prepare("SELECT * FROM tags WHERE id = ?").get(id);
        return { success: true, data: rowToTag(existing) };
      }
      values.push(id);
      const stmt = db2.prepare(`UPDATE tags SET ${fields.join(", ")} WHERE id = ?`);
      stmt.run(...values);
      const updated = db2.prepare("SELECT * FROM tags WHERE id = ?").get(id);
      return { success: true, data: rowToTag(updated) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.TAG_DELETE, async (_event, id) => {
    try {
      db2.prepare("DELETE FROM tags WHERE id = ?").run(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.TAG_LIST, async () => {
    try {
      const rows = db2.prepare("SELECT * FROM tags ORDER BY name").all();
      return { success: true, data: rows.map(rowToTag) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.TAG_ADD_TO_NOTE, async (_event, noteId, tagId) => {
    try {
      const stmt = db2.prepare(`
        INSERT OR IGNORE INTO note_tags (note_id, tag_id)
        VALUES (?, ?)
      `);
      stmt.run(noteId, tagId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.TAG_REMOVE_FROM_NOTE, async (_event, noteId, tagId) => {
    try {
      db2.prepare("DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?").run(noteId, tagId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
function registerLinkHandlers() {
  const db2 = getDatabase();
  ipcMain.handle(IPC_CHANNELS.LINK_CREATE, async (_event, sourceId, targetId) => {
    try {
      const stmt = db2.prepare(`
        INSERT OR IGNORE INTO links (source_id, target_id)
        VALUES (?, ?)
      `);
      stmt.run(sourceId, targetId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.LINK_DELETE, async (_event, sourceId, targetId) => {
    try {
      db2.prepare("DELETE FROM links WHERE source_id = ? AND target_id = ?").run(sourceId, targetId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.LINK_GET_BY_NOTE, async (_event, noteId) => {
    try {
      const outLinks = db2.prepare(`
        SELECT n.id, n.title, n.type
        FROM links l
        JOIN notes n ON n.id = l.target_id
        WHERE l.source_id = ?
      `).all(noteId);
      const inLinks = db2.prepare(`
        SELECT n.id, n.title, n.type
        FROM links l
        JOIN notes n ON n.id = l.source_id
        WHERE l.target_id = ?
      `).all(noteId);
      return {
        success: true,
        data: {
          outLinks: outLinks.map((n) => ({ id: n.id, title: n.title, type: n.type })),
          inLinks: inLinks.map((n) => ({ id: n.id, title: n.title, type: n.type }))
        }
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.LINK_GET_GRAPH, async () => {
    try {
      const notes = db2.prepare(`
        SELECT id, title, type FROM notes
      `).all();
      const links = db2.prepare(`
        SELECT source_id, target_id FROM links
      `).all();
      const nodes = notes.map((n) => ({
        id: n.id,
        label: n.title,
        type: n.type
      }));
      const edges = links.map((l) => ({
        source: l.source_id,
        target: l.target_id
      }));
      return { success: true, data: edges };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
function registerSettingsHandlers() {
  const db2 = getDatabase();
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    try {
      const rows = db2.prepare("SELECT key, value FROM settings").all();
      const settings = {};
      rows.forEach((row) => {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch {
          settings[row.key] = row.value;
        }
      });
      return { success: true, data: settings };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, settings) => {
    try {
      const stmt = db2.prepare(`
        INSERT OR REPLACE INTO settings (key, value)
        VALUES (?, ?)
      `);
      Object.entries(settings).forEach(([key, value]) => {
        stmt.run(key, JSON.stringify(value));
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
let activeRequest = null;
function getAIConfig() {
  const db2 = getDatabase();
  const rows = db2.prepare("SELECT key, value FROM settings WHERE key LIKE ?").all("ai_%");
  const config = {};
  rows.forEach((r) => {
    try {
      config[r.key] = JSON.parse(r.value);
    } catch {
      config[r.key] = r.value;
    }
  });
  return {
    baseUrl: config["ai_base_url"] || "https://api.openai.com/v1",
    apiKey: config["ai_api_key"] || "",
    model: config["ai_model"] || "gpt-3.5-turbo"
  };
}
async function aiChat(messages, systemPrompt) {
  const config = getAIConfig();
  if (!config.apiKey) throw new Error("请先在设置中配置 AI API Key");
  const allMessages = [];
  if (systemPrompt) {
    allMessages.push({ role: "system", content: systemPrompt });
  }
  allMessages.push(...messages);
  const body = JSON.stringify({
    model: config.model,
    messages: allMessages,
    temperature: 0.7,
    max_tokens: 2048
  });
  return new Promise((resolve, reject) => {
    const url = new URL(config.baseUrl.replace(/\/$/, "") + "/chat/completions");
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;
    const req = transport.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk.toString();
      });
      res.on("end", () => {
        var _a, _b, _c;
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)));
            return;
          }
          resolve(((_c = (_b = (_a = json.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || "");
        } catch (e) {
          reject(new Error("AI 响应解析失败: " + data.slice(0, 200)));
        }
      });
    });
    activeRequest = req;
    req.on("error", (e) => reject(new Error("AI 请求失败: " + e.message)));
    req.write(body);
    req.end();
  });
}
async function aiChatStream(messages, systemPrompt, onChunk, onDone, onError) {
  const config = getAIConfig();
  if (!config.apiKey) {
    onError("请先在设置中配置 AI API Key");
    return;
  }
  const allMessages = [];
  if (systemPrompt) {
    allMessages.push({ role: "system", content: systemPrompt });
  }
  allMessages.push(...messages);
  const body = JSON.stringify({
    model: config.model,
    messages: allMessages,
    temperature: 0.7,
    max_tokens: 2048,
    stream: true
  });
  const url = new URL(config.baseUrl.replace(/\/$/, "") + "/chat/completions");
  const isHttps = url.protocol === "https:";
  const transport = isHttps ? https : http;
  const req = transport.request({
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname + url.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    }
  }, (res) => {
    let buffer = "";
    res.on("data", (chunk) => {
      var _a, _b, _c;
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          onDone();
          return;
        }
        try {
          const json = JSON.parse(data);
          const content = (_c = (_b = (_a = json.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.delta) == null ? void 0 : _c.content;
          if (content) onChunk(content);
        } catch {
        }
      }
    });
    res.on("end", () => onDone());
  });
  activeRequest = req;
  req.on("error", (e) => onError("AI 请求失败: " + e.message));
  req.write(body);
  req.end();
}
function aiStop() {
  if (activeRequest) {
    activeRequest.destroy();
    activeRequest = null;
  }
}
const SYSTEM_PROMPTS = {
  summarize: "你是一个知识库助手。请用简洁的语言总结以下内容，提取核心要点。用中文回答。",
  suggestTags: "你是一个知识库助手。请根据以下内容建议 3-5 个合适的标签。只输出标签名，用逗号分隔，不要其他内容。用中文回答。",
  polish: "你是一个写作助手。请润色以下文字，使其更加通顺、专业，保持原意不变。直接输出润色后的内容，不要其他说明。",
  continue: "你是一个写作助手。请根据以下内容继续往下写，保持风格一致，自然地扩展内容。直接输出续写内容，不要重复已有内容。",
  translate: "你是一个翻译助手。请将以下内容翻译成{lang}。直接输出翻译结果，不要其他说明。",
  explain: "你是一个知识库助手。请用通俗易懂的语言解释以下内容。用中文回答。",
  searchEnhance: "你是一个搜索助手。用户想搜索以下内容，请帮忙扩展搜索关键词，生成 3-5 个相关的搜索词。只输出关键词，用逗号分隔。"
};
async function aiSummarize(content) {
  return aiChat([{ role: "user", content }], SYSTEM_PROMPTS.summarize);
}
async function aiSuggestTags(content) {
  const result = await aiChat([{ role: "user", content }], SYSTEM_PROMPTS.suggestTags);
  return result.split(/[,，、]/).map((t) => t.trim()).filter(Boolean);
}
async function aiPolish(content) {
  return aiChat([{ role: "user", content }], SYSTEM_PROMPTS.polish);
}
async function aiContinue(content) {
  return aiChat([{ role: "user", content }], SYSTEM_PROMPTS.continue);
}
async function aiTranslate(content, lang) {
  const prompt = SYSTEM_PROMPTS.translate.replace("{lang}", lang);
  return aiChat([{ role: "user", content }], prompt);
}
async function aiExplain(content) {
  return aiChat([{ role: "user", content }], SYSTEM_PROMPTS.explain);
}
async function aiSearchEnhance(query) {
  const result = await aiChat([{ role: "user", content: query }], SYSTEM_PROMPTS.searchEnhance);
  return result.split(/[,，、]/).map((t) => t.trim()).filter(Boolean);
}
function registerAIHandlers() {
  const db2 = getDatabase();
  db2.exec(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db2.exec(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    )
  `);
  ipcMain.handle(IPC_CHANNELS.AI_CHAT, async (_event, messages, systemPrompt) => {
    try {
      const result = await aiChat(messages, systemPrompt);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AI_CHAT_STREAM, async (event, messages, systemPrompt) => {
    try {
      const win2 = BrowserWindow.fromWebContents(event.sender);
      await aiChatStream(
        messages,
        systemPrompt,
        (text) => {
          if (win2 && !win2.isDestroyed()) {
            win2.webContents.send("ai:stream:chunk", text);
          }
        },
        () => {
          if (win2 && !win2.isDestroyed()) {
            win2.webContents.send("ai:stream:done");
          }
        },
        (err) => {
          if (win2 && !win2.isDestroyed()) {
            win2.webContents.send("ai:stream:error", err);
          }
        }
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AI_STOP, async () => {
    aiStop();
    return { success: true };
  });
  ipcMain.handle(IPC_CHANNELS.AI_SUMMARIZE, async (_event, content) => {
    try {
      const result = await aiSummarize(content);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AI_SUGGEST_TAGS, async (_event, content) => {
    try {
      const result = await aiSuggestTags(content);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AI_POLISH, async (_event, content) => {
    try {
      const result = await aiPolish(content);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AI_CONTINUE, async (_event, content) => {
    try {
      const result = await aiContinue(content);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AI_TRANSLATE, async (_event, content, lang) => {
    try {
      const result = await aiTranslate(content, lang);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AI_EXPLAIN, async (_event, content) => {
    try {
      const result = await aiExplain(content);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AI_SEARCH_ENHANCE, async (_event, query) => {
    try {
      const result = await aiSearchEnhance(query);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AI_CHAT_HISTORY_LIST, async () => {
    try {
      const rows = db2.prepare("SELECT * FROM ai_conversations ORDER BY updated_at DESC").all();
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AI_CHAT_HISTORY_GET, async (_event, conversationId) => {
    try {
      const messages = db2.prepare("SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC").all(conversationId);
      return { success: true, data: messages };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AI_CHAT_HISTORY_SAVE, async (_event, conversationId, title, messages) => {
    try {
      db2.prepare(`
        INSERT INTO ai_conversations (id, title, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET title = ?, updated_at = CURRENT_TIMESTAMP
      `).run(conversationId, title, title);
      db2.prepare("DELETE FROM ai_messages WHERE conversation_id = ?").run(conversationId);
      const insert = db2.prepare("INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)");
      for (const msg of messages) {
        insert.run(conversationId, msg.role, msg.content);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AI_CHAT_HISTORY_DELETE, async (_event, conversationId) => {
    try {
      db2.prepare("DELETE FROM ai_conversations WHERE id = ?").run(conversationId);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
function registerAllHandlers() {
  registerNoteHandlers();
  registerFolderHandlers();
  registerTagHandlers();
  registerLinkHandlers();
  registerSettingsHandlers();
  registerAIHandlers();
}
createRequire$1(import.meta.url);
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$1.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 600,
    icon: path$1.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.on("before-quit", () => {
  closeDatabase();
});
app.whenReady().then(() => {
  initDatabase();
  registerAllHandlers();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
//# sourceMappingURL=main.js.map
