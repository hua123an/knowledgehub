<template>
  <Teleport to="body">
    <Transition name="cmd-palette">
      <div v-if="visible" class="cmd-palette-overlay" @mousedown.self="emit('close')">
        <div class="cmd-palette-panel">
          <!-- Search input -->
          <div class="cmd-palette-header">
            <el-icon class="search-icon"><Search /></el-icon>
            <input
              ref="inputRef"
              v-model="query"
              class="cmd-palette-input"
              placeholder="输入命令或搜索笔记..."
              @keydown="handleKeydown"
            />
            <kbd class="esc-hint">ESC</kbd>
          </div>

          <!-- Results list -->
          <div class="cmd-palette-body" ref="listRef">
            <template v-if="filteredGroups.length">
              <div v-for="group in filteredGroups" :key="group.label" class="cmd-group">
                <div class="cmd-group-label">{{ group.label }}</div>
                <div
                  v-for="item in group.items"
                  :key="item.id"
                  class="cmd-item"
                  :class="{ active: item.id === activeId }"
                  :data-id="item.id"
                  @mouseenter="activeId = item.id"
                  @click="executeItem(item)"
                >
                  <el-icon class="cmd-item-icon"><component :is="item.icon" /></el-icon>
                  <span class="cmd-item-label">{{ item.label }}</span>
                  <kbd v-if="item.shortcut" class="cmd-item-shortcut">{{ item.shortcut }}</kbd>
                </div>
              </div>
            </template>

            <!-- Note search results -->
            <div v-if="noteResults.length" class="cmd-group">
              <div class="cmd-group-label">笔记搜索</div>
              <div
                v-for="item in noteResults"
                :key="item.id"
                class="cmd-item"
                :class="{ active: item.id === activeId }"
                :data-id="item.id"
                @mouseenter="activeId = item.id"
                @click="executeItem(item)"
              >
                <el-icon class="cmd-item-icon"><Document /></el-icon>
                <div class="cmd-item-note">
                  <span class="cmd-item-label">{{ item.label }}</span>
                  <span v-if="item.snippet" class="cmd-item-snippet">{{ item.snippet }}</span>
                </div>
              </div>
            </div>

            <!-- Loading state -->
            <div v-if="isSearchingNotes" class="cmd-status">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>正在搜索笔记...</span>
            </div>

            <!-- Empty state -->
            <div v-if="!filteredGroups.length && !noteResults.length && !isSearchingNotes && query.trim()" class="cmd-status">
              <span>未找到匹配的命令或笔记</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, type Component as VueComponent } from 'vue'
import {
  Search,
  Document,
  Plus,
  FolderAdd,
  HomeFilled,
  Share,
  Setting,
  Delete,
  Sunny,
  Moon,
  Monitor,
  Loading,
} from '@element-plus/icons-vue'

// ---- Types ----

interface CommandItem {
  id: string
  label: string
  icon: VueComponent
  shortcut?: string
  group: string
  action: { type: 'navigate' | 'create' | 'theme' | 'openNote'; payload: any }
  snippet?: string
}

interface CommandGroup {
  label: string
  items: CommandItem[]
}

// ---- Props & Emits ----

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  action: [payload: { type: 'navigate' | 'create' | 'theme' | 'openNote'; payload: any }]
}>()

// ---- Refs ----

const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLDivElement | null>(null)
const query = ref('')
const activeId = ref('')
const noteResults = ref<CommandItem[]>([])
const isSearchingNotes = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

// ---- Static commands ----

