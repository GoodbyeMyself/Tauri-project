<script setup lang="ts">
import { getDB } from '@/utils/database'
import { useUserStore } from '@/stores/user'
import { isDark } from '@/styles/theme'
import { getHoliday } from '@/utils/holidays'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, addMonths, subMonths, isToday, isSameDay, isSameMonth,
  isWeekend, startOfWeek as sow, endOfWeek as eow,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  getWeek,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  NText, NButton, NTag, NInput, NModal, NSwitch, NPopover, NColorPicker,
  NPopconfirm, NEmpty, NProgress, useMessage,
} from 'naive-ui'

const userStore = useUserStore()
const message = useMessage()

interface StatusConfig {
  key: string
  label: string
  color: string
  isDone: boolean
}

const DEFAULT_STATUS_CONFIG: StatusConfig[] = [
  { key: 'doing', label: '开发中', color: '#4098FC', isDone: false },
  { key: 'pending_release', label: '待发布', color: '#F0A020', isDone: false },
  { key: 'done', label: '已完成', color: '#36AD6A', isDone: true },
]

function loadStatusConfig(): StatusConfig[] {
  try {
    const saved = localStorage.getItem('task-status-config')
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return [...DEFAULT_STATUS_CONFIG]
}

const statusConfig = ref<StatusConfig[]>(loadStatusConfig())

function saveStatusConfig() {
  localStorage.setItem('task-status-config', JSON.stringify(statusConfig.value))
  window.dispatchEvent(new Event('task-status-changed'))
}

const statusMap = computed(() => {
  const map: Record<string, { label: string; color: string; type: 'success' | 'info' | 'warning' }> = {}
  for (const s of statusConfig.value) {
    map[s.key] = { label: s.label, color: s.color, type: s.isDone ? 'success' : 'info' }
  }
  return map
})

const doneKeys = computed(() => statusConfig.value.filter(s => s.isDone).map(s => s.key))
const fallbackStatus = { label: '未知', color: '#999', type: 'info' as const }
function getStatus(key: string) {
  return statusMap.value[key] || fallbackStatus
}
const defaultNewStatus = computed(() => statusConfig.value.find(s => !s.isDone)?.key || statusConfig.value[0].key)

type ViewMode = 'day' | 'week' | 'month' | 'quarter' | 'year'

interface Task {
  id: number
  title: string
  description: string
  status: string
  task_date: string
  user_id: number
  created_at: string
  updated_at: string
}

const viewMode = ref<ViewMode>('day')
const currentMonth = ref(new Date())
const selectedDate = ref(new Date())
const tasks = ref<Task[]>([])
const newTaskTitle = ref('')
const editingId = ref<number | null>(null)
const editingTitle = ref('')

// Tag management modal
const showTagModal = ref(false)
const editingConfig = ref<StatusConfig[]>([])

function openTagModal() {
  editingConfig.value = JSON.parse(JSON.stringify(statusConfig.value))
  showTagModal.value = true
}

function addTag() {
  const id = Date.now()
  editingConfig.value.push({ key: `custom_${id}`, label: '新标签', color: '#999999', isDone: false })
}

function removeTag(index: number) {
  if (editingConfig.value.length <= 2) {
    message.warning('至少保留 2 个标签')
    return
  }
  editingConfig.value.splice(index, 1)
}

function saveTagConfig() {
  if (!editingConfig.value.some(s => s.isDone)) {
    message.warning('请至少设置一个完成态标签（如 已完成、已结束等）')
    return
  }
  if (editingConfig.value.some(s => !s.label.trim())) {
    message.warning('标签名称不能为空')
    return
  }
  statusConfig.value = JSON.parse(JSON.stringify(editingConfig.value))
  saveStatusConfig()
  showTagModal.value = false
  message.success('标签配置已保存')
}

const viewModes: { key: ViewMode; label: string }[] = [
  { key: 'day', label: '日' },
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
  { key: 'quarter', label: '季' },
  { key: 'year', label: '年' },
]

// ===== Calendar Grid =====
const calendarDays = computed(() => {
  const monthStart = startOfMonth(currentMonth.value)
  const monthEnd = endOfMonth(currentMonth.value)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: calStart, end: calEnd })
})

const weekDayLabels = ['一', '二', '三', '四', '五', '六', '日']

const taskDateMap = computed(() => {
  const map: Record<string, Task[]> = {}
  for (const t of tasks.value) {
    if (!map[t.task_date]) map[t.task_date] = []
    map[t.task_date].push(t)
  }
  return map
})

