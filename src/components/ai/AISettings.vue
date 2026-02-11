<template>
  <el-dialog
    v-model="aiStore.settingsOpen"
    title="AI 设置"
    width="440px"
    :append-to-body="true"
  >
    <div class="ai-settings">
      <div class="field">
        <label>API Base URL</label>
        <el-input v-model="aiStore.config.baseUrl" placeholder="https://api.openai.com/v1" />
        <span class="field-hint">兼容 OpenAI 格式的 API 地址</span>
      </div>

      <div class="field">
        <label>API Key</label>
        <el-input
          v-model="aiStore.config.apiKey"
          type="password"
          placeholder="sk-..."
          show-password
        />
      </div>

      <div class="field">
        <label>模型</label>
        <el-input v-model="aiStore.config.model" placeholder="gpt-3.5-turbo" />
        <span class="field-hint">如 gpt-4, deepseek-chat, qwen-turbo 等</span>
      </div>

      <div class="status" :class="{ ok: aiStore.isConfigured }">
        {{ aiStore.isConfigured ? '已配置' : '未配置 - 请填写 API Key' }}
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="testConnection" :disabled="testing">
          {{ testing ? '测试中...' : '测试连接' }}
        </button>
        <button class="btn btn-primary" @click="save">保存</button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAIStore } from '@/stores/ai'

const aiStore = useAIStore()
const testing = ref(false)

async function save() {
  await aiStore.saveConfig()
  aiStore.settingsOpen = false
  ElMessage.success('AI 设置已保存')
}

async function testConnection() {
  if (!aiStore.config.apiKey) {
    ElMessage.warning('请先填写 API Key')
    return
  }
  testing.value = true
  try {
    const result = await window.api.aiChat(
      [{ role: 'user', content: '你好，请回复"连接成功"' }],
      '请只回复"连接成功"四个字'
    )
    if (result.success) {
      ElMessage.success('连接成功: ' + (result.data || '').slice(0, 50))
    } else {
      ElMessage.error('连接失败: ' + (result.error || '未知错误'))
    }
  } catch (e: any) {
    ElMessage.error('连接失败: ' + e.message)
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.ai-settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
}

.field-hint {
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

.status {
  font-size: 0.75rem;
  color: var(--warning-color);
  padding: var(--space-sm) var(--space-md);
  background: #fffbeb;
  border-radius: var(--radius-md);
}

.status.ok {
  color: var(--success-color);
  background: #f0fdf4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}
</style>
