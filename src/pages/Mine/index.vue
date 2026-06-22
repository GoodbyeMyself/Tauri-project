<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { exportBackupJSON, importBackupJSON } from '@/utils/backup'
import {
  NText,
  NButton,
  NAvatar,
  NInput,
  NTag,
  NPopconfirm,
  NEmpty,
  NTimePicker,
  useMessage,
  useDialog,
} from 'naive-ui'
import { getDB } from '@/utils/database'

const userStore = useUserStore()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const editingNickname = ref(false)
const newNickname = ref('')

async function startEditNickname() {
  newNickname.value = userStore.currentUser?.nickname || ''
  editingNickname.value = true
}

async function saveNickname() {
  if (!newNickname.value.trim()) return
  await userStore.updateNickname(newNickname.value.trim())
  editingNickname.value = false
  message.success('昵称已更新')
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
  message.success('已退出登录')
}

async function handleExportBackup() {
  const userId = userStore.currentUser?.id
  if (!userId) return
  const result = await exportBackupJSON(userId)
  if (result) message.success(`已备份 ${result.wechatArticles} 篇公众号文章、${result.workTasks} 条工作任务`)
}

interface LocalUser {
  id: number
  username: string
  nickname: string
  plain_password: string
  created_at: string
}

const allUsers = ref<LocalUser[]>([])
const visiblePwdIds = ref<Set<number>>(new Set())

function togglePwd(id: number) {
  if (visiblePwdIds.value.has(id)) {
    visiblePwdIds.value.delete(id)
  } else {
    visiblePwdIds.value.add(id)
  }
  visiblePwdIds.value = new Set(visiblePwdIds.value)
}

async function loadAllUsers() {
  const db = await getDB()
  allUsers.value = await db.select<LocalUser[]>(
    'SELECT id, username, nickname, plain_password, created_at FROM users ORDER BY created_at ASC'
  )
}

async function deleteUser(id: number) {
  if (id === userStore.currentUser?.id) return
  const db = await getDB()
  await db.execute('DELETE FROM work_tasks WHERE user_id = ?', [id])
  await db.execute('DELETE FROM wechat_articles WHERE user_id = ?', [id])
  await db.execute('DELETE FROM users WHERE id = ?', [id])
  await loadAllUsers()
  message.success('账号已删除')
}

onMounted(() => loadAllUsers())

function handleImportBackup() {
  const userId = userStore.currentUser?.id
  if (!userId) return
  dialog.warning({
    title: '导入备份',
    content: '导入会合并数据（不会覆盖已有记录），确定继续？',
    positiveText: '确定导入',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const result = await importBackupJSON(userId)
        if (result) {
          message.success(`已导入 ${result.articlesCount} 篇公众号文章、${result.tasksCount} 条工作任务`)
        }
      } catch {
        message.error('导入失败：备份文件格式错误')
      }
    },
  })
}

// ===== 上下班时间 =====
function loadWorkTime() {
  const saved = localStorage.getItem('work-schedule')
  if (saved) return JSON.parse(saved)
  return { start: 9 * 3600000, end: 18 * 3600000 }
}

const workSchedule = reactive(loadWorkTime())
const countdown = ref('')
const workStatus = ref<'before' | 'working' | 'done'>('before')
const workProgress = ref(0)

const motivations = [
  '今天也要元气满满地工作！💪',
  '每一份努力都不会被辜负 ✨',
  '专注当下，未来可期 🌟',
  '你比想象中更强大 🔥',
  '保持热爱，奔赴山海 🏔️',
  '认真的人最有魅力 💫',
  '今天的付出，明天的收获 🌱',
]
const todayMotivation = motivations[new Date().getDate() % motivations.length]

