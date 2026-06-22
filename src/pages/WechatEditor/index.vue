<script setup lang="ts">
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { themes, getThemeById, buildThemeCSS } from './themes'
import { getDB } from '@/utils/database'
import { useUserStore } from '@/stores/user'
import { renderMarkdown } from './utils/markdown-renderer'
import { copyRichTextToClipboard } from './utils/clipboard'
import { exportMarkdownFile, exportPDF } from './utils/export'
import { importMarkdownFile, importWordFile } from './utils/import'
import { saveImage, getImageUrl } from '@/utils/image-storage'
import {
  NButton,
  NText,
  NSpace,
  NDropdown,
  NSwitch,
  NInput,
  NEllipsis,
  NEmpty,
  NPopconfirm,
  useMessage,
} from 'naive-ui'
import type { DropdownOption } from 'naive-ui'

const message = useMessage()

const editorRef = ref<HTMLElement>()
const previewRef = ref<HTMLElement>()
const previewPaneRef = ref<HTMLElement>()
const imageInputRef = ref<HTMLInputElement>()
let editorView: EditorView | null = null

const DEMO_CONTENT = `# 微信公众号文章编辑器

> 写一篇漂亮的公众号文章，从这里开始。

## 功能特点

- **实时预览**：左侧编写 Markdown，右侧实时渲染
- **主题切换**：多种精美主题一键切换
- **一键复制**：复制后直接粘贴到微信公众号后台
- 支持导入导出 Markdown / Word / PDF

## 代码示例

\`\`\`javascript
function hello() {
  console.log('Hello, 微信公众号！')
}
\`\`\`

## 表格支持

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| Markdown 编辑 | ✅ | 支持 GFM 语法 |
| 主题切换 | ✅ | 5 种精美主题 |
| 一键复制 | ✅ | 带内联样式 |
| 同步滚动 | ✅ | 左右联动 |

## 引用

> 好的文章，从好的工具开始。
>
> —— Desktop Notepad

---

*开始编辑你的文章吧！*
`

const markdownContent = ref(DEMO_CONTENT)

// ===== Article List =====

const userStore = useUserStore()

interface Article {
  id: number
  title: string
  content: string
  sort_order: number
  user_id: number
  created_at: string
  updated_at: string
}

const articles = ref<Article[]>([])
const activeArticleId = ref<number | null>(null)
const showArticleList = ref(true)
const editingTitleId = ref<number | null>(null)
const editingTitleValue = ref('')
let saveTimer: ReturnType<typeof setTimeout> | null = null

async function loadArticles() {
  const db = await getDB()
  const userId = userStore.currentUser?.id
  if (!userId) return
  const rows = await db.select<Article[]>(
    'SELECT * FROM wechat_articles WHERE user_id = ? ORDER BY sort_order ASC, updated_at DESC',
    [userId]
  )
  articles.value = rows
  if (rows.length > 0) {
    selectArticle(rows[0].id)
  } else {
    activeArticleId.value = null
    markdownContent.value = DEMO_CONTENT
    updateEditorContent(DEMO_CONTENT)
  }
}

async function createArticle(content = '', title = '未命名文章') {
  const empty = articles.value.find(a => !a.content.trim())
  if (empty) {
    if (!content.trim()) {
      selectArticle(empty.id)
      message.warning('已有空白文章，请先编辑')
      return
    }
    empty.content = content
    empty.title = title
    selectArticle(empty.id)
    const db = await getDB()
    await db.execute(
      'UPDATE wechat_articles SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, content, empty.id]
    )
    return
  }
  const db = await getDB()
  const userId = userStore.currentUser?.id
  if (!userId) return
  const minOrder = articles.value.length > 0 ? Math.min(...articles.value.map(a => a.sort_order)) - 1 : 0
  const result = await db.execute(
    'INSERT INTO wechat_articles (title, content, sort_order, user_id) VALUES (?, ?, ?, ?)',
    [title, content, minOrder, userId]
  )
  await loadArticles()
  if (result.lastInsertId) {
    selectArticle(result.lastInsertId)
  }
}

function selectArticle(id: number) {
  const article = articles.value.find(a => a.id === id)
  if (!article) return
  activeArticleId.value = id
  markdownContent.value = article.content
  updateEditorContent(article.content)
}

async function deleteArticle(id: number) {
  const db = await getDB()
  await db.execute('DELETE FROM wechat_articles WHERE id = ?', [id])
  articles.value = articles.value.filter(a => a.id !== id)
  if (activeArticleId.value === id) {
    if (articles.value.length > 0) {
      selectArticle(articles.value[0].id)
    } else {
      activeArticleId.value = null
      markdownContent.value = DEMO_CONTENT
      updateEditorContent(DEMO_CONTENT)
    }
  }
}

