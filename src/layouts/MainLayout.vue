<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  NLayout,
  NLayoutSider,
  NMenu,
  NLayoutContent,
  NText,
  NBadge,
} from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { h } from 'vue'
import { getDB } from '@/utils/database'
import { format } from 'date-fns'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const collapsed = ref(false)

const activeKey = computed(() => {
  const path = route.path
  if (path === '/') return 'dashboard'
  return path.slice(1)
})

function renderIcon(icon: string) {
  return () => h('div', { class: icon, style: 'font-size: 18px' })
}

const allMenuItems: { key: string; label: string; icon: string; locked?: boolean }[] = [
  { key: 'dashboard', label: '首页', icon: 'i-carbon-dashboard' },
  { key: 'work-task', label: '工作任务', icon: 'i-carbon-task' },
  { key: 'wechat-editor', label: '公众号编辑器', icon: 'i-carbon-document' },
  { key: 'mine', label: '我的', icon: 'i-carbon-user-avatar', locked: true },
  { key: 'settings', label: '设置', icon: 'i-carbon-settings', locked: true },
]

function getHiddenMenus(): string[] {
  try {
    return JSON.parse(localStorage.getItem('hiddenMenus') || '[]')
  } catch { return [] }
}

const hiddenMenus = ref<string[]>(getHiddenMenus())

const menuOptions = computed<MenuOption[]>(() =>
  allMenuItems
    .filter(item => !hiddenMenus.value.includes(item.key))
    .map(item => ({
      key: item.key,
      icon: renderIcon(item.icon),
      label: item.key === 'work-task' && todayUndone.value > 0
        ? () => h('span', { style: 'display:flex;align-items:center;gap:6px' }, [
            item.label,
            h(NBadge, { value: todayUndone.value, type: 'warning' }),
          ])
        : item.label,
    }))
)

window.addEventListener('storage', () => {
  hiddenMenus.value = getHiddenMenus()
})

const refreshMenus = () => { hiddenMenus.value = getHiddenMenus() }
window.addEventListener('menu-visibility-changed', refreshMenus)

const todayUndone = ref(0)

function getDoneKeys(): string[] {
  try {
    const saved = localStorage.getItem('task-status-config')
    if (saved) {
      const config = JSON.parse(saved) as { key: string; isDone: boolean }[]
      return config.filter(s => s.isDone).map(s => s.key)
    }
  } catch { /* ignore */ }
  return ['done']
}

async function loadTodayUndone() {
  const userId = userStore.currentUser?.id
  if (!userId) return
  try {
    const db = await getDB()
    const today = format(new Date(), 'yyyy-MM-dd')
    const doneKeys = getDoneKeys()
    const placeholders = doneKeys.map(() => '?').join(',')
    const rows = await db.select<{ cnt: number }[]>(
      `SELECT COUNT(*) as cnt FROM work_tasks WHERE user_id = ? AND task_date = ? AND status NOT IN (${placeholders})`,
      [userId, today, ...doneKeys]
    )
    todayUndone.value = rows[0]?.cnt || 0
  } catch { /* db not ready */ }
}

onMounted(() => loadTodayUndone())

window.addEventListener('task-updated', () => loadTodayUndone())
window.addEventListener('task-status-changed', () => loadTodayUndone())

function handleMenuUpdate(key: string) {
  const path = key === 'dashboard' ? '/' : `/${key}`
  router.replace(path)
}
</script>

<template>
  <NLayout has-sider style="height: 100vh">
    <NLayoutSider
      bordered
      :collapsed="collapsed"
      collapse-mode="width"
      :collapsed-width="64"
      :width="220"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
      :native-scrollbar="false"
      class="main-sider"
    >
      <div class="sider-logo" :class="{ collapsed }">
        <img src="@/assets/icon.png" class="sider-logo-icon" alt="logo" />
        <div v-if="!collapsed" class="sider-logo-text">
          <NText strong style="font-size: 15px; display: block; white-space: nowrap">
            Desktop Notepad
          </NText>
          <NText depth="3" style="font-size: 12px">
            {{ userStore.currentUser?.nickname }}
          </NText>
        </div>
      </div>
      <NMenu
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="20"
        :value="activeKey"
        :options="menuOptions"
        @update:value="handleMenuUpdate"
        style="padding: 8px"
      />
      <!-- 最近使用 -->
      <div v-if="!collapsed" class="sider-recent">
        <div class="sider-recent-header">
          <NText depth="3" style="font-size: 12px">最近使用</NText>
        </div>
        <div class="sider-recent-item" @click="router.replace('/ai-search')">
          <div class="i-carbon-search" style="font-size: 14px; color: var(--text-muted)"></div>
          <span class="sider-recent-label">AI 搜问</span>
        </div>
      </div>
    </NLayoutSider>
    <NLayoutContent class="main-content">
      <div class="main-content-inner">
        <RouterView />
      </div>
    </NLayoutContent>
  </NLayout>
</template>

<style scoped>
.main-content {
  background: var(--bg-content);
}

.main-content-inner {
  height: 100%;
  overflow: auto;
  padding: 24px;
}

.main-sider {
  background: var(--bg-sider) !important;
  border-right: 1px solid var(--border-color) !important;
}

.sider-logo {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-light);
  transition: all .2s;
}

.sider-logo.collapsed {
  justify-content: center;
  padding: 16px 0;
}

.sider-logo-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
  object-fit: cover;
}

.sider-logo-text {
  overflow: hidden;
}

.sider-recent {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-sider);
}

.sider-recent-header {
  margin-bottom: 6px;
}

.sider-recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-card-hover);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color);
  transition: background 0.12s;
}

.sider-recent-item:hover {
  background: var(--border-light);
}

.sider-recent-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>

<style>
/* Naive UI Menu 折叠居中修正 */
.main-sider .n-menu--collapsed .n-menu-item-content {
  justify-content: center !important;
}

.main-sider .n-menu--collapsed .n-menu-item-content__icon {
  margin-right: 0 !important;
}
</style>