const commands: CommandItem[] = [
  // Quick actions
  {
    id: 'create-note',
    label: '新建笔记',
    icon: Plus,
    shortcut: '\u2318N',
    group: '快速操作',
    action: { type: 'create', payload: 'note' },
  },
  {
    id: 'create-folder',
    label: '新建文件夹',
    icon: FolderAdd,
    shortcut: '\u2318\u21E7N',
    group: '快速操作',
    action: { type: 'create', payload: 'folder' },
  },
  // Navigation
  {
    id: 'nav-home',
    label: '去首页',
    icon: HomeFilled,
    shortcut: '\u2318\u21E71',
    group: '导航',
    action: { type: 'navigate', payload: '/' },
  },
  {
    id: 'nav-graph',
    label: '去图谱',
    icon: Share,
    group: '导航',
    action: { type: 'navigate', payload: '/graph' },
  },
  {
    id: 'nav-settings',
    label: '去设置',
    icon: Setting,
    shortcut: '\u2318,',
    group: '导航',
    action: { type: 'navigate', payload: '/settings' },
  },
  {
    id: 'nav-trash',
    label: '去回收站',
    icon: Delete,
    group: '导航',
    action: { type: 'navigate', payload: '/trash' },
  },
  // Theme
  {
    id: 'theme-light',
    label: '切换亮色主题',
    icon: Sunny,
    group: '外观',
    action: { type: 'theme', payload: 'light' },
  },
  {
    id: 'theme-dark',
    label: '切换暗色主题',
    icon: Moon,
    group: '外观',
    action: { type: 'theme', payload: 'dark' },
  },
  {
    id: 'theme-system',
    label: '跟随系统',
    icon: Monitor,
    group: '外观',
    action: { type: 'theme', payload: 'system' },
  },
]

// ---- Fuzzy matching ----

function fuzzyMatch(text: string, pattern: string): boolean {
  const lowerText = text.toLowerCase()
  const lowerPattern = pattern.toLowerCase()
  // Check if all characters of pattern appear in text in order
  let ti = 0
  for (let pi = 0; pi < lowerPattern.length; pi++) {
    const ch = lowerPattern[pi]
    const found = lowerText.indexOf(ch, ti)
    if (found === -1) return false
    ti = found + 1
  }
  return true
}

// ---- Filtered groups ----

const filteredGroups = computed<CommandGroup[]>(() => {
  const q = query.value.trim()
  const items = q ? commands.filter((c) => fuzzyMatch(c.label, q)) : commands

  const groupMap = new Map<string, CommandItem[]>()
  const groupOrder = ['快速操作', '导航', '外观']

  for (const item of items) {
    if (!groupMap.has(item.group)) {
      groupMap.set(item.group, [])
    }
    groupMap.get(item.group)!.push(item)
  }

  const groups: CommandGroup[] = []
  for (const label of groupOrder) {
    const list = groupMap.get(label)
    if (list && list.length) {
      groups.push({ label, items: list })
    }
  }
  return groups
})

// ---- All visible items (for keyboard navigation) ----

const allVisibleItems = computed<CommandItem[]>(() => {
  const items: CommandItem[] = []
  for (const g of filteredGroups.value) {
    items.push(...g.items)
  }
  items.push(...noteResults.value)
  return items
})

// ---- Note search ----

async function searchNotes(q: string) {
  if (!q.trim()) {
    noteResults.value = []
    return
  }
  isSearchingNotes.value = true
  try {
    const res = await window.api.noteSearch(q)
    if (res.success && res.data) {
      noteResults.value = res.data.slice(0, 8).map((r: any) => ({
        id: `note-${r.note.id}`,
        label: r.note.title || '无标题',
        icon: Document,
        group: '笔记搜索',
        snippet: r.highlights?.[0] || '',
        action: { type: 'openNote' as const, payload: r.note.id },
      }))
    } else {
      noteResults.value = []
    }
  } catch {
    noteResults.value = []
  } finally {
    isSearchingNotes.value = false
  }
}

// ---- Watch query changes ----

watch(query, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (val.trim()) {
    searchTimer = setTimeout(() => searchNotes(val), 300)
  } else {
    noteResults.value = []
  }
})

// ---- Watch visibility ----

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      query.value = ''
      noteResults.value = []
      activeId.value = ''
      await nextTick()
      inputRef.value?.focus()
      // Set initial active to first item
      if (allVisibleItems.value.length) {
        activeId.value = allVisibleItems.value[0].id
      }
    }
  }
)

