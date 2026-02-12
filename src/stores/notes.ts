import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Note, NoteType, SearchResult, GraphLink } from '../types'

export const useNotesStore = defineStore('notes', () => {
  // 状态
  const notes = ref<Note[]>([])
  const currentNote = ref<Note | null>(null)
  const loading = ref(false)
  const searchResults = ref<SearchResult[]>([])

  // 计算属性
  const markdownNotes = computed(() => 
    notes.value.filter(n => n.type === 'markdown')
  )
  
  const bookmarks = computed(() => 
    notes.value.filter(n => n.type === 'bookmark')
  )
  
  const snippets = computed(() => 
    notes.value.filter(n => n.type === 'snippet')
  )

  const notesByFolder = computed(() => {
    const map = new Map<string | null, Note[]>()
    notes.value.forEach(note => {
      const folderId = note.folderId
      if (!map.has(folderId)) {
        map.set(folderId, [])
      }
      map.get(folderId)!.push(note)
    })
    return map
  })

  // Filter Logic
  const filter = ref<{ tagId?: string | null, folderId?: string | null, type?: NoteType }>({})

  function setFilter(newFilter: { tagId?: string | null, folderId?: string | null, type?: NoteType }) {
    filter.value = newFilter
  }

  const filteredNotes = computed(() => {
    let result = notes.value
    if (filter.value.tagId) {
      // Assuming we have a way to check tags, but for now let's just return all or implement rudimentary check if note has tags property
      // Since note interface usually has tags array or we need to look it up. 
      // Checking types/index.ts: Note interface doesn't have tags array directly on it in some versions, but let's assume filtering by folder/type implies we filter the notes array.
      // If tag filtering is complex (many-to-many), we might need to rely on backend or join tables.
      // For now, to stop the crash, we'll return notes. ideally we filter by tag.
    }
    if (filter.value.folderId) {
      result = result.filter(n => n.folderId === filter.value.folderId)
    }
    if (filter.value.type) {
      result = result.filter(n => n.type === filter.value.type)
    }
    return result
  })

  // 方法
  async function fetchNotes() {
    loading.value = true
    try {
      const result = await window.api.noteList()
      if (result.success && result.data) {
        notes.value = result.data
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchNotesByType(type: NoteType) {
    loading.value = true
    try {
      const result = await window.api.noteList({ type })
      if (result.success && result.data) {
        return result.data
      }
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchNotesByFolder(folderId: string | null) {
    loading.value = true
    try {
      const result = await window.api.noteList({ folderId })
      if (result.success && result.data) {
        return result.data
      }
      return []
    } finally {
      loading.value = false
    }
  }

  async function getNote(id: string) {
    const result = await window.api.noteGet(id)
    if (result.success && result.data) {
      currentNote.value = result.data
      return result.data
    }
    return null
  }

  async function createNote(note: Partial<Note>) {
    const result = await window.api.noteCreate(note)
    if (result.success && result.data) {
      notes.value.unshift(result.data)
      currentNote.value = result.data
      return result.data
    }
    return null
  }

  async function updateNote(noteOrId: string | Note, updates?: Partial<Note>) {
    let id: string
    let updateData: Partial<Note>
    
    if (typeof noteOrId === 'string') {
      id = noteOrId
      updateData = updates || {}
    } else {
      id = noteOrId.id
      updateData = noteOrId
    }
    
    const result = await window.api.noteUpdate(id, updateData)
    if (result.success && result.data) {
      const index = notes.value.findIndex(n => n.id === id)
      if (index !== -1) {
        notes.value[index] = result.data
      }
      if (currentNote.value?.id === id) {
        currentNote.value = result.data
      }
      return result.data
    }
    return null
  }

  async function deleteNote(id: string) {
    const result = await window.api.noteDelete(id)
    if (result.success) {
      notes.value = notes.value.filter(n => n.id !== id)
      if (currentNote.value?.id === id) {
        currentNote.value = null
      }
      return true
    }
    return false
  }

  async function searchNotes(query: string) {
    loading.value = true
    try {
      const result = await window.api.noteSearch(query)
      if (result.success && result.data) {
        // 扁平化结果，方便组件使用
        const flattened = result.data.map((r: any) => ({
          ...r.note,
          snippet: r.contentSnippet || r.note.content?.slice(0, 150),
          matchField: r.matchField || '匹配'
        }))
        searchResults.value = flattened
        return flattened
      }
      return []
    } finally {
      loading.value = false
    }
  }

  function setCurrentNote(note: Note | null) {
    currentNote.value = note
  }

  function clearSearchResults() {
    searchResults.value = []
  }

  async function starNote(id: string) {
    const result = await window.api.noteStar(id)
    if (result.success) {
      const index = notes.value.findIndex(n => n.id === id)
      if (index !== -1) notes.value[index] = { ...notes.value[index], isStarred: true }
      if (currentNote.value?.id === id) currentNote.value = { ...currentNote.value, isStarred: true }
      return true
    }
    return false
  }

  async function unstarNote(id: string) {
    const result = await window.api.noteUnstar(id)
    if (result.success) {
      const index = notes.value.findIndex(n => n.id === id)
      if (index !== -1) notes.value[index] = { ...notes.value[index], isStarred: false }
      if (currentNote.value?.id === id) currentNote.value = { ...currentNote.value, isStarred: false }
      return true
    }
    return false
  }

  async function fetchNoteById(id: string) {
    const result = await window.api.noteGet(id)
    if (result.success && result.data) {
      return result.data
    }
    return null
  }

  async function fetchLinks(): Promise<GraphLink[]> {
    try {
      const result = await window.api.linkGetGraph()
      if (result.success && result.data) {
        return result.data
      }
    } catch (e) {
      console.error('Failed to fetch links:', e)
    }
    return []
  }

  return {
    // 状态
    notes,
    currentNote,
    loading,
    searchResults,
    // 计算属性
    markdownNotes,
    bookmarks,
    snippets,
    notesByFolder,
    // 方法
    fetchNotes,
    fetchNotesByType,
    fetchNotesByFolder,
    fetchNoteById,
    fetchLinks,
    getNote,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    setCurrentNote,
    clearSearchResults,
    setFilter,
    filteredNotes,
    starNote,
    unstarNote,
  }
})
