<template>
  <node-view-wrapper class="image-block" :class="{ selected }">
    <div class="image-container" @click="selected = !selected">
      <img
        v-if="node.attrs.src"
        :src="node.attrs.src"
        :alt="node.attrs.alt || ''"
        :style="imageStyle"
        @load="onLoad"
        @error="onError"
      />
      <div v-else class="image-placeholder">
        <el-icon :size="32"><PictureFilled /></el-icon>
        <span>图片加载失败</span>
      </div>
    </div>
    <div v-if="selected" class="image-toolbar">
      <el-button-group size="small">
        <el-button @click="openExternal" title="用系统程序打开">
          <el-icon><FolderOpened /></el-icon>
        </el-button>
        <el-button @click="deleteNode" title="删除" type="danger">
          <el-icon><Delete /></el-icon>
        </el-button>
      </el-button-group>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { PictureFilled, FolderOpened, Delete } from '@element-plus/icons-vue'

const props = defineProps(nodeViewProps)
const selected = ref(false)
const loaded = ref(false)

const imageStyle = computed(() => {
  const style: Record<string, string> = { maxWidth: '100%', borderRadius: '8px' }
  if (props.node.attrs.width) style.width = `${props.node.attrs.width}px`
  return style
})

function onLoad() {
  loaded.value = true
}

function onError() {
  loaded.value = false
}

async function openExternal() {
  const id = props.node.attrs.attachmentId
  if (id) await window.api.attachmentOpen(id)
}

function deleteNode() {
  props.deleteNode()
}
</script>

<style scoped>
.image-block {
  position: relative;
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-block.selected .image-container {
  outline: 2px solid var(--primary-color, #6366f1);
  border-radius: 8px;
}

.image-container {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  max-width: 100%;
}

.image-container img {
  display: block;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  background: var(--bg-tertiary, #f3f4f6);
  border-radius: 8px;
  color: var(--text-tertiary, #9ca3af);
  min-width: 200px;
  min-height: 120px;
}

.image-toolbar {
  margin-top: 8px;
}
</style>