async function saveCurrentArticle() {
  if (activeArticleId.value === null) return
  const article = articles.value.find(a => a.id === activeArticleId.value)
  if (!article) return
  const title = getArticleTitle(markdownContent.value)
  article.content = markdownContent.value
  article.title = title
  const db = await getDB()
  await db.execute(
    'UPDATE wechat_articles SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [title, markdownContent.value, activeArticleId.value]
  )
}

function getArticleTitle(content: string): string {
  const firstLine = content.split('\n').find(l => l.trim())
  if (!firstLine) return '未命名文章'
  return firstLine.replace(/^#+\s*/, '').slice(0, 30) || '未命名文章'
}

function startEditTitle(article: Article, event: Event) {
  event.stopPropagation()
  editingTitleId.value = article.id
  editingTitleValue.value = article.title
}

async function confirmEditTitle(article: Article) {
  const title = editingTitleValue.value.trim() || '未命名文章'
  article.title = title
  editingTitleId.value = null
  const db = await getDB()
  await db.execute('UPDATE wechat_articles SET title = ? WHERE id = ?', [title, article.id])
}

// ===== Drag Sort =====
const dragFrom = ref(-1)
const dragTo = ref(-1)
const dragging = ref(false)
const ghostStyle = ref({ top: '0px', left: '0px', width: '0px', display: 'none' })
const ghostTitle = ref('')
let _dragStartY = 0
let _dragItemEl: HTMLElement | null = null

function onItemMousedown(index: number, e: MouseEvent) {
  if ((e.target as HTMLElement).closest('input, button, .n-popconfirm, .n-popover')) return
  e.preventDefault()
  const el = (e.currentTarget as HTMLElement)
  _dragStartY = e.clientY
  _dragItemEl = el
  dragFrom.value = index
  const moved = ref(false)

  function onMove(ev: MouseEvent) {
    ev.preventDefault()
    if (!moved.value && Math.abs(ev.clientY - _dragStartY) < 4) return
    if (!moved.value) {
      moved.value = true
      dragging.value = true
      ghostTitle.value = articles.value[index].title
      ghostStyle.value.width = _dragItemEl!.offsetWidth + 'px'
      ghostStyle.value.display = 'block'
      document.body.style.cursor = 'grabbing'
    }
    const listEl = document.querySelector('.we-article-items') as HTMLElement
    if (!listEl) return
    const listRect = listEl.getBoundingClientRect()
    ghostStyle.value.top = (ev.clientY - listRect.top + listEl.scrollTop - 18) + 'px'
    ghostStyle.value.left = '0px'

    const items = listEl.querySelectorAll('.we-article-item')
    let target = articles.value.length
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect()
      if (ev.clientY < r.top + r.height / 2) { target = i; break }
    }
    dragTo.value = target
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    ghostStyle.value.display = 'none'

    if (moved.value && dragFrom.value >= 0 && dragTo.value >= 0) {
      let from = dragFrom.value
      let to = dragTo.value
      if (from !== to && from !== to - 1) {
        if (to > from) to--
        const item = articles.value.splice(from, 1)[0]
        articles.value.splice(to, 0, item)
        saveSortOrder()
      }
    }
    dragFrom.value = -1
    dragTo.value = -1
    dragging.value = false
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

async function saveSortOrder() {
  const db = await getDB()
  for (let i = 0; i < articles.value.length; i++) {
    articles.value[i].sort_order = i
    await db.execute('UPDATE wechat_articles SET sort_order = ? WHERE id = ?', [i, articles.value[i].id])
  }
}

watch(markdownContent, (val) => {
  if (activeArticleId.value === null) return
  const article = articles.value.find(a => a.id === activeArticleId.value)
  if (article) {
    article.content = val
    article.title = getArticleTitle(val)
  }
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveCurrentArticle(), 1000)
})

const addMenuOptions: DropdownOption[] = [
  { label: '新建文章', key: 'new', icon: renderMenuIcon('i-carbon-document') },
  { label: '导入 MD', key: 'import-md', icon: renderMenuIcon('i-carbon-document-import') },
]

function handleAddMenu(key: string) {
  if (key === 'new') {
    createArticle()
  } else if (key === 'import-md') {
    importMarkdownFile().then(text => {
      createArticle(text, getArticleTitle(text))
      message.success('已导入')
    }).catch(() => {})
  }
}

const currentThemeId = ref(localStorage.getItem('wechat-editor-theme') || 'default')
const showEditor = ref(true)
const showPreview = ref(true)
const isFullscreen = ref(false)
const fontSize = ref(Number(localStorage.getItem('wechat-editor-fontsize')) || 15)
const customCSS = ref(localStorage.getItem('wechat-editor-custom-css') || '')
const syncScrolling = ref(true)
const previewMode = ref<'desktop' | 'mobile'>('desktop')

interface PhoneModel { label: string; width: number; height: number }
const phoneModels: PhoneModel[] = [
  { label: 'iPhone 5/SE', width: 320, height: 568 },
  { label: 'iPhone 6/7/8', width: 375, height: 667 },
  { label: 'iPhone 6/7/8 Plus', width: 414, height: 736 },
  { label: 'iPhone X', width: 375, height: 812 },
]
const activePhone = ref(1)
const currentPhone = computed(() => phoneModels[activePhone.value])

const phoneMenuOptions = computed<DropdownOption[]>(() =>
  phoneModels.map((p, i) => ({
    label: `${p.label}  (${p.width}×${p.height})`,
    key: String(i),
    props: { style: activePhone.value === i ? 'color:#06c160;font-weight:600' : '' },
  }))
)

function handlePhoneMenu(key: string) {
  activePhone.value = Number(key)
  if (previewMode.value !== 'mobile') previewMode.value = 'mobile'
  nextTick(() => {
    fitPreviewToPhone()
    updatePhoneScale()
  })
}

function fitPreviewToPhone() {
  const bodyEl = document.querySelector('.we-body') as HTMLElement
  if (!bodyEl) return
  const bodyWidth = bodyEl.clientWidth
  const listWidth = showArticleList.value ? 200 : 0
  const toggleWidth = 20
  const dividerWidth = 5
  const available = bodyWidth - listWidth - toggleWidth - dividerWidth
  if (available <= 0) return
  const phoneNeed = currentPhone.value.width + 60
  const previewPercent = (phoneNeed / available) * 100
  editorWidthPercent.value = Math.min(75, Math.max(25, 100 - previewPercent))
}
let scrollSource: 'editor' | 'preview' | null = null
let scrollTimer: ReturnType<typeof setTimeout> | null = null

// ===== Drag Resize =====
const editorWidthPercent = ref(50)
const isDragging = ref(false)

const phoneScale = ref(1)

function updatePhoneScale() {
  if (!previewPaneRef.value || previewMode.value !== 'mobile') return
  const paneWidth = previewPaneRef.value.clientWidth
  const pw = currentPhone.value.width + 40
  phoneScale.value = paneWidth < pw ? Math.max(0.5, (paneWidth - 16) / currentPhone.value.width) : 1
}

watch([editorWidthPercent, previewMode, showEditor, showArticleList], () => {
  nextTick(updatePhoneScale)
})

let resizeObserver: ResizeObserver | null = null

function onDividerMousedown(e: MouseEvent) {
  e.preventDefault()
  isDragging.value = true
  const bodyEl = document.querySelector('.we-body') as HTMLElement
  if (!bodyEl) return
  const startX = e.clientX
  const startPercent = editorWidthPercent.value
  const bodyRect = bodyEl.getBoundingClientRect()
  const listWidth = showArticleList.value ? 200 : 0
  const toggleWidth = 20
  const availableWidth = bodyRect.width - listWidth - toggleWidth

  function onMousemove(ev: MouseEvent) {
    const dx = ev.clientX - startX
    const newPercent = startPercent + (dx / availableWidth) * 100
    editorWidthPercent.value = Math.min(80, Math.max(20, newPercent))
  }

  function onMouseup() {
    isDragging.value = false
    document.removeEventListener('mousemove', onMousemove)
    document.removeEventListener('mouseup', onMouseup)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMousemove)
  document.addEventListener('mouseup', onMouseup)
}

const currentTheme = computed(() => getThemeById(currentThemeId.value))

const previewHtml = computed(() => {
  return renderMarkdown(markdownContent.value, currentTheme.value)
})

const themeCSS = computed(() => buildThemeCSS(currentTheme.value))

let themeStyleEl: HTMLStyleElement | null = null
let customStyleEl: HTMLStyleElement | null = null

watch(themeCSS, (css) => {
  if (!themeStyleEl) {
    themeStyleEl = document.createElement('style')
    themeStyleEl.setAttribute('data-wechat-theme', '')
    document.head.appendChild(themeStyleEl)
  }
  themeStyleEl.textContent = css
}, { immediate: true })

const hljsStyles: Record<string, string> = {}
let hljsStyleEl: HTMLStyleElement | null = null

async function loadHljsTheme(name: string) {
  if (!hljsStyles[name]) {
    const mod = name === 'atom-one-dark'
      ? await import('highlight.js/styles/atom-one-dark.css?raw')
      : await import('highlight.js/styles/github.css?raw')
    hljsStyles[name] = mod.default
  }
  if (!hljsStyleEl) {
    hljsStyleEl = document.createElement('style')
    hljsStyleEl.setAttribute('data-wechat-hljs', '')
    document.head.appendChild(hljsStyleEl)
  }
  hljsStyleEl.textContent = hljsStyles[name]
}

watch(currentTheme, (theme) => {
  loadHljsTheme(theme.codeTheme || 'github')
}, { immediate: true })

watch(customCSS, (css) => {
  if (!customStyleEl) {
    customStyleEl = document.createElement('style')
    customStyleEl.setAttribute('data-wechat-custom', '')
    document.head.appendChild(customStyleEl)
  }
  customStyleEl.textContent = css
  localStorage.setItem('wechat-editor-custom-css', css)
})

watch(fontSize, (val) => {
  localStorage.setItem('wechat-editor-fontsize', String(val))
})


const wordCount = computed(() => {
  return markdownContent.value.replace(/\s/g, '').length
})

const lineCount = computed(() => {
  return markdownContent.value.split('\n').length
})

// ===== Menu Options =====

const fileMenuOptions: DropdownOption[] = [
  { label: '导出 Markdown', key: 'export-md', icon: renderMenuIcon('i-carbon-document-export') },
  { label: '导出 PDF', key: 'export-pdf', icon: renderMenuIcon('i-carbon-document-pdf') },
  { type: 'divider', key: 'd1' },
  { label: '导入 Markdown', key: 'import-md', icon: renderMenuIcon('i-carbon-document-import') },
  { label: '导入 Word', key: 'import-word', icon: renderMenuIcon('i-carbon-document-word-processor') },
]

const formatMenuOptions: DropdownOption[] = [
  { label: '一级标题', key: 'h1', props: { style: 'font-weight:600' } },
  { label: '二级标题', key: 'h2', props: { style: 'font-weight:600' } },
  { label: '三级标题', key: 'h3', props: { style: 'font-weight:600' } },
  { label: '四级标题', key: 'h4' },
  { label: '五级标题', key: 'h5' },
  { label: '六级标题', key: 'h6' },
  { type: 'divider', key: 'd1' },
  { label: '加粗', key: 'bold' },
  { label: '斜体', key: 'italic' },
  { label: '删除线', key: 'strikethrough' },
  { label: '下划线', key: 'underline' },
  { label: '行内代码', key: 'inline-code' },
  { type: 'divider', key: 'd2' },
  { label: '引用', key: 'blockquote' },
  { label: '有序列表', key: 'ordered-list' },
  { label: '无序列表', key: 'unordered-list' },
  { label: '代码块', key: 'code-block' },
  { label: '分割线', key: 'horizontal-rule' },
  { type: 'divider', key: 'd3' },
  { label: '链接', key: 'link' },
  { label: '图片', key: 'image' },
  { label: '表格', key: 'table' },
]

const themeMenuOptions = computed<DropdownOption[]>(() =>
  themes.map(t => ({
    label: t.name,
    key: t.id,
    props: {
      style: currentThemeId.value === t.id ? 'color: #06c160; font-weight: 600' : '',
    },
  }))
)

const viewMenuOptions = computed<DropdownOption[]>(() => [
  { label: isFullscreen.value ? '退出全屏' : '全屏', key: 'fullscreen' },
  { type: 'divider', key: 'd1' },
  { label: `${showArticleList.value ? '✓ ' : ''}文章列表`, key: 'toggle-article-list' },
  { label: `${showEditor.value ? '✓ ' : ''}编辑区域`, key: 'toggle-editor' },
  { label: `${showPreview.value ? '✓ ' : ''}预览区域`, key: 'toggle-preview' },
])

function renderMenuIcon(iconClass: string) {
  return () => h('div', { class: iconClass, style: 'font-size: 16px; margin-right: 4px' })
}

// ===== Menu Handlers =====

function handleFileMenu(key: string) {
  switch (key) {
    case 'export-md':
      exportMarkdownFile(markdownContent.value).then(() => {
        message.success('Markdown 文件已导出')
      }).catch(() => {})
      break
    case 'export-pdf':
      if (previewRef.value) exportPDF(previewRef.value)
      break
    case 'import-md':
      importMarkdownFile().then(text => {
        markdownContent.value = text
        updateEditorContent(text)
        message.success('Markdown 文件已导入')
      }).catch(() => {})
      break
    case 'import-word':
      importWordFile().then(text => {
        markdownContent.value = text
        updateEditorContent(text)
        message.success('Word 文件已导入')
      }).catch(() => {})
      break
  }
}

function handleFormatMenu(key: string) {
  if (!editorView) return
  if (key === 'image') {
    imageInputRef.value?.click()
    return
  }
  const formatMap: Record<string, string> = {
    'h1': '# ', 'h2': '## ', 'h3': '### ',
    'h4': '#### ', 'h5': '##### ', 'h6': '###### ',
    'bold': '****', 'italic': '**', 'strikethrough': '~~~~',
    'underline': '<u></u>', 'inline-code': '``',
    'blockquote': '> ', 'ordered-list': '1. ', 'unordered-list': '- ',
    'code-block': '```\n\n```', 'horizontal-rule': '\n---\n',
    'link': '[链接文字](url)',
    'table': '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n',
  }
  const text = formatMap[key]
  if (!text) return
  insertTextAtCursor(text)
}

function handleThemeMenu(key: string) {
  currentThemeId.value = key
  localStorage.setItem('wechat-editor-theme', key)
  message.success(`已切换到「${getThemeById(key).name}」主题`)
}

function handleViewMenu(key: string) {
  switch (key) {
    case 'fullscreen':
      toggleFullscreen()
      break
    case 'toggle-article-list':
      showArticleList.value = !showArticleList.value
      break
    case 'toggle-editor':
      if (!showEditor.value || showPreview.value) showEditor.value = !showEditor.value
      break
    case 'toggle-preview':
      if (showEditor.value || !showPreview.value) showPreview.value = !showPreview.value
      break
  }
}

// ===== Editor Logic =====

function initEditor() {
  if (!editorRef.value) return
  const state = EditorState.create({
    doc: markdownContent.value,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      drawSelection(),
      history(),
      markdown(),
      syntaxHighlighting(defaultHighlightStyle),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          markdownContent.value = update.state.doc.toString()
        }
      }),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { height: '100%', fontSize: '14px' },
        '.cm-scroller': { fontFamily: '"SF Mono", Menlo, Consolas, "PingFang SC", monospace', overflow: 'auto' },
        '.cm-content': { padding: '12px 0' },
        '.cm-gutters': { background: 'var(--bg-card-hover)', border: 'none', color: 'var(--text-muted)' },
        '.cm-activeLineGutter': { background: 'var(--wt-accent-bg)', color: '#06c160' },
        '.cm-activeLine': { background: 'var(--wt-accent-bg)' },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { background: '#b3e5c8 !important' },
        '.cm-cursor': { borderLeftColor: '#06c160' },
      }),
    ],
  })
  editorView = new EditorView({ state, parent: editorRef.value })
}

