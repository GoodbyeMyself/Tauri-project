import { open } from '@tauri-apps/plugin-dialog'
import { readFile, readTextFile } from '@tauri-apps/plugin-fs'
import mammoth from 'mammoth'

export async function importMarkdownFile(): Promise<string> {
  const path = await open({
    title: '导入 Markdown 文件',
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
    multiple: false,
  })
  if (!path) throw new Error('未选择文件')
  return await readTextFile(path as string)
}

export async function importWordFile(): Promise<string> {
  const path = await open({
    title: '导入 Word 文件',
    filters: [{ name: 'Word 文档', extensions: ['docx'] }],
    multiple: false,
  })
  if (!path) throw new Error('未选择文件')
  const bytes = await readFile(path as string)
  const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
  return htmlToMarkdown(result.value)
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
