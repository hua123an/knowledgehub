<template>
  <div class="tag-cloud">
    <div class="section-header">
      <span>标签</span>
      <el-button type="primary" link size="small" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>

    <div class="tags-container">
      <el-tag
        v-for="tag in tags"
        :key="tag.id"
        :color="tag.color"
        :effect="selectedTagId === tag.id ? 'dark' : 'plain'"
        class="tag-item"
        :closable="editMode"
        @click="selectTag(tag)"
        @close="deleteTag(tag)"
      >
        {{ tag.name }}
        <span class="tag-count">({{ getTagCount(tag.id) }})</span>
      </el-tag>

      <el-empty v-if="tags.length === 0" description="暂无标签" :image-size="40" />
    </div>

    <div class="tag-actions" v-if="tags.length > 0">
      <el-button link size="small" @click="editMode = !editMode">
        {{ editMode ? '完成' : '编辑' }}
      </el-button>
    </div>

    <!-- Create Tag Dialog -->
    <el-dialog v-model="showCreateDialog" title="新建标签" width="360px">
      <el-form :model="newTag" label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="newTag.name" placeholder="输入标签名称" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="newTag.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createTag">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTagsStore } from '../../stores/tags'
import { useNotesStore } from '../../stores/notes'
import type { Tag } from '../../types'

const emit = defineEmits<{
  select: [tagId: string | null]
}>()

const tagsStore = useTagsStore()
const notesStore = useNotesStore()

const editMode = ref(false)
const showCreateDialog = ref(false)
const selectedTagId = ref<string | null>(null)
const newTag = ref({
  name: '',
  color: '#409EFF'
})

const tags = computed(() => tagsStore.tags)

function getTagCount(tagId: string) {
  return tagsStore.getTagsByNoteId ? 
    notesStore.notes.filter(n => 
      tagsStore.getTagsByNoteId(n.id).some(t => t.id === tagId)
    ).length : 0
}

function selectTag(tag: Tag) {
  if (editMode.value) return
  
  if (selectedTagId.value === tag.id) {
    selectedTagId.value = null
    emit('select', null)
  } else {
    selectedTagId.value = tag.id
    emit('select', tag.id)
  }
}

async function createTag() {
  if (!newTag.value.name.trim()) {
    ElMessage.warning('请输入标签名称')
    return
  }
  
  await tagsStore.createTag({
    name: newTag.value.name.trim(),
    color: newTag.value.color
  })
  
  showCreateDialog.value = false
  newTag.value = { name: '', color: '#409EFF' }
  ElMessage.success('标签已创建')
}

async function deleteTag(tag: Tag) {
  try {
    await ElMessageBox.confirm(`确定要删除标签 "${tag.name}" 吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await tagsStore.deleteTag(tag.id)
    ElMessage.success('标签已删除')
    
    if (selectedTagId.value === tag.id) {
      selectedTagId.value = null
      emit('select', null)
    }
  } catch {
    // cancelled
  }
}

onMounted(() => {
  tagsStore.fetchTags()
})
</script>

<style scoped>
.tag-cloud {
  padding: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
  font-size: 14px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  cursor: pointer;
  transition: transform 0.2s;
}

.tag-item:hover {
  transform: scale(1.05);
}

.tag-count {
  margin-left: 4px;
  opacity: 0.7;
  font-size: 11px;
}

.tag-actions {
  margin-top: 12px;
  text-align: right;
}
</style>
