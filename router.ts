import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      { path: '', name: 'dashboard', component: () => import('@/pages/Dashboard.vue') },
      { path: 'scenarios', name: 'scenarios', component: () => import('@/pages/Scenarios.vue') },
      {
        path: 'scenarios/:id',
        name: 'scenario-detail',
        component: () => import('@/pages/ScenarioDetail.vue'),
      },
      { path: 'entities', name: 'entities', component: () => import('@/pages/Entities.vue') },
      { path: 'settings', name: 'settings', component: () => import('@/pages/Settings.vue') },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