// ---- Update activeId when items change ----

watch(allVisibleItems, (items) => {
  if (items.length && !items.find((i) => i.id === activeId.value)) {
    activeId.value = items[0].id
  }
})

// ---- Execute item ----

function executeItem(item: CommandItem) {
  emit('action', item.action)
  emit('close')
}

// ---- Keyboard navigation ----

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }

  const items = allVisibleItems.value
  if (!items.length) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const idx = items.findIndex((i) => i.id === activeId.value)
    const next = idx < items.length - 1 ? idx + 1 : 0
    activeId.value = items[next].id
    scrollToActive()
    return
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    const idx = items.findIndex((i) => i.id === activeId.value)
    const prev = idx > 0 ? idx - 1 : items.length - 1
    activeId.value = items[prev].id
    scrollToActive()
    return
  }

  if (e.key === 'Enter') {
    e.preventDefault()
    const item = items.find((i) => i.id === activeId.value)
    if (item) executeItem(item)
    return
  }
}

function scrollToActive() {
  nextTick(() => {
    const el = listRef.value?.querySelector(`[data-id="${activeId.value}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  })
}

// ---- Global Escape listener ----

function handleGlobalKeydown(e: KeyboardEvent) {
  if (props.visible && e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
/* Overlay */
.cmd-palette-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 120px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

/* Panel */
.cmd-palette-panel {
  width: 560px;
  max-height: 480px;
  background: var(--bg-elevated, var(--bg-primary));
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header / Search */
.cmd-palette-header {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
  gap: 10px;
  flex-shrink: 0;
}

.search-icon {
  font-size: 18px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.cmd-palette-input {
  flex: 1;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  color: var(--text-primary);
  caret-color: var(--accent-color);
}

.cmd-palette-input::placeholder {
  color: var(--text-tertiary);
}

.esc-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 2px 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary, var(--bg-primary));
  line-height: 1.2;
  flex-shrink: 0;
}

/* Body / List */
.cmd-palette-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
  overscroll-behavior: contain;
}

/* Group */
.cmd-group {
  padding: 2px 0;
}

.cmd-group-label {
  padding: 6px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  user-select: none;
}

/* Item */
.cmd-item {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  margin: 0 6px;
  border-radius: 8px;
  cursor: pointer;
  gap: 10px;
  transition: background 0.1s ease;
}

.cmd-item.active {
  background: var(--bg-hover);
}

.cmd-item-icon {
  font-size: 16px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.cmd-item.active .cmd-item-icon {
  color: var(--text-primary);
}

.cmd-item-label {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cmd-item-note {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 1px;
}

.cmd-item-note .cmd-item-label {
  font-size: 13px;
  line-height: 1.3;
}

.cmd-item-snippet {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cmd-item-shortcut {
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 2px 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary, var(--bg-primary));
  line-height: 1.2;
  flex-shrink: 0;
  font-family: system-ui, -apple-system, sans-serif;
}

/* Status (loading / empty) */
.cmd-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px;
  font-size: 13px;
  color: var(--text-tertiary);
}

/* Scrollbar */
.cmd-palette-body::-webkit-scrollbar {
  width: 4px;
}

.cmd-palette-body::-webkit-scrollbar-track {
  background: transparent;
}

.cmd-palette-body::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

/* Transition: scale + opacity */
.cmd-palette-enter-active {
  transition: opacity 0.15s ease;
}

.cmd-palette-leave-active {
  transition: opacity 0.1s ease;
}

.cmd-palette-enter-from,
.cmd-palette-leave-to {
  opacity: 0;
}

.cmd-palette-enter-active .cmd-palette-panel {
  animation: cmd-panel-in 0.15s ease;
}

.cmd-palette-leave-active .cmd-palette-panel {
  animation: cmd-panel-out 0.1s ease;
}

@keyframes cmd-panel-in {
  from {
    opacity: 0;
    transform: scale(0.98) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes cmd-panel-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.98) translateY(-4px);
  }
}
</style>