function updateEditorContent(text: string) {
  if (!editorView) return
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: text },
  })
}

function insertTextAtCursor(text: string) {
  if (!editorView) return
  const { from, to } = editorView.state.selection.main
  const wrapPairs: Record<string, boolean> = {
    '****': true, '**': true, '~~~~': true, '``': true, '<u></u>': true,
  }
  if (wrapPairs[text] && from !== to) {
    const selectedText = editorView.state.sliceDoc(from, to)
    let wrapped: string
    if (text === '<u></u>') {
      wrapped = `<u>${selectedText}</u>`
    } else {
      const half = Math.floor(text.length / 2)
      const left = text.slice(0, half)
      const right = text.slice(half)
      wrapped = `${left}${selectedText}${right}`
    }
    editorView.dispatch({ changes: { from, to, insert: wrapped } })
  } else if (wrapPairs[text]) {
    let cursorOffset: number
    if (text === '<u></u>') {
      editorView.dispatch({
        changes: { from, insert: text },
        selection: { anchor: from + 3 },
      })
      return
    }
    const half = Math.floor(text.length / 2)
    cursorOffset = half
    editorView.dispatch({
      changes: { from, insert: text },
      selection: { anchor: from + cursorOffset },
    })
  } else {
    editorView.dispatch({ changes: { from, to, insert: text } })
  }
  editorView.focus()
}

