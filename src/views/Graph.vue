<template>
  <div class="graph-view">
    <header class="graph-header">
      <div class="header-left">
        <h1>知识图谱</h1>
        <span class="node-count" v-if="stats.nodes">{{ stats.nodes }} 个节点</span>
      </div>
      <div class="header-right">
        <button
          v-for="t in nodeTypes" :key="t.value"
          class="filter-btn" :class="{ active: filterType === t.value }"
          @click="filterType = t.value"
        >{{ t.label }}</button>
        <span class="sep"></span>
        <button class="icon-btn" @click="fitView" title="适应"><el-icon><FullScreen /></el-icon></button>
        <button class="icon-btn" @click="refresh" title="刷新"><el-icon><Refresh /></el-icon></button>
      </div>
    </header>

    <div class="graph-body">
      <div v-if="!loading && stats.nodes === 0" class="empty-hint">
        <p>还没有数据，创建笔记并使用 [[链接]] 语法来构建知识网络</p>
        <button class="btn btn-primary" @click="createNote">新建笔记</button>
      </div>
      <div v-else-if="loading" class="empty-hint">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      </div>
      <div v-else ref="graphRef" class="graph-canvas"></div>
    </div>

    <!-- 选中详情 -->
    <transition name="slide">
      <aside v-if="selectedNode" class="detail-panel">
        <div class="panel-head">
          <span class="panel-title">{{ selectedNode.label }}</span>
          <button class="icon-btn" @click="selectedNode = null"><el-icon><Close /></el-icon></button>
        </div>
        <div class="panel-body">
          <div class="panel-stat">
            <div><strong>{{ getCount(selectedNode.id, 'out') }}</strong><span>链接到</span></div>
            <div><strong>{{ getCount(selectedNode.id, 'in') }}</strong><span>被引用</span></div>
          </div>
          <button class="btn btn-primary" style="width:100%" @click="router.push(`/editor/${selectedNode.id}`)">打开</button>
        </div>
      </aside>
    </transition>

    <!-- 图例 -->
    <div class="legend" v-if="stats.nodes > 0">
      <span><i class="dot" style="background:#1a1a1a"></i>笔记</span>
      <span><i class="dot" style="background:#0066ff"></i>书签</span>
      <span><i class="dot" style="background:#e6a700"></i>代码</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { FullScreen, Refresh, Close, Loading } from '@element-plus/icons-vue'
import type { Network, Options, Data, Node, Edge } from 'vis-network'
import { useNotesStore } from '@/stores/notes'
import { useFoldersStore } from '@/stores/folders'

interface GraphNode { id: string; label: string; type: string }

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
  { value: '', label: '全部' },
  { value: 'markdown', label: '笔记' },
  { value: 'bookmark', label: '书签' },
  { value: 'snippet', label: '代码' },
]

const stats = computed(() => ({ nodes: graphData.value.nodes.length, links: graphData.value.links.length }))

const colors: Record<string, any> = {
  markdown: { background: '#1a1a1a', border: '#333', highlight: { background: '#333', border: '#1a1a1a' } },
  bookmark: { background: '#0066ff', border: '#0055dd', highlight: { background: '#4d94ff', border: '#0066ff' } },
  snippet: { background: '#e6a700', border: '#cc9200', highlight: { background: '#ffc533', border: '#e6a700' } },
}

