<template>
  <div class="settings-view">
    <h1 class="settings-title">设置</h1>

    <div class="settings-content">
      <!-- 外观设置 -->
      <section class="settings-card">
        <h2 class="card-title">外观设置</h2>

        <div class="setting-row">
          <div class="setting-label">
            <span class="label-text">主题</span>
            <span class="label-desc">选择应用的显示主题</span>
          </div>
          <div class="theme-options">
            <div
              v-for="opt in themeOptions"
              :key="opt.value"
              class="theme-card"
              :class="{ active: settingsStore.settings.theme === opt.value }"
              @click="settingsStore.setTheme(opt.value)"
            >
              <div class="theme-preview" :class="opt.value">
                <div class="preview-bar" />
                <div class="preview-body">
                  <div class="preview-line short" />
                  <div class="preview-line" />
                </div>
              </div>
              <span class="theme-name">{{ opt.label }}</span>
            </div>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-label">
            <span class="label-text">编辑器字体大小</span>
            <span class="label-desc">调整编辑器中的文字大小</span>
          </div>
          <div class="setting-control slider-control">
            <span class="slider-value">{{ settingsStore.settings.editorFontSize }}px</span>
            <el-slider
              :model-value="settingsStore.settings.editorFontSize"
              :min="12"
              :max="24"
              :step="1"
              :show-tooltip="false"
              style="width: 160px"
              @change="(val: number) => settingsStore.setEditorFontSize(val)"
            />
          </div>
        </div>
      </section>

      <!-- 编辑器设置 -->
      <section class="settings-card">
        <h2 class="card-title">编辑器设置</h2>

        <div class="setting-row">
          <div class="setting-label">
            <span class="label-text">自动保存</span>
            <span class="label-desc">编辑内容后自动保存到本地</span>
          </div>
          <div class="setting-control">
            <el-switch
              :model-value="settingsStore.settings.autoSave"
              @change="(val: boolean) => settingsStore.setAutoSave(val)"
            />
          </div>
        </div>

        <div v-if="settingsStore.settings.autoSave" class="setting-row">
          <div class="setting-label">
            <span class="label-text">自动保存间隔</span>
            <span class="label-desc">两次自动保存之间的等待时间</span>
          </div>
          <div class="setting-control">
            <el-select
              :model-value="settingsStore.settings.autoSaveInterval"
              @change="(val: number) => settingsStore.setAutoSaveInterval(val)"
              style="width: 120px"
            >
              <el-option
                v-for="opt in intervalOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
        </div>
      </section>

      <!-- 联网搜索设置 -->
      <section class="settings-card">
        <h2 class="card-title">联网搜索</h2>
        <p class="card-desc">配置搜索 API 后，AI 助手可实时搜索互联网获取最新信息。按优先级尝试：Tavily → Serper → Google → Bocha</p>

        <div class="setting-row">
          <div class="setting-label">
            <span class="label-text">Tavily API Key</span>
            <span class="label-desc">推荐，专为 AI 设计的搜索 API</span>
          </div>
          <div class="setting-control">
            <el-input
              v-model="searchKeys.tavily"
              placeholder="tvly-..."
              type="password"
              show-password
              style="width: 240px"
              @change="saveSearchKeys"
            />
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-label">
            <span class="label-text">Serper API Key</span>
            <span class="label-desc">Google 搜索结果 API</span>
          </div>
          <div class="setting-control">
            <el-input
              v-model="searchKeys.serper"
              placeholder="API Key"
              type="password"
              show-password
              style="width: 240px"
              @change="saveSearchKeys"
            />
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-label">
            <span class="label-text">Google Custom Search API Key</span>
            <span class="label-desc">需同时配置搜索引擎 ID (CX)</span>
          </div>
          <div class="setting-control" style="display:flex;gap:8px;">
            <el-input
              v-model="searchKeys.google"
              placeholder="API Key"
              type="password"
              show-password
              style="width: 160px"
              @change="saveSearchKeys"
            />
            <el-input
              v-model="searchKeys.googleCx"
              placeholder="CX ID"
              style="width: 120px"
              @change="saveSearchKeys"
            />
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-label">
            <span class="label-text">Bocha API Key</span>
            <span class="label-desc">博查 AI 搜索</span>
          </div>
          <div class="setting-control">
            <el-input
              v-model="searchKeys.bocha"
              placeholder="sk-..."
              type="password"
              show-password
              style="width: 240px"
              @change="saveSearchKeys"
            />
          </div>
        </div>
      </section>

      <!-- 工作区信息 -->
      <section class="settings-card">
        <h2 class="card-title">工作区信息</h2>

        <div class="setting-row">
          <div class="setting-label">
            <span class="label-text">当前工作区</span>
            <span class="label-desc path-text">{{ workspacePath || '未设置' }}</span>
          </div>
          <div class="setting-control workspace-actions">
            <button
              v-if="workspacePath"
              class="btn btn-secondary btn-sm"
              @click="revealInFinder"
            >
              在 Finder 中打开
            </button>
            <button class="btn btn-secondary btn-sm" @click="switchWorkspace">
              切换工作区
            </button>
          </div>
        </div>
      </section>

      <!-- 关于 -->
      <section class="settings-card">
        <h2 class="card-title">关于</h2>

        <div class="about-info">
          <div class="about-name">KnowledgeHub</div>
          <div class="about-version">版本 1.0.0</div>
          <div class="about-tech">Electron + Vue 3 + Tiptap</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

