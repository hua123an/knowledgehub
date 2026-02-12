import { app as F, ipcMain as c, BrowserWindow as K, shell as q, dialog as Z, protocol as ae } from "electron";
import { fileURLToPath as oe } from "node:url";
import _ from "node:path";
import * as C from "path";
import * as m from "fs";
import { createRequire as ce } from "module";
import { randomFillSync as ie, randomUUID as Ee } from "node:crypto";
import g from "node:fs";
import W from "https";
import Q from "http";
const le = ce(import.meta.url), ue = le("better-sqlite3");
let h = null;
function N() {
  if (!h)
    throw new Error("Database not initialized");
  return h;
}
function de() {
  const r = F.getPath("userData"), s = C.join(r, "knowledge.db");
  m.existsSync(r) || m.mkdirSync(r, { recursive: !0 }), h = new ue(s), h.pragma("foreign_keys = ON"), h.exec(`
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
  `);
  try {
    h.exec("ALTER TABLE notes ADD COLUMN deleted_at TEXT DEFAULT NULL");
  } catch {
  }
  try {
    h.exec("ALTER TABLE notes ADD COLUMN is_starred INTEGER DEFAULT 0");
  } catch {
  }
  try {
    h.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title,
        content,
        content='notes',
        content_rowid='rowid'
      );
    `);
  } catch {
  }
  try {
    h.exec(`
      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, title, content) VALUES (NEW.rowid, NEW.title, NEW.content);
      END;
    `), h.exec(`
      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', OLD.rowid, OLD.title, OLD.content);
        INSERT INTO notes_fts(rowid, title, content) VALUES (NEW.rowid, NEW.title, NEW.content);
      END;
    `), h.exec(`
      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', OLD.rowid, OLD.title, OLD.content);
      END;
    `);
  } catch {
  }
  try {
    h.exec(`
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
    `);
  } catch {
  }
  return h;
}
function Te() {
  h && (h.close(), h = null);
}
const p = [];
for (let r = 0; r < 256; ++r)
  p.push((r + 256).toString(16).slice(1));
function pe(r, s = 0) {
  return (p[r[s + 0]] + p[r[s + 1]] + p[r[s + 2]] + p[r[s + 3]] + "-" + p[r[s + 4]] + p[r[s + 5]] + "-" + p[r[s + 6]] + p[r[s + 7]] + "-" + p[r[s + 8]] + p[r[s + 9]] + "-" + p[r[s + 10]] + p[r[s + 11]] + p[r[s + 12]] + p[r[s + 13]] + p[r[s + 14]] + p[r[s + 15]]).toLowerCase();
}
const X = new Uint8Array(256);
let P = X.length;
function _e() {
  return P > X.length - 16 && (ie(X), P = 0), X.slice(P, P += 16);
}
const $ = { randomUUID: Ee };
function he(r, s, t) {
  var n;
  r = r || {};
  const e = r.random ?? ((n = r.rng) == null ? void 0 : n.call(r)) ?? _e();
  if (e.length < 16)
    throw new Error("Random bytes length must be >= 16");
  return e[6] = e[6] & 15 | 64, e[8] = e[8] & 63 | 128, pe(e);
}
function w(r, s, t) {
  return $.randomUUID && !r ? $.randomUUID() : he(r);
}
const i = {
  // 笔记操作
  NOTE_CREATE: "note:create",
  NOTE_UPDATE: "note:update",
  NOTE_DELETE: "note:delete",
  NOTE_GET: "note:get",
  NOTE_LIST: "note:list",
  NOTE_SEARCH: "note:search",
  NOTE_RESTORE: "note:restore",
  NOTE_PERMANENT_DELETE: "note:permanentDelete",
  NOTE_TRASH_LIST: "note:trashList",
  NOTE_STAR: "note:star",
  NOTE_UNSTAR: "note:unstar",
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
  AI_WEB_SEARCH: "ai:webSearch",
  AI_CHAT_HISTORY_LIST: "ai:chatHistoryList",
  AI_CHAT_HISTORY_GET: "ai:chatHistoryGet",
  AI_CHAT_HISTORY_SAVE: "ai:chatHistorySave",
  AI_CHAT_HISTORY_DELETE: "ai:chatHistoryDelete",
  // 附件操作
  ATTACHMENT_UPLOAD: "attachment:upload",
  ATTACHMENT_DELETE: "attachment:delete",
  ATTACHMENT_GET: "attachment:get",
  ATTACHMENT_LIST: "attachment:list",
  ATTACHMENT_GET_PATH: "attachment:getPath",
  ATTACHMENT_OPEN: "attachment:open",
  ATTACHMENT_PICK_FILE: "attachment:pickFile",
  // 系统
  SYSTEM_REVEAL: "system:reveal"
}, f = {
  currentWorkspace: null
};
function v(r) {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    type: r.type,
    folderId: r.folder_id,
    url: r.url || void 0,
    favicon: r.favicon || void 0,
    description: r.description || void 0,
    language: r.language || void 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    isStarred: r.is_starred === 1
  };
}
function Se() {
  const r = N();
  c.handle(i.NOTE_CREATE, async (s, t) => {
    try {
      const e = w(), n = (/* @__PURE__ */ new Date()).toISOString();
      r.prepare(`
        INSERT INTO notes (id, title, content, type, folder_id, url, favicon, description, language, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        e,
        t.title || "无标题",
        t.content || "",
        t.type || "markdown",
        t.folderId || null,
        t.url || null,
        t.favicon || null,
        t.description || null,
        t.language || null,
        n,
        n
      );
      const o = r.prepare("SELECT * FROM notes WHERE id = ?").get(e);
      if (f.currentWorkspace) {
        const E = `${o.title}.md`, l = C.join(f.currentWorkspace, E);
        try {
          m.writeFileSync(l, o.content || "", "utf-8"), console.log("[Main] Created file:", l);
        } catch (d) {
          console.error("[Main] Create file failed:", d);
        }
      }
      return { success: !0, data: v(o) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.NOTE_UPDATE, async (s, t, e) => {
    try {
      const n = r.prepare("SELECT * FROM notes WHERE id = ?").get(t);
      if (!n)
        return { success: !1, error: "Note not found" };
      const a = [], o = [];
      e.title !== void 0 && (a.push("title = ?"), o.push(e.title)), e.content !== void 0 && (a.push("content = ?"), o.push(e.content)), e.folderId !== void 0 && (a.push("folder_id = ?"), o.push(e.folderId)), e.url !== void 0 && (a.push("url = ?"), o.push(e.url)), e.favicon !== void 0 && (a.push("favicon = ?"), o.push(e.favicon)), e.description !== void 0 && (a.push("description = ?"), o.push(e.description)), e.language !== void 0 && (a.push("language = ?"), o.push(e.language)), a.push("updated_at = ?"), o.push((/* @__PURE__ */ new Date()).toISOString()), o.push(t), r.prepare(`UPDATE notes SET ${a.join(", ")} WHERE id = ?`).run(...o);
      const l = r.prepare("SELECT * FROM notes WHERE id = ?").get(t);
      if (f.currentWorkspace && l) {
        const d = `${l.title}.md`, T = C.join(f.currentWorkspace, d);
        if (e.title !== void 0 && e.title !== n.title) {
          const u = C.join(f.currentWorkspace, `${n.title}.md`);
          try {
            m.existsSync(u) && (m.renameSync(u, T), console.log("[Main] Renamed file:", u, "->", T));
          } catch (S) {
            console.error("[Main] Rename failed:", S);
          }
        }
        if (e.content !== void 0)
          try {
            m.writeFileSync(T, e.content, "utf-8"), console.log("[Main] Saved file:", T);
          } catch (u) {
            console.error("[Main] Save failed:", u);
          }
      }
      return { success: !0, data: v(l) };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.NOTE_DELETE, async (s, t) => {
    try {
      const e = (/* @__PURE__ */ new Date()).toISOString();
      return r.prepare("UPDATE notes SET deleted_at = ? WHERE id = ?").run(e, t), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.NOTE_GET, async (s, t) => {
    try {
      const e = r.prepare("SELECT * FROM notes WHERE id = ?").get(t);
      return e ? { success: !0, data: v(e) } : { success: !1, error: "Note not found" };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.NOTE_LIST, async (s, t = {}) => {
    try {
      let e = "SELECT * FROM notes WHERE deleted_at IS NULL";
      const n = [];
      return t.type && (e += " AND type = ?", n.push(t.type)), t.folderId !== void 0 && (t.folderId === null ? e += " AND folder_id IS NULL" : (e += " AND folder_id = ?", n.push(t.folderId))), e += " ORDER BY is_starred DESC, updated_at DESC", { success: !0, data: r.prepare(e).all(...n).map(v) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.NOTE_SEARCH, async (s, t) => {
    try {
      if (!t || t.trim() === "")
        return { success: !0, data: [] };
      const e = `%${t}%`;
      return { success: !0, data: r.prepare(`
        SELECT * FROM notes
        WHERE (title LIKE ? OR content LIKE ?) AND deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 50
      `).all(e, e).map((o) => {
        let E = (o.content || "").slice(0, 150);
        if (o.content && o.content.toLowerCase().includes(t.toLowerCase())) {
          const d = o.content.toLowerCase().indexOf(t.toLowerCase()), T = Math.max(0, d - 40), u = Math.min(o.content.length, d + 80);
          E = (T > 0 ? "..." : "") + o.content.slice(T, u) + (u < o.content.length ? "..." : "");
        }
        const l = o.title.toLowerCase().includes(t.toLowerCase()) ? "标题" : "内容";
        return {
          note: v(o),
          matchField: l,
          contentSnippet: E,
          score: 0
        };
      }) };
    } catch (e) {
      return console.error("Search error:", e), { success: !1, error: String(e) };
    }
  }), c.handle(i.NOTE_RESTORE, async (s, t) => {
    try {
      return r.prepare("UPDATE notes SET deleted_at = NULL WHERE id = ?").run(t), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.NOTE_PERMANENT_DELETE, async (s, t) => {
    try {
      const e = r.prepare("SELECT * FROM notes WHERE id = ?").get(t);
      if (f.currentWorkspace && e) {
        const n = C.join(f.currentWorkspace, `${e.title}.md`);
        try {
          m.existsSync(n) && (m.unlinkSync(n), console.log("[Main] Permanently deleted file:", n));
        } catch (a) {
          console.error("[Main] Delete file failed:", a);
        }
      }
      return r.prepare("DELETE FROM notes WHERE id = ?").run(t), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.NOTE_TRASH_LIST, async () => {
    try {
      return { success: !0, data: r.prepare(
        "SELECT * FROM notes WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"
      ).all().map(v) };
    } catch (s) {
      return { success: !1, error: String(s) };
    }
  }), c.handle(i.NOTE_STAR, async (s, t) => {
    try {
      return r.prepare("UPDATE notes SET is_starred = 1 WHERE id = ?").run(t), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.NOTE_UNSTAR, async (s, t) => {
    try {
      return r.prepare("UPDATE notes SET is_starred = 0 WHERE id = ?").run(t), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  });
}
function x(r) {
  return {
    id: r.id,
    name: r.name,
    parentId: r.parent_id,
    sortOrder: r.sort_order
  };
}
function k(r, s) {
  const t = f.currentWorkspace;
  if (!t) return null;
  const e = [];
  let n = s;
  for (; n; ) {
    const a = r.prepare("SELECT id, name, parent_id FROM folders WHERE id = ?").get(n);
    if (!a) break;
    e.unshift(a.name), n = a.parent_id;
  }
  return _.join(t, ...e);
}
function fe() {
  const r = N();
  c.handle(i.FOLDER_CREATE, async (s, t) => {
    try {
      const e = w(), n = t.parentId ? r.prepare("SELECT COALESCE(MAX(sort_order), -1) as max_order FROM folders WHERE parent_id = ?").get(t.parentId) : r.prepare("SELECT COALESCE(MAX(sort_order), -1) as max_order FROM folders WHERE parent_id IS NULL").get(), a = ((n == null ? void 0 : n.max_order) ?? -1) + 1;
      r.prepare(`
        INSERT INTO folders (id, name, parent_id, sort_order)
        VALUES (?, ?, ?, ?)
      `).run(e, t.name || "新文件夹", t.parentId || null, a);
      const E = k(r, e);
      E && !g.existsSync(E) && g.mkdirSync(E, { recursive: !0 });
      const l = r.prepare("SELECT * FROM folders WHERE id = ?").get(e);
      return { success: !0, data: x(l) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.FOLDER_UPDATE, async (s, t, e) => {
    try {
      let n = null;
      e.name !== void 0 && (n = k(r, t));
      const a = [], o = [];
      if (e.name !== void 0 && (a.push("name = ?"), o.push(e.name)), e.parentId !== void 0 && (a.push("parent_id = ?"), o.push(e.parentId)), e.sortOrder !== void 0 && (a.push("sort_order = ?"), o.push(e.sortOrder)), a.length === 0) {
        const d = r.prepare("SELECT * FROM folders WHERE id = ?").get(t);
        return { success: !0, data: x(d) };
      }
      if (o.push(t), r.prepare(`UPDATE folders SET ${a.join(", ")} WHERE id = ?`).run(...o), n && e.name !== void 0) {
        const d = k(r, t);
        d && n !== d && g.existsSync(n) && g.renameSync(n, d);
      }
      const l = r.prepare("SELECT * FROM folders WHERE id = ?").get(t);
      return { success: !0, data: x(l) };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.FOLDER_DELETE, async (s, t) => {
    try {
      const e = k(r, t);
      return r.prepare("DELETE FROM folders WHERE id = ?").run(t), e && g.existsSync(e) && g.rmSync(e, { recursive: !0, force: !0 }), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.FOLDER_LIST, async () => {
    try {
      return { success: !0, data: r.prepare("SELECT * FROM folders ORDER BY sort_order").all().map(x) };
    } catch (s) {
      return { success: !1, error: String(s) };
    }
  });
}
function b(r) {
  return {
    id: r.id,
    name: r.name,
    color: r.color
  };
}
const J = [
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
function me() {
  const r = N();
  c.handle(i.TAG_CREATE, async (s, t) => {
    try {
      const e = w(), n = t.color || J[Math.floor(Math.random() * J.length)];
      r.prepare(`
        INSERT INTO tags (id, name, color)
        VALUES (?, ?, ?)
      `).run(e, t.name, n);
      const o = r.prepare("SELECT * FROM tags WHERE id = ?").get(e);
      return { success: !0, data: b(o) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.TAG_UPDATE, async (s, t, e) => {
    try {
      const n = [], a = [];
      if (e.name !== void 0 && (n.push("name = ?"), a.push(e.name)), e.color !== void 0 && (n.push("color = ?"), a.push(e.color)), n.length === 0) {
        const l = r.prepare("SELECT * FROM tags WHERE id = ?").get(t);
        return { success: !0, data: b(l) };
      }
      a.push(t), r.prepare(`UPDATE tags SET ${n.join(", ")} WHERE id = ?`).run(...a);
      const E = r.prepare("SELECT * FROM tags WHERE id = ?").get(t);
      return { success: !0, data: b(E) };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.TAG_DELETE, async (s, t) => {
    try {
      return r.prepare("DELETE FROM tags WHERE id = ?").run(t), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.TAG_LIST, async () => {
    try {
      return { success: !0, data: r.prepare("SELECT * FROM tags ORDER BY name").all().map(b) };
    } catch (s) {
      return { success: !1, error: String(s) };
    }
  }), c.handle(i.TAG_ADD_TO_NOTE, async (s, t, e) => {
    try {
      return r.prepare(`
        INSERT OR IGNORE INTO note_tags (note_id, tag_id)
        VALUES (?, ?)
      `).run(t, e), { success: !0 };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.TAG_REMOVE_FROM_NOTE, async (s, t, e) => {
    try {
      return r.prepare("DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?").run(t, e), { success: !0 };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  });
}
function ge() {
  const r = N();
  c.handle(i.LINK_CREATE, async (s, t, e) => {
    try {
      return r.prepare(`
        INSERT OR IGNORE INTO links (source_id, target_id)
        VALUES (?, ?)
      `).run(t, e), { success: !0 };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.LINK_DELETE, async (s, t, e) => {
    try {
      return r.prepare("DELETE FROM links WHERE source_id = ? AND target_id = ?").run(t, e), { success: !0 };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.LINK_GET_BY_NOTE, async (s, t) => {
    try {
      const e = r.prepare(`
        SELECT n.id, n.title, n.type
        FROM links l
        JOIN notes n ON n.id = l.target_id
        WHERE l.source_id = ?
      `).all(t), n = r.prepare(`
        SELECT n.id, n.title, n.type
        FROM links l
        JOIN notes n ON n.id = l.source_id
        WHERE l.target_id = ?
      `).all(t);
      return {
        success: !0,
        data: {
          outLinks: e.map((a) => ({ id: a.id, title: a.title, type: a.type })),
          inLinks: n.map((a) => ({ id: a.id, title: a.title, type: a.type }))
        }
      };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.LINK_GET_GRAPH, async () => {
    try {
      const s = r.prepare(`
        SELECT id, title, type FROM notes
      `).all(), e = r.prepare(`
        SELECT source_id, target_id FROM links
      `).all().map((n) => ({
        source: n.source_id,
        target: n.target_id
      }));
      return { success: !0, data: { nodes: s.map((n) => ({ id: n.id, label: n.title, type: n.type })), edges: e } };
    } catch (s) {
      return { success: !1, error: String(s) };
    }
  });
}
function Re() {
  const r = N();
  c.handle(i.SETTINGS_GET, async () => {
    try {
      const s = r.prepare("SELECT key, value FROM settings").all(), t = {};
      return s.forEach((e) => {
        try {
          t[e.key] = JSON.parse(e.value);
        } catch {
          t[e.key] = e.value;
        }
      }), { success: !0, data: t };
    } catch (s) {
      return { success: !1, error: String(s) };
    }
  }), c.handle(i.SETTINGS_SET, async (s, t) => {
    try {
      const e = r.prepare(`
        INSERT OR REPLACE INTO settings (key, value)
        VALUES (?, ?)
      `);
      return Object.entries(t).forEach(([n, a]) => {
        e.run(n, JSON.stringify(a));
      }), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  });
}
let M = null;
function ee() {
  const s = N().prepare("SELECT key, value FROM settings WHERE key LIKE ?").all("ai_%"), t = {};
  return s.forEach((e) => {
    try {
      t[e.key] = JSON.parse(e.value);
    } catch {
      t[e.key] = e.value;
    }
  }), {
    baseUrl: t.ai_base_url || "https://api.deepseek.com",
    apiKey: t.ai_api_key || "sk-376363b4a79e4bb5ae5f329706efc0f4",
    model: t.ai_model || "deepseek-chat"
  };
}
async function L(r, s) {
  const t = ee(), e = [];
  s && e.push({ role: "system", content: s }), e.push(...r);
  const n = JSON.stringify({
    model: t.model,
    messages: e,
    temperature: 0.7,
    max_tokens: 2048
  });
  return new Promise((a, o) => {
    const E = new URL(t.baseUrl.replace(/\/$/, "") + "/chat/completions"), l = E.protocol === "https:", T = (l ? W : Q).request({
      hostname: E.hostname,
      port: E.port || (l ? 443 : 80),
      path: E.pathname + E.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t.apiKey}`
      }
    }, (u) => {
      let S = "";
      u.on("data", (A) => {
        S += A.toString();
      }), u.on("end", () => {
        var A, y, I;
        try {
          const R = JSON.parse(S);
          if (R.error) {
            o(new Error(R.error.message || JSON.stringify(R.error)));
            return;
          }
          a(((I = (y = (A = R.choices) == null ? void 0 : A[0]) == null ? void 0 : y.message) == null ? void 0 : I.content) || "");
        } catch {
          o(new Error("AI 响应解析失败: " + S.slice(0, 200)));
        }
      });
    });
    M = T, T.on("error", (u) => o(new Error("AI 请求失败: " + u.message))), T.write(n), T.end();
  });
}
async function Ae(r, s, t, e, n) {
  const a = ee(), o = [];
  s && o.push({ role: "system", content: s }), o.push(...r);
  const E = JSON.stringify({
    model: a.model,
    messages: o,
    temperature: 0.7,
    max_tokens: 2048,
    stream: !0
  }), l = new URL(a.baseUrl.replace(/\/$/, "") + "/chat/completions"), d = l.protocol === "https:", u = (d ? W : Q).request({
    hostname: l.hostname,
    port: l.port || (d ? 443 : 80),
    path: l.pathname + l.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${a.apiKey}`
    }
  }, (S) => {
    let A = "";
    S.on("data", (y) => {
      var R, H, U;
      A += y.toString();
      const I = A.split(`
`);
      A = I.pop() || "";
      for (const se of I) {
        const G = se.trim();
        if (!G || !G.startsWith("data: ")) continue;
        const j = G.slice(6);
        if (j === "[DONE]") {
          e();
          return;
        }
        try {
          const V = (U = (H = (R = JSON.parse(j).choices) == null ? void 0 : R[0]) == null ? void 0 : H.delta) == null ? void 0 : U.content;
          V && t(V);
        } catch {
        }
      }
    }), S.on("end", () => e());
  });
  M = u, u.on("error", (S) => n("AI 请求失败: " + S.message)), u.write(E), u.end();
}
function Ne() {
  M && (M.destroy(), M = null);
}
const D = {
  summarize: "你是一个知识库助手。请用简洁的语言总结以下内容，提取核心要点。用中文回答。",
  suggestTags: "你是一个知识库助手。请根据以下内容建议 3-5 个合适的标签。只输出标签名，用逗号分隔，不要其他内容。用中文回答。",
  polish: "你是一个写作助手。请润色以下文字，使其更加通顺、专业，保持原意不变。直接输出润色后的内容，不要其他说明。",
  continue: "你是一个写作助手。请根据以下内容继续往下写，保持风格一致，自然地扩展内容。直接输出续写内容，不要重复已有内容。",
  translate: "你是一个翻译助手。请将以下内容翻译成{lang}。直接输出翻译结果，不要其他说明。",
  explain: "你是一个知识库助手。请用通俗易懂的语言解释以下内容。用中文回答。",
  searchEnhance: "你是一个搜索助手。用户想搜索以下内容，请帮忙扩展搜索关键词，生成 3-5 个相关的搜索词。只输出关键词，用逗号分隔。"
};
async function ye(r) {
  return L([{ role: "user", content: r }], D.summarize);
}
async function Ie(r) {
  return (await L([{ role: "user", content: r }], D.suggestTags)).split(/[,，、]/).map((t) => t.trim()).filter(Boolean);
}
async function Oe(r) {
  return L([{ role: "user", content: r }], D.polish);
}
async function Le(r) {
  return L([{ role: "user", content: r }], D.continue);
}
async function Ce(r, s) {
  const t = D.translate.replace("{lang}", s);
  return L([{ role: "user", content: r }], t);
}
async function De(r) {
  return L([{ role: "user", content: r }], D.explain);
}
async function ve(r) {
  return (await L([{ role: "user", content: r }], D.searchEnhance)).split(/[,，、]/).map((t) => t.trim()).filter(Boolean);
}
function Fe() {
  const s = N().prepare("SELECT key, value FROM settings WHERE key LIKE ?").all("search_%"), t = {};
  return s.forEach((e) => {
    try {
      t[e.key] = JSON.parse(e.value);
    } catch {
      t[e.key] = e.value;
    }
  }), {
    tavilyKey: t.search_tavily_key || "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",
    googleKey: t.search_google_key || "AIzaSyBVX6rTEuPciJ87n87fkY70Y_lZess2XXc",
    googleCx: t.search_google_cx || void 0,
    bochaKey: t.search_bocha_key || "sk-8d34ebe45906488499ed771af68d1a43",
    serperKey: t.search_serper_key || "1c70b54b855778cb90ea5d2e168b9bed16f6eb6f"
  };
}
function B(r, s) {
  return new Promise((t, e) => {
    const n = W.request(r, (a) => {
      let o = "";
      a.on("data", (E) => {
        o += E.toString();
      }), a.on("end", () => t(o));
    });
    n.on("error", (a) => e(new Error("请求失败: " + a.message))), s && n.write(s), n.end();
  });
}
function Me(r) {
  return new Promise((s, t) => {
    W.get(r, (e) => {
      let n = "";
      e.on("data", (a) => {
        n += a.toString();
      }), e.on("end", () => s(n));
    }).on("error", (e) => t(new Error("请求失败: " + e.message)));
  });
}
async function we(r, s) {
  const t = JSON.stringify({
    api_key: s,
    query: r,
    search_depth: "basic",
    max_results: 5
  }), e = await B({
    hostname: "api.tavily.com",
    path: "/search",
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  }, t), n = JSON.parse(e);
  if (n.error) throw new Error(n.error);
  return n.results.map((a) => ({
    title: a.title,
    url: a.url,
    snippet: a.content
  }));
}
async function He(r, s) {
  const t = JSON.stringify({
    q: r,
    num: 5
  }), e = await B({
    hostname: "google.serper.dev",
    path: "/search",
    method: "POST",
    headers: {
      "X-API-KEY": s,
      "Content-Type": "application/json"
    }
  }, t), n = JSON.parse(e);
  if (n.error) throw new Error(n.error);
  return n.organic.map((a) => ({
    title: a.title,
    url: a.link,
    snippet: a.snippet
  }));
}
async function Ue(r, s, t) {
  const e = `https://www.googleapis.com/customsearch/v1?key=${s}&cx=${t}&q=${encodeURIComponent(r)}&num=5`, n = await Me(e), a = JSON.parse(n);
  if (a.error) throw new Error(a.error.message || JSON.stringify(a.error));
  return (a.items || []).map((o) => ({
    title: o.title,
    url: o.link,
    snippet: o.snippet
  }));
}
async function Pe(r, s) {
  var a, o, E;
  const t = JSON.stringify({
    query: r,
    freshness: "noLimit",
    summary: !0,
    count: 5
  }), e = await B({
    hostname: "api.bochaai.com",
    path: "/v1/web-search",
    method: "POST",
    headers: {
      Authorization: `Bearer ${s}`,
      "Content-Type": "application/json"
    }
  }, t), n = JSON.parse(e);
  if (n.error) throw new Error(n.error);
  return ((E = (o = (a = n.data) == null ? void 0 : a.webPages) == null ? void 0 : o.value) == null ? void 0 : E.map((l) => ({
    title: l.name,
    url: l.url,
    snippet: l.snippet
  }))) || [];
}
async function xe(r) {
  const s = Fe(), t = [];
  if (t.push({ name: "Tavily", fn: () => we(r, s.tavilyKey) }), t.push({ name: "Serper", fn: () => He(r, s.serperKey) }), s.googleCx && t.push({ name: "Google", fn: () => Ue(r, s.googleKey, s.googleCx) }), t.push({ name: "Bocha", fn: () => Pe(r, s.bochaKey) }), t.length === 0)
    throw new Error("未配置搜索 API，请在设置中添加搜索 API Key");
  let e = null;
  for (const n of t)
    try {
      return await n.fn();
    } catch (a) {
      e = a instanceof Error ? a : new Error(String(a)), console.error(`[WebSearch] ${n.name} 搜索失败:`, e.message);
    }
  throw e || new Error("未配置搜索 API，请在设置中添加搜索 API Key");
}
function ke() {
  const r = N();
  r.exec(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `), r.exec(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    )
  `), c.handle(i.AI_CHAT, async (s, t, e) => {
    try {
      return { success: !0, data: await L(t, e) };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.AI_CHAT_STREAM, async (s, t, e) => {
    try {
      const n = K.fromWebContents(s.sender);
      return await Ae(
        t,
        e,
        (a) => {
          n && !n.isDestroyed() && n.webContents.send("ai:stream:chunk", a);
        },
        () => {
          n && !n.isDestroyed() && n.webContents.send("ai:stream:done");
        },
        (a) => {
          n && !n.isDestroyed() && n.webContents.send("ai:stream:error", a);
        }
      ), { success: !0 };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.AI_STOP, async () => (Ne(), { success: !0 })), c.handle(i.AI_SUMMARIZE, async (s, t) => {
    try {
      return { success: !0, data: await ye(t) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_SUGGEST_TAGS, async (s, t) => {
    try {
      return { success: !0, data: await Ie(t) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_POLISH, async (s, t) => {
    try {
      return { success: !0, data: await Oe(t) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_CONTINUE, async (s, t) => {
    try {
      return { success: !0, data: await Le(t) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_TRANSLATE, async (s, t, e) => {
    try {
      return { success: !0, data: await Ce(t, e) };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.AI_EXPLAIN, async (s, t) => {
    try {
      return { success: !0, data: await De(t) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_SEARCH_ENHANCE, async (s, t) => {
    try {
      return { success: !0, data: await ve(t) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_WEB_SEARCH, async (s, t) => {
    try {
      return { success: !0, data: await xe(t) };
    } catch (e) {
      return { success: !1, error: e.message || String(e) };
    }
  }), c.handle(i.AI_CHAT_HISTORY_LIST, async () => {
    try {
      return { success: !0, data: r.prepare("SELECT * FROM ai_conversations ORDER BY updated_at DESC").all() };
    } catch (s) {
      return { success: !1, error: String(s) };
    }
  }), c.handle(i.AI_CHAT_HISTORY_GET, async (s, t) => {
    try {
      return { success: !0, data: r.prepare("SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC").all(t) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_CHAT_HISTORY_SAVE, async (s, t, e, n) => {
    try {
      r.prepare(`
        INSERT INTO ai_conversations (id, title, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET title = ?, updated_at = CURRENT_TIMESTAMP
      `).run(t, e, e), r.prepare("DELETE FROM ai_messages WHERE conversation_id = ?").run(t);
      const a = r.prepare("INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)");
      for (const o of n)
        a.run(t, o.role, o.content);
      return { success: !0 };
    } catch (a) {
      return { success: !1, error: String(a) };
    }
  }), c.handle(i.AI_CHAT_HISTORY_DELETE, async (s, t) => {
    try {
      return r.prepare("DELETE FROM ai_conversations WHERE id = ?").run(t), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  });
}
function z(r) {
  return {
    id: r.id,
    noteId: r.note_id,
    filename: r.filename,
    storedName: r.stored_name,
    mimeType: r.mime_type,
    category: r.category,
    size: r.size,
    width: r.width,
    height: r.height,
    duration: r.duration,
    createdAt: r.created_at
  };
}
function be(r) {
  const s = f.currentWorkspace;
  if (!s) return null;
  const t = _.join(s, "_attachments", r);
  return g.existsSync(t) || g.mkdirSync(t, { recursive: !0 }), t;
}
function Xe(r) {
  return _.extname(r).toLowerCase() || ".bin";
}
function We(r) {
  return {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".webm": "audio/webm",
    ".flac": "audio/flac",
    ".aac": "audio/aac",
    ".m4a": "audio/mp4",
    ".mp4": "video/mp4",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".csv": "text/csv"
  }[r] || "application/octet-stream";
}
function Ge() {
  const r = N();
  c.handle(i.ATTACHMENT_UPLOAD, async (s, t) => {
    try {
      const { noteId: e, filename: n, buffer: a, mimeType: o, category: E, width: l, height: d, duration: T } = t, u = be(E);
      if (!u) return { success: !1, error: "No workspace set" };
      const S = w(), A = Xe(n), y = `${S}${A}`, I = _.join(u, y), R = Buffer.from(a);
      g.writeFileSync(I, R);
      const H = R.length;
      r.prepare(`
        INSERT INTO attachments (id, note_id, filename, stored_name, mime_type, category, size, width, height, duration)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(S, e, n, y, o, E, H, l || null, d || null, T || null);
      const U = `_attachments/${E}/${y}`;
      return {
        success: !0,
        data: {
          id: S,
          storedName: y,
          relativePath: U,
          absolutePath: I,
          url: `attachment://${I}`
        }
      };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.ATTACHMENT_DELETE, async (s, t) => {
    try {
      const e = r.prepare("SELECT * FROM attachments WHERE id = ?").get(t);
      if (!e) return { success: !1, error: "Attachment not found" };
      const n = f.currentWorkspace;
      if (n) {
        const a = _.join(n, "_attachments", e.category, e.stored_name);
        g.existsSync(a) && g.unlinkSync(a);
      }
      return r.prepare("DELETE FROM attachments WHERE id = ?").run(t), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.ATTACHMENT_GET, async (s, t) => {
    try {
      const e = r.prepare("SELECT * FROM attachments WHERE id = ?").get(t);
      return e ? { success: !0, data: z(e) } : { success: !1, error: "Not found" };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.ATTACHMENT_LIST, async (s, t, e) => {
    try {
      let n;
      return e ? n = r.prepare("SELECT * FROM attachments WHERE note_id = ? AND category = ? ORDER BY created_at DESC").all(t, e) : n = r.prepare("SELECT * FROM attachments WHERE note_id = ? ORDER BY created_at DESC").all(t), { success: !0, data: n.map(z) };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.ATTACHMENT_GET_PATH, async (s, t) => {
    try {
      const e = r.prepare("SELECT * FROM attachments WHERE id = ?").get(t);
      if (!e) return { success: !1, error: "Not found" };
      const n = f.currentWorkspace;
      if (!n) return { success: !1, error: "No workspace" };
      const a = _.join(n, "_attachments", e.category, e.stored_name);
      return { success: !0, data: { absolutePath: a, url: `attachment://${a}` } };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.ATTACHMENT_OPEN, async (s, t) => {
    try {
      const e = r.prepare("SELECT * FROM attachments WHERE id = ?").get(t);
      if (!e) return { success: !1, error: "Not found" };
      const n = f.currentWorkspace;
      if (!n) return { success: !1, error: "No workspace" };
      const a = _.join(n, "_attachments", e.category, e.stored_name);
      return await q.openPath(a), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.ATTACHMENT_PICK_FILE, async (s, t) => {
    try {
      const e = [];
      (t == null ? void 0 : t.category) === "image" ? e.push({ name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"] }) : (t == null ? void 0 : t.category) === "audio" ? e.push({ name: "Audio", extensions: ["mp3", "wav", "ogg", "webm", "flac", "aac", "m4a"] }) : (t == null ? void 0 : t.category) === "video" ? e.push({ name: "Video", extensions: ["mp4", "webm", "avi", "mov", "mkv"] }) : (t == null ? void 0 : t.category) === "document" && e.push({ name: "Documents", extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"] }), e.push({ name: "All Files", extensions: ["*"] });
      const n = ["openFile"];
      t != null && t.multiple && n.push("multiSelections");
      const a = await Z.showOpenDialog({
        properties: n,
        filters: e
      });
      return a.canceled || a.filePaths.length === 0 ? { success: !0, data: [] } : { success: !0, data: a.filePaths.map((E) => {
        const l = g.readFileSync(E), d = _.basename(E), T = _.extname(E).toLowerCase(), u = We(T);
        return {
          filename: d,
          buffer: l.buffer,
          mimeType: u,
          size: l.length
        };
      }) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  });
}
function Ye() {
  c.handle("dialog:openDirectory", async () => {
    const r = await Z.showOpenDialog({
      properties: ["openDirectory", "createDirectory"]
    });
    return r.canceled ? null : r.filePaths[0];
  }), c.handle("workspace:set", async (r, s) => {
    console.log("[Main] Setting workspace:", s), f.currentWorkspace = s;
    try {
      if (!m.existsSync(s)) return !1;
      const t = N(), n = m.readdirSync(s).filter((o) => o.endsWith(".md"));
      console.log(`[Main] Found ${n.length} markdown files to sync`);
      const a = (/* @__PURE__ */ new Date()).toISOString();
      for (const o of n) {
        const E = C.basename(o, ".md"), l = m.readFileSync(C.join(s, o), "utf-8");
        if (!t.prepare("SELECT id FROM notes WHERE title = ?").get(E)) {
          const T = w();
          t.prepare(`
            INSERT INTO notes (id, title, content, type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(T, E, l, "markdown", a, a), console.log(`[Main] Imported note: ${E}`);
        }
      }
      return !0;
    } catch (t) {
      return console.error("[Main] Sync failed:", t), !1;
    }
  }), c.handle(i.SYSTEM_REVEAL, async (r, s) => {
    try {
      return m.existsSync(s) ? (q.showItemInFolder(s), !0) : !1;
    } catch (t) {
      return console.error("[Main] Reveal failed:", t), !1;
    }
  });
}
function Ke() {
  Se(), fe(), me(), ge(), Re(), ke(), Ge(), Ye();
}
const te = _.dirname(oe(import.meta.url));
process.env.APP_ROOT = _.join(te, "..");
const Y = process.env.VITE_DEV_SERVER_URL, et = _.join(process.env.APP_ROOT, "dist-electron"), re = _.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Y ? _.join(process.env.APP_ROOT, "public") : re;
let O;
function ne() {
  O = new K({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 600,
    icon: _.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: _.join(te, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), O.webContents.on("did-finish-load", () => {
    O == null || O.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), Y ? O.loadURL(Y) : O.loadFile(_.join(re, "index.html"));
}
F.on("window-all-closed", () => {
  process.platform !== "darwin" && (F.quit(), O = null);
});
F.on("activate", () => {
  K.getAllWindows().length === 0 && ne();
});
F.on("before-quit", () => {
  Te();
});
F.whenReady().then(() => {
  ae.registerFileProtocol("attachment", (r, s) => {
    const t = decodeURIComponent(r.url.replace("attachment://", ""));
    s({ path: t });
  }), de(), Ke(), ne();
});
export {
  et as MAIN_DIST,
  re as RENDERER_DIST,
  Y as VITE_DEV_SERVER_URL
};
//# sourceMappingURL=main.js.map
