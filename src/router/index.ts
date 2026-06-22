import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/widget',
      name: 'Widget',
      component: () => import('@/pages/Widget/index.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/pages/Login/index.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/pages/Dashboard/index.vue'),
        },
{
          path: 'work-task',
          name: 'WorkTask',
          component: () => import('@/pages/WorkTask/index.vue'),
        },
        {
          path: 'mine',
          name: 'Mine',
          component: () => import('@/pages/Mine/index.vue'),
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('@/pages/Settings/index.vue'),
        },
        {
          path: 'wechat-editor',
          name: 'WechatEditor',
          component: () => import('@/pages/WechatEditor/index.vue'),
        },
        {
          path: 'ai-search',
          name: 'AiSearch',
          component: () => import('@/pages/AiSearch/index.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const userStore = useUserStore()

  if (!userStore.isLoggedIn) {
    await userStore.restoreSession()
  }

  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn) {
    return { name: 'Login' }
  }

  if (to.name === 'Login' && userStore.isLoggedIn) {
    return { name: 'Dashboard' }
  }
})

export default router
