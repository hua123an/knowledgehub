<template>
  <BubbleMenu
    v-if="editor"
    :editor="editor"
    :tippy-options="{ duration: 150, placement: 'top' }"
    class="bubble-toolbar"
  >
    <!-- 内联格式 -->
    <button
      class="bubble-btn"
      :class="{ active: editor.isActive('bold') }"
      @click="editor.chain().focus().toggleBold().run()"
      title="加粗"
    >
      B
    </button>
    <button
      class="bubble-btn italic"
      :class="{ active: editor.isActive('italic') }"
      @click="editor.chain().focus().toggleItalic().run()"
      title="斜体"
    >
      I
    </button>
    <button
      class="bubble-btn"
      :class="{ active: editor.isActive('strike') }"
      @click="editor.chain().focus().toggleStrike().run()"
      title="删除线"
    >
      S
    </button>
    <button
      class="bubble-btn code"
      :class="{ active: editor.isActive('code') }"
      @click="editor.chain().focus().toggleCode().run()"
      title="行内代码"
    >
      &lt;&gt;
    </button>
    <button
      class="bubble-btn"
      :class="{ active: editor.isActive('highlight') }"
      @click="editor.chain().focus().toggleHighlight().run()"
      title="高亮"
    >
      H
    </button>

    <!-- 分隔线 -->
    <span class="bubble-divider"></span>

    <!-- 标题 -->
    <button
      class="bubble-btn"
      :class="{ active: editor.isActive('heading', { level: 1 }) }"
      @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
      title="标题1"
    >
      H1
    </button>
    <button
      class="bubble-btn"
      :class="{ active: editor.isActive('heading', { level: 2 }) }"
      @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      title="标题2"
    >
      H2
    </button>

    <!-- 分隔线 -->
    <span class="bubble-divider"></span>

    <!-- 块级格式 -->
    <button
      class="bubble-btn"
      :class="{ active: editor.isActive('blockquote') }"
      @click="editor.chain().focus().toggleBlockquote().run()"
      title="引用"
    >
      &ldquo;&rdquo;
    </button>
    <button
      class="bubble-btn code"
      :class="{ active: editor.isActive('codeBlock') }"
      @click="editor.chain().focus().toggleCodeBlock().run()"
      title="代码块"
    >
      {/}
    </button>
  </BubbleMenu>
</template>

<script setup lang="ts">
import { BubbleMenu } from '@tiptap/vue-3/menus'
import type { Editor } from '@tiptap/vue-3'

defineProps<{
  editor: Editor
}>()
</script>

<style scoped>
.bubble-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.bubble-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
  line-height: 1;
  font-family: inherit;
  flex-shrink: 0;
}

.bubble-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.bubble-btn.active {
  color: var(--accent-color);
}

.bubble-btn.italic {
  font-style: italic;
}

.bubble-btn.code {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 11px;
}

.bubble-divider {
  width: 1px;
  height: 16px;
  background: var(--border-color);
  margin: 0 4px;
  flex-shrink: 0;
}
</style>
