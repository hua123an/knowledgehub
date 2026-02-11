// 全局上下文，用于在不同 IPC 模块间共享状态
export const globalContext = {
  currentWorkspace: null as string | null
}
