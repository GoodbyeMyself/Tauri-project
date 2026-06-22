<script setup lang="ts">
import { NText, NInput, NButton, NTooltip, useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import { chatStream, getAiConfig } from '@/utils/ai'
import type { ChatMessage } from '@/utils/ai'

const router = useRouter()
const message = useMessage()

const query = ref('')
const loading = ref(false)
const chatListRef = ref<HTMLElement>()

interface UiMessage {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<UiMessage[]>([])
const inChat = computed(() => messages.value.length > 0)
const showSidebar = ref(true)

interface ChatSession {
  id: number
  title: string
  messages: UiMessage[]
  time: string
}

const sessions = ref<ChatSession[]>(JSON.parse(localStorage.getItem('ai-sessions') || '[]'))
const activeSessionId = ref<number | null>(null)

function saveSessions() {
  localStorage.setItem('ai-sessions', JSON.stringify(sessions.value))
}

function createSession() {
  if (messages.value.length > 0) {
    saveCurrentSession()
  }
  messages.value = []
  query.value = ''
  activeSessionId.value = null
}

function saveCurrentSession() {
  if (messages.value.length === 0) return
  const title = messages.value.find(m => m.role === 'user')?.content.slice(0, 30) || '新对话'
  if (activeSessionId.value !== null) {
    const session = sessions.value.find(s => s.id === activeSessionId.value)
    if (session) {
      session.messages = [...messages.value]
      session.title = title
      saveSessions()
      return
    }
  }
  const id = Date.now()
  sessions.value.unshift({ id, title, messages: [...messages.value], time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) })
  activeSessionId.value = id
  saveSessions()
}

function loadSession(session: ChatSession) {
  if (messages.value.length > 0 && activeSessionId.value !== session.id) {
    saveCurrentSession()
  }
  messages.value = [...session.messages]
  activeSessionId.value = session.id
}

function deleteSession(id: number) {
  sessions.value = sessions.value.filter(s => s.id !== id)
  saveSessions()
  if (activeSessionId.value === id) {
    messages.value = []
    activeSessionId.value = null
  }
}

const tags = [
  { label: '任务查询', icon: 'i-carbon-task', prompt: '帮我总结一下今天的工作任务' },
  { label: '文章管理', icon: 'i-carbon-document', prompt: '如何用公众号编辑器写出排版好看的文章？' },
  { label: '数据统计', icon: 'i-carbon-chart-bar', prompt: '如何高效管理我的每日工作进度？' },
  { label: '使用帮助', icon: 'i-carbon-help', prompt: '这个应用有哪些功能？怎么使用？' },
]

function clickTag(prompt: string) {
  query.value = prompt
  handleSend()
}

function scrollToBottom() {
  nextTick(() => {
    if (chatListRef.value) {
      chatListRef.value.scrollTop = chatListRef.value.scrollHeight
    }
  })
}

async function handleSend() {
  const text = query.value.trim()
  if (!text || loading.value) return

  const { apiKey } = getAiConfig()
  if (!apiKey) {
    message.warning('请先在设置页配置 API Key')
    router.replace('/settings')
    return
  }

  messages.value.push({ role: 'user', content: text })
  query.value = ''
  scrollToBottom()

  messages.value.push({ role: 'assistant', content: '' })
  loading.value = true

  const history: ChatMessage[] = messages.value
    .slice(0, -1)
    .map(m => ({ role: m.role, content: m.content }))

  const aiIndex = messages.value.length - 1

  await chatStream(
    history,
    (chunk) => {
      messages.value[aiIndex].content += chunk
      scrollToBottom()
    },
    () => {
      loading.value = false
    },
    (err) => {
      loading.value = false
      if (messages.value[aiIndex].content === '') {
        messages.value[aiIndex].content = `出错了：${err}`
      } else {
        message.error(err)
      }
    },
  )
}

function renderMd(text: string): string {
  return marked.parse(text, { async: false }) as string
}

function copyContent(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    message.success('已复制')
  })
}

function newChat() {
  createSession()
}

watch(messages, () => {
  if (messages.value.length > 0 && !loading.value) {
    saveCurrentSession()
  }
}, { deep: true })
</script>

