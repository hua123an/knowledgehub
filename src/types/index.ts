// 笔记类型
export type NoteType = 'markdown' | 'bookmark' | 'snippet'

// 笔记接口
export interface Note {
  id: string
  title: string
  content: string
  type: NoteType
  folderId: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  isStarred?: boolean
  tags?: Tag[]
  // 书签特有字段
  url?: string
  favicon?: string
  description?: string
  // 代码片段特有字段
  language?: string
}

// 标签接口
export interface Tag {
  id: string
  name: string
  color: string
}

// 笔记-标签关联
export interface NoteTag {
  noteId: string
  tagId: string
}

// 双向链接
export interface Link {
  sourceId: string
  targetId: string
}

// 文件夹接口
export interface Folder {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
  children?: Folder[]
}

// 搜索结果
export interface SearchResult {
  note: Note
  highlights: string[]
  score: number
}

// 知识图谱节点
export interface GraphNode {
  id: string
  label: string
  type: NoteType
}

// 知识图谱边
export interface GraphEdge {
  from: string
  to: string
}

// 知识图谱数据
export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// 应用设置
export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  editorFontSize: number
  autoSave: boolean
  autoSaveInterval: number
  dataPath: string
}

// 书签元数据
export interface BookmarkMeta {
  url: string
  description?: string
  coverUrl?: string
}

// 代码片段元数据
export interface SnippetMeta {
  code: string
  language: string
}

// 图谱链接
export interface GraphLink {
  source: string
  target: string
}

// IPC 通道名称
export const IPC_CHANNELS = {
  // 数据库操作
  DB_INIT: 'db:init',
  DB_QUERY: 'db:query',
  DB_RUN: 'db:run',
  
  // 笔记操作
  NOTE_CREATE: 'note:create',
  NOTE_UPDATE: 'note:update',
  NOTE_DELETE: 'note:delete',
  NOTE_GET: 'note:get',
  NOTE_LIST: 'note:list',
  NOTE_SEARCH: 'note:search',
  
  // 文件夹操作
  FOLDER_CREATE: 'folder:create',
  FOLDER_UPDATE: 'folder:update',
  FOLDER_DELETE: 'folder:delete',
  FOLDER_LIST: 'folder:list',
  
  // 标签操作
  TAG_CREATE: 'tag:create',
  TAG_UPDATE: 'tag:update',
  TAG_DELETE: 'tag:delete',
  TAG_LIST: 'tag:list',
  TAG_ADD_TO_NOTE: 'tag:addToNote',
  TAG_REMOVE_FROM_NOTE: 'tag:removeFromNote',
  
  // 链接操作
  LINK_CREATE: 'link:create',
  LINK_DELETE: 'link:delete',
  LINK_GET_BY_NOTE: 'link:getByNote',
  LINK_GET_GRAPH: 'link:getGraph',
  
  // 文件操作
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_DELETE: 'file:delete',
  
  // 设置
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
} as const

// 附件分类
export type AttachmentCategory = 'image' | 'audio' | 'video' | 'document' | 'other'

// 附件接口
export interface Attachment {
  id: string
  noteId: string
  filename: string
  storedName: string
  mimeType: string
  category: AttachmentCategory
  size: number
  width?: number | null
  height?: number | null
  duration?: number | null
  createdAt: string
}

// 附件上传参数
export interface AttachmentUploadParams {
  noteId: string
  filename: string
  buffer: ArrayBuffer
  mimeType: string
  category: AttachmentCategory
  width?: number
  height?: number
  duration?: number
}

// 附件上传结果
export interface AttachmentUploadResult {
  id: string
  storedName: string
  relativePath: string
  absolutePath: string
  url: string
}

// 文件选择结果
export interface PickedFile {
  filename: string
  buffer: ArrayBuffer
  mimeType: string
  size: number
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
