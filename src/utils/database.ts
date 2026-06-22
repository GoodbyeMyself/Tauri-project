import Database from '@tauri-apps/plugin-sql'

let db: Database | null = null

export async function getDB(): Promise<Database> {
  if (!db) {
    assertTauriRuntime()
    db = await Database.load('sqlite:notepad.db')
    await initTables()
  }
  return db
}

function assertTauriRuntime() {
  const tauriInternals = (window as Window & {
    __TAURI_INTERNALS__?: { invoke?: unknown }
  }).__TAURI_INTERNALS__

  if (!tauriInternals?.invoke) {
    throw new Error('数据库功能需要在 Tauri 桌面环境中运行，请使用 pnpm tauri:dev 启动应用。')
  }
}

async function initTables() {
  if (!db) return

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nickname TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      signature TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  try {
    await db.execute('ALTER TABLE users ADD COLUMN plain_password TEXT DEFAULT \'\'')
  } catch {
    // column already exists
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS wechat_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '未命名文章',
      content TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  try {
    await db.execute('ALTER TABLE wechat_articles ADD COLUMN sort_order INTEGER DEFAULT 0')
  } catch {
    // column already exists
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS work_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'doing',
      task_date TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}