// ===== Image Upload =====

async function handleImageSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  try {
    const filePath = await saveImage(file)
    const src = getImageUrl(filePath)
    insertTextAtCursor(`![${file.name}](${src})`)
  } catch {
    message.error('图片保存失败')
  }
  input.value = ''
}

// ===== Sync Scroll =====

function claimScroll(source: 'editor' | 'preview') {
  if (scrollSource && scrollSource !== source) return false
  scrollSource = source
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => { scrollSource = null }, 150)
  return true
}

function handleEditorScroll() {
  if (!syncScrolling.value || !claimScroll('editor')) return
  const editorScroller = editorRef.value?.querySelector('.cm-scroller') as HTMLElement
  const previewEl = previewRef.value
  if (!editorScroller || !previewEl) return
  const ratio = editorScroller.scrollTop / (editorScroller.scrollHeight - editorScroller.clientHeight || 1)
  previewEl.scrollTop = ratio * (previewEl.scrollHeight - previewEl.clientHeight)
}

function handlePreviewScroll() {
  if (!syncScrolling.value || !claimScroll('preview')) return
  const editorScroller = editorRef.value?.querySelector('.cm-scroller') as HTMLElement
  const previewEl = previewRef.value
  if (!editorScroller || !previewEl) return
  const ratio = previewEl.scrollTop / (previewEl.scrollHeight - previewEl.clientHeight || 1)
  editorScroller.scrollTop = ratio * (editorScroller.scrollHeight - editorScroller.clientHeight)
}

