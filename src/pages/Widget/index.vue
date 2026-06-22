<script setup lang="ts">
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { getDB } from '@/utils/database'
import { showMainWindow } from '@/utils/widget'
import { getCurrentWindow } from '@tauri-apps/api/window'

function startDrag() {
  getCurrentWindow().startDragging()
}

function handleClose() {
  getCurrentWindow().close()
}

const currentTime = ref('')
const currentDate = ref('')
const countdown = ref('')
const undoneCount = ref(0)
const workStatus = ref<'before' | 'working' | 'done'>('before')
const workProgress = ref(0)

const motivations = [
  '今天也要元气满满 💪',
  '每一份努力都不会被辜负 ✨',
  '专注当下，未来可期 🌟',
  '你比想象中更强大 🔥',
  '保持热爱，奔赴山海 🏔️',
  '认真的人最有魅力 💫',
  '付出终将有回报 🌱',
]
const todayMotivation = motivations[new Date().getDate() % motivations.length]

function loadWorkSchedule() {
  try {
    const saved = localStorage.getItem('work-schedule')
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return { start: 9 * 3600000, end: 18 * 3600000 }
}

function tsToOffsetMs(ts: number): number {
  const d = new Date(ts)
  return d.getHours() * 3600000 + d.getMinutes() * 60000 + d.getSeconds() * 1000
}

function formatCountdown(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function updateTime() {
  const now = new Date()
  currentTime.value = format(now, 'HH:mm')
  currentDate.value = format(now, 'M月d日 EEEE', { locale: zhCN })

  const schedule = loadWorkSchedule()
  const nowMs = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000
  const startMs = tsToOffsetMs(schedule.start)
  const endMs = tsToOffsetMs(schedule.end)

  if (nowMs < startMs) {
    workStatus.value = 'before'
    countdown.value = formatCountdown(startMs - nowMs)
    workProgress.value = 0
  } else if (nowMs < endMs) {
    workStatus.value = 'working'
    countdown.value = formatCountdown(endMs - nowMs)
    workProgress.value = Math.round(((nowMs - startMs) / (endMs - startMs)) * 100)
  } else {
    workStatus.value = 'done'
    countdown.value = '00:00:00'
    workProgress.value = 100
  }
}

async function loadUndone() {
  try {
    const db = await getDB()
    const today = format(new Date(), 'yyyy-MM-dd')
    const rows = await db.select<{ cnt: number }[]>(
      'SELECT COUNT(*) as cnt FROM work_tasks WHERE task_date = ? AND status != ?',
      [today, 'done']
    )
    undoneCount.value = rows[0]?.cnt || 0
  } catch { /* db not ready */ }
}

updateTime()
loadUndone()
const timer = setInterval(updateTime, 1000)
const taskTimer = setInterval(loadUndone, 30000)
onUnmounted(() => { clearInterval(timer); clearInterval(taskTimer) })
</script>

<template>
  <div class="w" @mousedown="startDrag" @dblclick="showMainWindow">
    <!-- 关闭 -->
    <button class="w-close" @click.stop="handleClose">×</button>

    <!-- 上半：时钟 -->
    <div class="w-top">
      <div class="w-time">{{ currentTime }}</div>
      <div class="w-seconds">{{ format(new Date(), 'ss') }}</div>
    </div>
    <div class="w-date">{{ currentDate }}</div>

    <!-- 分割线 -->
    <div class="w-divider"></div>

    <!-- 今日任务 -->
    <div class="w-row">
      <div class="w-col">
        <div class="w-label">今日任务</div>
        <div class="w-value">
          <span v-if="undoneCount > 0" style="color: #F0A020">{{ undoneCount }} 项待完成</span>
          <span v-else style="color: #36AD6A">已清空 ✓</span>
        </div>
      </div>
    </div>

    <!-- 激励 -->
    <div class="w-motto">{{ todayMotivation }}</div>
  </div>
</template>

<style>
html, body, #app {
  background: transparent !important;
  margin: 0;
  padding: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
}
</style>

<style scoped>
.w {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.06),
    0 4px 24px rgba(0, 0, 0, 0.08),
    0 12px 48px rgba(0, 0, 0, 0.04);
  padding: 18px 20px 14px;
  display: flex;
  flex-direction: column;
  cursor: grab;
  user-select: none;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', sans-serif;
  color: #1d1d1f;
}

.w:active { cursor: grabbing; }

/* 关闭按钮 */
.w-close {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 14px;
  height: 14px;
  border: none;
  border-radius: 50%;
  background: #ff5f57;
  color: transparent;
  font-size: 10px;
  line-height: 14px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.w:hover .w-close { color: rgba(0,0,0,0.5); }
.w-close:hover { background: #ff3b30; }

/* 时钟 */
.w-top {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 2px;
}

.w-time {
  font-size: 44px;
  font-weight: 300;
  letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.w-seconds {
  font-size: 18px;
  font-weight: 300;
  color: rgba(0, 0, 0, 0.35);
  font-variant-numeric: tabular-nums;
}

.w-date {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 4px;
  font-weight: 500;
}

/* 分割线 */
.w-divider {
  height: 0.5px;
  background: rgba(0, 0, 0, 0.08);
  margin: 12px 0;
}

/* 信息行 */
.w-row {
  display: flex;
  align-items: center;
}

.w-col {
  flex: 1;
}

.w-col-divider {
  width: 0.5px;
  height: 32px;
  background: rgba(0, 0, 0, 0.08);
  margin: 0 14px;
}

.w-label {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
  font-weight: 500;
  margin-bottom: 3px;
}

.w-value {
  font-size: 17px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #1d1d1f;
}

.w-value.working { color: #36AD6A; }
.w-value.done { color: rgba(0, 0, 0, 0.25); }
.w-value.before { color: #F0A020; }

/* 进度条 */
.w-progress {
  height: 3px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 2px;
  margin-top: 12px;
  overflow: hidden;
}

.w-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34c759, #30d158);
  border-radius: 2px;
  transition: width 1s ease;
}

/* 激励语 */
.w-motto {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.3);
  text-align: center;
  margin-top: 8px;
}
</style>
