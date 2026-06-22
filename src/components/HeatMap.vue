<script setup lang="ts">
import { NText, NTooltip } from 'naive-ui'
import { format, subDays, eachDayOfInterval, startOfWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { getDB } from '@/utils/database'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const taskMap = ref<Record<string, number>>({})
const totalDays = 365
const today = new Date()

onMounted(async () => {
  const db = await getDB()
  const userId = userStore.currentUser?.id
  if (!userId) return
  const startDate = format(subDays(today, totalDays), 'yyyy-MM-dd')
  const rows = await db.select<{ task_date: string; cnt: number }[]>(
    'SELECT task_date, COUNT(*) as cnt FROM work_tasks WHERE user_id = ? AND task_date >= ? GROUP BY task_date',
    [userId, startDate]
  )
  const map: Record<string, number> = {}
  for (const r of rows) map[r.task_date] = r.cnt
  taskMap.value = map
})

const monthLabels = computed(() => {
  const labels: { label: string; col: number }[] = []
  let lastMonth = -1
  for (let i = 0; i < weeks.value.length; i++) {
    const firstDay = weeks.value[i][0]
    if (firstDay) {
      const m = firstDay.date.getMonth()
      if (m !== lastMonth) {
        labels.push({ label: format(firstDay.date, 'M月'), col: i })
        lastMonth = m
      }
    }
  }
  return labels
})

interface DayCell {
  date: Date
  key: string
  count: number
  level: number
}

const weeks = computed(() => {
  const end = today
  const start = subDays(end, totalDays)
  const weekStart = startOfWeek(start, { weekStartsOn: 1 })
  const allDays = eachDayOfInterval({ start: weekStart, end })

  const result: (DayCell | null)[][] = []
  let currentWeek: (DayCell | null)[] = []

  for (const day of allDays) {
    const key = format(day, 'yyyy-MM-dd')
    const count = taskMap.value[key] || 0
    const dayOfWeek = (day.getDay() + 6) % 7

    if (dayOfWeek === 0 && currentWeek.length > 0) {
      result.push(currentWeek)
      currentWeek = []
    }

    const isFuture = day > today
    if (isFuture) {
      currentWeek.push(null)
    } else {
      currentWeek.push({
        date: day,
        key,
        count,
        level: count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4,
      })
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    result.push(currentWeek)
  }

  return result
})

const totalTasks = computed(() => Object.values(taskMap.value).reduce((a, b) => a + b, 0))
const activeDays = computed(() => Object.values(taskMap.value).filter(v => v > 0).length)

const weekDayLabels = ['一', '二', '三', '四', '五', '六', '日']
</script>

<template>
  <div class="heatmap">
    <div class="heatmap-header">
      <NText strong style="font-size: 16px">年度任务热力图</NText>
      <div class="heatmap-stats">
        <NText depth="3" style="font-size: 12px">{{ totalTasks }} 个任务</NText>
        <NText depth="3" style="font-size: 12px">·</NText>
        <NText depth="3" style="font-size: 12px">{{ activeDays }} 天活跃</NText>
      </div>
    </div>

    <div class="heatmap-body">
      <div class="heatmap-weekdays">
        <span v-for="(l, i) in weekDayLabels" :key="i" class="heatmap-wl">{{ l }}</span>
      </div>
      <div class="heatmap-scroll">
        <div class="heatmap-months">
          <span
            v-for="m in monthLabels"
            :key="m.col"
            class="heatmap-ml"
            :style="{ left: (m.col / weeks.length * 100) + '%' }"
          >{{ m.label }}</span>
        </div>
        <div class="heatmap-grid">
          <div v-for="(week, wi) in weeks" :key="wi" class="heatmap-col">
            <template v-for="(cell, di) in week" :key="di">
              <NTooltip v-if="cell" trigger="hover" placement="top" :delay="100">
                <template #trigger>
                  <div class="heatmap-cell" :class="'level-' + cell.level"></div>
                </template>
                {{ format(cell.date, 'yyyy年M月d日 EEEE', { locale: zhCN }) }}<br />
                {{ cell.count }} 个任务
              </NTooltip>
              <div v-else class="heatmap-cell empty"></div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="heatmap-legend">
      <NText depth="3" style="font-size: 11px">少</NText>
      <div class="heatmap-cell level-0"></div>
      <div class="heatmap-cell level-1"></div>
      <div class="heatmap-cell level-2"></div>
      <div class="heatmap-cell level-3"></div>
      <div class="heatmap-cell level-4"></div>
      <NText depth="3" style="font-size: 11px">多</NText>
    </div>
  </div>
</template>

<style scoped>
.heatmap {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  margin-top: 20px;
}

.heatmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.heatmap-stats {
  display: flex;
  gap: 4px;
  align-items: center;
}

.heatmap-body {
  display: flex;
  gap: 4px;
}

.heatmap-weekdays {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 18px;
  flex-shrink: 0;
}

.heatmap-wl {
  width: 16px;
  height: 12px;
  font-size: 10px;
  color: var(--text-muted);
  line-height: 12px;
  text-align: right;
}

.heatmap-scroll {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.heatmap-months {
  display: flex;
  height: 14px;
  margin-bottom: 4px;
  position: relative;
}

.heatmap-ml {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  position: absolute;
}

.heatmap-grid {
  display: flex;
  gap: 2px;
  flex: 1;
}

.heatmap-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.heatmap-cell {
  aspect-ratio: 1;
  width: 100%;
  border-radius: 2px;
  background: var(--border-light);
}

.heatmap-cell.empty {
  background: transparent;
}

.heatmap-cell.level-0 { background: var(--border-light); }
.heatmap-cell.level-1 { background: #9be9a8; }
.heatmap-cell.level-2 { background: #40c463; }
.heatmap-cell.level-3 { background: #30a14e; }
.heatmap-cell.level-4 { background: #216e39; }

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 3px;
  justify-content: flex-end;
  margin-top: 8px;
}

.heatmap-legend .heatmap-cell {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}
</style>