// ===== Copy & Fullscreen =====

async function handleCopy() {
  const hljsCSS = hljsStyles[currentTheme.value.codeTheme || 'github'] || ''
  let html = renderMarkdown(markdownContent.value, currentTheme.value, hljsCSS)
  const ok = await copyRichTextToClipboard(html)
  if (ok) message.success('已复制，可直接粘贴到微信公众号后台')
  else message.error('复制失败')
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

onMounted(async () => {
  initEditor()
  await loadArticles()
  nextTick(() => {
    const scroller = editorRef.value?.querySelector('.cm-scroller')
    scroller?.addEventListener('scroll', handleEditorScroll)
    if (previewPaneRef.value) {
      resizeObserver = new ResizeObserver(() => updatePhoneScale())
      resizeObserver.observe(previewPaneRef.value)
    }
  })
})

onUnmounted(() => {
  editorView?.destroy()
  const scroller = editorRef.value?.querySelector('.cm-scroller')
  scroller?.removeEventListener('scroll', handleEditorScroll)
  resizeObserver?.disconnect()
  themeStyleEl?.remove()
  customStyleEl?.remove()
  hljsStyleEl?.remove()
})

</script>

<template>
  <div class="wechat-editor-page" :class="{ fullscreen: isFullscreen }">
    <!-- 顶部菜单栏 -->
    <div class="we-menubar">
      <div class="we-menu-left">
        <NDropdown :options="fileMenuOptions" trigger="click" @select="handleFileMenu">
          <button class="we-menu-btn">文件</button>
        </NDropdown>
        <NDropdown :options="formatMenuOptions" trigger="click" scrollable @select="handleFormatMenu" style="max-height: 70vh">
          <button class="we-menu-btn">格式</button>
        </NDropdown>
        <NDropdown :options="themeMenuOptions" trigger="click" @select="handleThemeMenu">
          <button class="we-menu-btn">主题</button>
        </NDropdown>
        <NDropdown :options="viewMenuOptions" trigger="click" @select="handleViewMenu">
          <button class="we-menu-btn">查看</button>
        </NDropdown>
      </div>
      <div class="we-menu-right">
        <div style="display: flex; align-items: center; gap: 4px; margin-right: 8px">
          <button
            class="we-preview-mode-btn"
            :class="{ active: previewMode === 'desktop' }"
            title="电脑预览"
            @click="previewMode = 'desktop'"
          >
            <div class="i-carbon-laptop" style="font-size: 15px"></div>
          </button>
          <NDropdown :options="phoneMenuOptions" trigger="click" @select="handlePhoneMenu" size="small">
            <button
              class="we-preview-mode-btn"
              :class="{ active: previewMode === 'mobile' }"
              title="手机预览"
            >
              <div class="i-carbon-mobile" style="font-size: 15px"></div>
            </button>
          </NDropdown>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; margin-right: 12px">
          <NText depth="3" style="font-size: 12px">同步滚动</NText>
          <NSwitch v-model:value="syncScrolling" size="small" />
        </div>
        <NButton type="primary" size="small" @click="handleCopy">
          <template #icon>
            <div class="i-carbon-copy" style="font-size: 14px"></div>
          </template>
          一键复制
        </NButton>
      </div>
    </div>

    <!-- 编辑区域 -->
    <div class="we-body">
      <!-- 文章列表 -->
      <div class="we-article-list" :class="{ collapsed: !showArticleList }">
        <div class="we-article-list-header">
          <div style="display: flex; align-items: center; gap: 6px">
            <div class="i-carbon-document-multiple" style="font-size: 16px; color: var(--text-secondary)"></div>
            <NText strong style="font-size: 14px">文章列表</NText>
          </div>
          <NDropdown :options="addMenuOptions" trigger="click" @select="handleAddMenu" size="small">
            <button class="we-add-btn">
              <div class="i-carbon-add" style="font-size: 16px"></div>
            </button>
          </NDropdown>
        </div>
        <div class="we-article-items" style="position: relative">
          <div v-if="articles.length === 0" style="padding: 32px 12px; text-align: center">
            <NEmpty size="small" description="暂无文章" />
            <NButton size="small" type="primary" style="margin-top: 12px" @click="createArticle(DEMO_CONTENT)">
              新建文章
            </NButton>
          </div>

          <!-- 拖拽浮动卡片 -->
          <div class="we-drag-ghost" :style="ghostStyle">
            <div class="i-carbon-draggable" style="font-size: 12px; color: var(--text-muted); flex-shrink: 0"></div>
            <span>{{ ghostTitle }}</span>
          </div>

          <div
            v-for="(article, index) in articles"
            :key="article.id"
            class="we-article-item"
            :class="{
              active: activeArticleId === article.id,
              'is-dragging': dragging && dragFrom === index,
              'drop-above': dragging && dragTo === index && dragFrom !== index,
            }"
            @mousedown="onItemMousedown(index, $event)"
            @click="selectArticle(article.id)"
          >
            <NInput
              v-if="editingTitleId === article.id"
              v-model:value="editingTitleValue"
              size="tiny"
              autofocus
              style="font-size: 13px"
              @blur="confirmEditTitle(article)"
              @keydown.enter="confirmEditTitle(article)"
              @click.stop
            />
            <NEllipsis v-else style="font-size: 13px; font-weight: 500" @dblclick="startEditTitle(article, $event)">{{ article.title }}</NEllipsis>
            <div class="we-article-item-footer">
              <NText depth="3" style="font-size: 11px">{{ article.created_at }}</NText>
              <NPopconfirm @positive-click="deleteArticle(article.id)" :show-icon="false">
                <template #trigger>
                  <button class="we-article-del" @click.stop>
                    <div class="i-carbon-trash-can" style="font-size: 12px"></div>
                  </button>
                </template>
                删除此文章？
              </NPopconfirm>
            </div>
          </div>
        </div>
      </div>

      <!-- 折叠按钮 -->
      <button class="we-toggle-list" @click="showArticleList = !showArticleList" :title="showArticleList ? '收起列表' : '展开列表'">
        <div :class="showArticleList ? 'i-carbon-chevron-left' : 'i-carbon-chevron-right'" style="font-size: 14px"></div>
      </button>

      <!-- 左侧编辑器 -->
      <div
        v-show="showEditor"
        class="we-editor-pane"
        :class="{ 'full-width': !showPreview }"
        :style="showPreview ? { flex: `0 0 ${editorWidthPercent}%` } : undefined"
      >
        <div ref="editorRef" class="we-codemirror"></div>
      </div>

      <!-- 可拖拽分割线 -->
      <div
        v-if="showEditor && showPreview"
        class="we-divider"
        :class="{ dragging: isDragging }"
        @mousedown="onDividerMousedown"
      ></div>

      <!-- 右侧预览 -->
      <div
        ref="previewPaneRef"
        v-show="showPreview"
        class="we-preview-pane"
        :class="{ 'full-width': !showEditor, 'mobile-mode': previewMode === 'mobile' }"
      >
        <!-- 手机模式外壳 -->
        <div v-if="previewMode === 'mobile'" class="we-phone-frame" :style="{ width: currentPhone.width + 'px', height: currentPhone.height + 'px', ...(phoneScale < 1 ? { transform: `scale(${phoneScale})`, transformOrigin: 'top center' } : {}) }">
          <div class="we-phone-notch">
            <span class="we-phone-time">{{ new Date().getHours() }}:{{ String(new Date().getMinutes()).padStart(2, '0') }}</span>
            <span class="we-phone-island"></span>
            <span class="we-phone-icons">
              <div class="i-carbon-wifi" style="font-size: 12px"></div>
              <div class="i-carbon-battery-full" style="font-size: 12px"></div>
            </span>
          </div>
          <div ref="previewRef" class="we-phone-body" @scroll="handlePreviewScroll">
            <div class="we-preview-content" :style="{ fontSize: fontSize + 'px' }">
              <div class="wechat-preview" v-html="previewHtml"></div>
            </div>
          </div>
        </div>
        <!-- 电脑模式 -->
        <div v-else ref="previewRef" class="we-desktop-preview" @scroll="handlePreviewScroll">
          <div class="we-preview-content" :style="{ fontSize: fontSize + 'px' }">
            <div class="wechat-preview" v-html="previewHtml"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="we-statusbar">
      <NSpace :size="16">
        <NText depth="3" style="font-size: 12px">{{ wordCount }} 字</NText>
        <NText depth="3" style="font-size: 12px">{{ lineCount }} 行</NText>
        <NText depth="3" style="font-size: 12px">主题：{{ currentTheme.name }}</NText>
      </NSpace>
      <NText depth="3" style="font-size: 12px">微信公众号编辑器</NText>
    </div>

    <!-- 隐藏的图片选择器 -->
    <input ref="imageInputRef" type="file" accept="image/*" style="display: none" @change="handleImageSelect" />
  </div>