function getDateDots(day: Date): string[] {
  const key = format(day, 'yyyy-MM-dd')
  const dayTasks = taskDateMap.value[key]
  if (!dayTasks) return []
  const statuses = new Set(dayTasks.map(t => t.status))
  return [...statuses]
}

function prevMonth() { currentMonth.value = subMonths(currentMonth.value, 1) }
function nextMonth() { currentMonth.value = addMonths(currentMonth.value, 1) }
function goToday() {
  currentMonth.value = new Date()
  selectedDate.value = new Date()
}

function selectDay(day: Date) {
  selectedDate.value = day
  if (!isSameMonth(day, currentMonth.value)) {
    currentMonth.value = startOfMonth(day)
  }
}

// ===== Task CRUD =====
async function loadTasks() {
  const db = await getDB()
  const userId = userStore.currentUser?.id
  if (!userId) return
  tasks.value = await db.select<Task[]>(
    'SELECT * FROM work_tasks WHERE user_id = ? ORDER BY task_date DESC, created_at DESC',
    [userId]
  )
  window.dispatchEvent(new Event('task-updated'))
}

async function addTask() {
  if (!newTaskTitle.value.trim()) return
  const db = await getDB()
  const userId = userStore.currentUser?.id
  if (!userId) return
  const dateStr = format(selectedDate.value, 'yyyy-MM-dd')
  const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  await db.execute(
    'INSERT INTO work_tasks (title, status, task_date, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [newTaskTitle.value.trim(), defaultNewStatus.value, dateStr, userId, now, now]
  )
  newTaskTitle.value = ''
  await loadTasks()
}

async function updateStatus(task: Task) {
  const order = statusConfig.value.map(s => s.key)
  const next = order[(order.indexOf(task.status) + 1) % order.length]
  const db = await getDB()
  const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  await db.execute(
    'UPDATE work_tasks SET status = ?, updated_at = ? WHERE id = ?',
    [next, now, task.id]
  )
  task.status = next
  window.dispatchEvent(new Event('task-updated'))
}

async function deleteTask(id: number) {
  const db = await getDB()
  await db.execute('DELETE FROM work_tasks WHERE id = ?', [id])
  await loadTasks()
}

function startEdit(task: Task) {
  editingId.value = task.id
  editingTitle.value = task.title
}

async function saveEdit(task: Task) {
  const title = editingTitle.value.trim()
  if (!title) return
  const db = await getDB()
  const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  await db.execute(
    'UPDATE work_tasks SET title = ?, updated_at = ? WHERE id = ?',
    [title, now, task.id]
  )
  task.title = title
  editingId.value = null
}

// ===== Filtered Tasks =====
const selectedDateStr = computed(() => format(selectedDate.value, 'yyyy-MM-dd'))

const dayTasks = computed(() =>
  tasks.value.filter(t => t.task_date === selectedDateStr.value)
)

function getDateRange(): { start: string; end: string } {
  const d = selectedDate.value
  let s: Date, e: Date
  switch (viewMode.value) {
    case 'week':
      s = sow(d, { weekStartsOn: 1 }); e = eow(d, { weekStartsOn: 1 }); break
    case 'month':
      s = startOfMonth(d); e = endOfMonth(d); break
    case 'quarter':
      s = startOfQuarter(d); e = endOfQuarter(d); break
    case 'year':
      s = startOfYear(d); e = endOfYear(d); break
    default:
      s = d; e = d
  }
  return { start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd') }
}

const rangeTasks = computed(() => {
  const { start, end } = getDateRange()
  return tasks.value.filter(t => t.task_date >= start && t.task_date <= end)
})

const stats = computed(() => {
  const list = rangeTasks.value
  const total = list.length
  const done = list.filter(t => doneKeys.value.includes(t.status)).length
  const undone = total - done
  const rate = total > 0 ? Math.round((done / total) * 100) : 0
  return { total, done, undone, rate }
})

const rangeLabel = computed(() => {
  const d = selectedDate.value
  switch (viewMode.value) {
    case 'week': return `第 ${getWeek(d, { weekStartsOn: 1 })} 周`
    case 'month': return format(d, 'yyyy年M月')
    case 'quarter': return `${format(d, 'yyyy')}年 Q${Math.ceil((d.getMonth() + 1) / 3)}`
    case 'year': return format(d, 'yyyy年')
    default: return format(d, 'M月d日 EEEE', { locale: zhCN })
  }
})

// ===== Bar Chart Data =====
interface BarItem { label: string; total: number; done: number; from: string; to: string }

const selectedBarIndex = ref<number | null>(null)

watch(viewMode, () => { selectedBarIndex.value = null })

const barData = computed<BarItem[]>(() => {
  const { start, end } = getDateRange()
  const days = eachDayOfInterval({ start: new Date(start), end: new Date(end) })

  if (viewMode.value === 'year') {
    return Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0')
      const y = format(selectedDate.value, 'yyyy')
      const prefix = y + '-' + m
      const mt = tasks.value.filter(t => t.task_date.startsWith(prefix))
      const mStart = `${y}-${m}-01`
      const mEnd = format(endOfMonth(new Date(Number(y), i)), 'yyyy-MM-dd')
      return { label: `${i + 1}月`, total: mt.length, done: mt.filter(t => doneKeys.value.includes(t.status)).length, from: mStart, to: mEnd }
    })
  }

  if (viewMode.value === 'quarter') {
    const weeks: BarItem[] = []
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7)
      const wTasks = chunk.flatMap(d => taskDateMap.value[format(d, 'yyyy-MM-dd')] || [])
      weeks.push({
        label: format(chunk[0], 'M/d'),
        total: wTasks.length,
        done: wTasks.filter(t => doneKeys.value.includes(t.status)).length,
        from: format(chunk[0], 'yyyy-MM-dd'),
        to: format(chunk[chunk.length - 1], 'yyyy-MM-dd'),
      })
    }
    return weeks
  }

  return days.map(day => {
    const key = format(day, 'yyyy-MM-dd')
    const dayT = taskDateMap.value[key] || []
    return { label: format(day, 'd'), total: dayT.length, done: dayT.filter(t => doneKeys.value.includes(t.status)).length, from: key, to: key }
  })
})

