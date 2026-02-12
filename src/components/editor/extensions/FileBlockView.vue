<template>
  <node-view-wrapper class="file-block">
    <div class="file-card" @dblclick="openExternal">
      <div class="file-icon" :class="iconClass">
        <el-icon :size="20">
          <Document v-if="isPdf" />
          <Tickets v-else-if="isSpreadsheet" />
          <Reading v-else-if="isWord" />
          <Memo v-else />
        </el-icon>
      </div>
      <div class="file-info">
        <span class="file-name">{{ node.attrs.filename || '未知文件' }}</span>
        <span class="file-size">{{ formatSize(node.attrs.size) }}</span>
      </div>
      <div class="file-actions">
        <el-button circle size="small" @click="openExternal" title="打开">
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
import { computed } from 'vue'
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { Document, Tickets, Reading, Memo, FolderOpened, Delete } from '@element-plus/icons-vue'

const props = defineProps(nodeViewProps)

const mime = computed(() => props.node.attrs.mimeType || '')
const isPdf = computed(() => mime.value.includes('pdf'))
const isSpreadsheet = computed(() => mime.value.includes('sheet') || mime.value.includes('excel'))
const isWord = computed(() => mime.value.includes('word') || mime.value.includes('document'))

const iconClass = computed(() => {
  if (isPdf.value) return 'pdf'
  if (isSpreadsheet.value) return 'excel'
  if (isWord.value) return 'word'
  return 'other'
})

function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
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
.file-block {
  margin: 12px 0;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  max-width: 400px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.file-card:hover {
  border-color: var(--primary-color, #6366f1);
}

.file-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
  color: white;
}

.file-icon.pdf { background: linear-gradient(135deg, #ef4444, #dc2626); }
.file-icon.excel { background: linear-gradient(135deg, #10b981, #059669); }
.file-icon.word { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.file-icon.other { background: linear-gradient(135deg, #6b7280, #4b5563); }

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary, #1f2937);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.75rem;
  color: var(--text-tertiary, #9ca3af);
}

.file-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.file-card:hover .file-actions {
  opacity: 1;
}
</style>
