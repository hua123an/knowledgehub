<template>
  <node-view-wrapper class="video-block">
    <div class="video-container">
      <video
        v-if="node.attrs.src"
        :src="node.attrs.src"
        controls
        preload="metadata"
        :style="videoStyle"
      />
      <div v-else class="video-placeholder">
        <el-icon :size="32"><Film /></el-icon>
        <span>视频加载失败</span>
      </div>
    </div>
    <div class="video-toolbar">
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
import { computed } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { Film, FolderOpened, Delete } from '@element-plus/icons-vue'

const props = defineProps(nodeViewProps)

const videoStyle = computed(() => ({
  maxWidth: '100%',
  borderRadius: '8px',
  width: props.node.attrs.width ? `${props.node.attrs.width}px` : '100%',
}))

async function openExternal() {
  const id = props.node.attrs.attachmentId
  if (id) await window.api.attachmentOpen(id)
}

function deleteNode() {
  props.deleteNode()
}
</script>

<style scoped>
.video-block {
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.video-container {
  border-radius: 8px;
  overflow: hidden;
  max-width: 100%;
  background: #000;
}

.video-container video {
  display: block;
}

.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px;
  background: var(--bg-tertiary, #f3f4f6);
  border-radius: 8px;
  color: var(--text-tertiary, #9ca3af);
  min-width: 320px;
  min-height: 180px;
}

.video-toolbar {
  margin-top: 8px;
}
</style>
