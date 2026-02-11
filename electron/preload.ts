import { ipcRenderer, contextBridge } from 'electron'
import { IPC_CHANNELS } from '../src/types'

// API 接口定义
const api = {
  // 笔记操作
  noteCreate: (note: any) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_CREATE, note),
  noteUpdate: (id: string, updates: any) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_UPDATE, id, updates),
  noteDelete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_DELETE, id),
  noteGet: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_GET, id),
  noteList: (filters?: any) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_LIST, filters),
  noteSearch: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTE_SEARCH, query),

  // 文件夹操作
  folderCreate: (folder: any) => ipcRenderer.invoke(IPC_CHANNELS.FOLDER_CREATE, folder),
  folderUpdate: (id: string, updates: any) => ipcRenderer.invoke(IPC_CHANNELS.FOLDER_UPDATE, id, updates),
  folderDelete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.FOLDER_DELETE, id),
  folderList: () => ipcRenderer.invoke(IPC_CHANNELS.FOLDER_LIST),

  // 标签操作
  tagCreate: (tag: any) => ipcRenderer.invoke(IPC_CHANNELS.TAG_CREATE, tag),
  tagUpdate: (id: string, updates: any) => ipcRenderer.invoke(IPC_CHANNELS.TAG_UPDATE, id, updates),
  tagDelete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TAG_DELETE, id),
  tagList: () => ipcRenderer.invoke(IPC_CHANNELS.TAG_LIST),
  tagAddToNote: (noteId: string, tagId: string) => ipcRenderer.invoke(IPC_CHANNELS.TAG_ADD_TO_NOTE, noteId, tagId),
  tagRemoveFromNote: (noteId: string, tagId: string) => ipcRenderer.invoke(IPC_CHANNELS.TAG_REMOVE_FROM_NOTE, noteId, tagId),

  // 链接操作
  linkCreate: (sourceId: string, targetId: string) => ipcRenderer.invoke(IPC_CHANNELS.LINK_CREATE, sourceId, targetId),
  linkDelete: (sourceId: string, targetId: string) => ipcRenderer.invoke(IPC_CHANNELS.LINK_DELETE, sourceId, targetId),
  linkGetByNote: (noteId: string) => ipcRenderer.invoke(IPC_CHANNELS.LINK_GET_BY_NOTE, noteId),
  linkGetGraph: () => ipcRenderer.invoke(IPC_CHANNELS.LINK_GET_GRAPH),

  // 设置操作
  settingsGet: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  settingsSet: (settings: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),
}

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('api', api)

// 保留原有的 ipcRenderer 暴露（兼容性）
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

// 类型声明
export type ApiType = typeof api
