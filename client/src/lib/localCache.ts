/**
 * localCache — on-device storage for the installed PWA.
 *
 * Small data (project, folders):  localStorage  — instant synchronous reads
 * Large data (images, messages):  IndexedDB     — async, no size limit
 *
 * Strategy: stale-while-revalidate
 *   1. Read from cache → render immediately (0 ms)
 *   2. Fetch from API in background
 *   3. Write fresh data back to cache
 *   4. Update UI
 */

const DB_NAME = 'bb-local-store'
const DB_VERSION = 1
const STORE_NAME = 'cache'

// TTL per key type (milliseconds)
const TTL: Record<string, number> = {
  'portal-project': 7 * 24 * 60 * 60 * 1000,   // 7 days
  'projects':       10 * 60 * 1000,             // 10 minutes
  'gallery':        30 * 60 * 1000,             // 30 minutes
  'uploads':        15 * 60 * 1000,             // 15 minutes
  'cad-files':      15 * 60 * 1000,             // 15 minutes
  'messages':        5 * 60 * 1000,             //  5 minutes
}

function ttlFor(key: string) {
  for (const [prefix, ms] of Object.entries(TTL)) {
    if (key.startsWith(prefix)) return ms
  }
  return 10 * 60 * 1000 // 10 min default
}

/* ── localStorage (small / sync) ─────────────────────────────────── */

interface CacheEntry<T> {
  data: T
  cachedAt: number
  ttl: number
}

export function lsSet<T>(key: string, data: T) {
  try {
    const entry: CacheEntry<T> = { data, cachedAt: Date.now(), ttl: ttlFor(key) }
    localStorage.setItem(`bb:${key}`, JSON.stringify(entry))
  } catch { /* storage full or private mode */ }
}

export function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`bb:${key}`)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() - entry.cachedAt > entry.ttl) {
      localStorage.removeItem(`bb:${key}`)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function lsClear(prefix?: string) {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(prefix ? `bb:${prefix}` : 'bb:')) keys.push(k)
  }
  keys.forEach(k => localStorage.removeItem(k))
}

/* ── IndexedDB (large / async) ────────────────────────────────────── */

let _db: IDBDatabase | null = null

function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result
      resolve(_db)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function idbSet<T>(key: string, data: T): Promise<void> {
  try {
    const db = await openDb()
    const entry = { key: `bb:${key}`, data, cachedAt: Date.now(), ttl: ttlFor(key) }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).put(entry)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch { /* private mode or quota exceeded */ }
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb()
    return new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(`bb:${key}`)
      req.onsuccess = () => {
        const entry = req.result as { data: T; cachedAt: number; ttl: number } | undefined
        if (!entry) { resolve(null); return }
        if (Date.now() - entry.cachedAt > entry.ttl) { resolve(null); return }
        resolve(entry.data)
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function idbClear(prefix?: string): Promise<void> {
  try {
    const db = await openDb()
    const pfx = prefix ? `bb:${prefix}` : 'bb:'
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null
        if (!cursor) { resolve(); return }
        if ((cursor.key as string).startsWith(pfx)) cursor.delete()
        cursor.continue()
      }
      req.onerror = () => resolve()
    })
  } catch { /* ignore */ }
}

/**
 * Clear all local cache — call on logout so the next user doesn't
 * see the previous user's data.
 */
export async function clearAllCache() {
  lsClear()
  await idbClear()
}