<template>
  <div class="ai-layout">
    <!-- 左侧侧边栏 -->
    <div class="ai-sidebar" :class="{ collapsed: !showSidebar }">
      <div v-if="showSidebar" class="ai-sidebar-inner">
        <div class="ai-sidebar-header">
          <img src="@/assets/ai-logo.png" style="width: 24px; height: 24px; border-radius: 6px" />
          <NText strong style="font-size: 14px">AI 搜问</NText>
          <span style="flex: 1"></span>
          <button class="ai-sidebar-btn" @click="showSidebar = false" title="收起">
            <div class="i-carbon-side-panel-close" style="font-size: 16px"></div>
          </button>
        </div>

        <button class="ai-new-chat-btn" @click="newChat">
          <div class="i-carbon-edit" style="font-size: 16px"></div>
          <span>新建对话</span>
        </button>

        <div class="ai-sidebar-section">
          <NText depth="3" style="font-size: 12px">最近</NText>
        </div>
        <div class="ai-session-list">
          <div v-if="sessions.length === 0" style="padding: 12px; text-align: center">
            <NText depth="3" style="font-size: 12px">没有更多了</NText>
          </div>
          <div
            v-for="s in sessions"
            :key="s.id"
            class="ai-session-item"
            :class="{ active: activeSessionId === s.id }"
            @click="loadSession(s)"
          >
            <NText style="font-size: 13px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ s.title }}</NText>
            <button class="ai-session-del" @click.stop="deleteSession(s.id)">
              <div class="i-carbon-close" style="font-size: 12px"></div>
            </button>
          </div>
        </div>
      </div>
      <button v-else class="ai-expand-btn" @click="showSidebar = true" title="展开侧栏">
        <div class="i-carbon-side-panel-open" style="font-size: 16px"></div>
      </button>
    </div>

    <!-- 右侧内容 -->
    <div class="ai-page" :class="{ chatting: inChat }">
    <!-- 欢迎界面 -->
    <div v-if="!inChat" class="ai-center">
      <img src="@/assets/icon.png" class="ai-logo" alt="logo" />
      <h1 class="ai-title">嗨! 尽管问</h1>
      <NText depth="3" class="ai-desc">
        基于你的本地笔记和任务数据，快速查找你想要的答案。
      </NText>

      <div class="ai-search-box">
        <div class="ai-search-inner">
          <NInput
            v-model:value="query"
            type="textarea"
            placeholder="问问任何问题"
            :autosize="{ minRows: 1, maxRows: 4 }"
            :bordered="false"
            style="flex: 1"
            @keydown.enter.exact.prevent="handleSend"
          />
          <button class="ai-send-btn" :class="{ active: query.trim() }" @click="handleSend">
            <div class="i-carbon-send-alt" style="font-size: 18px"></div>
          </button>
        </div>
      </div>

      <div class="ai-tags">
        <button v-for="tag in tags" :key="tag.label" class="ai-tag" @click="clickTag(tag.prompt)">
          <div :class="tag.icon" style="font-size: 16px"></div>
          <span>{{ tag.label }}</span>
        </button>
      </div>
    </div>

    <!-- 对话界面 -->
    <template v-else>
      <div class="ai-chat-header">
        <NButton text @click="newChat" style="color: var(--text-muted)">
          <div class="i-carbon-add" style="font-size: 16px; margin-right: 4px"></div>
          新对话
        </NButton>
      </div>

      <div ref="chatListRef" class="ai-chat-list">
        <template v-for="(msg, i) in messages" :key="i">
          <!-- 用户提问 -->
          <div v-if="msg.role === 'user'" class="ai-q">
            <div class="ai-q-text">{{ msg.content }}</div>
          </div>

          <!-- AI 回复 -->
          <div v-else class="ai-a">
            <div class="ai-a-header">
              <img src="@/assets/icon.png" class="ai-a-avatar" />
              <NText strong style="font-size: 13px">AI 助手</NText>
            </div>
            <div class="ai-a-body">
              <div v-if="msg.content === '' && loading" class="ai-typing">
                <span></span><span></span><span></span>
              </div>
              <div v-else class="ai-md" v-html="renderMd(msg.content)"></div>
            </div>
            <div v-if="msg.content && !(msg.content === '' && loading)" class="ai-a-actions">
              <NTooltip trigger="hover" placement="bottom">
                <template #trigger>
                  <button class="ai-action-btn" @click="copyContent(msg.content)">
                    <div class="i-carbon-copy" style="font-size: 14px"></div>
                  </button>
                </template>
                复制
              </NTooltip>
            </div>
          </div>
        </template>
      </div>

      <div class="ai-chat-input">
        <div class="ai-search-box">
          <div class="ai-search-inner">
            <NInput
              v-model:value="query"
              type="textarea"
              placeholder="继续提问..."
              :autosize="{ minRows: 1, maxRows: 4 }"
              :bordered="false"
              :disabled="loading"
              style="flex: 1"
              @keydown.enter.exact.prevent="handleSend"
            />
            <button
              class="ai-send-btn"
              :class="{ active: query.trim() && !loading }"
              :disabled="loading"
              @click="handleSend"
            >
              <div v-if="loading" class="i-carbon-stop-filled" style="font-size: 18px"></div>
              <div v-else class="i-carbon-send-alt" style="font-size: 18px"></div>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
  </div>
</template>

<style scoped>
/* Layout */
.ai-layout {
  display: flex;
  height: 100vh;
  margin: -24px;
  overflow: hidden;
}

/* Sidebar */
.ai-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-light);
  background: var(--bg-sider);
  transition: width 0.25s ease, background 0.25s ease, border-color 0.25s ease;
  overflow: hidden;
}

.ai-sidebar.collapsed {
  width: 48px;
  border-right: none;
  background: transparent;
}

.ai-sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 12px;
  white-space: nowrap;
}

.ai-sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
  margin-bottom: 16px;
}

