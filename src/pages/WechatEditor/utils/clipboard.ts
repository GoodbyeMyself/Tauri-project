export async function copyRichTextToClipboard(html: string): Promise<boolean> {
  try {
    const blob = new Blob([html], { type: 'text/html' })
    const plainText = html.replace(/<[^>]*>/g, '')
    const textBlob = new Blob([plainText], { type: 'text/plain' })
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': blob,
        'text/plain': textBlob,
      }),
    ])
    return true
  } catch {
    const container = document.createElement('div')
    container.innerHTML = html
    container.style.position = 'fixed'
    container.style.left = '-9999px'
    container.style.opacity = '0'
    document.body.appendChild(container)
    const range = document.createRange()
    range.selectNodeContents(container)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    const success = document.execCommand('copy')
    document.body.removeChild(container)
    selection?.removeAllRanges()
    return success
  }
}
