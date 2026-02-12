import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import AudioBlockView from './AudioBlockView.vue'

export const AudioBlock = Node.create({
  name: 'audioBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      attachmentId: { default: null },
      filename: { default: null },
      duration: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="audioBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'audioBlock' }, HTMLAttributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(AudioBlockView)
  },
})