async function loadGraphData() {
  loading.value = true
  try {
    const result = await window.api.linkGetGraph()
    if (result.success && result.data) graphData.value = result.data
  } catch {
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
  let nodes = graphData.value.nodes
  if (filterType.value) nodes = nodes.filter(n => n.type === filterType.value)
  const ids = new Set(nodes.map(n => n.id))
  const edges = graphData.value.links.filter(l => ids.has(l.source) && ids.has(l.target))

  const visNodes: Node[] = nodes.map(n => ({
    id: n.id,
    label: n.label.length > 16 ? n.label.slice(0, 16) + '...' : n.label,
    title: n.label,
    color: colors[n.type] || colors.markdown,
    font: { color: '#fff', size: 11 },
    shape: 'dot',
    size: 16 + Math.min(getCount(n.id, 'all') * 3, 16),
  }))

  const visEdges: Edge[] = edges.map((e, i) => ({
    id: `e-${i}`, from: e.source, to: e.target, arrows: 'to',
    color: { color: '#ccc', opacity: 0.5 }, width: 1, smooth: { type: 'continuous' }
  }))

  const options: Options = {
    physics: { enabled: true, solver: 'forceAtlas2Based', forceAtlas2Based: { gravitationalConstant: -40, springLength: 120, springConstant: 0.08 }, stabilization: { iterations: 150 } },
    interaction: { hover: true, zoomView: true, dragView: true },
    nodes: { borderWidth: 2 },
    edges: { smooth: { enabled: true, type: 'continuous' } }
  }

  if (network) network.destroy()

  import('vis-network').then(({ Network }) => {
    network = new Network(graphRef.value!, { nodes: visNodes, edges: visEdges }, options)
    network.on('click', p => {
      if (p.nodes.length) { const n = graphData.value.nodes.find(x => x.id === p.nodes[0]); if (n) selectedNode.value = n }
      else selectedNode.value = null
    })
    network.on('doubleClick', p => { if (p.nodes.length) router.push(`/editor/${p.nodes[0]}`) })
  })
}

function getCount(id: string, dir: 'in' | 'out' | 'all') {
  const l = graphData.value.links
  if (dir === 'in') return l.filter(x => x.target === id).length
  if (dir === 'out') return l.filter(x => x.source === id).length
  return l.filter(x => x.source === id || x.target === id).length
}

function fitView() { network?.fit({ animation: true }) }
function refresh() { loadGraphData() }

async function createNote() {
  const note = await notesStore.createNote({ title: '新笔记', type: 'markdown', content: '', folderId: foldersStore.currentFolder?.id || null })
  if (note) router.push(`/editor/${note.id}`)
}

watch(filterType, renderGraph)
onMounted(loadGraphData)
onUnmounted(() => { network?.destroy(); network = null })
</script>

<style scoped>
.graph-view { height: 100%; display: flex; flex-direction: column; position: relative; }

.graph-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-md) var(--space-xl);
  border-bottom: 1px solid var(--border-color);
}

.header-left { display: flex; align-items: center; gap: var(--space-sm); }
.header-left h1 { font-size: 1rem; font-weight: 600; }
.node-count { font-size: 0.75rem; color: var(--text-tertiary); }
.header-right { display: flex; align-items: center; gap: 4px; }
.sep { width: 1px; height: 16px; background: var(--border-color); margin: 0 var(--space-sm); }

.filter-btn {
  padding: 4px 10px; font-size: 0.75rem; color: var(--text-tertiary);
  border-radius: var(--radius-full); transition: all var(--transition-fast);
}
.filter-btn:hover { color: var(--text-primary); }
.filter-btn.active { background: var(--bg-tertiary); color: var(--text-primary); }

.graph-body { flex: 1; position: relative; overflow: hidden; }
.graph-canvas { width: 100%; height: 100%; }
.empty-hint { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-md); color: var(--text-tertiary); font-size: 0.875rem; }

.detail-panel {
  position: absolute; top: 0; right: 0; width: 240px; height: 100%;
  background: var(--bg-primary); border-left: 1px solid var(--border-color);
}
.panel-head { display: flex; align-items: center; justify-content: space-between; padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border-color); }
.panel-title { font-size: 0.875rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.panel-body { padding: var(--space-lg); }
.panel-stat { display: flex; gap: var(--space-xl); margin-bottom: var(--space-lg); }
.panel-stat div { display: flex; flex-direction: column; }
.panel-stat strong { font-size: 1.25rem; }
.panel-stat span { font-size: 0.6875rem; color: var(--text-tertiary); }

.legend {
  position: absolute; bottom: var(--space-md); left: var(--space-md);
  display: flex; gap: var(--space-md); padding: 6px 12px;
  background: var(--bg-primary); border: 1px solid var(--border-color);
  border-radius: var(--radius-md); font-size: 0.6875rem; color: var(--text-tertiary);
}
.legend span { display: flex; align-items: center; gap: 4px; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

.slide-enter-active, .slide-leave-active { transition: transform 0.2s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
</style>
