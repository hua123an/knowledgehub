import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ImageBlockView from './ImageBlockView.vue'

export const ImageBlock = Node.create({
  name: 'imageBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      attachmentId: { default: null },
      width: { default: null },
      height: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'img[data-type="imageBlock"]' }, { tag: 'img[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes({ 'data-type': 'imageBlock' }, HTMLAttributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageBlockView)
  },
})
