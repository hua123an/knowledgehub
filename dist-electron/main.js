import { app, ipcMain, BrowserWindow } from "electron";
import { createRequire as createRequire$1 } from "node:module";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import * as path from "path";
import * as fs from "fs";
import { createRequire } from "module";
import { randomFillSync, randomUUID } from "node:crypto";
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
  SETTINGS_SET: "settings:set"
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
      const maxOrder = db2.prepare(`
        SELECT COALESCE(MAX(sort_order), -1) as max_order 
        FROM folders 
        WHERE parent_id ${folder.parentId ? "= ?" : "IS NULL"}
      `).get(folder.parentId ? folder.parentId : void 0);
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
function registerAllHandlers() {
  registerNoteHandlers();
  registerFolderHandlers();
  registerTagHandlers();
  registerLinkHandlers();
  registerSettingsHandlers();
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
