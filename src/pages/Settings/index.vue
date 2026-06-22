<script setup lang="ts">
import {
  NText,
  NCard,
  NSwitch,
  NDescriptions,
  NDescriptionsItem,
  NTag,
  NInput,
  NSelect,
  NButton,
  useMessage,
  useDialog,
} from 'naive-ui'
import { isDark } from '@/styles/theme'
import { openWidget } from '@/utils/widget'
import { AI_MODELS, API_PRESETS, getAiConfig } from '@/utils/ai'
import { getDB } from '@/utils/database'
import { useUserStore } from '@/stores/user'

interface MenuItem { key: string; label: string; icon: string; locked?: boolean }

const menuItems: MenuItem[] = [
  { key: 'dashboard', label: '首页', icon: 'i-carbon-dashboard' },
  { key: 'work-task', label: '工作任务', icon: 'i-carbon-task' },
  { key: 'wechat-editor', label: '公众号编辑器', icon: 'i-carbon-document' },
  { key: 'mine', label: '我的', icon: 'i-carbon-user-avatar', locked: true },
  { key: 'settings', label: '设置', icon: 'i-carbon-settings', locked: true },
]

function getHidden(): string[] {
  try { return JSON.parse(localStorage.getItem('hiddenMenus') || '[]') } catch { return [] }
}

const hiddenMenus = ref<string[]>(getHidden())

function isVisible(key: string) {
  return !hiddenMenus.value.includes(key)
}

function toggleMenu(key: string, val: boolean) {
  if (val) {
    hiddenMenus.value = hiddenMenus.value.filter(k => k !== key)
  } else {
    hiddenMenus.value.push(key)
  }
  localStorage.setItem('hiddenMenus', JSON.stringify(hiddenMenus.value))
  window.dispatchEvent(new Event('menu-visibility-changed'))
}

const message = useMessage()
const platform = navigator.platform

const aiConfig = reactive(getAiConfig())
const aiModelOptions = AI_MODELS.map(m => ({ label: m.name, value: m.id }))
const apiPresetOptions = [
  ...API_PRESETS.map(p => ({ label: p.label, value: p.url })),
  { label: '自定义', value: '__custom__' },
]
const isCustomBase = computed(() =>
  !API_PRESETS.some(p => p.url === aiConfig.apiBase)
)
const selectedPreset = computed(() =>
  isCustomBase.value ? '__custom__' : aiConfig.apiBase
)

function saveAiKey() {
  localStorage.setItem('ai-api-key', aiConfig.apiKey)
  message.success('API Key 已保存')
}

function saveAiBase() {
  localStorage.setItem('ai-api-base', aiConfig.apiBase)
  message.success('API 地址已保存')
}

function selectPreset(val: string) {
  if (val === '__custom__') {
    aiConfig.apiBase = ''
    localStorage.setItem('ai-api-base', '')
  } else {
    aiConfig.apiBase = val
    localStorage.setItem('ai-api-base', val)
  }
}

function updateAiModel(val: string) {
  aiConfig.model = val
  localStorage.setItem('ai-model', val)
}

const remindInterval = ref(Number(localStorage.getItem('task-remind-interval') ?? '120'))
const remindOptions = [
  { label: '关闭提醒', value: 0 },
  { label: '1 分钟', value: 60 },
  { label: '2 分钟', value: 120 },
  { label: '5 分钟', value: 300 },
  { label: '10 分钟', value: 600 },
  { label: '30 分钟', value: 1800 },
  { label: '1 小时', value: 3600 },
]

function updateRemindInterval(val: number) {
  remindInterval.value = val
  localStorage.setItem('task-remind-interval', String(val))
}

const shortcuts = [
  { keys: 'Alt + N', desc: '显示/隐藏窗口' },
  { keys: 'Ctrl + Enter', desc: '公众号编辑器中添加任务' },
]

// ===== 存储管理 =====
const userStore = useUserStore()
const dialog = useDialog()

interface StorageItem {
  key: string
  label: string
  icon: string
  count: number
  size: string
}

