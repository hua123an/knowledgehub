<template>
  <div class="graph-view">
    <!-- 工具栏 -->
    <header class="graph-header">
      <div class="header-title">
        <el-icon><Share /></el-icon>
        <h1>知识图谱</h1>
        <span class="node-count" v-if="stats.nodes">{{ stats.nodes }} 个节点</span>
      </div>
      
      <div class="header-actions">
        <div class="filter-group">
          <button
            v-for="type in nodeTypes"
            :key="type.value"
            class="filter-btn"
            :class="{ active: filterType === type.value }"
            @click="filterType = type.value"
          >
            <el-icon><component :is="type.icon" /></el-icon>
            {{ type.label }}
          </button>
        </div>
        
        <div class="action-buttons">
          <button class="icon-btn" @click="fitView" title="适应视图">
            <el-icon><FullScreen /></el-icon>
          </button>
          <button class="icon-btn" @click="refresh" title="刷新">
            <el-icon><Refresh /></el-icon>
          </button>
        </div>
      </div>
    </header>

    <!-- 图谱容器 -->
    <div class="graph-container">
      <!-- 空状态 -->
      <div v-if="!loading && stats.nodes === 0" class="empty-state">
        <div class="empty-illustration">
          <svg viewBox="0 0 120 120" fill="none">
            <circle cx="30" cy="60" r="15" stroke="currentColor" stroke-width="2" opacity="0.3"/>
            <circle cx="90" cy="40" r="12" stroke="currentColor" stroke-width="2" opacity="0.3"/>
            <circle cx="70" cy="90" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
            <line x1="45" y1="55" x2="78" y2="45" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
            <line x1="40" y1="70" x2="62" y2="83" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
            <line x1="80" y1="52" x2="72" y2="80" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
          </svg>
        </div>
        <h3 class="empty-title">开始构建知识网络</h3>
        <p class="empty-desc">在笔记中使用 [[链接]] 语法连接相关内容</p>
        <button class="btn btn-primary" @click="createNote">
          <el-icon><Plus /></el-icon>
          创建第一篇笔记
        </button>
      </div>
      
      <!-- 加载状态 -->
      <div v-else-if="loading" class="loading-state">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <p>加载图谱中...</p>
      </div>
      
      <!-- 图谱画布 -->
      <div v-else ref="graphRef" class="graph-canvas"></div>
    </div>

    <!-- 节点详情面板 -->
    <transition name="slide">
      <aside v-if="selectedNode" class="detail-panel">
        <div class="panel-header">
          <div class="panel-type" :class="selectedNode.type">
            <el-icon v-if="selectedNode.type === 'markdown'"><EditPen /></el-icon>
            <el-icon v-else-if="selectedNode.type === 'bookmark'"><Link /></el-icon>
            <el-icon v-else><Document /></el-icon>
          </div>
          <h3 class="panel-title">{{ selectedNode.label }}</h3>
          <button class="close-btn" @click="selectedNode = null">
            <el-icon><Close /></el-icon>
          </button>
        </div>
        
        <div class="panel-content">
          <div class="panel-section">
            <h4 class="section-label">连接</h4>
            <div class="connections">
              <div class="connection-stat">
                <span class="stat-value">{{ getConnectionCount(selectedNode.id, 'out') }}</span>
                <span class="stat-label">链接到</span>
              </div>
              <div class="connection-stat">
                <span class="stat-value">{{ getConnectionCount(selectedNode.id, 'in') }}</span>
                <span class="stat-label">被引用</span>
              </div>
            </div>
          </div>
          
          <button class="btn btn-primary full-width" @click="openNote(selectedNode.id)">
            <el-icon><EditPen /></el-icon>
            打开笔记
          </button>
        </div>
      </aside>
    </transition>

    <!-- 图例 -->
    <div class="graph-legend">
      <div class="legend-item">
        <span class="legend-dot markdown"></span>
        <span>Markdown</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot bookmark"></span>
        <span>书签</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot snippet"></span>
        <span>代码</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Share, FullScreen, Refresh, EditPen, Link, Document, 
  Close, Plus, Grid, Loading 
} from '@element-plus/icons-vue'
import type { Network, Options, Data, Node, Edge } from 'vis-network'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'

interface GraphNode {
  id: string
  label: string
  type: string
}

const router = useRouter()
const notesStore = useNotesStore()
const foldersStore = useFoldersStore()

const graphRef = ref<HTMLElement>()
const loading = ref(true)
const filterType = ref('')
const selectedNode = ref<GraphNode | null>(null)
const graphData = ref<{ nodes: GraphNode[]; links: { source: string; target: string }[] }>({ nodes: [], links: [] })

let network: Network | null = null

const nodeTypes = [
  { value: '', label: '全部', icon: Grid },
  { value: 'markdown', label: '笔记', icon: EditPen },
  { value: 'bookmark', label: '书签', icon: Link },
  { value: 'snippet', label: '代码', icon: Document },
]

const stats = computed(() => ({
  nodes: graphData.value.nodes.length,
  links: graphData.value.links.length
}))

const nodeColors = {
  markdown: { background: '#6366f1', border: '#4f46e5', highlight: { background: '#818cf8', border: '#6366f1' } },
  bookmark: { background: '#10b981', border: '#059669', highlight: { background: '#34d399', border: '#10b981' } },
  snippet: { background: '#f59e0b', border: '#d97706', highlight: { background: '#fbbf24', border: '#f59e0b' } },
}

