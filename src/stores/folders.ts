import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Folder } from '../types'

export const useFoldersStore = defineStore('folders', () => {
  // 状态
  const folders = ref<Folder[]>([])
  const currentFolder = ref<Folder | null>(null)
  const expandedFolders = ref<Set<string>>(new Set())
  const loading = ref(false)

  // 计算属性：构建树形结构
  const folderTree = computed(() => {
    const map = new Map<string | null, Folder[]>()
    
    // 按 parentId 分组
    folders.value.forEach(folder => {
      const parentId = folder.parentId
      if (!map.has(parentId)) {
        map.set(parentId, [])
      }
      map.get(parentId)!.push({ ...folder, children: [] })
    })
    
    // 递归构建树
    function buildTree(parentId: string | null): Folder[] {
      const children = map.get(parentId) || []
      return children
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id),
        }))
    }
    
    return buildTree(null)
  })

  // 方法
  async function fetchFolders() {
    loading.value = true
    try {
      const result = await window.api.folderList()
      if (result.success && result.data) {
        folders.value = result.data
      }
    } finally {
      loading.value = false
    }
  }

  async function createFolder(folder: Partial<Folder>) {
    const result = await window.api.folderCreate(folder)
    if (result.success && result.data) {
      folders.value.push(result.data)
      return result.data
    }
    return null
  }

  async function updateFolder(id: string, updates: Partial<Folder>) {
    const result = await window.api.folderUpdate(id, updates)
    if (result.success && result.data) {
      const index = folders.value.findIndex(f => f.id === id)
      if (index !== -1) {
        folders.value[index] = result.data
      }
      return result.data
    }
    return null
  }

  async function deleteFolder(id: string) {
    const result = await window.api.folderDelete(id)
    if (result.success) {
      folders.value = folders.value.filter(f => f.id !== id)
      if (currentFolder.value?.id === id) {
        currentFolder.value = null
      }
      return true
    }
    return false
  }

  function setCurrentFolder(folder: Folder | null) {
    currentFolder.value = folder
  }

  function toggleFolder(id: string) {
    if (expandedFolders.value.has(id)) {
      expandedFolders.value.delete(id)
    } else {
      expandedFolders.value.add(id)
    }
  }

  function expandFolder(id: string) {
    expandedFolders.value.add(id)
  }

  function collapseFolder(id: string) {
    expandedFolders.value.delete(id)
  }

  function isExpanded(id: string) {
    return expandedFolders.value.has(id)
  }

  // 查找文件夹
  function findFolder(id: string): Folder | undefined {
    return folders.value.find(f => f.id === id)
  }

  // 获取文件夹路径
  function getFolderPath(id: string): Folder[] {
    const path: Folder[] = []
    let current = findFolder(id)
    
    while (current) {
      path.unshift(current)
      current = current.parentId ? findFolder(current.parentId) : undefined
    }
    
    return path
  }

  return {
    // 状态
    folders,
    currentFolder,
    expandedFolders,
    loading,
    // 计算属性
    folderTree,
    // 方法
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    setCurrentFolder,
    toggleFolder,
    expandFolder,
    collapseFolder,
    isExpanded,
    findFolder,
    getFolderPath,
  }
})