</template>

<style scoped>
.wechat-editor-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 48px);
  background: var(--bg-card);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-light);
}

.wechat-editor-page.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  border-radius: 0;
  border: none;
}

/* Menu Bar */
.we-menubar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  height: 40px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
  background: var(--bg-card-hover);
}

.we-menu-left {
  display: flex;
  align-items: center;
  gap: 2px;
}

.we-menu-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.we-menu-btn {
  padding: 4px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.we-menu-btn:hover {
  background: var(--wt-accent-bg);
  color: #06c160;
}

/* Article List */
.we-article-list {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-card-hover);
  transition: width 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
}

.we-article-list.collapsed {
  width: 0;
  opacity: 0;
}

.we-toggle-list {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.we-toggle-list:hover {
  color: #06c160;
  background: var(--wt-accent-bg);
}

.we-article-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.we-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #06c160;
  cursor: pointer;
  transition: all 0.15s;
}

.we-add-btn:hover {
  background: var(--wt-accent-bg);
}

.we-article-items {
  flex: 1;
  overflow-y: auto;
  user-select: none;
  -webkit-user-select: none;
}

.we-article-item {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.15s;
}

.we-article-item:hover {
  background: var(--border-light);
}

.we-article-item.active {
  background: var(--wt-accent-bg);
  border-left: 3px solid #06c160;
  padding-left: 9px;
}

