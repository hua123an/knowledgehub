<template>
  <div class="bookmark-editor">
    <el-form label-width="80px">
      <el-form-item label="URL">
        <el-input
          v-model="url"
          placeholder="https://example.com"
          @blur="fetchMetadata"
        >
          <template #append>
            <el-button @click="fetchMetadata" :loading="fetching">
              获取信息
            </el-button>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="标题">
        <el-input v-model="title" @change="emitUpdate" />
      </el-form-item>

      <el-form-item label="描述">
        <el-input
          type="textarea"
          v-model="description"
          :rows="3"
          @change="emitUpdate"
        />
      </el-form-item>

      <el-form-item label="封面图">
        <div class="cover-preview" v-if="coverUrl">
          <img :src="coverUrl" alt="封面" />
          <el-button type="danger" size="small" @click="clearCover">
            移除
          </el-button>
        </div>
        <el-input v-model="coverUrl" placeholder="封面图片URL" @change="emitUpdate" />
      </el-form-item>
    </el-form>

    <div class="bookmark-preview" v-if="url">
      <el-card shadow="hover">
        <div class="preview-cover" v-if="coverUrl">
          <img :src="coverUrl" alt="封面" />
        </div>
        <div class="preview-content">
          <h4>{{ title || '无标题' }}</h4>
          <p>{{ description || '无描述' }}</p>
          <a :href="url" target="_blank" class="preview-url">
            <el-icon><Link /></el-icon>
            {{ url }}
          </a>
        </div>
      </el-card>
    </div>

    <div class="bookmark-actions">
      <el-button type="primary" @click="openUrl" :disabled="!url">
        <el-icon><Link /></el-icon>
        打开链接
      </el-button>
      <el-button @click="copyUrl" :disabled="!url">
        <el-icon><CopyDocument /></el-icon>
        复制链接
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Link, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { Note, BookmarkMeta } from '../../types'

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits<{
  update: [data: Partial<Note>]
}>()

const url = ref('')
const title = ref('')
const description = ref('')
const coverUrl = ref('')
const fetching = ref(false)

function parseContent() {
  try {
    const meta: BookmarkMeta = JSON.parse(props.note.content || '{}')
    url.value = meta.url || ''
    description.value = meta.description || ''
    coverUrl.value = meta.coverUrl || ''
  } catch {
    url.value = props.note.content || ''
  }
  title.value = props.note.title
}

function emitUpdate() {
  const meta: BookmarkMeta = {
    url: url.value,
    description: description.value,
    coverUrl: coverUrl.value
  }
  emit('update', {
    title: title.value,
    content: JSON.stringify(meta)
  })
}

async function fetchMetadata() {
  if (!url.value) return
  
  fetching.value = true
  try {
    // Use Electron IPC to fetch page metadata
    if (window.api?.fetchUrlMeta) {
      const meta = await window.api.fetchUrlMeta(url.value)
      if (meta) {
        if (meta.title && !title.value) title.value = meta.title
        if (meta.description) description.value = meta.description
        if (meta.image) coverUrl.value = meta.image
        emitUpdate()
      }
    }
  } catch (err) {
    ElMessage.warning('无法获取页面信息')
  } finally {
    fetching.value = false
  }
}

function clearCover() {
  coverUrl.value = ''
  emitUpdate()
}

function openUrl() {
  if (url.value) {
    window.open(url.value, '_blank')
  }
}

async function copyUrl() {
  if (url.value) {
    await navigator.clipboard.writeText(url.value)
    ElMessage.success('链接已复制')
  }
}

watch(() => props.note, parseContent, { immediate: true })

onMounted(parseContent)
</script>

<style scoped>
.bookmark-editor {
  max-width: 800px;
}

.cover-preview {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.cover-preview img {
  max-width: 200px;
  max-height: 120px;
  border-radius: 4px;
  object-fit: cover;
}

.bookmark-preview {
  margin-top: 24px;
}

.preview-cover img {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 12px;
}

.preview-content h4 {
  margin: 0 0 8px;
  font-size: 16px;
}

.preview-content p {
  color: var(--el-text-color-secondary);
  margin: 0 0 12px;
  font-size: 14px;
}

.preview-url {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-color-primary);
  font-size: 13px;
  text-decoration: none;
}

.bookmark-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
</style>
