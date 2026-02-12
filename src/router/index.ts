import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'),
  },
  {
    path: '/editor/:id?',
    name: 'editor',
    component: () => import('../views/EditorV2.vue'),
    props: true,
  },
  {
    path: '/editor-legacy/:id?',
    name: 'editor-legacy',
    component: () => import('../views/EditorLegacy.vue'),
    props: true,
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('../views/Search.vue'),
  },
  {
    path: '/graph',
    name: 'graph',
    component: () => import('../views/Graph.vue'),
  },
  {
    path: '/welcome',
    name: 'welcome',
    component: () => import('../views/Welcome.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/Settings.vue'),
  },
  {
    path: '/trash',
    name: 'trash',
    component: () => import('../views/Trash.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  // Use store inside guard to ensure pinia is active
  // We need to import useWorkspaceStore here or assume it's available?
  // It's better to verify logic. Since Pinia is installed in main, we can use it here.
  // BUT: Cyclic dependency might occur if store imports router.
  // Safe way: dynamic import or accessing pinia instance if needed.
  // Actually, standard way is fine as long as router is used after app.use(pinia).
  
  // Checking local storage directly for speed/simplicity before store hydration completed?
  // Or just trusting store. Let's try store.
  const storedWorkspace =localStorage.getItem('currentWorkspace')
  
  if (!storedWorkspace && to.path !== '/welcome') {
    next('/welcome')
  } else if (storedWorkspace && to.path === '/welcome') {
    next('/')
  } else {
    next()
  }
})

export default router
