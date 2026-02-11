import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Tag } from '../types'

export const useTagsStore = defineStore('tags', () => {
  // 状态
  const tags = ref<Tag[]>([])
  const noteTagsMap = ref<Map<string, string[]>>(new Map()) // noteId -> tagIds
  const loading = ref(false)

  // 计算属性
  const tagsByName = computed(() => {
    const map = new Map<string, Tag>()
    tags.value.forEach(tag => map.set(tag.name, tag))
    return map
  })

  const tagsById = computed(() => {
    const map = new Map<string, Tag>()
    tags.value.forEach(tag => map.set(tag.id, tag))
    return map
  })

  // 方法
  async function fetchTags() {
    loading.value = true
    try {
      const result = await window.api.tagList()
      if (result.success && result.data) {
        tags.value = result.data
      }
    } finally {
      loading.value = false
    }
  }

  async function createTag(tag: Partial<Tag>) {
    const result = await window.api.tagCreate(tag)
    if (result.success && result.data) {
      tags.value.push(result.data)
      return result.data
    }
    return null
  }

  async function updateTag(id: string, updates: Partial<Tag>) {
    const result = await window.api.tagUpdate(id, updates)
    if (result.success && result.data) {
      const index = tags.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tags.value[index] = result.data
      }
      return result.data
    }
    return null
  }

  async function deleteTag(id: string) {
    const result = await window.api.tagDelete(id)
    if (result.success) {
      tags.value = tags.value.filter(t => t.id !== id)
      // 从所有笔记中移除该标签
      noteTagsMap.value.forEach((tagIds, noteId) => {
        noteTagsMap.value.set(noteId, tagIds.filter(tid => tid !== id))
      })
      return true
    }
    return false
  }

  async function addTagToNote(noteId: string, tagId: string) {
    const result = await window.api.tagAddToNote(noteId, tagId)
    if (result.success) {
      const tagIds = noteTagsMap.value.get(noteId) || []
      if (!tagIds.includes(tagId)) {
        noteTagsMap.value.set(noteId, [...tagIds, tagId])
      }
      return true
    }
    return false
  }

  async function removeTagFromNote(noteId: string, tagId: string) {
    const result = await window.api.tagRemoveFromNote(noteId, tagId)
    if (result.success) {
      const tagIds = noteTagsMap.value.get(noteId) || []
      noteTagsMap.value.set(noteId, tagIds.filter(tid => tid !== tagId))
      return true
    }
    return false
  }

  function getNoteTags(noteId: string): Tag[] {
    const tagIds = noteTagsMap.value.get(noteId) || []
    return tagIds.map(id => tagsById.value.get(id)).filter(Boolean) as Tag[]
  }

  function setNoteTags(noteId: string, tagIds: string[]) {
    noteTagsMap.value.set(noteId, tagIds)
  }

  function findTagByName(name: string): Tag | undefined {
    return tagsByName.value.get(name)
  }

  function getTagsByNoteId(noteId: string): Tag[] {
    return getNoteTags(noteId)
  }

  return {
    // 状态
    tags,
    noteTagsMap,
    loading,
    // 计算属性
    tagsByName,
    tagsById,
    // 方法
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    addTagToNote,
    removeTagFromNote,
    getNoteTags,
    getTagsByNoteId,
    setNoteTags,
    findTagByName,
  }
})