const workspacePath = ref('')

const searchKeys = reactive({
  tavily: '',
  serper: '',
  google: '',
  googleCx: '',
  bocha: '',
})

const themeOptions: { value: 'light' | 'dark' | 'system'; label: string }[] = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
  { value: 'system', label: '跟随系统' },
]

const intervalOptions = [
  { value: 10000, label: '10 秒' },
  { value: 30000, label: '30 秒' },
  { value: 60000, label: '60 秒' },
  { value: 120000, label: '120 秒' },
]

onMounted(async () => {
  await settingsStore.fetchSettings()
  workspacePath.value = localStorage.getItem('currentWorkspace') || ''
  // 加载搜索 API Key
  try {
    const result = await window.api.settingsGet()
    if (result.success && result.data) {
      const s = result.data as any
      searchKeys.tavily = s.search_tavily_key || ''
      searchKeys.serper = s.search_serper_key || ''
      searchKeys.google = s.search_google_key || ''
      searchKeys.googleCx = s.search_google_cx || ''
      searchKeys.bocha = s.search_bocha_key || ''
    }
  } catch (e) {
    console.error('加载搜索设置失败:', e)
  }
})

async function saveSearchKeys() {
  try {
    await window.api.settingsSet({
      search_tavily_key: searchKeys.tavily,
      search_serper_key: searchKeys.serper,
      search_google_key: searchKeys.google,
      search_google_cx: searchKeys.googleCx,
      search_bocha_key: searchKeys.bocha,
    } as any)
  } catch (e) {
    console.error('保存搜索设置失败:', e)
  }
}

async function revealInFinder() {
  if (workspacePath.value) {
    await window.api.revealInExplorer(workspacePath.value)
  }
}

async function switchWorkspace() {
  try {
    const result = await window.api.openDirectory()
    if (result) {
      const path = typeof result === 'string' ? result : (result as any).path || (result as any)[0]
      if (path) {
        await window.api.setWorkspace(path)
        localStorage.setItem('currentWorkspace', path)
        workspacePath.value = path
        // 刷新应用以加载新工作区
        window.location.reload()
      }
    }
  } catch (e) {
    console.error('切换工作区失败:', e)
  }
}
</script>

<style scoped>
.settings-view {
  height: 100%;
  overflow-y: auto;
  padding: 32px 40px;
}

.settings-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.settings-content {
  max-width: 680px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 卡片 */
.settings-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
}

.card-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.card-desc {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: -12px;
  margin-bottom: 16px;
  line-height: 1.5;
}

/* 设置行 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}

.setting-row + .setting-row {
  border-top: 1px solid var(--border-color);
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.label-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.label-desc {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.path-text {
  word-break: break-all;
  max-width: 360px;
}

.setting-control {
  flex-shrink: 0;
}

/* 主题选择 */
.theme-options {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.theme-card.active {
  border-color: var(--accent-color);
}

.theme-card:hover:not(.active) {
  border-color: var(--border-color);
}

.theme-preview {
  width: 64px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.theme-preview.light {
  background: #f5f5f5;
}

.theme-preview.light .preview-bar {
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
}

.theme-preview.light .preview-line {
  background: #d0d0d0;
}

.theme-preview.dark {
  background: #1e1e1e;
}

.theme-preview.dark .preview-bar {
  background: #2a2a2a;
  border-bottom: 1px solid #333;
}

.theme-preview.dark .preview-line {
  background: #444;
}

.theme-preview.system {
  background: linear-gradient(135deg, #f5f5f5 50%, #1e1e1e 50%);
}

.theme-preview.system .preview-bar {
  background: linear-gradient(90deg, #ffffff 50%, #2a2a2a 50%);
  border-bottom: 1px solid #999;
}

.theme-preview.system .preview-line {
  background: linear-gradient(90deg, #d0d0d0 50%, #444 50%);
}

.preview-bar {
  height: 10px;
  flex-shrink: 0;
}

.preview-body {
  flex: 1;
  padding: 5px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-line {
  height: 4px;
  border-radius: 2px;
}

.preview-line.short {
  width: 60%;
}

.theme-name {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.theme-card.active .theme-name {
  color: var(--accent-color);
  font-weight: 500;
}

/* Slider */
.slider-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-value {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 36px;
  text-align: right;
}

/* 工作区按钮组 */
.workspace-actions {
  display: flex;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 0.8125rem;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-primary);
  border-color: var(--text-tertiary);
}

/* 关于 */
.about-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.about-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.about-version {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.about-tech {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* Element Plus 样式覆盖 */
:deep(.el-slider__runway) {
  height: 4px;
  background: var(--border-color);
}

:deep(.el-slider__bar) {
  height: 4px;
  background: var(--accent-color);
}

:deep(.el-slider__button) {
  width: 14px;
  height: 14px;
  border: 2px solid var(--accent-color);
}

:deep(.el-switch.is-checked .el-switch__core) {
  background-color: var(--accent-color);
  border-color: var(--accent-color);
}

:deep(.el-select) {
  --el-fill-color-blank: var(--bg-elevated);
  --el-text-color-regular: var(--text-primary);
  --el-border-color: var(--border-color);
}
</style>