.we-article-item.is-dragging {
  opacity: 0.3;
  background: var(--border-light);
}

.we-article-item.drop-above {
  position: relative;
}

.we-article-item.drop-above::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 8px;
  right: 8px;
  height: 2px;
  background: #06c160;
  border-radius: 1px;
  z-index: 2;
}

.we-article-item.drop-above::after {
  content: '';
  position: absolute;
  top: -4px;
  left: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #06c160;
  z-index: 2;
}

/* 拖拽浮动卡片 */
.we-drag-ghost {
  position: absolute;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-card);
  border: 1px solid #06c160;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(6, 193, 96, 0.15);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
  pointer-events: none;
  max-width: 180px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.we-article-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.we-article-del {
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
  transition: all 0.15s;
}

.we-article-item:hover .we-article-del {
  opacity: 1;
}

.we-article-del:hover {
  background: var(--wt-red-bg);
  color: #E88080;
}

/* Body */
.we-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.we-editor-pane {
  min-width: 0;
  overflow: hidden;
}

.we-editor-pane.full-width {
  flex: 1 !important;
}

.we-codemirror {
  height: 100%;
}

.we-codemirror :deep(.cm-selectionBackground) {
  background: #b3e5c8 !important;
}

.we-codemirror :deep(.cm-content ::selection) {
  background: #b3e5c8 !important;
}

