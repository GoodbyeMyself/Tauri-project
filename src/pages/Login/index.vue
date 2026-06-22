<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { isDark } from '@/styles/theme'
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NCheckbox,
  NSpace,
  NText,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'

const router = useRouter()
const userStore = useUserStore()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const isRegister = ref(false)
const loading = ref(false)

const formModel = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  rememberMe: false,
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度 2-20 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_: unknown, value: string) => {
        if (value !== formModel.password) {
          return new Error('两次密码不一致')
        }
        return true
      },
      trigger: 'blur',
    },
  ],
}

onMounted(() => {
  localStorage.removeItem('rememberedPassword')
  const savedUsername = localStorage.getItem('rememberedUsername')
  if (savedUsername) {
    formModel.username = savedUsername
    formModel.rememberMe = true
  }
})

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    if (isRegister.value) {
      await userStore.register(formModel.username, formModel.password)
      message.success('注册成功')
    } else {
      await userStore.login(formModel.username, formModel.password)
      message.success('登录成功')
    }

    if (formModel.rememberMe) {
      localStorage.setItem('rememberedUsername', formModel.username)
    } else {
      localStorage.removeItem('rememberedUsername')
    }

    router.push('/')
  } catch (err: unknown) {
    message.error((err as Error).message || '操作失败')
  } finally {
    loading.value = false
  }
}

function toggleMode() {
  isRegister.value = !isRegister.value
  formModel.confirmPassword = ''
}

const currentTime = ref('')
const currentDate = ref('')

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  currentDate.value = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

updateTime()
const timer = setInterval(updateTime, 1000)
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="login-container">
    <button class="login-theme-toggle" @click="isDark = !isDark" :title="isDark ? '切换亮色' : '切换暗色'">
      <div :class="isDark ? 'i-carbon-sun' : 'i-carbon-moon'" style="font-size: 18px"></div>
    </button>
    <div class="login-bg">
      <div class="login-bg-circle c1"></div>
      <div class="login-bg-circle c2"></div>
      <div class="login-bg-circle c3"></div>
    </div>

    <div class="login-content">
      <div class="login-left">
        <div class="brand">
          <div class="brand-icon">
            <span>N</span>
          </div>
          <h1>Desktop Notepad</h1>
          <p>你的个人智能笔记本</p>
        </div>
        <div class="time-display">
          <div class="time">{{ currentTime }}</div>
          <div class="date">{{ currentDate }}</div>
        </div>
        <div class="features">
          <div class="feature-item">
            <div class="i-carbon-lightning" style="font-size: 20px; color: #36AD6A"></div>
            <span>快速记录，随想随记</span>
          </div>
          <div class="feature-item">
            <div class="i-carbon-search" style="font-size: 20px; color: #36AD6A"></div>
            <span>全文搜索，一键定位</span>
          </div>
          <div class="feature-item">
            <div class="i-carbon-security" style="font-size: 20px; color: #36AD6A"></div>
            <span>本地存储，数据安全</span>
          </div>
        </div>
      </div>

      <div class="login-right">
        <NCard class="login-card" :bordered="false">
          <template #header>
            <div style="text-align: center">
              <NText strong style="font-size: 24px">
                {{ isRegister ? '创建账号' : '欢迎回来' }}
              </NText>
              <br />
              <NText depth="3" style="font-size: 14px; margin-top: 8px; display: inline-block">
                {{ isRegister ? '注册一个新账号开始使用' : '登录你的笔记本' }}
              </NText>
            </div>
          </template>

          <NForm ref="formRef" :model="formModel" :rules="rules" label-placement="left">
            <NFormItem path="username" :show-label="false">
              <NInput
                v-model:value="formModel.username"
                placeholder="请输入用户名"
                size="large"
                @keydown.enter="handleSubmit"
              >
                <template #prefix>
                  <div class="i-carbon-user" style="color: var(--text-muted); font-size: 16px"></div>
                </template>
              </NInput>
            </NFormItem>

            <NFormItem path="password" :show-label="false">
              <NInput
                v-model:value="formModel.password"
                type="password"
                show-password-on="click"
                placeholder="请输入密码"
                size="large"
                @keydown.enter="handleSubmit"
              >
                <template #prefix>
                  <div class="i-carbon-locked" style="color: var(--text-muted); font-size: 16px"></div>
                </template>
              </NInput>
            </NFormItem>

            <NFormItem v-if="isRegister" path="confirmPassword" :show-label="false">
              <NInput
                v-model:value="formModel.confirmPassword"
                type="password"
                show-password-on="click"
                placeholder="请确认密码"
                size="large"
                @keydown.enter="handleSubmit"
              >
                <template #prefix>
                  <div class="i-carbon-locked" style="color: var(--text-muted); font-size: 16px"></div>
                </template>
              </NInput>
            </NFormItem>

            <div v-if="!isRegister" style="margin-bottom: 20px">
              <NCheckbox v-model:checked="formModel.rememberMe">记住密码</NCheckbox>
            </div>

            <NButton
              type="primary"
              block
              size="large"
              :loading="loading"
              @click="handleSubmit"
              style="border-radius: 10px; height: 44px; font-size: 16px"
            >
              {{ isRegister ? '注 册' : '登 录' }}
            </NButton>

            <div style="text-align: center; margin-top: 20px">
              <NButton text type="primary" @click="toggleMode">
                {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
              </NButton>
            </div>
          </NForm>
        </NCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--login-bg);
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.login-bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
}

.c1 {
  width: 400px;
  height: 400px;
  background: #36AD6A;
  top: -100px;
  right: -100px;
  animation: float 8s ease-in-out infinite;
}

.c2 {
  width: 300px;
  height: 300px;
  background: #1B8C3E;
  bottom: -80px;
  left: -80px;
  animation: float 10s ease-in-out infinite reverse;
}

.c3 {
  width: 200px;
  height: 200px;
  background: #4FBF7F;
  top: 50%;
  left: 30%;
  animation: float 6s ease-in-out infinite 2s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -20px); }
}

.login-content {
  display: flex;
  align-items: center;
  gap: 80px;
  z-index: 1;
  padding: 0 40px;
}

.login-left {
  display: flex;
  flex-direction: column;
  gap: 40px;
  max-width: 400px;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #36AD6A, #1B8C3E);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(54, 173, 106, 0.3);
}

.brand-icon span {
  color: white;
  font-size: 32px;
  font-weight: bold;
}

.brand h1 {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-color);
  margin: 0;
}

.brand p {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

.time-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-display .time {
  font-size: 42px;
  font-weight: 200;
  color: var(--text-color);
  letter-spacing: 2px;
  font-variant-numeric: tabular-nums;
}

.time-display .date {
  font-size: 15px;
  color: var(--text-secondary);
}

.features {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

.login-right {
  width: 400px;
}

.login-card {
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(20px);
  background: var(--login-card-bg);
}

.login-theme-toggle {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 10;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--login-card-bg);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(12px);
  transition: all 0.2s;
}

.login-theme-toggle:hover {
  transform: scale(1.1);
  color: #36AD6A;
}
</style>
