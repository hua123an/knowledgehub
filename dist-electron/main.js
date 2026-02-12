import { app as C, ipcMain as c, BrowserWindow as x, dialog as te, shell as re } from "electron";
import { fileURLToPath as ne } from "node:url";
import I from "node:path";
import * as L from "path";
import * as S from "fs";
import { createRequire as se } from "module";
import { randomFillSync as ae, randomUUID as oe } from "node:crypto";
import y from "node:fs";
import $ from "https";
import J from "http";
const ce = se(import.meta.url), ie = ce("better-sqlite3");
let p = null;
function N() {
  if (!p)
    throw new Error("Database not initialized");
  return p;
}
function Ee() {
  const t = C.getPath("userData"), s = L.join(t, "knowledge.db");
  S.existsSync(t) || S.mkdirSync(t, { recursive: !0 }), p = new ie(s), p.pragma("foreign_keys = ON"), p.exec(`
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
  `);
  try {
    p.exec(`
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
    p.exec(`
      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, title, content) VALUES (NEW.rowid, NEW.title, NEW.content);
      END;
    `), p.exec(`
      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', OLD.rowid, OLD.title, OLD.content);
        INSERT INTO notes_fts(rowid, title, content) VALUES (NEW.rowid, NEW.title, NEW.content);
      END;
    `), p.exec(`
      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content) VALUES('delete', OLD.rowid, OLD.title, OLD.content);
      END;
    `);
  } catch {
  }
  try {
    p.exec(`
      CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
      CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
      CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
      CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
      CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id);
      CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);
    `);
  } catch {
  }
  return p;
}
function le() {
  p && (p.close(), p = null);
}
const T = [];
for (let t = 0; t < 256; ++t)
  T.push((t + 256).toString(16).slice(1));
function ue(t, s = 0) {
  return (T[t[s + 0]] + T[t[s + 1]] + T[t[s + 2]] + T[t[s + 3]] + "-" + T[t[s + 4]] + T[t[s + 5]] + "-" + T[t[s + 6]] + T[t[s + 7]] + "-" + T[t[s + 8]] + T[t[s + 9]] + "-" + T[t[s + 10]] + T[t[s + 11]] + T[t[s + 12]] + T[t[s + 13]] + T[t[s + 14]] + T[t[s + 15]]).toLowerCase();
}
const k = new Uint8Array(256);
let U = k.length;
function de() {
  return U > k.length - 16 && (ae(k), U = 0), k.slice(U, U += 16);
}
const V = { randomUUID: oe };
function Te(t, s, r) {
  var n;
  t = t || {};
  const e = t.random ?? ((n = t.rng) == null ? void 0 : n.call(t)) ?? de();
  if (e.length < 16)
    throw new Error("Random bytes length must be >= 16");
  return e[6] = e[6] & 15 | 64, e[8] = e[8] & 63 | 128, ue(e);
}
function G(t, s, r) {
  return V.randomUUID && !t ? V.randomUUID() : Te(t);
}
const i = {
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
  AI_CHAT_HISTORY_DELETE: "ai:chatHistoryDelete",
  // 系统
  SYSTEM_REVEAL: "system:reveal"
}, f = {
  currentWorkspace: null
};
function F(t) {
  return {
    id: t.id,
    title: t.title,
    content: t.content,
    type: t.type,
    folderId: t.folder_id,
    url: t.url || void 0,
    favicon: t.favicon || void 0,
    description: t.description || void 0,
    language: t.language || void 0,
    createdAt: t.created_at,
    updatedAt: t.updated_at
  };
}
function _e() {
  const t = N();
  c.handle(i.NOTE_CREATE, async (s, r) => {
    try {
      const e = G(), n = (/* @__PURE__ */ new Date()).toISOString();
      t.prepare(`
        INSERT INTO notes (id, title, content, type, folder_id, url, favicon, description, language, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        e,
        r.title || "无标题",
        r.content || "",
        r.type || "markdown",
        r.folderId || null,
        r.url || null,
        r.favicon || null,
        r.description || null,
        r.language || null,
        n,
        n
      );
      const o = t.prepare("SELECT * FROM notes WHERE id = ?").get(e);
      if (f.currentWorkspace) {
        const l = `${o.title}.md`, E = L.join(f.currentWorkspace, l);
        try {
          S.writeFileSync(E, o.content || "", "utf-8"), console.log("[Main] Created file:", E);
        } catch (d) {
          console.error("[Main] Create file failed:", d);
        }
      }
      return { success: !0, data: F(o) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.NOTE_UPDATE, async (s, r, e) => {
    try {
      const n = t.prepare("SELECT * FROM notes WHERE id = ?").get(r);
      if (!n)
        return { success: !1, error: "Note not found" };
      const a = [], o = [];
      e.title !== void 0 && (a.push("title = ?"), o.push(e.title)), e.content !== void 0 && (a.push("content = ?"), o.push(e.content)), e.folderId !== void 0 && (a.push("folder_id = ?"), o.push(e.folderId)), e.url !== void 0 && (a.push("url = ?"), o.push(e.url)), e.favicon !== void 0 && (a.push("favicon = ?"), o.push(e.favicon)), e.description !== void 0 && (a.push("description = ?"), o.push(e.description)), e.language !== void 0 && (a.push("language = ?"), o.push(e.language)), a.push("updated_at = ?"), o.push((/* @__PURE__ */ new Date()).toISOString()), o.push(r), t.prepare(`UPDATE notes SET ${a.join(", ")} WHERE id = ?`).run(...o);
      const E = t.prepare("SELECT * FROM notes WHERE id = ?").get(r);
      if (f.currentWorkspace && E) {
        const d = `${E.title}.md`, _ = L.join(f.currentWorkspace, d);
        if (e.title !== void 0 && e.title !== n.title) {
          const u = L.join(f.currentWorkspace, `${n.title}.md`);
          try {
            S.existsSync(u) && (S.renameSync(u, _), console.log("[Main] Renamed file:", u, "->", _));
          } catch (R) {
            console.error("[Main] Rename failed:", R);
          }
        }
        if (e.content !== void 0)
          try {
            S.writeFileSync(_, e.content, "utf-8"), console.log("[Main] Saved file:", _);
          } catch (u) {
            console.error("[Main] Save failed:", u);
          }
      }
      return { success: !0, data: F(E) };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.NOTE_DELETE, async (s, r) => {
    try {
      const e = t.prepare("SELECT * FROM notes WHERE id = ?").get(r);
      if (f.currentWorkspace && e) {
        const n = L.join(f.currentWorkspace, `${e.title}.md`);
        try {
          S.existsSync(n) && (S.unlinkSync(n), console.log("[Main] Deleted file:", n));
        } catch (a) {
          console.error("[Main] Delete file failed:", a);
        }
      }
      return t.prepare("DELETE FROM notes WHERE id = ?").run(r), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.NOTE_GET, async (s, r) => {
    try {
      const e = t.prepare("SELECT * FROM notes WHERE id = ?").get(r);
      return e ? { success: !0, data: F(e) } : { success: !1, error: "Note not found" };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.NOTE_LIST, async (s, r = {}) => {
    try {
      let e = "SELECT * FROM notes WHERE 1=1";
      const n = [];
      return r.type && (e += " AND type = ?", n.push(r.type)), r.folderId !== void 0 && (r.folderId === null ? e += " AND folder_id IS NULL" : (e += " AND folder_id = ?", n.push(r.folderId))), e += " ORDER BY updated_at DESC", { success: !0, data: t.prepare(e).all(...n).map(F) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.NOTE_SEARCH, async (s, r) => {
    try {
      if (!r || r.trim() === "")
        return { success: !0, data: [] };
      const e = `%${r}%`;
      return { success: !0, data: t.prepare(`
        SELECT * FROM notes 
        WHERE title LIKE ? OR content LIKE ?
        ORDER BY updated_at DESC
        LIMIT 50
      `).all(e, e).map((o) => {
        let l = (o.content || "").slice(0, 150);
        if (o.content && o.content.toLowerCase().includes(r.toLowerCase())) {
          const d = o.content.toLowerCase().indexOf(r.toLowerCase()), _ = Math.max(0, d - 40), u = Math.min(o.content.length, d + 80);
          l = (_ > 0 ? "..." : "") + o.content.slice(_, u) + (u < o.content.length ? "..." : "");
        }
        const E = o.title.toLowerCase().includes(r.toLowerCase()) ? "标题" : "内容";
        return {
          note: F(o),
          matchField: E,
          contentSnippet: l,
          score: 0
        };
      }) };
    } catch (e) {
      return console.error("Search error:", e), { success: !1, error: String(e) };
    }
  });
}
function H(t) {
  return {
    id: t.id,
    name: t.name,
    parentId: t.parent_id,
    sortOrder: t.sort_order
  };
}
function w(t, s) {
  const r = f.currentWorkspace;
  if (!r) return null;
  const e = [];
  let n = s;
  for (; n; ) {
    const a = t.prepare("SELECT id, name, parent_id FROM folders WHERE id = ?").get(n);
    if (!a) break;
    e.unshift(a.name), n = a.parent_id;
  }
  return I.join(r, ...e);
}
function pe() {
  const t = N();
  c.handle(i.FOLDER_CREATE, async (s, r) => {
    try {
      const e = G(), n = r.parentId ? t.prepare("SELECT COALESCE(MAX(sort_order), -1) as max_order FROM folders WHERE parent_id = ?").get(r.parentId) : t.prepare("SELECT COALESCE(MAX(sort_order), -1) as max_order FROM folders WHERE parent_id IS NULL").get(), a = ((n == null ? void 0 : n.max_order) ?? -1) + 1;
      t.prepare(`
        INSERT INTO folders (id, name, parent_id, sort_order)
        VALUES (?, ?, ?, ?)
      `).run(e, r.name || "新文件夹", r.parentId || null, a);
      const l = w(t, e);
      l && !y.existsSync(l) && y.mkdirSync(l, { recursive: !0 });
      const E = t.prepare("SELECT * FROM folders WHERE id = ?").get(e);
      return { success: !0, data: H(E) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.FOLDER_UPDATE, async (s, r, e) => {
    try {
      let n = null;
      e.name !== void 0 && (n = w(t, r));
      const a = [], o = [];
      if (e.name !== void 0 && (a.push("name = ?"), o.push(e.name)), e.parentId !== void 0 && (a.push("parent_id = ?"), o.push(e.parentId)), e.sortOrder !== void 0 && (a.push("sort_order = ?"), o.push(e.sortOrder)), a.length === 0) {
        const d = t.prepare("SELECT * FROM folders WHERE id = ?").get(r);
        return { success: !0, data: H(d) };
      }
      if (o.push(r), t.prepare(`UPDATE folders SET ${a.join(", ")} WHERE id = ?`).run(...o), n && e.name !== void 0) {
        const d = w(t, r);
        d && n !== d && y.existsSync(n) && y.renameSync(n, d);
      }
      const E = t.prepare("SELECT * FROM folders WHERE id = ?").get(r);
      return { success: !0, data: H(E) };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.FOLDER_DELETE, async (s, r) => {
    try {
      const e = w(t, r);
      return t.prepare("DELETE FROM folders WHERE id = ?").run(r), e && y.existsSync(e) && y.rmSync(e, { recursive: !0, force: !0 }), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.FOLDER_LIST, async () => {
    try {
      return { success: !0, data: t.prepare("SELECT * FROM folders ORDER BY sort_order").all().map(H) };
    } catch (s) {
      return { success: !1, error: String(s) };
    }
  });
}
function P(t) {
  return {
    id: t.id,
    name: t.name,
    color: t.color
  };
}
const j = [
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
function Se() {
  const t = N();
  c.handle(i.TAG_CREATE, async (s, r) => {
    try {
      const e = G(), n = r.color || j[Math.floor(Math.random() * j.length)];
      t.prepare(`
        INSERT INTO tags (id, name, color)
        VALUES (?, ?, ?)
      `).run(e, r.name, n);
      const o = t.prepare("SELECT * FROM tags WHERE id = ?").get(e);
      return { success: !0, data: P(o) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.TAG_UPDATE, async (s, r, e) => {
    try {
      const n = [], a = [];
      if (e.name !== void 0 && (n.push("name = ?"), a.push(e.name)), e.color !== void 0 && (n.push("color = ?"), a.push(e.color)), n.length === 0) {
        const E = t.prepare("SELECT * FROM tags WHERE id = ?").get(r);
        return { success: !0, data: P(E) };
      }
      a.push(r), t.prepare(`UPDATE tags SET ${n.join(", ")} WHERE id = ?`).run(...a);
      const l = t.prepare("SELECT * FROM tags WHERE id = ?").get(r);
      return { success: !0, data: P(l) };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.TAG_DELETE, async (s, r) => {
    try {
      return t.prepare("DELETE FROM tags WHERE id = ?").run(r), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.TAG_LIST, async () => {
    try {
      return { success: !0, data: t.prepare("SELECT * FROM tags ORDER BY name").all().map(P) };
    } catch (s) {
      return { success: !1, error: String(s) };
    }
  }), c.handle(i.TAG_ADD_TO_NOTE, async (s, r, e) => {
    try {
      return t.prepare(`
        INSERT OR IGNORE INTO note_tags (note_id, tag_id)
        VALUES (?, ?)
      `).run(r, e), { success: !0 };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.TAG_REMOVE_FROM_NOTE, async (s, r, e) => {
    try {
      return t.prepare("DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?").run(r, e), { success: !0 };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  });
}
function Re() {
  const t = N();
  c.handle(i.LINK_CREATE, async (s, r, e) => {
    try {
      return t.prepare(`
        INSERT OR IGNORE INTO links (source_id, target_id)
        VALUES (?, ?)
      `).run(r, e), { success: !0 };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.LINK_DELETE, async (s, r, e) => {
    try {
      return t.prepare("DELETE FROM links WHERE source_id = ? AND target_id = ?").run(r, e), { success: !0 };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.LINK_GET_BY_NOTE, async (s, r) => {
    try {
      const e = t.prepare(`
        SELECT n.id, n.title, n.type
        FROM links l
        JOIN notes n ON n.id = l.target_id
        WHERE l.source_id = ?
      `).all(r), n = t.prepare(`
        SELECT n.id, n.title, n.type
        FROM links l
        JOIN notes n ON n.id = l.source_id
        WHERE l.target_id = ?
      `).all(r);
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
      const s = t.prepare(`
        SELECT id, title, type FROM notes
      `).all(), e = t.prepare(`
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
function fe() {
  const t = N();
  c.handle(i.SETTINGS_GET, async () => {
    try {
      const s = t.prepare("SELECT key, value FROM settings").all(), r = {};
      return s.forEach((e) => {
        try {
          r[e.key] = JSON.parse(e.value);
        } catch {
          r[e.key] = e.value;
        }
      }), { success: !0, data: r };
    } catch (s) {
      return { success: !1, error: String(s) };
    }
  }), c.handle(i.SETTINGS_SET, async (s, r) => {
    try {
      const e = t.prepare(`
        INSERT OR REPLACE INTO settings (key, value)
        VALUES (?, ?)
      `);
      return Object.entries(r).forEach(([n, a]) => {
        e.run(n, JSON.stringify(a));
      }), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  });
}
let v = null;
function z() {
  const s = N().prepare("SELECT key, value FROM settings WHERE key LIKE ?").all("ai_%"), r = {};
  return s.forEach((e) => {
    try {
      r[e.key] = JSON.parse(e.value);
    } catch {
      r[e.key] = e.value;
    }
  }), {
    baseUrl: r.ai_base_url || "https://api.deepseek.com",
    apiKey: r.ai_api_key || "sk-376363b4a79e4bb5ae5f329706efc0f4",
    model: r.ai_model || "deepseek-chat"
  };
}
async function O(t, s) {
  const r = z(), e = [];
  s && e.push({ role: "system", content: s }), e.push(...t);
  const n = JSON.stringify({
    model: r.model,
    messages: e,
    temperature: 0.7,
    max_tokens: 2048
  });
  return new Promise((a, o) => {
    const l = new URL(r.baseUrl.replace(/\/$/, "") + "/chat/completions"), E = l.protocol === "https:", _ = (E ? $ : J).request({
      hostname: l.hostname,
      port: l.port || (E ? 443 : 80),
      path: l.pathname + l.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${r.apiKey}`
      }
    }, (u) => {
      let R = "";
      u.on("data", (h) => {
        R += h.toString();
      }), u.on("end", () => {
        var h, M, D;
        try {
          const g = JSON.parse(R);
          if (g.error) {
            o(new Error(g.error.message || JSON.stringify(g.error)));
            return;
          }
          a(((D = (M = (h = g.choices) == null ? void 0 : h[0]) == null ? void 0 : M.message) == null ? void 0 : D.content) || "");
        } catch {
          o(new Error("AI 响应解析失败: " + R.slice(0, 200)));
        }
      });
    });
    v = _, _.on("error", (u) => o(new Error("AI 请求失败: " + u.message))), _.write(n), _.end();
  });
}
async function Ie(t, s, r, e, n) {
  const a = z(), o = [];
  s && o.push({ role: "system", content: s }), o.push(...t);
  const l = JSON.stringify({
    model: a.model,
    messages: o,
    temperature: 0.7,
    max_tokens: 2048,
    stream: !0
  }), E = new URL(a.baseUrl.replace(/\/$/, "") + "/chat/completions"), d = E.protocol === "https:", u = (d ? $ : J).request({
    hostname: E.hostname,
    port: E.port || (d ? 443 : 80),
    path: E.pathname + E.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${a.apiKey}`
    }
  }, (R) => {
    let h = "";
    R.on("data", (M) => {
      var g, b, Y;
      h += M.toString();
      const D = h.split(`
`);
      h = D.pop() || "";
      for (const ee of D) {
        const X = ee.trim();
        if (!X || !X.startsWith("data: ")) continue;
        const B = X.slice(6);
        if (B === "[DONE]") {
          e();
          return;
        }
        try {
          const K = (Y = (b = (g = JSON.parse(B).choices) == null ? void 0 : g[0]) == null ? void 0 : b.delta) == null ? void 0 : Y.content;
          K && r(K);
        } catch {
        }
      }
    }), R.on("end", () => e());
  });
  v = u, u.on("error", (R) => n("AI 请求失败: " + R.message)), u.write(l), u.end();
}
function he() {
  v && (v.destroy(), v = null);
}
const m = {
  summarize: "你是一个知识库助手。请用简洁的语言总结以下内容，提取核心要点。用中文回答。",
  suggestTags: "你是一个知识库助手。请根据以下内容建议 3-5 个合适的标签。只输出标签名，用逗号分隔，不要其他内容。用中文回答。",
  polish: "你是一个写作助手。请润色以下文字，使其更加通顺、专业，保持原意不变。直接输出润色后的内容，不要其他说明。",
  continue: "你是一个写作助手。请根据以下内容继续往下写，保持风格一致，自然地扩展内容。直接输出续写内容，不要重复已有内容。",
  translate: "你是一个翻译助手。请将以下内容翻译成{lang}。直接输出翻译结果，不要其他说明。",
  explain: "你是一个知识库助手。请用通俗易懂的语言解释以下内容。用中文回答。",
  searchEnhance: "你是一个搜索助手。用户想搜索以下内容，请帮忙扩展搜索关键词，生成 3-5 个相关的搜索词。只输出关键词，用逗号分隔。"
};
async function ge(t) {
  return O([{ role: "user", content: t }], m.summarize);
}
async function Ae(t) {
  return (await O([{ role: "user", content: t }], m.suggestTags)).split(/[,，、]/).map((r) => r.trim()).filter(Boolean);
}
async function Ne(t) {
  return O([{ role: "user", content: t }], m.polish);
}
async function Oe(t) {
  return O([{ role: "user", content: t }], m.continue);
}
async function Le(t, s) {
  const r = m.translate.replace("{lang}", s);
  return O([{ role: "user", content: t }], r);
}
async function me(t) {
  return O([{ role: "user", content: t }], m.explain);
}
async function ye(t) {
  return (await O([{ role: "user", content: t }], m.searchEnhance)).split(/[,，、]/).map((r) => r.trim()).filter(Boolean);
}
function Ce() {
  const t = N();
  t.exec(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `), t.exec(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    )
  `), c.handle(i.AI_CHAT, async (s, r, e) => {
    try {
      return { success: !0, data: await O(r, e) };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.AI_CHAT_STREAM, async (s, r, e) => {
    try {
      const n = x.fromWebContents(s.sender);
      return await Ie(
        r,
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
  }), c.handle(i.AI_STOP, async () => (he(), { success: !0 })), c.handle(i.AI_SUMMARIZE, async (s, r) => {
    try {
      return { success: !0, data: await ge(r) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_SUGGEST_TAGS, async (s, r) => {
    try {
      return { success: !0, data: await Ae(r) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_POLISH, async (s, r) => {
    try {
      return { success: !0, data: await Ne(r) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_CONTINUE, async (s, r) => {
    try {
      return { success: !0, data: await Oe(r) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_TRANSLATE, async (s, r, e) => {
    try {
      return { success: !0, data: await Le(r, e) };
    } catch (n) {
      return { success: !1, error: String(n) };
    }
  }), c.handle(i.AI_EXPLAIN, async (s, r) => {
    try {
      return { success: !0, data: await me(r) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_SEARCH_ENHANCE, async (s, r) => {
    try {
      return { success: !0, data: await ye(r) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_CHAT_HISTORY_LIST, async () => {
    try {
      return { success: !0, data: t.prepare("SELECT * FROM ai_conversations ORDER BY updated_at DESC").all() };
    } catch (s) {
      return { success: !1, error: String(s) };
    }
  }), c.handle(i.AI_CHAT_HISTORY_GET, async (s, r) => {
    try {
      return { success: !0, data: t.prepare("SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC").all(r) };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  }), c.handle(i.AI_CHAT_HISTORY_SAVE, async (s, r, e, n) => {
    try {
      t.prepare(`
        INSERT INTO ai_conversations (id, title, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET title = ?, updated_at = CURRENT_TIMESTAMP
      `).run(r, e, e), t.prepare("DELETE FROM ai_messages WHERE conversation_id = ?").run(r);
      const a = t.prepare("INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)");
      for (const o of n)
        a.run(r, o.role, o.content);
      return { success: !0 };
    } catch (a) {
      return { success: !1, error: String(a) };
    }
  }), c.handle(i.AI_CHAT_HISTORY_DELETE, async (s, r) => {
    try {
      return t.prepare("DELETE FROM ai_conversations WHERE id = ?").run(r), { success: !0 };
    } catch (e) {
      return { success: !1, error: String(e) };
    }
  });
}
function De() {
  c.handle("dialog:openDirectory", async () => {
    const t = await te.showOpenDialog({
      properties: ["openDirectory", "createDirectory"]
    });
    return t.canceled ? null : t.filePaths[0];
  }), c.handle("workspace:set", async (t, s) => {
    console.log("[Main] Setting workspace:", s), f.currentWorkspace = s;
    try {
      if (!S.existsSync(s)) return !1;
      const r = N(), n = S.readdirSync(s).filter((o) => o.endsWith(".md"));
      console.log(`[Main] Found ${n.length} markdown files to sync`);
      const a = (/* @__PURE__ */ new Date()).toISOString();
      for (const o of n) {
        const l = L.basename(o, ".md"), E = S.readFileSync(L.join(s, o), "utf-8");
        if (!r.prepare("SELECT id FROM notes WHERE title = ?").get(l)) {
          const _ = G();
          r.prepare(`
            INSERT INTO notes (id, title, content, type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(_, l, E, "markdown", a, a), console.log(`[Main] Imported note: ${l}`);
        }
      }
      return !0;
    } catch (r) {
      return console.error("[Main] Sync failed:", r), !1;
    }
  }), c.handle(i.SYSTEM_REVEAL, async (t, s) => {
    try {
      return S.existsSync(s) ? (re.showItemInFolder(s), !0) : !1;
    } catch (r) {
      return console.error("[Main] Reveal failed:", r), !1;
    }
  });
}
function Fe() {
  _e(), pe(), Se(), Re(), fe(), Ce(), De();
}
const q = I.dirname(ne(import.meta.url));
process.env.APP_ROOT = I.join(q, "..");
const W = process.env.VITE_DEV_SERVER_URL, We = I.join(process.env.APP_ROOT, "dist-electron"), Z = I.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = W ? I.join(process.env.APP_ROOT, "public") : Z;
let A;
function Q() {
  A = new x({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 600,
    icon: I.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: I.join(q, "preload.mjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), A.webContents.on("did-finish-load", () => {
    A == null || A.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), W ? A.loadURL(W) : A.loadFile(I.join(Z, "index.html"));
}
C.on("window-all-closed", () => {
  process.platform !== "darwin" && (C.quit(), A = null);
});
C.on("activate", () => {
  x.getAllWindows().length === 0 && Q();
});
C.on("before-quit", () => {
  le();
});
C.whenReady().then(() => {
  Ee(), Fe(), Q();
});
export {
  We as MAIN_DIST,
  Z as RENDERER_DIST,
  W as VITE_DEV_SERVER_URL
};
//# sourceMappingURL=main.js.map
