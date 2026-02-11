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

  // AI
  AI_CHAT: 'ai:chat',
  AI_CHAT_STREAM: 'ai:chatStream',
  AI_STOP: 'ai:stop',
  AI_SUMMARIZE: 'ai:summarize',
  AI_SUGGEST_TAGS: 'ai:suggestTags',
  AI_POLISH: 'ai:polish',
  AI_CONTINUE: 'ai:continue',
  AI_TRANSLATE: 'ai:translate',
  AI_EXPLAIN: 'ai:explain',
  AI_SEARCH_ENHANCE: 'ai:searchEnhance',
  AI_CHAT_HISTORY_LIST: 'ai:chatHistoryList',
  AI_CHAT_HISTORY_GET: 'ai:chatHistoryGet',
  AI_CHAT_HISTORY_SAVE: 'ai:chatHistorySave',
  AI_CHAT_HISTORY_DELETE: 'ai:chatHistoryDelete',
  // 系统
  SYSTEM_REVEAL: 'system:reveal',
} as const