const barMax = computed(() => Math.max(...barData.value.map(d => d.total), 1))

function clickBar(index: number) {
  selectedBarIndex.value = selectedBarIndex.value === index ? null : index
}

const filteredRangeTasks = computed(() => {
  if (selectedBarIndex.value === null) return rangeTasks.value
  const bar = barData.value[selectedBarIndex.value]
  if (!bar) return rangeTasks.value
  return tasks.value.filter(t => t.task_date >= bar.from && t.task_date <= bar.to)
})

const detailLabel = computed(() => {
  if (selectedBarIndex.value === null) return '任务明细'
  const bar = barData.value[selectedBarIndex.value]
  return bar ? `${bar.label} 的任务` : '任务明细'
})

const todayStr = computed(() => format(new Date(), 'yyyy-MM-dd'))
const todayTasks = computed(() => tasks.value.filter(t => t.task_date === todayStr.value))
const todayStats = computed(() => {
  const total = todayTasks.value.length
  const done = todayTasks.value.filter(t => doneKeys.value.includes(t.status)).length
  return { total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 }
})

const totalStats = computed(() => {
  const total = tasks.value.length
  const done = tasks.value.filter(t => doneKeys.value.includes(t.status)).length
  return { total, done }
})

function copyRangeTasks() {
  const list = filteredRangeTasks.value
  if (list.length === 0) return
  const text = list
    .map((t, i) => `${i + 1}. ${t.title}【${getStatus(t.status).label}】`)
    .join('\n')
  navigator.clipboard.writeText(text).then(() => {
    message.success('已复制到剪贴板')
  }).catch(() => {
    message.error('复制失败')
  })
}

function copyDayTasks() {
  if (dayTasks.value.length === 0) return
  const text = dayTasks.value
    .map((t, i) => `${i + 1}. ${t.title}【${getStatus(t.status).label}】`)
    .join('\n')
  navigator.clipboard.writeText(text).then(() => {
    message.success('已复制到剪贴板')
  }).catch(() => {
    message.error('复制失败')
  })
}

onMounted(() => loadTasks())

watch(currentMonth, () => loadTasks())
</script>

