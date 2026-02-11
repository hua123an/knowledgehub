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
    component: () => import('../views/Editor.vue'),
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
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