function formatMs(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timeToMs(h: number, m: number): number {
  return h * 3600000 + m * 60000
}

function tsToOffsetMs(ts: number): number {
  const d = new Date(ts)
  return d.getHours() * 3600000 + d.getMinutes() * 60000 + d.getSeconds() * 1000
}

function updateCountdown() {
  const now = new Date()
  const nowMs = timeToMs(now.getHours(), now.getMinutes()) + now.getSeconds() * 1000
  const startMs = tsToOffsetMs(workSchedule.start)
  const endMs = tsToOffsetMs(workSchedule.end)

  if (nowMs < startMs) {
    workStatus.value = 'before'
    countdown.value = formatMs(startMs - nowMs)
    workProgress.value = 0
  } else if (nowMs < endMs) {
    workStatus.value = 'working'
    const remaining = endMs - nowMs
    countdown.value = formatMs(remaining)
    workProgress.value = Math.round(((nowMs - startMs) / (endMs - startMs)) * 100)
  } else {
    workStatus.value = 'done'
    countdown.value = '00:00:00'
    workProgress.value = 100
  }
}

function saveWorkSchedule() {
  localStorage.setItem('work-schedule', JSON.stringify({ start: workSchedule.start, end: workSchedule.end }))
}

function onStartChange(val: number | null) {
  if (val !== null) { workSchedule.start = val; saveWorkSchedule() }
}

function onEndChange(val: number | null) {
  if (val !== null) { workSchedule.end = val; saveWorkSchedule() }
}

updateCountdown()
const countdownTimer = setInterval(updateCountdown, 1000)
onUnmounted(() => clearInterval(countdownTimer))
</script>

<template>
  <div class="mine-page">
    <!-- 用户卡片 -->
    <div class="mine-profile">
      <div class="mine-profile-bg"></div>
      <div class="mine-profile-body">
        <NAvatar
          round
          :size="80"
          class="mine-avatar"
        >
          {{ userStore.currentUser?.nickname?.charAt(0) || 'U' }}
        </NAvatar>
        <div class="mine-info">
          <div style="display: flex; align-items: center; gap: 8px">
            <template v-if="editingNickname">
              <NInput
                v-model:value="newNickname"
                size="small"
                placeholder="输入新昵称"
                style="width: 160px"
                @keydown.enter="saveNickname"
              />
              <NButton size="tiny" type="primary" @click="saveNickname">保存</NButton>
              <NButton size="tiny" @click="editingNickname = false">取消</NButton>
            </template>
            <template v-else>
              <NText strong style="font-size: 22px">{{ userStore.currentUser?.nickname }}</NText>
              <NButton text size="tiny" @click="startEditNickname">
                <div class="i-carbon-edit" style="font-size: 14px; color: var(--text-muted)"></div>
              </NButton>
            </template>
          </div>
          <NText depth="3" style="font-size: 13px; margin-top: 4px; display: block">
            @{{ userStore.currentUser?.username }} · 注册于 {{ userStore.currentUser?.created_at ? new Date(userStore.currentUser.created_at).toLocaleDateString('zh-CN') : '' }}
          </NText>
        </div>
        <NPopconfirm @positive-click="handleLogout">
          <template #trigger>
            <NButton type="error" ghost size="small" style="margin-left: auto">退出登录</NButton>
          </template>
          确定退出登录吗？
        </NPopconfirm>
      </div>
    </div>

    <!-- 上下班倒计时 -->
    <div class="work-clock-card">
      <div class="work-clock-header">
        <div class="work-clock-emoji">
          {{ workStatus === 'done' ? '🎉' : workStatus === 'working' ? '💼' : '🌅' }}
        </div>
        <div>
          <NText strong style="font-size: 15px; display: block">
            {{ workStatus === 'done' ? '已下班，辛苦了！' : workStatus === 'working' ? '距离下班还有' : '距离上班还有' }}
          </NText>
          <NText depth="3" style="font-size: 12px">{{ todayMotivation }}</NText>
        </div>
      </div>

      <div class="work-clock-countdown" :class="workStatus">
        {{ countdown }}
      </div>

      <div class="work-clock-progress">
        <div class="work-clock-progress-bar" :style="{ width: workProgress + '%' }"></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 4px">
        <NText depth="3" style="font-size: 11px">{{ workProgress }}% 已完成</NText>
        <NText v-if="workStatus === 'done'" style="font-size: 11px; color: #36AD6A">🎊 今日已完成</NText>
      </div>

      <div class="work-clock-time">
        <div class="work-clock-time-item">
          <NText depth="3" style="font-size: 11px; display: block; margin-bottom: 4px">上班时间</NText>
          <NTimePicker
            :value="workSchedule.start"
            format="HH:mm"
            size="small"
            style="width: 100px"
            :actions="[]"
            @update:value="onStartChange"
          />
        </div>
        <div class="work-clock-divider">
          <div class="i-carbon-arrow-right" style="font-size: 14px; color: var(--text-muted)"></div>
        </div>
        <div class="work-clock-time-item">
          <NText depth="3" style="font-size: 11px; display: block; margin-bottom: 4px">下班时间</NText>
          <NTimePicker
            :value="workSchedule.end"
            format="HH:mm"
            size="small"
            style="width: 100px"
            :actions="[]"
            @update:value="onEndChange"
          />
        </div>
      </div>
    </div>

    <!-- 数据管理 -->
    <NText strong style="font-size: 16px; display: block; margin: 28px 0 14px">数据管理</NText>
    <div class="mine-data-grid">
      <div class="mine-data-card" @click="handleExportBackup">
        <div class="mine-data-icon" style="background: var(--wt-accent-bg); color: #36AD6A">
          <div class="i-carbon-cloud-download" style="font-size: 22px"></div>
        </div>
        <NText strong style="font-size: 14px">备份数据</NText>
        <NText depth="3" style="font-size: 12px; margin-top: 2px">导出所有数据为 JSON 文件</NText>
      </div>
      <div class="mine-data-card" @click="handleImportBackup">
        <div class="mine-data-icon" style="background: var(--wt-blue-bg); color: #4098FC">
          <div class="i-carbon-cloud-upload" style="font-size: 22px"></div>
        </div>
        <NText strong style="font-size: 14px">恢复数据</NText>
        <NText depth="3" style="font-size: 12px; margin-top: 2px">从 JSON 备份文件导入</NText>
      </div>
    </div>

    <!-- 本地账号 -->
    <NText strong style="font-size: 16px; display: block; margin: 28px 0 14px">本地账号</NText>
    <div class="mine-users-card">
      <NEmpty v-if="allUsers.length === 0" size="small" description="暂无账号" />
      <div
        v-for="user in allUsers"
        :key="user.id"
        class="mine-user-row"
      >
        <NAvatar round :size="36" class="mine-user-avatar">
          {{ user.nickname?.charAt(0) || user.username.charAt(0) }}
        </NAvatar>
        <div class="mine-user-info">
          <div style="display: flex; align-items: center; gap: 6px">
            <NText strong style="font-size: 14px">{{ user.nickname || user.username }}</NText>
            <NTag v-if="user.id === userStore.currentUser?.id" type="success" size="tiny" round>当前</NTag>
          </div>
          <div style="display: flex; align-items: center; gap: 4px; font-size: 11px">
            <NText depth="3">@{{ user.username }}</NText>
            <NText depth="3">·</NText>
            <NText depth="3" style="font-family: monospace">{{ visiblePwdIds.has(user.id) ? (user.plain_password || '—') : '••••••' }}</NText>
            <button class="mine-pwd-toggle" @click.stop="togglePwd(user.id)">
              <div :class="visiblePwdIds.has(user.id) ? 'i-carbon-view-off' : 'i-carbon-view'" style="font-size: 12px"></div>
            </button>
            <NText depth="3">·</NText>
            <NText depth="3">{{ user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '' }}</NText>
          </div>
        </div>
        <NPopconfirm
          v-if="user.id !== userStore.currentUser?.id"
          @positive-click="deleteUser(user.id)"
          :show-icon="false"
        >
          <template #trigger>
            <button class="mine-user-del">
              <div class="i-carbon-trash-can" style="font-size: 14px"></div>
            </button>
          </template>
          删除账号「{{ user.nickname || user.username }}」及其所有数据？
        </NPopconfirm>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mine-page {
  max-width: 100%;
}

.mine-profile {
  border-radius: 16px;
  overflow: hidden;
  background: var(--bg-card);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.mine-profile-bg {
  height: 80px;
  background: linear-gradient(135deg, #36AD6A, #1B8C3E 50%, #4FBF7F);
}

.mine-profile-body {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  padding: 0 24px 20px;
  margin-top: -36px;
}

.mine-avatar {
  background: linear-gradient(135deg, #36AD6A, #1B8C3E);
  font-size: 32px;
  font-weight: bold;
  border: 3px solid var(--bg-card);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.mine-info {
  flex: 1;
  padding-top: 40px;
}

.mine-data-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.mine-data-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.mine-data-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.mine-data-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.mine-users-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 8px 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.mine-user-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  transition: background 0.12s;
}

.mine-user-row:hover {
  background: var(--bg-card-hover);
}

.mine-user-avatar {
  background: linear-gradient(135deg, #36AD6A, #1B8C3E);
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.mine-user-info {
  flex: 1;
  min-width: 0;
}

.mine-user-del {
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
  opacity: 0;
  transition: all 0.15s;
}

.mine-user-row:hover .mine-user-del {
  opacity: 1;
}

.mine-user-del:hover {
  background: var(--wt-red-bg);
  color: #E88080;
}

.mine-pwd-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s;
  padding: 0;
}

.mine-pwd-toggle:hover {
  color: #36AD6A;
}

/* Work Clock */
.work-clock-card {
  margin-top: 24px;
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.work-clock-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.work-clock-emoji {
  font-size: 32px;
  line-height: 1;
}

.work-clock-countdown {
  font-size: 42px;
  font-weight: 200;
  letter-spacing: 2px;
  font-variant-numeric: tabular-nums;
  text-align: center;
  padding: 8px 0 16px;
  color: var(--text-color);
}

.work-clock-countdown.working {
  color: #36AD6A;
}

.work-clock-countdown.done {
  color: var(--text-muted);
}

.work-clock-progress {
  height: 6px;
  background: var(--border-light);
  border-radius: 3px;
  overflow: hidden;
}

.work-clock-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #36AD6A, #4FBF7F);
  border-radius: 3px;
  transition: width 1s ease;
}

.work-clock-time {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.work-clock-time-item {
  text-align: center;
}

.work-clock-divider {
  display: flex;
  align-items: center;
  padding-bottom: 6px;
}
</style>
