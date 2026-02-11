"use strict";
const electron = require("electron");
const IPC_CHANNELS = {
  NOTE_CREATE: "note:create",
  NOTE_UPDATE: "note:update",
  NOTE_DELETE: "note:delete",
  NOTE_GET: "note:get",
  NOTE_LIST: "note:list",
  NOTE_SEARCH: "note:search",
  FOLDER_CREATE: "folder:create",
  FOLDER_UPDATE: "folder:update",
  FOLDER_DELETE: "folder:delete",
  FOLDER_LIST: "folder:list",
  TAG_CREATE: "tag:create",
  TAG_UPDATE: "tag:update",
  TAG_DELETE: "tag:delete",
  TAG_LIST: "tag:list",
  TAG_ADD_TO_NOTE: "tag:addToNote",
  TAG_REMOVE_FROM_NOTE: "tag:removeFromNote",
  LINK_CREATE: "link:create",
  LINK_DELETE: "link:delete",
  LINK_GET_BY_NOTE: "link:getByNote",
  LINK_GET_GRAPH: "link:getGraph",
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set"
};
const api = {
  // 笔记操作
  noteCreate: (note) => electron.ipcRenderer.invoke(IPC_CHANNELS.NOTE_CREATE, note),
  noteUpdate: (id, updates) => electron.ipcRenderer.invoke(IPC_CHANNELS.NOTE_UPDATE, id, updates),
  noteDelete: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.NOTE_DELETE, id),
  noteGet: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET, id),
  noteList: (filters) => electron.ipcRenderer.invoke(IPC_CHANNELS.NOTE_LIST, filters),
  noteSearch: (query) => electron.ipcRenderer.invoke(IPC_CHANNELS.NOTE_SEARCH, query),
  // 文件夹操作
  folderCreate: (folder) => electron.ipcRenderer.invoke(IPC_CHANNELS.FOLDER_CREATE, folder),
  folderUpdate: (id, updates) => electron.ipcRenderer.invoke(IPC_CHANNELS.FOLDER_UPDATE, id, updates),
  folderDelete: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.FOLDER_DELETE, id),
  folderList: () => electron.ipcRenderer.invoke(IPC_CHANNELS.FOLDER_LIST),
  // 标签操作
  tagCreate: (tag) => electron.ipcRenderer.invoke(IPC_CHANNELS.TAG_CREATE, tag),
  tagUpdate: (id, updates) => electron.ipcRenderer.invoke(IPC_CHANNELS.TAG_UPDATE, id, updates),
  tagDelete: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.TAG_DELETE, id),
  tagList: () => electron.ipcRenderer.invoke(IPC_CHANNELS.TAG_LIST),
  tagAddToNote: (noteId, tagId) => electron.ipcRenderer.invoke(IPC_CHANNELS.TAG_ADD_TO_NOTE, noteId, tagId),
  tagRemoveFromNote: (noteId, tagId) => electron.ipcRenderer.invoke(IPC_CHANNELS.TAG_REMOVE_FROM_NOTE, noteId, tagId),
  // 链接操作
  linkCreate: (sourceId, targetId) => electron.ipcRenderer.invoke(IPC_CHANNELS.LINK_CREATE, sourceId, targetId),
  linkDelete: (sourceId, targetId) => electron.ipcRenderer.invoke(IPC_CHANNELS.LINK_DELETE, sourceId, targetId),
  linkGetByNote: (noteId) => electron.ipcRenderer.invoke(IPC_CHANNELS.LINK_GET_BY_NOTE, noteId),
  linkGetGraph: () => electron.ipcRenderer.invoke(IPC_CHANNELS.LINK_GET_GRAPH),
  // 设置操作
  settingsGet: () => electron.ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  settingsSet: (settings) => electron.ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings)
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
