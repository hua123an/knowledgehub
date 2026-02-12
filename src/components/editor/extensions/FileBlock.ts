import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import FileBlockView from './FileBlockView.vue'

export const FileBlock = Node.create({
  name: 'fileBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      attachmentId: { default: null },
      filename: { default: null },
      mimeType: { default: null },
      size: { default: 0 },
      src: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="fileBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'fileBlock' }, HTMLAttributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(FileBlockView)
  },
})
