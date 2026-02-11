"use strict";
const electron = require("electron");
const api = {
  // 笔记操作
  noteCreate: (note) => electron.ipcRenderer.invoke("note:create", note),
  noteUpdate: (id, updates) => electron.ipcRenderer.invoke("note:update", id, updates),
  noteDelete: (id) => electron.ipcRenderer.invoke("note:delete", id),
  noteGet: (id) => electron.ipcRenderer.invoke("note:get", id),
  noteList: (filters) => electron.ipcRenderer.invoke("note:list", filters),
  noteSearch: (query) => electron.ipcRenderer.invoke("note:search", query),
  // 文件夹操作
  folderCreate: (folder) => electron.ipcRenderer.invoke("folder:create", folder),
  folderUpdate: (id, updates) => electron.ipcRenderer.invoke("folder:update", id, updates),
  folderDelete: (id) => electron.ipcRenderer.invoke("folder:delete", id),
  folderList: () => electron.ipcRenderer.invoke("folder:list"),
  // 系统/文件操作
  openDirectory: () => electron.ipcRenderer.invoke("dialog:openDirectory"),
  setWorkspace: (path) => electron.ipcRenderer.invoke("workspace:set", path),
  revealInExplorer: (path) => electron.ipcRenderer.invoke("system:reveal", path),
  // 标签操作
  tagCreate: (tag) => electron.ipcRenderer.invoke("tag:create", tag),
  tagUpdate: (id, updates) => electron.ipcRenderer.invoke("tag:update", id, updates),
  tagDelete: (id) => electron.ipcRenderer.invoke("tag:delete", id),
  tagList: () => electron.ipcRenderer.invoke("tag:list"),
  tagAddToNote: (noteId, tagId) => electron.ipcRenderer.invoke("tag:addToNote", noteId, tagId),
  tagRemoveFromNote: (noteId, tagId) => electron.ipcRenderer.invoke("tag:removeFromNote", noteId, tagId),
  // 链接操作
  linkCreate: (sourceId, targetId) => electron.ipcRenderer.invoke("link:create", sourceId, targetId),
  linkDelete: (sourceId, targetId) => electron.ipcRenderer.invoke("link:delete", sourceId, targetId),
  linkGetByNote: (noteId) => electron.ipcRenderer.invoke("link:getByNote", noteId),
  linkGetGraph: () => electron.ipcRenderer.invoke("link:getGraph"),
  // 设置操作
  settingsGet: () => electron.ipcRenderer.invoke("settings:get"),
  settingsSet: (settings) => electron.ipcRenderer.invoke("settings:set", settings),
  // AI 操作
  aiChat: (messages, systemPrompt) => electron.ipcRenderer.invoke("ai:chat", messages, systemPrompt),
  aiChatStream: (messages, systemPrompt) => electron.ipcRenderer.invoke("ai:chatStream", messages, systemPrompt),
  aiStop: () => electron.ipcRenderer.invoke("ai:stop"),
  aiSummarize: (content) => electron.ipcRenderer.invoke("ai:summarize", content),
  aiSuggestTags: (content) => electron.ipcRenderer.invoke("ai:suggestTags", content),
  aiPolish: (content) => electron.ipcRenderer.invoke("ai:polish", content),
  aiContinue: (content) => electron.ipcRenderer.invoke("ai:continue", content),
  aiTranslate: (content, lang) => electron.ipcRenderer.invoke("ai:translate", content, lang),
  aiExplain: (content) => electron.ipcRenderer.invoke("ai:explain", content),
  aiSearchEnhance: (query) => electron.ipcRenderer.invoke("ai:searchEnhance", query),
  aiChatHistoryList: () => electron.ipcRenderer.invoke("ai:chatHistoryList"),
  aiChatHistoryGet: (id) => electron.ipcRenderer.invoke("ai:chatHistoryGet", id),
  aiChatHistorySave: (id, title, messages) => electron.ipcRenderer.invoke("ai:chatHistorySave", id, title, messages),
  aiChatHistoryDelete: (id) => electron.ipcRenderer.invoke("ai:chatHistoryDelete", id),
  // AI stream 事件监听
  onAiStreamChunk: (callback) => {
    const handler = (_event, text) => callback(text);
    electron.ipcRenderer.on("ai:stream:chunk", handler);
    return () => electron.ipcRenderer.off("ai:stream:chunk", handler);
  },
  onAiStreamDone: (callback) => {
    const handler = () => callback();
    electron.ipcRenderer.on("ai:stream:done", handler);
    return () => electron.ipcRenderer.off("ai:stream:done", handler);
  },
  onAiStreamError: (callback) => {
    const handler = (_event, err) => callback(err);
    electron.ipcRenderer.on("ai:stream:error", handler);
    return () => electron.ipcRenderer.off("ai:stream:error", handler);
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
