<template>
  <div class="graph-view">
    <div class="graph-toolbar">
      <el-button-group>
        <el-button @click="zoomIn">
          <el-icon><ZoomIn /></el-icon>
        </el-button>
        <el-button @click="zoomOut">
          <el-icon><ZoomOut /></el-icon>
        </el-button>
        <el-button @click="resetZoom">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
      </el-button-group>
      
      <el-select v-model="filterType" placeholder="筛选类型" clearable size="small">
        <el-option label="全部" value="" />
        <el-option label="笔记" value="markdown" />
        <el-option label="收藏" value="bookmark" />
        <el-option label="代码片段" value="snippet" />
      </el-select>
    </div>

    <div class="graph-container" ref="graphContainer">
      <svg ref="svgElement" class="graph-svg">
        <g ref="graphGroup">
          <!-- Links -->
          <line
            v-for="link in filteredLinks"
            :key="`${link.source}-${link.target}`"
            class="graph-link"
            :x1="getNodePosition(link.source).x"
            :y1="getNodePosition(link.source).y"
            :x2="getNodePosition(link.target).x"
            :y2="getNodePosition(link.target).y"
          />
          
          <!-- Nodes -->
          <g
            v-for="node in filteredNodes"
            :key="node.id"
            class="graph-node"
            :transform="`translate(${node.x}, ${node.y})`"
            @click="selectNode(node)"
            @dblclick="openNote(node)"
          >
            <circle
              :r="getNodeRadius(node)"
              :fill="getNodeColor(node)"
              :class="{ selected: selectedNode?.id === node.id }"
            />
            <text
              :dy="getNodeRadius(node) + 14"
              text-anchor="middle"
              class="node-label"
            >
              {{ truncateText(node.title, 12) }}
            </text>
          </g>
        </g>
      </svg>
    </div>

    <!-- Node Info Panel -->
    <div class="node-info-panel" v-if="selectedNode">
      <div class="panel-header">
        <h3>{{ selectedNode.title }}</h3>
        <el-button link @click="selectedNode = null">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <div class="panel-content">
        <p><strong>类型:</strong> {{ getTypeLabel(selectedNode.type) }}</p>
        <p><strong>链接数:</strong> {{ getNodeLinkCount(selectedNode.id) }}</p>
        <p><strong>更新时间:</strong> {{ formatDate(selectedNode.updatedAt) }}</p>
        <el-button type="primary" @click="openNote(selectedNode)">
          打开笔记
        </el-button>
      </div>
      <div class="panel-connections">
        <h4>相关链接</h4>
        <ul>
          <li
            v-for="linkedNote in getLinkedNotes(selectedNode.id)"
            :key="linkedNote.id"
            @click="selectNodeById(linkedNote.id)"
          >
            {{ linkedNote.title }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ZoomIn, ZoomOut, RefreshRight, Close } from '@element-plus/icons-vue'
import { useNotesStore } from '../stores/notes'
import type { Note, NoteType, GraphNode, GraphLink } from '../types'

interface NodeWithPosition extends Note {
  x: number
  y: number
}

const router = useRouter()
const notesStore = useNotesStore()

const graphContainer = ref<HTMLElement | null>(null)
const svgElement = ref<SVGElement | null>(null)
const graphGroup = ref<SVGGElement | null>(null)

const filterType = ref('')
const selectedNode = ref<NodeWithPosition | null>(null)
const nodes = ref<NodeWithPosition[]>([])
const links = ref<GraphLink[]>([])
const scale = ref(1)

const filteredNodes = computed(() => {
  if (!filterType.value) return nodes.value
  return nodes.value.filter(n => n.type === filterType.value)
})

const filteredLinks = computed(() => {
  const nodeIds = new Set(filteredNodes.value.map(n => n.id))
  return links.value.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
})

function getNodePosition(nodeId: string) {
  const node = nodes.value.find(n => n.id === nodeId)
  return node ? { x: node.x, y: node.y } : { x: 0, y: 0 }
}

function getNodeRadius(node: NodeWithPosition) {
  const linkCount = getNodeLinkCount(node.id)
  return Math.min(8 + linkCount * 2, 24)
}

function getNodeColor(node: NodeWithPosition) {
  const colors: Record<NoteType, string> = {
    markdown: '#667eea',
    bookmark: '#38ef7d',
    snippet: '#f5576c'
  }
  return colors[node.type] || '#999'
}

function getNodeLinkCount(nodeId: string) {
  return links.value.filter(l => l.source === nodeId || l.target === nodeId).length
}

function getLinkedNotes(nodeId: string): Note[] {
  const linkedIds = new Set<string>()
  links.value.forEach(link => {
    if (link.source === nodeId) linkedIds.add(link.target)
    if (link.target === nodeId) linkedIds.add(link.source)
  })
  return nodes.value.filter(n => linkedIds.has(n.id))
}

