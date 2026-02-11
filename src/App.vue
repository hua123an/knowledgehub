<template>
  <el-config-provider :locale="zhCn">
    <AppLayout />
  </el-config-provider>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import AppLayout from '@/components/common/AppLayout.vue'
import { useWorkspaceStore } from '@/stores/workspace'

const workspaceStore = useWorkspaceStore()

onMounted(() => {
  if (workspaceStore.init) {
    workspaceStore.init()
  }
})
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
