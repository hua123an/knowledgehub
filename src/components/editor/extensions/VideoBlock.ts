import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import VideoBlockView from './VideoBlockView.vue'

export const VideoBlock = Node.create({
  name: 'videoBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      attachmentId: { default: null },
      width: { default: 640 },
      height: { default: 360 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="videoBlock"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'videoBlock' }, HTMLAttributes)]
  },

  addNodeView() {
    return VueNodeViewRenderer(VideoBlockView)
  },
})
