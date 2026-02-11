import { ipcRenderer, contextBridge } from 'electron'

const api = {
  // 笔记操作
  noteCreate: (note: any) => ipcRenderer.invoke('note:create', note),
  noteUpdate: (id: string, updates: any) => ipcRenderer.invoke('note:update', id, updates),
  noteDelete: (id: string) => ipcRenderer.invoke('note:delete', id),
  noteGet: (id: string) => ipcRenderer.invoke('note:get', id),
  noteList: (filters?: any) => ipcRenderer.invoke('note:list', filters),
  noteSearch: (query: string) => ipcRenderer.invoke('note:search', query),

  // 文件夹操作
  folderCreate: (folder: any) => ipcRenderer.invoke('folder:create', folder),
  folderUpdate: (id: string, updates: any) => ipcRenderer.invoke('folder:update', id, updates),
  folderDelete: (id: string) => ipcRenderer.invoke('folder:delete', id),
  folderList: () => ipcRenderer.invoke('folder:list'),
  
  // 系统/文件操作
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  setWorkspace: (path: string) => ipcRenderer.invoke('workspace:set', path),
  revealInExplorer: (path: string) => ipcRenderer.invoke('system:reveal', path),

  // 标签操作
  tagCreate: (tag: any) => ipcRenderer.invoke('tag:create', tag),
  tagUpdate: (id: string, updates: any) => ipcRenderer.invoke('tag:update', id, updates),
  tagDelete: (id: string) => ipcRenderer.invoke('tag:delete', id),
  tagList: () => ipcRenderer.invoke('tag:list'),
  tagAddToNote: (noteId: string, tagId: string) => ipcRenderer.invoke('tag:addToNote', noteId, tagId),
  tagRemoveFromNote: (noteId: string, tagId: string) => ipcRenderer.invoke('tag:removeFromNote', noteId, tagId),

  // 链接操作
  linkCreate: (sourceId: string, targetId: string) => ipcRenderer.invoke('link:create', sourceId, targetId),
  linkDelete: (sourceId: string, targetId: string) => ipcRenderer.invoke('link:delete', sourceId, targetId),
  linkGetByNote: (noteId: string) => ipcRenderer.invoke('link:getByNote', noteId),
  linkGetGraph: () => ipcRenderer.invoke('link:getGraph'),

  // 设置操作
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsSet: (settings: any) => ipcRenderer.invoke('settings:set', settings),

  // AI 操作
  aiChat: (messages: any[], systemPrompt?: string) => ipcRenderer.invoke('ai:chat', messages, systemPrompt),
  aiChatStream: (messages: any[], systemPrompt?: string) => ipcRenderer.invoke('ai:chatStream', messages, systemPrompt),
  aiStop: () => ipcRenderer.invoke('ai:stop'),
  aiSummarize: (content: string) => ipcRenderer.invoke('ai:summarize', content),
  aiSuggestTags: (content: string) => ipcRenderer.invoke('ai:suggestTags', content),
  aiPolish: (content: string) => ipcRenderer.invoke('ai:polish', content),
  aiContinue: (content: string) => ipcRenderer.invoke('ai:continue', content),
  aiTranslate: (content: string, lang: string) => ipcRenderer.invoke('ai:translate', content, lang),
  aiExplain: (content: string) => ipcRenderer.invoke('ai:explain', content),
  aiSearchEnhance: (query: string) => ipcRenderer.invoke('ai:searchEnhance', query),
  aiChatHistoryList: () => ipcRenderer.invoke('ai:chatHistoryList'),
  aiChatHistoryGet: (id: string) => ipcRenderer.invoke('ai:chatHistoryGet', id),
  aiChatHistorySave: (id: string, title: string, messages: any[]) => ipcRenderer.invoke('ai:chatHistorySave', id, title, messages),
  aiChatHistoryDelete: (id: string) => ipcRenderer.invoke('ai:chatHistoryDelete', id),

  // AI stream 事件监听
  onAiStreamChunk: (callback: (text: string) => void) => {
    const handler = (_event: any, text: string) => callback(text)
    ipcRenderer.on('ai:stream:chunk', handler)
    return () => ipcRenderer.off('ai:stream:chunk', handler)
  },
  onAiStreamDone: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('ai:stream:done', handler)
    return () => ipcRenderer.off('ai:stream:done', handler)
  },
  onAiStreamError: (callback: (err: string) => void) => {
    const handler = (_event: any, err: string) => callback(err)
    ipcRenderer.on('ai:stream:error', handler)
    return () => ipcRenderer.off('ai:stream:error', handler)
  },
}

contextBridge.exposeInMainWorld('api', api)

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

export type ApiType = typeof api
