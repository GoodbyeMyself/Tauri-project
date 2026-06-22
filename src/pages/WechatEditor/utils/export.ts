import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

export async function exportMarkdownFile(content: string) {
  const path = await save({
    title: '导出 Markdown 文件',
    defaultPath: 'article.md',
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  })
  if (!path) return
  await writeTextFile(path, content)
}

export function exportPDF(previewEl: HTMLElement, title = 'article') {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 20px 40px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>${previewEl.innerHTML}</body>
    </html>
  `)
  printWindow.document.close()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 300)
}
