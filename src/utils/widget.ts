import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

const WIDGET_LABEL = 'widget'

export async function openWidget() {
  const existing = await WebviewWindow.getByLabel(WIDGET_LABEL)
  if (existing) {
    await existing.show()
    await existing.setFocus()
    return
  }

  new WebviewWindow(WIDGET_LABEL, {
    url: '/widget',
    title: '小组件',
    width: 260,
    height: 170,
    resizable: false,
    decorations: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    center: false,
    x: 60,
    y: 60,
  })
}

export async function closeWidget() {
  const existing = await WebviewWindow.getByLabel(WIDGET_LABEL)
  if (existing) {
    await existing.close()
  }
}

export async function showMainWindow() {
  const main = await WebviewWindow.getByLabel('main')
  if (main) {
    await main.show()
    await main.setFocus()
  }
}