<template>
  <div class="wt-page">
    <!-- 标签管理弹窗 -->
    <NModal v-model:show="showTagModal" preset="card" title="任务标签管理" style="max-width: 480px; border-radius: 14px">
      <NText depth="3" style="font-size: 12px; display: block; margin-bottom: 12px">
        自定义任务状态标签，至少需要一个「完成态」标签（如 已完成、已结束）
      </NText>
      <div class="tag-list">
        <div v-for="(tag, i) in editingConfig" :key="i" class="tag-row">
          <NPopover trigger="click" placement="bottom-start" :show-arrow="false">
            <template #trigger>
              <div class="tag-color-dot" :style="{ background: tag.color }"></div>
            </template>
            <div class="tag-color-panel">
              <div
                v-for="c in ['#4098FC','#36AD6A','#F0A020','#E88080','#8B5CF6','#F472B6','#06B6D4']"
                :key="c"
                class="tag-color-option"
                :class="{ active: tag.color === c }"
                :style="{ background: c }"
                @click="tag.color = c"
              ></div>
              <NColorPicker v-model:value="tag.color" :show-alpha="false" :modes="['hex']" size="small">
                <template #label>
                  <span></span>
                </template>
              </NColorPicker>
            </div>
          </NPopover>
          <NInput v-model:value="tag.label" size="small" placeholder="标签名称" style="flex: 1; min-width: 80px" />
          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0">
            <NText depth="3" style="font-size: 11px">完成态</NText>
            <NSwitch v-model:value="tag.isDone" size="small" />
          </div>
          <button class="tag-del-btn" @click="removeTag(i)">
            <div class="i-carbon-close" style="font-size: 14px"></div>
          </button>
        </div>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 12px">
        <NButton size="small" dashed block @click="addTag">
          <template #icon><div class="i-carbon-add" style="font-size: 14px"></div></template>
          添加标签
        </NButton>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px">
        <NButton size="small" @click="showTagModal = false">取消</NButton>
        <NButton size="small" type="primary" @click="saveTagConfig">保存</NButton>
      </div>
    </NModal>

    <!-- 顶部 -->
    <div class="wt-header">
      <div style="display: flex; align-items: center; gap: 8px">
        <NText strong style="font-size: 20px">工作任务</NText>
        <button class="wt-tag-btn" @click="openTagModal" title="标签管理">
          <div class="i-carbon-settings-adjust" style="font-size: 16px"></div>
        </button>
      </div>
      <div class="wt-view-tabs">
        <button
          v-for="v in viewModes"
          :key="v.key"
          class="wt-tab"
          :class="{ active: viewMode === v.key }"
          @click="viewMode = v.key"
        >{{ v.label }}</button>
      </div>
    </div>

    <div class="wt-body">
      <!-- 左侧日历 -->
      <div class="wt-calendar">
        <div class="wt-cal-header">
          <button class="wt-cal-arrow" @click="prevMonth">
            <div class="i-carbon-chevron-left" style="font-size: 16px"></div>
          </button>
          <span class="wt-cal-title" @click="goToday">{{ format(currentMonth, 'yyyy年M月') }}</span>
          <button class="wt-cal-arrow" @click="nextMonth">
            <div class="i-carbon-chevron-right" style="font-size: 16px"></div>
          </button>
        </div>

        <div class="wt-cal-weekdays">
          <span v-for="w in weekDayLabels" :key="w" class="wt-cal-wd" :class="{ weekend: w === '六' || w === '日' }">{{ w }}</span>
        </div>

        <div class="wt-cal-grid">
          <div
            v-for="day in calendarDays"
            :key="day.toISOString()"
            class="wt-cal-day"
            :class="{
              today: isToday(day),
              selected: isSameDay(day, selectedDate),
              other: !isSameMonth(day, currentMonth),
              weekend: isWeekend(day),
              holiday: getHoliday(format(day, 'yyyy-MM-dd'))?.isOff,
            }"
            @click="selectDay(day)"
          >
            <span class="wt-cal-num">{{ format(day, 'd') }}</span>
            <span v-if="getHoliday(format(day, 'yyyy-MM-dd'))?.isWork" class="wt-cal-work">班</span>
            <span v-else-if="getHoliday(format(day, 'yyyy-MM-dd'))" class="wt-cal-holiday" :class="{ off: getHoliday(format(day, 'yyyy-MM-dd'))?.isOff }">
              {{ getHoliday(format(day, 'yyyy-MM-dd'))!.name }}
            </span>
            <div v-else class="wt-cal-dots">
              <span
                v-for="s in getDateDots(day)"
                :key="s"
                class="wt-dot"
                :style="{ background: getStatus(s).color }"
              ></span>
            </div>
          </div>
        </div>

        <!-- 今日快捷 -->
        <button class="wt-today-btn" @click="goToday">回到今天</button>

        <!-- 日历下方：今日概览 -->
        <div class="wt-cal-summary">
          <div class="wt-summary-title">今日任务</div>
          <div class="wt-summary-row">
            <div class="wt-summary-item">
              <span class="wt-summary-num">{{ todayStats.total }}</span>
              <span class="wt-summary-label">总计</span>
            </div>
            <div class="wt-summary-item">
              <span class="wt-summary-num" style="color: #36AD6A">{{ todayStats.done }}</span>
              <span class="wt-summary-label">完成</span>
            </div>
            <div class="wt-summary-item">
              <span class="wt-summary-num" style="color: #4098FC">{{ todayStats.total - todayStats.done }}</span>
              <span class="wt-summary-label">进行中</span>
            </div>
          </div>
          <div class="wt-summary-bar">
            <div class="wt-summary-bar-fill" :style="{ width: todayStats.rate + '%' }"></div>
          </div>
        </div>

        <!-- 累计统计 -->
        <div class="wt-cal-summary" style="margin-top: 10px">
          <div class="wt-summary-title">累计</div>
          <div class="wt-summary-row">
            <div class="wt-summary-item">
              <span class="wt-summary-num">{{ totalStats.total }}</span>
              <span class="wt-summary-label">总任务</span>
            </div>
            <div class="wt-summary-item">
              <span class="wt-summary-num" style="color: #36AD6A">{{ totalStats.done }}</span>
              <span class="wt-summary-label">已完成</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧内容 -->
      <div class="wt-right">
        <div class="wt-range-label">
          <NText strong style="font-size: 16px">{{ rangeLabel }}</NText>
          <NText v-if="viewMode !== 'day'" depth="3" style="font-size: 13px; margin-left: 8px">共 {{ stats.total }} 项任务</NText>
        </div>

        <!-- 日视图：任务列表 -->
        <template v-if="viewMode === 'day'">
          <div v-if="dayTasks.length > 0" class="wt-copy-bar">
            <NButton size="tiny" quaternary @click="copyDayTasks">
              <template #icon><div class="i-carbon-copy" style="font-size: 13px"></div></template>
              复制列表
            </NButton>
          </div>
          <div v-if="dayTasks.length === 0 && !newTaskTitle" class="wt-empty">
            <NEmpty size="small" description="这天还没有任务" />
          </div>

          <div class="wt-task-list">
            <div
              v-for="task in dayTasks"
              :key="task.id"
              class="wt-task-card"
              :style="{ borderLeftColor: getStatus(task.status).color }"
            >
              <div class="wt-task-top">
                <NTag
                  size="small"
                  round
                  :bordered="false"
                  :color="{ color: getStatus(task.status).color + '18', textColor: getStatus(task.status).color }"
                  style="cursor: pointer; flex-shrink: 0"
                  @click="updateStatus(task)"
                >
                  {{ getStatus(task.status).label }}
                </NTag>
                <NText depth="3" style="font-size: 11px">{{ task.created_at }}</NText>
                <div style="flex: 1"></div>
                <NPopconfirm @positive-click="deleteTask(task.id)" :show-icon="false">
                  <template #trigger>
                    <button class="wt-task-del">
                      <div class="i-carbon-close" style="font-size: 12px"></div>
                    </button>
                  </template>
                  删除此任务？
                </NPopconfirm>
              </div>
              <div class="wt-task-body">
                <NInput
                  v-if="editingId === task.id"
                  v-model:value="editingTitle"
                  type="textarea"
                  :autosize="{ minRows: 1, maxRows: 4 }"
                  autofocus
                  size="small"
                  @blur="saveEdit(task)"
                  @keydown.enter.exact.prevent="saveEdit(task)"
                  @keydown.escape="editingId = null"
                />
                <div v-else class="wt-task-title" @click="startEdit(task)">
                  {{ task.title }}
                </div>
              </div>
            </div>
          </div>

          <!-- 添加任务 -->
          <div class="wt-add-bar">
            <NInput
              v-model:value="newTaskTitle"
              type="textarea"
              placeholder="输入任务内容，Enter 添加..."
              :autosize="{ minRows: 1, maxRows: 4 }"
              :bordered="false"
              style="flex: 1"
              @keydown.enter.exact.prevent="addTask"
            />
            <button class="wt-add-btn" :class="{ active: newTaskTitle.trim() }" @click="addTask">
              <div class="i-carbon-add" style="font-size: 16px"></div>
            </button>
          </div>
        </template>

        <!-- 统计视图 -->
        <template v-else>
          <div class="wt-stats-cards">
            <div class="wt-stat-card wt-stat-total">
              <div class="wt-stat-icon"><div class="i-carbon-task" style="font-size: 18px"></div></div>
              <div class="wt-stat-info">
                <span class="wt-stat-num">{{ stats.total }}</span>
                <span class="wt-stat-label">总任务</span>
              </div>
            </div>
            <div class="wt-stat-card wt-stat-doing">
              <div class="wt-stat-icon"><div class="i-carbon-in-progress" style="font-size: 18px"></div></div>
              <div class="wt-stat-info">
                <span class="wt-stat-num">{{ stats.undone }}</span>
                <span class="wt-stat-label">进行中</span>
              </div>
            </div>
            <div class="wt-stat-card wt-stat-done">
              <div class="wt-stat-icon"><div class="i-carbon-checkmark" style="font-size: 18px"></div></div>
              <div class="wt-stat-info">
                <span class="wt-stat-num">{{ stats.done }}</span>
                <span class="wt-stat-label">已完成</span>
              </div>
            </div>
          </div>

          <!-- 完成率 -->
          <div class="wt-rate-section">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px">
              <NText style="font-size: 13px">完成率</NText>
              <NText strong style="font-size: 13px; color: #36AD6A">{{ stats.rate }}%</NText>
            </div>
            <NProgress :percentage="stats.rate" :show-indicator="false" :height="8" :border-radius="4" color="#36AD6A" :rail-color="isDark ? '#3a3a3e' : '#f0f0f0'" />
          </div>

          <!-- 柱状图 -->
          <div class="wt-chart">
            <NText depth="3" style="font-size: 12px; margin-bottom: 8px; display: block">任务分布</NText>
            <div class="wt-bars">
              <div
                v-for="(bar, i) in barData"
                :key="i"
                class="wt-bar-col"
                :class="{ active: selectedBarIndex === i, dimmed: selectedBarIndex !== null && selectedBarIndex !== i }"
                @click="clickBar(i)"
              >
                <div class="wt-bar-wrap">
                  <div class="wt-bar wt-bar-total" :style="{ height: (bar.total / barMax * 100) + '%' }"></div>
                  <div class="wt-bar wt-bar-done" :style="{ height: (bar.done / barMax * 100) + '%' }"></div>
                </div>
                <span class="wt-bar-label">{{ bar.label }}</span>
              </div>
            </div>
            <div style="display: flex; gap: 16px; margin-top: 8px">
              <span style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: var(--border-light); display: inline-block"></span> 全部
              </span>
              <span style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px">
                <span style="width: 8px; height: 8px; border-radius: 2px; background: #36AD6A; display: inline-block"></span> 已完成
              </span>
            </div>
          </div>

          <!-- 范围内任务列表 -->
          <div v-if="filteredRangeTasks.length > 0" style="margin-top: 16px">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
              <NText depth="3" style="font-size: 12px">{{ detailLabel }}</NText>
              <NText depth="3" style="font-size: 11px">({{ filteredRangeTasks.length }})</NText>
              <button v-if="selectedBarIndex !== null" class="wt-clear-filter" @click="selectedBarIndex = null">
                清除筛选
              </button>
              <div style="flex: 1"></div>
              <NButton size="tiny" quaternary @click="copyRangeTasks">
                <template #icon><div class="i-carbon-copy" style="font-size: 12px"></div></template>
                复制
              </NButton>
            </div>
            <div class="wt-task-list">
              <div
                v-for="task in filteredRangeTasks"
                :key="task.id"
                class="wt-task-card wt-task-compact"
                :style="{ borderLeftColor: getStatus(task.status).color }"
              >
                <div style="display: flex; align-items: center; gap: 8px">
                  <NTag size="tiny" round :bordered="false" :color="{ color: getStatus(task.status).color + '18', textColor: getStatus(task.status).color }">
                    {{ getStatus(task.status).label }}
                  </NTag>
                  <span style="font-size: 13px; color: var(--text-color); flex: 1">{{ task.title }}</span>
                  <NText depth="3" style="font-size: 11px; flex-shrink: 0">{{ task.task_date.slice(5) }}</NText>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wt-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 48px);
}

