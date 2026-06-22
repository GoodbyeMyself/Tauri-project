export interface WechatTheme {
  name: string
  id: string
  macCodeBlock?: boolean
  codeTheme?: 'github' | 'atom-one-dark'
  flagHeading?: boolean
  styles: {
    base: string
    h1: string
    h2: string
    h3: string
    h4: string
    h5: string
    h6: string
    p: string
    strong: string
    em: string
    del: string
    a: string
    blockquote: string
    code: string
    pre: string
    ul: string
    ol: string
    li: string
    img: string
    table: string
    th: string
    td: string
    hr: string
  }
}

import { defaultTheme } from './default'
import { elegantTheme } from './elegant'
import { techTheme } from './tech'
import { orangeTheme } from './orange'
import { darkGreenTheme } from './dark-green'
import { freshGreenTheme } from './fresh-green'

export const themes: WechatTheme[] = [
  defaultTheme,
  elegantTheme,
  techTheme,
  orangeTheme,
  darkGreenTheme,
  freshGreenTheme,
]

export function getThemeById(id: string): WechatTheme {
  return themes.find(t => t.id === id) || defaultTheme
}

export function buildThemeCSS(theme: WechatTheme): string {
  const s = theme.styles
  const flagCSS = theme.flagHeading ? `
    .wechat-preview h2 { border: none; padding: 0; margin: 1em 0 0.5em; background: none; }
  ` : ''
  return `
    .wechat-preview { ${s.base} }
    .wechat-preview h1 { ${s.h1} }
    .wechat-preview h2 { ${s.h2} }
    ${flagCSS}
    .wechat-preview h3 { ${s.h3} }
    .wechat-preview h4 { ${s.h4} }
    .wechat-preview h5 { ${s.h5} }
    .wechat-preview h6 { ${s.h6} }
    .wechat-preview p { ${s.p} }
    .wechat-preview strong, .wechat-preview b { display: inline; ${s.strong} }
    .wechat-preview em, .wechat-preview i { display: inline; ${s.em} }
    .wechat-preview del { display: inline; ${s.del} }
    .wechat-preview a { display: inline; ${s.a} }
    .wechat-preview blockquote { ${s.blockquote} }
    .wechat-preview code { ${s.code} }
    .wechat-preview pre { ${s.pre} }
    .wechat-preview pre code { background: none; padding: 12px 16px; border: none; border-radius: 0; font-size: inherit; color: inherit; display: block; overflow-x: auto; white-space: pre; font-family: "SF Mono", Menlo, Consolas, monospace; }
    .wechat-preview ul { ${s.ul} }
    .wechat-preview ol { ${s.ol} }
    .wechat-preview li { ${s.li} }
    .wechat-preview li strong, .wechat-preview li em, .wechat-preview li code { display: inline; }
    .wechat-preview img { ${s.img} }
    .wechat-preview table { ${s.table} }
    .wechat-preview th { ${s.th} }
    .wechat-preview td { ${s.td} }
    .wechat-preview hr { ${s.hr} }
  `
}
