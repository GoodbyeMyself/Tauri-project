import { getDB } from './database'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'

interface BackupData {
  version: string
  exportedAt: string
  wechatArticles: Record<string, unknown>[]
  workTasks: Record<string, unknown>[]
}

export async function exportBackupJSON(userId: number) {
  const db = await getDB()
  const wechatArticles = await db.select('SELECT * FROM wechat_articles WHERE user_id = ?', [userId])
  const workTasks = await db.select('SELECT * FROM work_tasks WHERE user_id = ?', [userId])

  const data: BackupData = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    wechatArticles: wechatArticles as Record<string, unknown>[],
    workTasks: workTasks as Record<string, unknown>[],
  }

  const path = await save({
    title: '导出数据备份',
    defaultPath: `notepad-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (!path) return null

  await writeTextFile(path, JSON.stringify(data, null, 2))
  return {
    wechatArticles: (wechatArticles as unknown[]).length,
    workTasks: (workTasks as unknown[]).length,
  }
}

export async function importBackupJSON(userId: number) {
  const path = await open({
    title: '导入数据备份',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    multiple: false,
  })
  if (!path) return null

  const text = await readTextFile(path as string)
  const data = JSON.parse(text) as BackupData & { notes?: Record<string, unknown>[]; categories?: Record<string, unknown>[] }
  if (!data.version) throw new Error('无效的备份文件')

  const db = await getDB()

  let articlesCount = 0
  for (const article of (data.wechatArticles || [])) {
    const existing = await db.select<{ id: number }[]>(
      'SELECT id FROM wechat_articles WHERE title = ? AND created_at = ? AND user_id = ?',
      [article.title, article.created_at, userId]
    )
    if (existing.length > 0) continue
    await db.execute(
      'INSERT INTO wechat_articles (title, content, sort_order, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [article.title, article.content, article.sort_order || 0, userId, article.created_at, article.updated_at]
    )
    articlesCount++
  }

  let tasksCount = 0
  for (const task of (data.workTasks || [])) {
    const existing = await db.select<{ id: number }[]>(
      'SELECT id FROM work_tasks WHERE title = ? AND task_date = ? AND user_id = ?',
      [task.title, task.task_date, userId]
    )
    if (existing.length > 0) continue
    await db.execute(
      'INSERT INTO work_tasks (title, description, status, task_date, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [task.title, task.description || '', task.status || 'doing', task.task_date, userId, task.created_at, task.updated_at]
    )
    tasksCount++
  }

  return { articlesCount, tasksCount }
}