.wt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 14px;
  flex-shrink: 0;
}

.wt-view-tabs {
  display: flex;
  background: var(--bg-card-hover);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}

.wt-tab {
  padding: 5px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all .15s;
}
.wt-tab:hover { background: var(--border-light); }
.wt-tab.active {
  background: var(--bg-card);
  color: #36AD6A;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
}

/* ===== Body ===== */
.wt-body {
  display: flex;
  gap: 24px;
  flex: 1;
  min-height: 0;
}

/* ===== Calendar (left, larger) ===== */
.wt-calendar {
  width: 340px;
  flex-shrink: 0;
  background: var(--bg-card);
  border-radius: 14px;
  padding: 20px;
  border: 1px solid var(--border-light);
  box-shadow: 0 2px 8px rgba(54, 173, 106, 0.04);
  align-self: flex-start;
}

.wt-cal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.wt-cal-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-color);
  cursor: pointer;
}
.wt-cal-title:hover { color: #36AD6A; }

.wt-cal-arrow {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: none; border-radius: 8px;
  background: var(--bg-card-hover); color: var(--text-secondary); cursor: pointer; transition: all .15s;
}
.wt-cal-arrow:hover { background: var(--wt-accent-bg); color: #36AD6A; }

.wt-cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 6px;
}

.wt-cal-wd {
  text-align: center; font-size: 14px; color: var(--text-secondary);
  padding: 6px 0; font-weight: 600;
}
.wt-cal-wd.weekend { color: #E06060; font-weight: 600; }

.wt-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.wt-cal-day {
  display: flex; flex-direction: column; align-items: center;
  padding: 6px 0 4px; border-radius: 10px;
  cursor: pointer; transition: all .12s;
  min-height: 42px;
}
.wt-cal-day:hover { background: var(--bg-card-hover); }
.wt-cal-day.weekend { background: var(--wt-weekend-bg); }
.wt-cal-day.weekend:hover { background: var(--wt-weekend-hover); }
.wt-cal-day.other { opacity: 0.25; }

.wt-cal-day.today .wt-cal-num {
  background: #36AD6A; color: #fff; border-radius: 50%;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600;
}

.wt-cal-day.selected {
  background: var(--wt-accent-bg);
  outline: 2px solid #36AD6A;
  outline-offset: -1px;
}

.wt-cal-num {
  font-size: 15px; color: var(--text-color); line-height: 1; font-weight: 500;
}
.wt-cal-day.weekend .wt-cal-num { color: #E06060; }

.wt-cal-dots {
  display: flex; gap: 3px; margin-top: 3px; height: 5px;
}
.wt-dot { width: 5px; height: 5px; border-radius: 50%; }

.wt-cal-holiday {
  font-size: 8px;
  line-height: 1;
  color: #F0A020;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.wt-cal-holiday.off { color: #E06060; }

.wt-cal-work {
  font-size: 9px;
  line-height: 1;
  color: #fff;
  background: #E06060;
  border-radius: 2px;
  padding: 1px 3px;
  margin-top: 2px;
}

.wt-cal-day.holiday { background: var(--wt-red-bg); }
.wt-cal-day.holiday:hover { background: var(--wt-weekend-hover); }

.wt-today-btn {
  display: block; width: 100%; margin-top: 14px;
  padding: 7px 0; border: 1px solid var(--border-color); border-radius: 8px;
  background: var(--bg-card); color: var(--text-secondary); font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all .15s;
}
.wt-today-btn:hover { border-color: #36AD6A; color: #36AD6A; background: var(--wt-accent-bg); }

/* Calendar summary panels */
.wt-cal-summary {
  margin-top: 14px;
  padding: 12px;
  background: var(--bg-card-hover);
  border-radius: 10px;
  border: 1px solid var(--border-light);
}

.wt-summary-title {
  font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;
}

.wt-summary-row {
  display: flex; gap: 6px;
}

.wt-summary-item {
  flex: 1; text-align: center;
  padding: 6px 0;
  background: var(--bg-card-hover);
  border-radius: 6px;
}

.wt-summary-num {
  font-size: 18px; font-weight: 700; color: var(--text-color); display: block; line-height: 1.2;
}

.wt-summary-label {
  font-size: 10px; color: var(--text-muted); display: block; margin-top: 2px;
}

.wt-summary-bar {
  margin-top: 8px; height: 4px; background: var(--border-light); border-radius: 2px; overflow: hidden;
}

.wt-summary-bar-fill {
  height: 100%; background: #36AD6A; border-radius: 2px; transition: width .3s ease;
}

/* ===== Right Panel ===== */
.wt-right {
  flex: 1; min-width: 0; overflow-y: auto;
  padding-right: 4px;
}

.wt-range-label {
  display: flex; align-items: baseline; margin-bottom: 12px;
}

.wt-empty { padding: 32px 0; }

.wt-copy-bar { display: flex; justify-content: flex-end; margin-bottom: 6px; }

/* ===== Task List (compact) ===== */
.wt-task-list {
  display: flex; flex-direction: column; gap: 6px;
}

.wt-task-card {
  padding: 8px 10px;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--border-light);
  border-left: 3px solid #e0e0e0;
  transition: all .12s;
}
.wt-task-card:hover {
  border-color: #e8e8e8;
  box-shadow: 0 1px 6px rgba(0,0,0,.04);
}

.wt-task-top {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 4px;
}

.wt-task-body { margin-bottom: 0; }

.wt-task-title {
  font-size: 13px; color: var(--text-color); line-height: 1.5;
  cursor: text; white-space: pre-wrap; word-break: break-word;
  padding: 2px 4px; border-radius: 4px; margin: -2px -4px;
  transition: background .12s;
}
.wt-task-title:hover { background: var(--bg-card-hover); }

.wt-task-compact { padding: 6px 8px; border-left-width: 2px; }
.wt-task-compact .wt-task-top { margin-bottom: 0; }
.wt-task-compact .wt-task-body,
.wt-task-compact .wt-task-time { display: none; }

.wt-task-del {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border: none; border-radius: 4px;
  background: transparent; color: #ccc; cursor: pointer;
  opacity: 0; transition: all .12s;
}
.wt-task-card:hover .wt-task-del { opacity: 1; }
.wt-task-del:hover { background: var(--wt-red-bg); color: #E88080; }

.wt-add-bar {
  display: flex; gap: 8px; align-items: flex-end;
  margin-top: 8px; padding: 10px 12px;
  background: var(--bg-card); border-radius: 10px;
  border: 1px solid var(--border-light);
  transition: all .15s;
}
.wt-add-bar:focus-within {
  border-color: #36AD6A;
  box-shadow: 0 0 0 2px rgba(54, 173, 106, 0.08);
}

.wt-add-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: none; border-radius: 8px;
  background: var(--border-light); color: var(--text-muted);
  cursor: pointer; transition: all .15s; flex-shrink: 0;
}
.wt-add-btn.active { background: #36AD6A; color: #fff; }
.wt-add-btn:hover { background: #36AD6A; color: #fff; }

/* ===== Stats ===== */
.wt-stats-cards {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 10px; margin-bottom: 14px;
}

.wt-stat-card {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg-card); border-radius: 10px; padding: 12px 14px;
  border: 1px solid var(--border-light);
  transition: all .15s;
}
.wt-stat-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.05); }

.wt-stat-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.wt-stat-total .wt-stat-icon { background: var(--border-light); color: var(--text-secondary); }
.wt-stat-doing .wt-stat-icon { background: var(--wt-blue-bg); color: #4098FC; }
.wt-stat-pending .wt-stat-icon { background: var(--wt-orange-bg); color: #F0A020; }
.wt-stat-done .wt-stat-icon { background: var(--wt-accent-bg); color: #36AD6A; }

.wt-stat-info { display: flex; flex-direction: column; }
.wt-stat-num { font-size: 20px; font-weight: 700; color: var(--text-color); line-height: 1.2; }

.wt-stat-total .wt-stat-num { color: var(--text-color); }
.wt-stat-doing .wt-stat-num { color: #4098FC; }
.wt-stat-pending .wt-stat-num { color: #F0A020; }
.wt-stat-done .wt-stat-num { color: #36AD6A; }

.wt-stat-label { font-size: 11px; color: var(--text-muted); }

.wt-rate-section {
  background: var(--bg-card); border-radius: 8px; padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04); margin-bottom: 12px;
}

/* ===== Bar Chart ===== */
.wt-chart {
  background: var(--bg-card); border-radius: 8px; padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}

.wt-bars { display: flex; gap: 2px; align-items: flex-end; height: 100px; }

.wt-bar-col {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; height: 100%;
  cursor: pointer; transition: opacity .15s;
  border-radius: 4px;
}
.wt-bar-col:hover { background: var(--bg-card-hover); }
.wt-bar-col.active { background: var(--wt-accent-bg); }
.wt-bar-col.active .wt-bar-label { color: #36AD6A; font-weight: 600; }
.wt-bar-col.dimmed { opacity: 0.35; }

.wt-bar-wrap {
  flex: 1; width: 100%; position: relative;
  display: flex; align-items: flex-end;
}

.wt-bar {
  position: absolute; bottom: 0; left: 15%; width: 70%;
  border-radius: 2px 2px 0 0; transition: height .3s ease; min-height: 1px;
}
.wt-bar-total { background: var(--border-light); }
.wt-bar-done { background: #36AD6A; z-index: 1; }

.wt-bar-label { font-size: 9px; color: var(--text-muted); margin-top: 3px; white-space: nowrap; }

.wt-clear-filter {
  border: none; background: none; color: #36AD6A;
  font-size: 11px; cursor: pointer; padding: 0; margin-left: auto;
}
.wt-clear-filter:hover { text-decoration: underline; }

/* Tag management */
.wt-tag-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s;
}

.wt-tag-btn:hover {
  background: var(--bg-card-hover);
  color: #36AD6A;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-card-hover);
  border-radius: 8px;
}

.tag-del-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s;
  flex-shrink: 0;
}

.tag-del-btn:hover {
  color: #E88080;
}

.tag-color-dot {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  border: 2px solid var(--border-light);
  transition: transform 0.12s;
}

.tag-color-dot:hover {
  transform: scale(1.1);
}

.tag-color-panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 4px;
}

.tag-color-option {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.12s;
}

.tag-color-option:hover {
  transform: scale(1.15);
}

.tag-color-option.active {
  border-color: var(--text-color);
  box-shadow: 0 0 0 2px var(--bg-card);
}
</style>