.we-divider {
  width: 5px;
  background: var(--border-light);
  flex-shrink: 0;
  cursor: col-resize;
  position: relative;
  transition: background .15s;
}

.we-divider:hover,
.we-divider.dragging {
  background: var(--wt-accent-bg);
}

.we-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 3px;
  height: 32px;
  border-radius: 2px;
  background: var(--text-muted);
  transition: background .15s;
}

.we-divider:hover::after,
.we-divider.dragging::after {
  background: #36AD6A;
}

.we-preview-pane {
  flex: 1;
  min-width: 0;
  background: var(--bg-card);
  overflow: hidden;
}

.we-preview-pane.full-width {
  flex: 1;
}

.we-preview-pane.mobile-mode {
  background: var(--bg-content);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
  padding: 20px;
}


.we-desktop-preview {
  height: 100%;
  overflow-y: auto;
}

.we-preview-content {
  max-width: 780px;
  margin: 0 auto;
  padding: 24px 32px;
}

/* Phone Frame */
.we-phone-frame {
  background: #fff;
  border-radius: 40px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15), 0 0 0 3px #1a1a1a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  transition: width .2s, height .2s;
}

.we-phone-notch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px 8px;
  font-size: 12px;
  color: #333;
  flex-shrink: 0;
  background: #fff;
}

.we-phone-time {
  font-weight: 600;
  font-size: 13px;
}

.we-phone-island {
  width: 80px;
  height: 24px;
  background: #1a1a1a;
  border-radius: 14px;
}

.we-phone-icons {
  display: flex;
  gap: 4px;
  align-items: center;
  color: #333;
}

.we-phone-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.we-phone-body .we-preview-content {
  max-width: 100%;
  padding: 16px 20px;
}

/* Preview Mode Toggle */
.we-preview-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.we-preview-mode-btn:hover {
  background: var(--border-light);
  color: var(--text-secondary);
}

.we-preview-mode-btn.active {
  background: var(--wt-accent-bg);
  color: #06c160;
}

/* Status Bar */
.we-statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  height: 28px;
  border-top: 1px solid var(--border-light);
  flex-shrink: 0;
  background: var(--bg-card-hover);
}
</style>
