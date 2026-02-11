import type { ApiResponse, Note, Folder, Tag, SearchResult, GraphData, AppSettings } from './index'

declare global {
  interface Window {
    api: {
      // 笔记操作
      noteCreate: (note: Partial<Note>) => Promise<ApiResponse<Note>>
      noteUpdate: (id: string, updates: Partial<Note>) => Promise<ApiResponse<Note>>
      noteDelete: (id: string) => Promise<ApiResponse<void>>
      noteGet: (id: string) => Promise<ApiResponse<Note>>
      noteList: (filters?: { type?: string; folderId?: string | null }) => Promise<ApiResponse<Note[]>>
      noteSearch: (query: string) => Promise<ApiResponse<SearchResult[]>>

      // 文件夹操作
      folderCreate: (folder: Partial<Folder>) => Promise<ApiResponse<Folder>>
      folderUpdate: (id: string, updates: Partial<Folder>) => Promise<ApiResponse<Folder>>
      folderDelete: (id: string) => Promise<ApiResponse<void>>
      folderList: () => Promise<ApiResponse<Folder[]>>

      // 标签操作
      tagCreate: (tag: Partial<Tag>) => Promise<ApiResponse<Tag>>
      tagUpdate: (id: string, updates: Partial<Tag>) => Promise<ApiResponse<Tag>>
      tagDelete: (id: string) => Promise<ApiResponse<void>>
      tagList: () => Promise<ApiResponse<Tag[]>>
      tagAddToNote: (noteId: string, tagId: string) => Promise<ApiResponse<void>>
      tagRemoveFromNote: (noteId: string, tagId: string) => Promise<ApiResponse<void>>

      // 链接操作
      linkCreate: (sourceId: string, targetId: string) => Promise<ApiResponse<void>>
      linkDelete: (sourceId: string, targetId: string) => Promise<ApiResponse<void>>
      linkGetByNote: (noteId: string) => Promise<ApiResponse<{
        outLinks: Array<{ id: string; title: string; type: string }>
        inLinks: Array<{ id: string; title: string; type: string }>
      }>>
      linkGetGraph: () => Promise<ApiResponse<GraphData>>

      // 设置操作
      settingsGet: () => Promise<ApiResponse<AppSettings>>
      settingsSet: (settings: AppSettings) => Promise<ApiResponse<void>>
    }
    ipcRenderer: {
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => void
      off: (channel: string, listener: (...args: any[]) => void) => void
      send: (channel: string, ...args: any[]) => void
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}

export {}
