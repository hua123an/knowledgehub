/// <reference types="vite/client" />

declare module 'element-plus/dist/locale/zh-cn.mjs' {
  import type { Language } from 'element-plus/es/locale'
  const zhCn: Language
  export default zhCn
}

interface Window {
  api: {
    // Note Operations
    noteList: (filters?: any) => Promise<any>;
    noteGet: (id: string) => Promise<any>;
    noteCreate: (note: any) => Promise<any>;
    noteUpdate: (id: string, updates: any) => Promise<any>;
    noteDelete: (id: string) => Promise<any>;
    noteSearch: (query: string) => Promise<any>;

    // Folder Operations
    folderList: () => Promise<any>;
    folderCreate: (folder: any) => Promise<any>;
    folderUpdate: (id: string, updates: any) => Promise<any>;
    folderDelete: (id: string) => Promise<any>;

    // System Operations
    openDirectory: () => Promise<string | null>;
    setWorkspace: (path: string) => Promise<boolean>;
    revealInExplorer: (path: string) => Promise<boolean>;
    fetchUrlMeta: (url: string) => Promise<any>;

    // Link Operations
    linkGetGraph: () => Promise<any>;
    linkGetByNote: (noteId: string) => Promise<any>;
    
    // Tag Operations
    tagList: () => Promise<any>;
    tagCreate: (tag: any) => Promise<any>;
    tagUpdate: (id: string, updates: any) => Promise<any>;
    tagDelete: (id: string) => Promise<any>;
    tagAddToNote: (noteId: string, tagId: string) => Promise<any>;
    tagRemoveFromNote: (noteId: string, tagId: string) => Promise<any>;

    // Chat History
    aiChatHistoryList: () => Promise<any>;
    aiChatHistoryGet: (id: string) => Promise<any>;
    aiChatHistorySave: (id: string, title: string, messages: any[]) => Promise<any>;
    aiChatHistoryDelete: (id: string) => Promise<any>;

    // Settings
    settingsGet: () => Promise<any>;
    settingsSet: (settings: any) => Promise<any>;
    
    // AI Operations - simplified signatures for now
    aiChat: (messages: any[], systemPrompt?: string) => Promise<any>;
    aiChatStream: (messages: any[], systemPrompt?: string) => Promise<any>;
    aiStop: () => Promise<any>;
    aiSummarize: (content: string) => Promise<any>;
    aiSuggestTags: (content: string) => Promise<any>;
    aiPolish: (content: string) => Promise<any>;
    aiContinue: (content: string) => Promise<any>;
    aiTranslate: (content: string, lang: string) => Promise<any>;
    aiExplain: (content: string) => Promise<any>;
    aiSearchEnhance: (query: string) => Promise<any>;
    
    // AI Events
    onAiStreamChunk: (callback: (text: string) => void) => () => void;
    onAiStreamDone: (callback: () => void) => () => void;
    onAiStreamError: (callback: (err: string) => void) => () => void;
  }
  ipcRenderer: any;
}
