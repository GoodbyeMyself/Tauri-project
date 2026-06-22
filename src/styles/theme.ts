import type { GlobalThemeOverrides } from 'naive-ui'
import { ref, watch, computed } from 'vue'

export const isDark = ref(localStorage.getItem('theme') === 'dark')

watch(isDark, (val) => {
  localStorage.setItem('theme', val ? 'dark' : 'light')
  document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light')
}, { immediate: true })

export const themeOverrides = computed<GlobalThemeOverrides>(() => ({
  common: {
    primaryColor: '#36AD6A',
    primaryColorHover: '#4FBF7F',
    primaryColorPressed: '#1B8C3E',
    primaryColorSuppl: '#36AD6A',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  },
  Button: {
    borderRadiusMedium: '8px',
    borderRadiusLarge: '10px',
    rippleDuration: '.6s',
  },
  Card: {
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
  },
  Input: {
    borderRadius: '8px',
  },
  Menu: {
    borderRadius: '8px',
    itemColorActive: isDark.value ? '#1a2e20' : '#f0fdf4',
    itemColorActiveHover: isDark.value ? '#243828' : '#e8f5e9',
    itemTextColorActive: isDark.value ? '#4FBF7F' : '#1B8C3E',
    itemIconColorActive: isDark.value ? '#4FBF7F' : '#1B8C3E',
    itemTextColorActiveHover: isDark.value ? '#4FBF7F' : '#1B8C3E',
    itemIconColorActiveHover: isDark.value ? '#4FBF7F' : '#1B8C3E',
    itemColorHover: isDark.value ? '#333338' : '#f0f2f1',
    itemTextColorHover: isDark.value ? '#e0e0e0' : '#333',
    itemIconColorHover: isDark.value ? '#e0e0e0' : '#333',
  },
}))
