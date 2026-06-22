import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import 'virtual:uno.css'
import './styles/global.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// 禁用鼠标侧键导航
window.addEventListener('mouseup', (e) => {
  if (e.button === 3 || e.button === 4) e.preventDefault()
}, true)

const RIPPLE_SELECTORS = 'button, .n-button, .n-menu-item, .n-tag--clickable, .wt-tab, .wt-cal-day, .wt-cal-arrow, .wt-today-btn, .we-menu-btn, .we-preview-mode-btn, .we-add-btn, .we-toggle-list'

document.addEventListener('mousedown', (e) => {
  const target = (e.target as HTMLElement).closest(RIPPLE_SELECTORS) as HTMLElement | null
  if (!target) return

  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top - size / 2

  const prevPos = target.style.position
  const prevOverflow = target.style.overflow
  if (!getComputedStyle(target).position || getComputedStyle(target).position === 'static') {
    target.style.position = 'relative'
  }
  target.style.overflow = 'hidden'

  const circle = document.createElement('span')
  circle.className = 'ripple-circle'
  circle.style.width = circle.style.height = size + 'px'
  circle.style.left = x + 'px'
  circle.style.top = y + 'px'
  target.appendChild(circle)

  circle.addEventListener('animationend', () => {
    circle.remove()
    target.style.position = prevPos
    target.style.overflow = prevOverflow
  })
})
