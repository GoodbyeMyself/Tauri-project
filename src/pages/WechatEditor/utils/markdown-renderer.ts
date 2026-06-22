import { Marked } from 'marked'
import hljs from 'highlight.js'
import juice from 'juice'
import { type WechatTheme, buildThemeCSS } from '../themes'

let currentTheme: WechatTheme | null = null

const MAC_DOTS = `<section style="padding:12px 16px 0;line-height:0;font-size:0"><span style="width:12px;height:12px;border-radius:50%;background:#ff5f57;display:inline-block;margin-right:6px;overflow:hidden">&nbsp;</span><span style="width:12px;height:12px;border-radius:50%;background:#febc2e;display:inline-block;margin-right:6px;overflow:hidden">&nbsp;</span><span style="width:12px;height:12px;border-radius:50%;background:#28c840;display:inline-block;overflow:hidden">&nbsp;</span></section>`

function getThemeH2Color(): string {
  const match = currentTheme?.styles.h2.match(/--h2-bg:\s*(#[0-9a-fA-F]+)/)
  return match ? match[1] : '#06c160'
}

function flagHeadingHtml(text: string, size: string) {
  const color = getThemeH2Color()
  return `<section style="border-bottom:2px solid ${color};padding-bottom:0;margin:0"><span style="display:inline-block;background:${color};color:#fff;font-size:${size};font-weight:700;padding:6px 16px;line-height:1.4;border-radius:4px 4px 0 0;border-bottom:0;vertical-align:bottom">${text}</span></section>`
}

function createMarked() {
  const m = new Marked({ breaks: true, gfm: true })
  m.use({
    renderer: {
      heading({ text, depth }: { text: string; depth: number }) {
        if (currentTheme?.flagHeading && (depth === 1 || depth === 2)) {
          const size = depth === 1 ? '20px' : '17px'
          return `<h${depth}>${flagHeadingHtml(text, size)}</h${depth}>`
        }
        return `<h${depth}>${text}</h${depth}>`
      },
      strong({ text }: { text: string }) {
        return `<b>${text}</b>`
      },
      em({ text }: { text: string }) {
        return `<i>${text}</i>`
      },
      code({ text, lang }: { text: string; lang?: string }) {
        let highlighted: string
        if (lang && hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(text, { language: lang }).value
        } else {
          highlighted = hljs.highlightAuto(text).value
        }
        if (currentTheme?.macCodeBlock) {
          return `<pre>${MAC_DOTS}<code class="hljs language-${lang || ''}">${highlighted}</code></pre>`
        }
        return `<pre><code class="hljs language-${lang || ''}">${highlighted}</code></pre>`
      },
    },
  })
  return m
}

const marked = createMarked()

export function renderMarkdown(markdown: string, theme: WechatTheme, extraCSS?: string): string {
  currentTheme = theme
  const rawHtml = marked.parse(markdown) as string
  const wrappedHtml = `<section class="wechat-preview">${rawHtml}</section>`
  const css = buildThemeCSS(theme) + (extraCSS || '')
  return juice.inlineContent(wrappedHtml, css)
}

export function renderMarkdownForPreview(markdown: string): string {
  return marked.parse(markdown) as string
}
