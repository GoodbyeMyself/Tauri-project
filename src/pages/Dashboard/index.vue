<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { getDB } from '@/utils/database'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  NText,
  NButton,
  NProgress,
  useNotification,
} from 'naive-ui'
import { isDark } from '@/styles/theme'
import HeatMap from '@/components/HeatMap.vue'

const userStore = useUserStore()
const router = useRouter()
const notification = useNotification()

const currentTime = ref('')
const currentDate = ref('')
const greeting = ref('')

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  currentDate.value = format(now, 'yyyy年M月d日 EEEE', { locale: zhCN })

  const hour = now.getHours()
  if (hour < 6) greeting.value = '夜深了'
  else if (hour < 9) greeting.value = '早上好'
  else if (hour < 12) greeting.value = '上午好'
  else if (hour < 14) greeting.value = '中午好'
  else if (hour < 18) greeting.value = '下午好'
  else if (hour < 22) greeting.value = '晚上好'
  else greeting.value = '夜深了'
}

updateTime()
const timer = setInterval(updateTime, 1000)
onUnmounted(() => clearInterval(timer))

const dailyQuotes = [
  '好的文章，从好的工具开始。',
  '把想法写下来，让思路更清晰。',
  '今天也是创作的好日子。',
  '每一篇文章都值得被认真对待。',
  '灵感来了就写，别让它溜走。',
  '坚持输出，量变引发质变。',
  '写作是最好的思考方式。',
]
const dailyQuote = dailyQuotes[new Date().getDate() % dailyQuotes.length]

interface TaskStat { total: number; done: number; doing: number }
const todayTasks = ref<TaskStat>({ total: 0, done: 0, doing: 0 })
const articleCount = ref(0)

onMounted(async () => {
  const db = await getDB()
  const userId = userStore.currentUser?.id
  if (!userId) return
  const today = format(new Date(), 'yyyy-MM-dd')
  const tasks = await db.select<{ status: string }[]>(
    'SELECT status FROM work_tasks WHERE user_id = ? AND task_date = ?',
    [userId, today]
  )
  todayTasks.value = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    doing: tasks.filter(t => t.status === 'doing').length,
  }
  const arts = await db.select<{ id: number }[]>(
    'SELECT id FROM wechat_articles WHERE user_id = ?',
    [userId]
  )
  articleCount.value = arts.length

  const undone = todayTasks.value.total - todayTasks.value.done
  const intervalSec = Number(localStorage.getItem('task-remind-interval') ?? '120')
  if (intervalSec === 0) return
  const dismissedAt = Number(sessionStorage.getItem('task-remind-dismissed') || '0')
  const elapsed = Date.now() - dismissedAt
  if (undone > 0 && (dismissedAt === 0 || elapsed >= intervalSec * 1000)) {
    notification.warning({
      title: '任务提醒',
      content: `今日还有 ${undone} 项任务未完成`,
      meta: format(new Date(), 'HH:mm'),
      duration: 5000,
      keepAliveOnHover: true,
      onClose: () => {
        sessionStorage.setItem('task-remind-dismissed', String(Date.now()))
      },
      action: () => h(NButton, {
        text: true,
        type: 'primary',
        size: 'small',
        onClick: () => router.replace('/work-task'),
      }, { default: () => '去处理' }),
    })
  }
})

const todayRate = computed(() =>
  todayTasks.value.total > 0 ? Math.round((todayTasks.value.done / todayTasks.value.total) * 100) : 0
)

function getHiddenMenus(): string[] {
  try { return JSON.parse(localStorage.getItem('hiddenMenus') || '[]') } catch { return [] }
}
const hiddenMenus = ref<string[]>(getHiddenMenus())
window.addEventListener('menu-visibility-changed', () => { hiddenMenus.value = getHiddenMenus() })

function isVisible(key: string) { return !hiddenMenus.value.includes(key) }

const shortcutDefs = [
  {
    title: '工作任务',
    desc: '日历视图管理每日工作，支持日/周/月/季/年统计',
    icon: 'i-carbon-task',
    color: '#36AD6A',
    lightBg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
    darkBg: 'linear-gradient(135deg, #1a2e20, #1e3325)',
    route: '/work-task',
    menuKey: 'work-task',
  },
  {
    title: '公众号编辑器',
    desc: 'Markdown 编写，实时预览，一键复制到微信后台',
    icon: 'i-carbon-document',
    color: '#4098FC',
    lightBg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    darkBg: 'linear-gradient(135deg, #1a2233, #1e2838)',
    route: '/wechat-editor',
    menuKey: 'wechat-editor',
  },
]

const allShortcuts = computed(() =>
  shortcutDefs.map(s => ({
    ...s,
    bg: isDark.value ? s.darkBg : s.lightBg,
  }))
)

const shortcuts = computed(() => allShortcuts.value.filter(s => isVisible(s.menuKey)))
</script>

