<template>
  <div class="recording-panel" v-if="recorder.isRecording.value">
    <div class="recording-content">
      <span class="pulse-dot"></span>
      <span class="recording-label">
        {{ recorder.isPaused.value ? '已暂停' : '录音中' }}
      </span>
      <span class="recording-time">{{ recorder.formatDuration(recorder.duration.value) }}</span>
    </div>
    <div class="recording-actions">
      <el-button
        v-if="!recorder.isPaused.value"
        size="small"
        @click="recorder.pause()"
        circle
        title="暂停"
      >
        <el-icon><VideoPause /></el-icon>
      </el-button>
      <el-button
        v-else
        size="small"
        @click="recorder.resume()"
        circle
        title="继续"
      >
        <el-icon><VideoPlay /></el-icon>
      </el-button>
      <el-button
        size="small"
        type="primary"
        @click="handleStop"
        title="完成并插入"
      >
        完成
      </el-button>
      <el-button
        size="small"
        @click="handleCancel"
        title="取消"
      >
        取消
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import { useRecorder } from '@/composables/useRecorder'

const recorder = useRecorder()

const emit = defineEmits<{
  (e: 'recorded', file: File): void
  (e: 'cancel'): void
}>()

async function startRecording() {
  await recorder.start()
}

async function handleStop() {
  const file = await recorder.stop()
  emit('recorded', file)
}

function handleCancel() {
  recorder.cancel()
  emit('cancel')
}

defineExpose({ startRecording, recorder })
</script>

<style scoped>
.recording-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  margin: 8px 0;
}

.recording-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.recording-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #ef4444;
}

.recording-time {
  font-size: 0.875rem;
  font-family: monospace;
  color: var(--text-secondary, #6b7280);
}

.recording-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