.ai-sidebar-btn {
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

.ai-sidebar-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-color);
}

.ai-new-chat-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.12s;
  margin-bottom: 16px;
}

.ai-new-chat-btn:hover {
  background: var(--bg-card-hover);
  border-color: #36AD6A;
  color: #36AD6A;
}

.ai-sidebar-section {
  margin-bottom: 6px;
}

.ai-session-list {
  flex: 1;
  overflow-y: auto;
}

.ai-session-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
  margin-bottom: 2px;
}

.ai-session-item:hover {
  background: var(--bg-card-hover);
}

.ai-session-item.active {
  background: var(--wt-accent-bg);
  color: #36AD6A;
}

.ai-session-del {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: all 0.12s;
  flex-shrink: 0;
}

.ai-session-item:hover .ai-session-del {
  opacity: 1;
}

.ai-session-del:hover {
  color: #E88080;
}

.ai-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.12s;
  margin: 16px 0 0 12px;
}

.ai-expand-btn:hover {
  color: var(--text-color);
}

/* Main content */
.ai-page {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.ai-page.chatting {
  justify-content: flex-start;
}

.ai-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 640px;
  width: 100%;
  padding: 0 20px;
}

.ai-logo {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  margin-bottom: 24px;
  object-fit: cover;
}

.ai-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 8px;
}

.ai-desc {
  font-size: 14px;
  text-align: center;
  margin-bottom: 32px;
  display: block;
}

/* Search Box */
.ai-search-box {
  width: 100%;
  background: var(--bg-card);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  padding: 12px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.ai-search-box:focus-within {
  border-color: #36AD6A;
  box-shadow: 0 2px 16px rgba(54, 173, 106, 0.1);
}

.ai-search-inner {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.ai-send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: var(--border-light);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.ai-send-btn.active {
  background: #36AD6A;
  color: #fff;
}

.ai-send-btn:hover:not(:disabled) {
  background: #36AD6A;
  color: #fff;
}

.ai-send-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Tags */
.ai-tags {
  display: flex;
  gap: 10px;
  margin-top: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.ai-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.ai-tag:hover {
  border-color: #36AD6A;
  color: #36AD6A;
  background: var(--wt-accent-bg);
}

/* Chat Header */
.ai-chat-header {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding: 12px 24px;
  flex-shrink: 0;
}

/* Chat List */
.ai-chat-list {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 24px 16px;
}

/* Question (user) */
.ai-q {
  padding: 16px 0 8px;
}

.ai-q-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Answer (AI) */
.ai-a {
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border-light);
}

.ai-a-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 0;
}

.ai-a-avatar {
  width: 24px;
  height: 24px;
  border-radius: 6px;
}

.ai-a-body {
  padding: 8px 16px 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-color);
  word-break: break-word;
}

.ai-a-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 16px 10px;
  border-top: 1px solid var(--border-light);
  padding-top: 8px;
  margin: 0 16px;
  border-top: 1px solid var(--border-light);
}

.ai-action-btn {
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

.ai-action-btn:hover {
  background: var(--bg-card-hover);
  color: #36AD6A;
}

.ai-md :deep(h1) { font-size: 1.3em; font-weight: 700; margin: 8px 0 4px; }
.ai-md :deep(h2) { font-size: 1.15em; font-weight: 700; margin: 6px 0 3px; }
.ai-md :deep(h3) { font-size: 1.05em; font-weight: 600; margin: 4px 0 2px; }
.ai-md :deep(h4), .ai-md :deep(h5), .ai-md :deep(h6) { font-size: 1em; font-weight: 600; margin: 4px 0 2px; }
.ai-md :deep(p) { margin: 2px 0; }
.ai-md :deep(ul), .ai-md :deep(ol) { padding-left: 18px; margin: 2px 0; }
.ai-md :deep(li) { margin: 1px 0; }
.ai-md :deep(code) {
  background: var(--bg-card-hover);
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
}
.ai-md :deep(pre) {
  background: var(--bg-card-hover);
  padding: 10px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 4px 0;
}
.ai-md :deep(pre code) {
  background: none;
  padding: 0;
}
.ai-md :deep(blockquote) {
  border-left: 3px solid #36AD6A;
  padding-left: 10px;
  margin: 4px 0;
  color: var(--text-secondary);
}
.ai-md :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 6px 0;
}
.ai-md :deep(strong) { font-weight: 700; }
.ai-md :deep(a) { color: #36AD6A; text-decoration: none; }
.ai-md :deep(a:hover) { text-decoration: underline; }
.ai-md :deep(> :first-child) { margin-top: 0; }
.ai-md :deep(> :last-child) { margin-bottom: 0; }

/* Typing indicator */
.ai-typing {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.ai-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: typing-dot 1.2s infinite;
}

.ai-typing span:nth-child(2) { animation-delay: 0.2s; }
.ai-typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-dot {
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1); }
}

/* Chat Input */
.ai-chat-input {
  width: 100%;
  padding: 12px 24px 24px;
  flex-shrink: 0;
}
</style>