const storageItems = ref<StorageItem[]>([])
const totalSize = ref('0 B')

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getLocalStorageSize(): number {
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) total += key.length + (localStorage.getItem(key)?.length || 0)
  }
  return total * 2
}

async function loadStorageInfo() {
  const db = await getDB()
  const userId = userStore.currentUser?.id

  const tasks = userId
    ? await db.select<{ cnt: number }[]>('SELECT COUNT(*) as cnt FROM work_tasks WHERE user_id = ?', [userId])
    : [{ cnt: 0 }]
  const articles = userId
    ? await db.select<{ cnt: number }[]>('SELECT COUNT(*) as cnt FROM wechat_articles WHERE user_id = ?', [userId])
    : [{ cnt: 0 }]
  const users = await db.select<{ cnt: number }[]>('SELECT COUNT(*) as cnt FROM users')

  const aiSessions = JSON.parse(localStorage.getItem('ai-sessions') || '[]')
  const lsSize = getLocalStorageSize()

  const taskCount = tasks[0]?.cnt || 0
  const articleCount = articles[0]?.cnt || 0
  const userCount = users[0]?.cnt || 0
  const sessionCount = aiSessions.length

  storageItems.value = [
    { key: 'tasks', label: '工作任务', icon: 'i-carbon-task', count: taskCount, size: formatSize(taskCount * 200) },
    { key: 'articles', label: '公众号文章', icon: 'i-carbon-document', count: articleCount, size: formatSize(articleCount * 2000) },
    { key: 'ai-sessions', label: 'AI 聊天记录', icon: 'i-carbon-chat', count: sessionCount, size: formatSize(JSON.stringify(aiSessions).length * 2) },
    { key: 'users', label: '本地账号', icon: 'i-carbon-user', count: userCount, size: formatSize(userCount * 100) },
    { key: 'localstorage', label: '本地缓存', icon: 'i-carbon-settings', count: localStorage.length, size: formatSize(lsSize) },
  ]

  const dbSize = taskCount * 200 + articleCount * 2000 + userCount * 100
  totalSize.value = formatSize(dbSize + lsSize)
}

function clearItem(key: string) {
  const item = storageItems.value.find(i => i.key === key)
  if (!item) return

  dialog.warning({
    title: '确认清除',
    content: `确定要清除所有「${item.label}」数据吗？此操作不可恢复。`,
    positiveText: '确定清除',
    negativeText: '取消',
    onPositiveClick: async () => {
      const db = await getDB()
      const userId = userStore.currentUser?.id
      if (key === 'tasks' && userId) {
        await db.execute('DELETE FROM work_tasks WHERE user_id = ?', [userId])
        window.dispatchEvent(new Event('task-updated'))
      } else if (key === 'articles' && userId) {
        await db.execute('DELETE FROM wechat_articles WHERE user_id = ?', [userId])
      } else if (key === 'ai-sessions') {
        localStorage.removeItem('ai-sessions')
      } else if (key === 'users') {
        const currentId = userStore.currentUser?.id
        if (currentId) {
          await db.execute('DELETE FROM users WHERE id != ?', [currentId])
        }
      } else if (key === 'localstorage') {
        const keysToKeep = ['user_session', 'rememberedUsername', 'theme']
        const allKeys: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && !keysToKeep.includes(k)) allKeys.push(k)
        }
        allKeys.forEach(k => localStorage.removeItem(k))
      }
      await db.execute('VACUUM')
      message.success(`「${item.label}」已清除`)
      await loadStorageInfo()
    },
  })
}

function clearAll() {
  dialog.warning({
    title: '一键清除所有数据',
    content: '将清除当前用户的所有工作任务、公众号文章、AI 聊天记录和本地缓存。当前账号保留，此操作不可恢复！',
    positiveText: '全部清除',
    negativeText: '取消',
    onPositiveClick: async () => {
      const db = await getDB()
      const userId = userStore.currentUser?.id
      if (userId) {
        await db.execute('DELETE FROM work_tasks WHERE user_id = ?', [userId])
        await db.execute('DELETE FROM wechat_articles WHERE user_id = ?', [userId])
      }
      localStorage.removeItem('ai-sessions')
      const keysToKeep = ['user_session', 'rememberedUsername', 'theme']
      const allKeys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && !keysToKeep.includes(k)) allKeys.push(k)
      }
      allKeys.forEach(k => localStorage.removeItem(k))
      await db.execute('VACUUM')
      window.dispatchEvent(new Event('task-updated'))
      message.success('所有数据已清除')
      await loadStorageInfo()
    },
  })
}

