import { defineStore } from 'pinia'
import { getDB } from '@/utils/database'
import { hashPassword, verifyPassword } from '@/utils/crypto'

interface User {
  id: number
  username: string
  nickname: string
  avatar: string
  signature: string
  created_at: string
}

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null)
  const isLoggedIn = computed(() => !!currentUser.value)

  async function register(username: string, password: string) {
    const db = await getDB()
    const existing = await db.select<User[]>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    )
    if (existing.length > 0) {
      throw new Error('用户名已存在')
    }
    const hashed = await hashPassword(password)
    const result = await db.execute(
      'INSERT INTO users (username, password, nickname, plain_password) VALUES (?, ?, ?, ?)',
      [username, hashed, username, password]
    )
    const user = await db.select<User[]>(
      'SELECT id, username, nickname, avatar, signature, created_at FROM users WHERE id = ?',
      [result.lastInsertId]
    )
    currentUser.value = user[0]
    localStorage.setItem('currentUserId', String(user[0].id))

    await db.execute(
      'INSERT INTO categories (name, icon, sort_order, user_id) VALUES (?, ?, ?, ?)',
      ['默认', '📝', 0, user[0].id]
    )
  }

  async function login(username: string, password: string) {
    const db = await getDB()
    const users = await db.select<(User & { password: string })[]>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    )
    if (users.length === 0) {
      throw new Error('用户名不存在')
    }
    const valid = await verifyPassword(password, users[0].password)
    if (!valid) {
      throw new Error('密码错误')
    }
    const { password: _, ...user } = users[0]
    currentUser.value = user
    localStorage.setItem('currentUserId', String(user.id))
  }

  async function restoreSession() {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return false
    try {
      const db = await getDB()
      const users = await db.select<User[]>(
        'SELECT id, username, nickname, avatar, signature, created_at FROM users WHERE id = ?',
        [Number(userId)]
      )
      if (users.length > 0) {
        currentUser.value = users[0]
        return true
      }
    } catch {
      // DB not ready yet
    }
    return false
  }

  async function updateNickname(nickname: string) {
    if (!currentUser.value) return
    const db = await getDB()
    await db.execute('UPDATE users SET nickname = ? WHERE id = ?', [nickname, currentUser.value.id])
    currentUser.value = { ...currentUser.value, nickname }
  }

  function logout() {
    currentUser.value = null
    localStorage.removeItem('currentUserId')
    localStorage.removeItem('rememberedUsername')
  }

  return {
    currentUser,
    isLoggedIn,
    register,
    login,
    restoreSession,
    updateNickname,
    logout,
  }
})
