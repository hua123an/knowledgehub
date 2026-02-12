import { ref } from 'vue'

export type AttachmentCategory = 'image' | 'audio' | 'video' | 'document' | 'other'

export function useAttachment() {
  const uploading = ref(false)

  function getCategory(mimeType: string): AttachmentCategory {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.startsWith('video/')) return 'video'
    const docTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint',
      'text/plain',
      'text/csv',
    ]
    if (docTypes.some(t => mimeType.startsWith(t))) return 'document'
    return 'other'
  }

  async function uploadFile(noteId: string, file: File) {
    uploading.value = true
    try {
      const category = getCategory(file.type)
      const buffer = await file.arrayBuffer()

      const result = await window.api.attachmentUpload({
        noteId,
        filename: file.name,
        buffer,
        mimeType: file.type,
        category,
      })

      return result
    } finally {
      uploading.value = false
    }
  }

  async function uploadFiles(noteId: string, files: File[]) {
    const results = []
    for (const file of files) {
      const result = await uploadFile(noteId, file)
      results.push(result)
    }
    return results
  }

  function insertToEditor(editor: any, uploadResult: any, category: AttachmentCategory, filename: string) {
    if (!uploadResult?.success || !uploadResult.data) return

    const { id, url } = uploadResult.data

    switch (category) {
      case 'image':
        editor.chain().focus().insertContent({
          type: 'imageBlock',
          attrs: { src: url, attachmentId: id, alt: filename },
        }).run()
        break
      case 'audio':
        editor.chain().focus().insertContent({
          type: 'audioBlock',
          attrs: { src: url, attachmentId: id, filename },
        }).run()
        break
      case 'video':
        editor.chain().focus().insertContent({
          type: 'videoBlock',
          attrs: { src: url, attachmentId: id },
        }).run()
        break
      default:
        editor.chain().focus().insertContent({
          type: 'fileBlock',
          attrs: { attachmentId: id, filename, mimeType: category, size: 0, src: url },
        }).run()
        break
    }
  }

  async function handleFileUpload(editor: any, noteId: string, files: File[]) {
    for (const file of files) {
      const category = getCategory(file.type)
      const result = await uploadFile(noteId, file)
      insertToEditor(editor, result, category, file.name)
    }
  }

  async function pickAndUpload(editor: any, noteId: string, category?: AttachmentCategory) {
    const result = await window.api.attachmentPickFile({ category, multiple: true })
    if (!result?.success || !result.data?.length) return

    for (const picked of result.data) {
      const cat = category || getCategory(picked.mimeType)
      const uploadResult = await window.api.attachmentUpload({
        noteId,
        filename: picked.filename,
        buffer: picked.buffer,
        mimeType: picked.mimeType,
        category: cat,
      })
      insertToEditor(editor, uploadResult, cat, picked.filename)
    }
  }

  return {
    uploading,
    getCategory,
    uploadFile,
    uploadFiles,
    insertToEditor,
    handleFileUpload,
    pickAndUpload,
  }
}