onMounted(() => loadStorageInfo())
</script>

<template>
  <div class="settings-page">
    <NText strong style="font-size: 22px; display: block; margin-bottom: 24px">设置</NText>

    <NCard title="桌面小组件" :bordered="false" style="border-radius: 14px; margin-bottom: 16px">
      <div class="setting-row">
        <div style="display: flex; align-items: center; gap: 10px">
          <div class="i-carbon-dashboard" style="font-size: 16px; color: var(--text-secondary)"></div>
          <div>
            <NText strong style="font-size: 14px">迷你时钟</NText>
            <NText depth="3" style="font-size: 12px; display: block; margin-top: 1px">桌面常驻小组件，显示时钟、倒计时、任务数</NText>
          </div>
        </div>
        <NButton size="small" type="primary" @click="openWidget">打开</NButton>
      </div>
    </NCard>

    <NCard title="外观" :bordered="false" style="border-radius: 14px; margin-bottom: 16px">
      <div class="setting-row">
        <div style="display: flex; align-items: center; gap: 10px">
          <div :class="isDark ? 'i-carbon-moon' : 'i-carbon-sun'" style="font-size: 16px; color: var(--text-secondary)"></div>
          <div>
            <NText strong style="font-size: 14px">{{ isDark ? '暗色模式' : '亮色模式' }}</NText>
            <NText depth="3" style="font-size: 12px; display: block; margin-top: 1px">切换应用主题</NText>
          </div>
        </div>
        <NSwitch v-model:value="isDark" size="small">
          <template #checked>暗</template>
          <template #unchecked>亮</template>
        </NSwitch>
      </div>
    </NCard>

    <NCard title="任务提醒" :bordered="false" style="border-radius: 14px; margin-bottom: 16px">
      <div class="setting-row">
        <div style="display: flex; align-items: center; gap: 10px">
          <div class="i-carbon-alarm" style="font-size: 16px; color: var(--text-secondary)"></div>
          <div>
            <NText strong style="font-size: 14px">提醒间隔</NText>
            <NText depth="3" style="font-size: 12px; display: block; margin-top: 1px">关闭提醒后，间隔多久再次提示未完成任务</NText>
          </div>
        </div>
        <NSelect
          :value="remindInterval"
          :options="remindOptions"
          size="small"
          style="width: 120px"
          @update:value="updateRemindInterval"
        />
      </div>
    </NCard>

    <NCard title="AI 配置" :bordered="false" style="border-radius: 14px; margin-bottom: 16px">
      <NText depth="3" style="font-size: 12px; display: block; margin-bottom: 12px">
        支持硅基流动、DeepSeek、OpenAI 等兼容接口，<a href="https://cloud.siliconflow.cn/account/ak" target="_blank" style="color: #8B5CF6">获取硅基流动 Key</a>
      </NText>
      <div class="setting-row">
        <div style="display: flex; align-items: center; gap: 10px">
          <div class="i-carbon-api" style="font-size: 16px; color: var(--text-secondary)"></div>
          <NText style="font-size: 14px">接口</NText>
        </div>
        <NSelect
          :value="selectedPreset"
          :options="apiPresetOptions"
          size="small"
          style="width: 200px"
          @update:value="selectPreset"
        />
      </div>
      <div v-if="isCustomBase" class="setting-row">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0">
          <div class="i-carbon-link" style="font-size: 16px; color: var(--text-secondary); flex-shrink: 0"></div>
          <NInput
            v-model:value="aiConfig.apiBase"
            placeholder="输入 API 地址，如 https://api.example.com/v1"
            size="small"
            style="flex: 1"
            @blur="saveAiBase"
            @keydown.enter="saveAiBase"
          />
        </div>
      </div>
      <div class="setting-row">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0">
          <div class="i-carbon-key" style="font-size: 16px; color: var(--text-secondary); flex-shrink: 0"></div>
          <NInput
            v-model:value="aiConfig.apiKey"
            type="password"
            show-password-on="click"
            placeholder="输入 API Key"
            size="small"
            style="flex: 1"
            @blur="saveAiKey"
            @keydown.enter="saveAiKey"
          />
        </div>
      </div>
      <div class="setting-row">
        <div style="display: flex; align-items: center; gap: 10px">
          <div class="i-carbon-machine-learning-model" style="font-size: 16px; color: var(--text-secondary)"></div>
          <NText style="font-size: 14px">模型</NText>
        </div>
        <NSelect
          :value="aiConfig.model"
          :options="aiModelOptions"
          size="small"
          style="width: 200px"
          filterable
          tag
          placeholder="选择或输入模型"
          @update:value="updateAiModel"
        />
      </div>
    </NCard>

    <NCard title="菜单管理" :bordered="false" style="border-radius: 14px; margin-bottom: 16px">
      <NText depth="3" style="font-size: 12px; display: block; margin-bottom: 12px">控制侧边栏显示的功能模块</NText>
      <div v-for="item in menuItems" :key="item.key" class="setting-row">
        <div style="display: flex; align-items: center; gap: 10px">
          <div :class="item.icon" style="font-size: 16px; color: var(--text-secondary)"></div>
          <div>
            <NText strong style="font-size: 14px">{{ item.label }}</NText>
            <NText v-if="item.locked" depth="3" style="font-size: 11px; display: block; margin-top: 1px">不可隐藏</NText>
          </div>
        </div>
        <NSwitch
          :value="isVisible(item.key)"
          :disabled="item.locked"
          @update:value="(val: boolean) => toggleMenu(item.key, val)"
          size="small"
        />
      </div>
    </NCard>

    <NCard title="快捷键" :bordered="false" style="border-radius: 14px; margin-bottom: 16px">
      <div v-for="s in shortcuts" :key="s.keys" class="setting-row">
        <NText style="font-size: 14px">{{ s.desc }}</NText>
        <NTag size="small" :bordered="false" style="font-family: monospace">{{ s.keys }}</NTag>
      </div>
    </NCard>

    <NCard title="存储管理" :bordered="false" style="border-radius: 14px; margin-bottom: 16px">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <NText depth="3" style="font-size: 12px">当前数据占用约 {{ totalSize }}</NText>
        <NButton size="tiny" type="error" ghost @click="clearAll">一键清除</NButton>
      </div>
      <div v-for="item in storageItems" :key="item.key" class="setting-row">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1">
          <div :class="item.icon" style="font-size: 16px; color: var(--text-secondary)"></div>
          <div style="flex: 1">
            <NText strong style="font-size: 14px">{{ item.label }}</NText>
            <NText depth="3" style="font-size: 11px; display: block; margin-top: 1px">{{ item.count }} 条 · {{ item.size }}</NText>
          </div>
        </div>
        <NButton size="tiny" quaternary type="error" @click="clearItem(item.key)" :disabled="item.count === 0">
          清除
        </NButton>
      </div>
    </NCard>

    <NCard title="关于" :bordered="false" style="border-radius: 14px">
      <NDescriptions label-placement="left" :column="1" bordered>
        <NDescriptionsItem label="应用名称">Desktop Notepad</NDescriptionsItem>
        <NDescriptionsItem label="版本">v0.1.0</NDescriptionsItem>
        <NDescriptionsItem label="框架">Tauri 2.0 + Vue 3</NDescriptionsItem>
        <NDescriptionsItem label="数据存储">本地 SQLite</NDescriptionsItem>
        <NDescriptionsItem label="运行平台">{{ platform }}</NDescriptionsItem>
      </NDescriptions>
    </NCard>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 100%;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
}

.setting-row:last-child {
  border-bottom: none;
}
</style>