async function loadGraphData() {
  loading.value = true
  try {
    const result = await window.api.linkGetGraph()
    if (result.success && result.data) {
      graphData.value = result.data
    }
  } catch (e) {
    console.error('Failed to load graph data:', e)
    // 如果 API 失败，使用本地笔记数据生成简单图谱
    graphData.value = {
      nodes: notesStore.notes.map(n => ({ id: n.id, label: n.title || '无标题', type: n.type })),
      links: []
    }
  } finally {
    loading.value = false
    await nextTick()
    renderGraph()
  }
}

function renderGraph() {
  if (!graphRef.value) return
  
  // 过滤节点
  let nodes = graphData.value.nodes
  if (filterType.value) {
    nodes = nodes.filter(n => n.type === filterType.value)
  }
  
  const nodeIds = new Set(nodes.map(n => n.id))
  const edges = graphData.value.links.filter(l => 
    nodeIds.has(l.source) && nodeIds.has(l.target)
  )
  
  const visNodes: Node[] = nodes.map(n => ({
    id: n.id,
    label: n.label.length > 20 ? n.label.slice(0, 20) + '...' : n.label,
    title: n.label,
    color: nodeColors[n.type as keyof typeof nodeColors] || nodeColors.markdown,
    font: { color: '#ffffff', size: 12 },
    shape: 'dot',
    size: 20 + Math.min(getConnectionCount(n.id, 'all') * 3, 20),
  }))
  
  const visEdges: Edge[] = edges.map((e, i) => ({
    id: `edge-${i}`,
    from: e.source,
    to: e.target,
    arrows: 'to',
    color: { color: '#94a3b8', opacity: 0.5, highlight: '#6366f1' },
    width: 1,
    smooth: { type: 'continuous' }
  }))
  
  const data: Data = { nodes: visNodes, edges: visEdges }
  
  const options: Options = {
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -50,
        centralGravity: 0.01,
        springLength: 150,
        springConstant: 0.08,
        damping: 0.4
      },
      stabilization: {
        enabled: true,
        iterations: 200,
        updateInterval: 25
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
      zoomView: true,
      dragView: true
    },
    nodes: {
      borderWidth: 2,
      shadow: true
    },
    edges: {
      smooth: {
        enabled: true,
        type: 'continuous'
      }
    }
  }
  
  if (network) {
    network.destroy()
  }
  
  // 动态导入 vis-network
  import('vis-network').then(({ Network }) => {
    network = new Network(graphRef.value!, data, options)
    
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0]
        const node = graphData.value.nodes.find(n => n.id === nodeId)
        if (node) {
          selectedNode.value = node
        }
      } else {
        selectedNode.value = null
      }
    })
    
    network.on('doubleClick', (params) => {
      if (params.nodes.length > 0) {
        openNote(params.nodes[0])
      }
    })
  })
}

function getConnectionCount(nodeId: string, direction: 'in' | 'out' | 'all'): number {
  const links = graphData.value.links
  if (direction === 'in') {
    return links.filter(l => l.target === nodeId).length
  } else if (direction === 'out') {
    return links.filter(l => l.source === nodeId).length
  }
  return links.filter(l => l.source === nodeId || l.target === nodeId).length
}

function fitView() {
  network?.fit({ animation: true })
}

function refresh() {
  loadGraphData()
}

function openNote(id: string) {
  router.push(`/editor/${id}`)
}

async function createNote() {
  const note = await notesStore.createNote({
    title: '新笔记',
    type: 'markdown',
    content: '',
    folderId: foldersStore.currentFolder?.id || null,
  })
  if (note) {
    router.push(`/editor/${note.id}`)
  }
}

watch(filterType, () => {
  renderGraph()
})

onMounted(() => {
  loadGraphData()
})

onUnmounted(() => {
  if (network) {
    network.destroy()
    network = null
  }
})
</script>

<style scoped>
.graph-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  position: relative;
}

/* 头部 */
.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg) var(--space-xl);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.header-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.header-title h1 {
  font-size: 1.25rem;
  font-weight: 600;
}

.node-count {
  font-size: 0.75rem;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: var(--radius-full);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.filter-group {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.filter-btn:hover {
  color: var(--text-primary);
}

.filter-btn.active {
  background: var(--bg-primary);
  color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.action-buttons {
  display: flex;
  gap: var(--space-xs);
}

/* 图谱容器 */
.graph-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.graph-canvas {
  width: 100%;
  height: 100%;
}

/* 空状态 */
.empty-state, .loading-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.empty-illustration {
  width: 120px;
  height: 120px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-lg);
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-sm);
}

.empty-desc {
  color: var(--text-secondary);
  margin-bottom: var(--space-lg);
}

.loading-state p {
  color: var(--text-secondary);
  margin-top: var(--space-md);
}

/* 详情面板 */
.detail-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 300px;
  height: 100%;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg);
  border-bottom: 1px solid var(--border-color);
}

.panel-type {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.panel-type.markdown {
  background: rgba(99, 102, 241, 0.1);
  color: var(--type-markdown);
}

.panel-type.bookmark {
  background: rgba(16, 185, 129, 0.1);
  color: var(--type-bookmark);
}

.panel-type.snippet {
  background: rgba(245, 158, 11, 0.1);
  color: var(--type-snippet);
}

.panel-title {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.panel-content {
  flex: 1;
  padding: var(--space-lg);
}

.panel-section {
  margin-bottom: var(--space-xl);
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-md);
}

.connections {
  display: flex;
  gap: var(--space-lg);
}

.connection-stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.full-width {
  width: 100%;
}

/* 图例 */
.graph-legend {
  position: absolute;
  bottom: var(--space-lg);
  left: var(--space-lg);
  display: flex;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.markdown { background: #6366f1; }
.legend-dot.bookmark { background: #10b981; }
.legend-dot.snippet { background: #f59e0b; }

/* 动画 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