<template>
  <div class="dash">
    <!-- 问候横幅 -->
    <div class="dash-hero">
      <div class="dash-hero-inner">
        <div>
          <NText class="dash-greeting">{{ greeting }}，{{ userStore.currentUser?.nickname }}</NText>
          <NText depth="3" style="font-size: 14px; margin-top: 6px; display: block">{{ currentDate }} {{ currentTime }}</NText>
          <NText italic depth="3" style="font-size: 13px; margin-top: 14px; display: block; color: var(--text-muted)">「{{ dailyQuote }}」</NText>
        </div>
        <button class="dash-ai-btn" @click="router.replace('/ai-search')" title="AI 搜问">
          <img src="@/assets/ai-logo.png" class="dash-ai-icon" alt="AI" />
        </button>
      </div>
    </div>

    <!-- 数据概览 -->
    <div class="dash-stats">
      <div v-if="isVisible('work-task')" class="dash-stat-card" @click="router.replace('/work-task')">
        <div class="dash-stat-icon" style="background: var(--wt-accent-bg); color: #36AD6A">
          <div class="i-carbon-task" style="font-size: 20px"></div>
        </div>
        <div class="dash-stat-info">
          <NText strong style="font-size: 20px; line-height: 1.2">{{ todayTasks.total }}</NText>
          <NText depth="3" style="font-size: 11px">今日任务</NText>
        </div>
      </div>
      <div v-if="isVisible('work-task')" class="dash-stat-card" @click="router.replace('/work-task')">
        <div class="dash-stat-icon" style="background: var(--wt-accent-bg); color: #36AD6A">
          <div class="i-carbon-checkmark" style="font-size: 20px"></div>
        </div>
        <div class="dash-stat-info">
          <NText strong style="font-size: 20px; line-height: 1.2; color: #36AD6A">{{ todayTasks.done }}</NText>
          <NText depth="3" style="font-size: 11px">已完成</NText>
        </div>
      </div>
      <div v-if="isVisible('work-task')" class="dash-stat-card" @click="router.replace('/work-task')">
        <div class="dash-stat-icon" style="background: var(--wt-blue-bg); color: #4098FC">
          <div class="i-carbon-in-progress" style="font-size: 20px"></div>
        </div>
        <div class="dash-stat-info">
          <NText strong style="font-size: 20px; line-height: 1.2; color: #4098FC">{{ todayTasks.doing }}</NText>
          <NText depth="3" style="font-size: 11px">进行中</NText>
        </div>
      </div>
      <div v-if="isVisible('wechat-editor')" class="dash-stat-card" @click="router.replace('/wechat-editor')">
        <div class="dash-stat-icon" style="background: var(--wt-orange-bg); color: #F0A020">
          <div class="i-carbon-document" style="font-size: 20px"></div>
        </div>
        <div class="dash-stat-info">
          <NText strong style="font-size: 20px; line-height: 1.2">{{ articleCount }}</NText>
          <NText depth="3" style="font-size: 11px">公众号文章</NText>
        </div>
      </div>
    </div>

    <!-- 今日完成率 -->
    <div v-if="todayTasks.total > 0 && isVisible('work-task')" class="dash-rate">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
        <NText style="font-size: 13px; color: var(--text-secondary)">今日完成率</NText>
        <NText strong style="font-size: 14px; color: #36AD6A">{{ todayRate }}%</NText>
      </div>
      <NProgress :percentage="todayRate" :show-indicator="false" :height="6" :border-radius="3" color="#36AD6A" :rail-color="isDark ? '#3a3a3e' : '#e8e8e8'" />
    </div>

    <!-- 热力图 -->
    <HeatMap v-if="isVisible('work-task')" />

    <!-- 快捷入口 -->
    <NText strong style="font-size: 16px; display: block; margin: 24px 0 12px">快捷入口</NText>
    <div class="dash-shortcuts">
      <div
        v-for="item in shortcuts"
        :key="item.route"
        class="dash-shortcut"
        :style="{ background: item.bg }"
        @click="router.replace(item.route)"
      >
        <div class="dash-shortcut-icon" :style="{ background: item.color }">
          <div :class="item.icon" style="font-size: 22px; color: #fff"></div>
        </div>
        <div style="flex: 1">
          <NText strong style="font-size: 15px; display: block">{{ item.title }}</NText>
          <NText depth="3" style="font-size: 12px; margin-top: 3px; display: block">{{ item.desc }}</NText>
        </div>
        <div class="i-carbon-arrow-right" style="font-size: 16px; color: var(--text-muted)"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dash {
  max-width: 100%;
}

.dash-hero {
  background: var(--bg-card);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.dash-hero-inner {
  padding: 28px 32px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.dash-ai-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  padding: 0;
}

.dash-ai-btn:hover {
  transform: scale(1.1);
}

.dash-ai-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  animation: ai-spin 3s linear infinite;
}

.dash-ai-btn:hover .dash-ai-icon {
  animation-duration: 0.8s;
}

@keyframes ai-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.dash-greeting {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color);
  display: block;
}

/* Stats */
.dash-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 20px;
}

.dash-stat-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.dash-stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.06);
}

.dash-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dash-stat-info {
  display: flex;
  flex-direction: column;
}

.dash-rate {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 14px 18px;
  margin-top: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

/* Shortcuts */
.dash-shortcuts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dash-shortcut {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.dash-shortcut:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.dash-shortcut-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
