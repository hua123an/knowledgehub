<template>
  <node-view-wrapper class="audio-block">
    <div class="audio-card">
      <div class="audio-icon">
        <el-icon :size="24"><Headset /></el-icon>
      </div>
      <div class="audio-info">
        <span class="audio-filename">{{ node.attrs.filename || '音频文件' }}</span>
        <span class="audio-duration" v-if="node.attrs.duration">
          {{ formatDuration(node.attrs.duration) }}
        </span>
      </div>
      <div class="audio-controls">
        <audio ref="audioRef" :src="node.attrs.src" preload="metadata" @loadedmetadata="onMeta" />
        <el-button circle size="small" @click="togglePlay">
          <el-icon>
            <VideoPlay v-if="!playing" />
            <VideoPause v-else />
          </el-icon>
        </el-button>
        <el-button circle size="small" @click="openExternal" title="用系统程序打开">
          <el-icon><FolderOpened /></el-icon>
        </el-button>
        <el-button circle size="small" type="danger" @click="deleteNode" title="删除">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { Headset, VideoPlay, VideoPause, FolderOpened, Delete } from '@element-plus/icons-vue'

const props = defineProps(nodeViewProps)
const audioRef = ref<HTMLAudioElement>()
const playing = ref(false)

function togglePlay() {
  if (!audioRef.value) return
  if (playing.value) {
    audioRef.value.pause()
    playing.value = false
  } else {
    audioRef.value.play()
    playing.value = true
    audioRef.value.onended = () => { playing.value = false }
  }
}

function onMeta() {
  // metadata loaded
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
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
.audio-block {
  margin: 12px 0;
}

.audio-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  max-width: 480px;
}

.audio-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  flex-shrink: 0;
}

.audio-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.audio-filename {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary, #1f2937);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-duration {
  font-size: 0.75rem;
  color: var(--text-tertiary, #9ca3af);
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.audio-controls audio {
  display: none;
}
</style>