function getTypeLabel(type: NoteType) {
  const map: Record<NoteType, string> = {
    markdown: '笔记',
    bookmark: '收藏',
    snippet: '代码'
  }
  return map[type] || type
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('zh-CN')
}

function truncateText(text: string, maxLength: number) {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

function selectNode(node: NodeWithPosition) {
  selectedNode.value = node
}

function selectNodeById(id: string) {
  const node = nodes.value.find(n => n.id === id)
  if (node) selectedNode.value = node
}

function openNote(node: NodeWithPosition | Note) {
  router.push({ name: 'editor', params: { id: node.id } })
}

function zoomIn() {
  scale.value = Math.min(scale.value * 1.2, 3)
  applyZoom()
}

function zoomOut() {
  scale.value = Math.max(scale.value / 1.2, 0.3)
  applyZoom()
}

function resetZoom() {
  scale.value = 1
  applyZoom()
}

function applyZoom() {
  if (graphGroup.value) {
    const container = graphContainer.value
    if (!container) return
    const cx = container.clientWidth / 2
    const cy = container.clientHeight / 2
    graphGroup.value.style.transform = `translate(${cx}px, ${cy}px) scale(${scale.value}) translate(${-cx}px, ${-cy}px)`
  }
}

async function loadGraphData() {
  await notesStore.fetchNotes()
  const allNotes = notesStore.notes
  
  // Fetch links from database
  const graphLinks = await notesStore.fetchLinks()
  links.value = graphLinks
  
  // Position nodes using force-directed layout simulation
  const container = graphContainer.value
  if (!container) return
  
  const width = container.clientWidth
  const height = container.clientHeight
  const centerX = width / 2
  const centerY = height / 2
  
  // Simple circular layout
  const nodeCount = allNotes.length
  nodes.value = allNotes.map((note, i) => {
    const angle = (2 * Math.PI * i) / nodeCount
    const radius = Math.min(width, height) * 0.35
    return {
      ...note,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    }
  })
  
  // Apply force simulation for better layout
  simulateForces()
}

function simulateForces() {
  const iterations = 50
  const repulsion = 5000
  const attraction = 0.01
  
  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all nodes
    for (let i = 0; i < nodes.value.length; i++) {
      for (let j = i + 1; j < nodes.value.length; j++) {
        const dx = nodes.value[j].x - nodes.value[i].x
        const dy = nodes.value[j].y - nodes.value[i].y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const force = repulsion / (dist * dist)
        
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        
        nodes.value[i].x -= fx
        nodes.value[i].y -= fy
        nodes.value[j].x += fx
        nodes.value[j].y += fy
      }
    }
    
    // Attraction along links
    for (const link of links.value) {
      const source = nodes.value.find(n => n.id === link.source)
      const target = nodes.value.find(n => n.id === link.target)
      if (!source || !target) continue
      
      const dx = target.x - source.x
      const dy = target.y - source.y
      
      source.x += dx * attraction
      source.y += dy * attraction
      target.x -= dx * attraction
      target.y -= dy * attraction
    }
    
    // Keep nodes in bounds
    const container = graphContainer.value
    if (container) {
      const padding = 50
      for (const node of nodes.value) {
        node.x = Math.max(padding, Math.min(container.clientWidth - padding, node.x))
        node.y = Math.max(padding, Math.min(container.clientHeight - padding, node.y))
      }
    }
  }
}

onMounted(() => {
  loadGraphData()
})

watch(filterType, () => {
  selectedNode.value = null
})
</script>

<style scoped>
.graph-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.graph-toolbar {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.graph-container {
  flex: 1;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.graph-svg {
  width: 100%;
  height: 100%;
}

.graph-link {
  stroke: var(--el-border-color);
  stroke-width: 1;
  stroke-opacity: 0.6;
}

.graph-node {
  cursor: pointer;
  transition: transform 0.2s;
}

.graph-node:hover {
  transform: scale(1.1);
}

.graph-node circle {
  stroke: white;
  stroke-width: 2;
  transition: all 0.2s;
}

.graph-node circle.selected {
  stroke: var(--el-color-primary);
  stroke-width: 3;
}

.node-label {
  font-size: 11px;
  fill: var(--el-text-color-regular);
  pointer-events: none;
}

.node-info-panel {
  position: absolute;
  right: 16px;
  top: 80px;
  width: 280px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow);
  padding: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
}

.panel-content p {
  margin: 8px 0;
  font-size: 14px;
}

.panel-connections h4 {
  margin: 16px 0 8px;
  font-size: 14px;
}

.panel-connections ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.panel-connections li {
  padding: 6px 8px;
  margin: 4px 0;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.panel-connections li:hover {
  background: var(--el-fill-color);
}
</style>
