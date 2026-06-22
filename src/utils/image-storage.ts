import { writeFile, mkdir, exists } from '@tauri-apps/plugin-fs'
import { BaseDirectory } from '@tauri-apps/api/path'
import { appDataDir, join } from '@tauri-apps/api/path'
import { convertFileSrc } from '@tauri-apps/api/core'

const IMAGES_DIR = 'images'

async function ensureImagesDir(): Promise<void> {
  const dirExists = await exists(IMAGES_DIR, { baseDir: BaseDirectory.AppData })
  if (!dirExists) {
    await mkdir(IMAGES_DIR, { baseDir: BaseDirectory.AppData, recursive: true })
  }
}

function getExtension(file: File): string {
  const mimeMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
  }
  return mimeMap[file.type] || 'png'
}

export async function saveImage(file: File): Promise<string> {
  await ensureImagesDir()
  const ext = getExtension(file)
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const filename = `${timestamp}-${random}.${ext}`
  const relativePath = `${IMAGES_DIR}/${filename}`

  const buffer = await file.arrayBuffer()
  await writeFile(relativePath, new Uint8Array(buffer), { baseDir: BaseDirectory.AppData })

  const appData = await appDataDir()
  const fullPath = await join(appData, relativePath)
  return fullPath
}

export function getImageUrl(filePath: string): string {
  return convertFileSrc(filePath)
}
