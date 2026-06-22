import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
    }),
  ],
  theme: {
    colors: {
      primary: '#36AD6A',
      'primary-light': '#E8F5E9',
      'primary-dark': '#1B8C3E',
      'bg-base': '#f0f2f1',
      'bg-card': '#FFFFFF',
      'text-primary': '#333333',
      'text-secondary': '#666666',
      'text-muted': '#999999',
      danger: '#E88080',
    },
  },
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
  },
})
