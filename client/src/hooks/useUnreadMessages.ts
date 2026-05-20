import { useCallback, useEffect, useRef, useState } from 'react'

export interface UnreadState {
  total: number
  byProject: Record<string, number>
}

const POLL_MS = 5000

/**
 * Polls /api/messages/unread-counts every 5 s.
 * Fires a browser notification when new messages arrive (after first load).
 * Call markAllRead(projectId) when the user opens the messenger.
 */
export function useUnreadMessages() {
  const [unread, setUnread] = useState<UnreadState>({ total: 0, byProject: {} })
  const prevTotal = useRef<number | null>(null)
  const notifGranted = useRef(false)

  // Request browser notification permission once
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      notifGranted.current = true
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        notifGranted.current = p === 'granted'
      })
    }
  }, [])

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/unread-counts', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json() as UnreadState

      setUnread(data)

      // Fire browser notification on new message (skip very first load)
      if (prevTotal.current !== null && data.total > prevTotal.current) {
        const diff = data.total - prevTotal.current
        if (notifGranted.current) {
          new Notification('Blink & Bling — New message', {
            body: `You have ${diff} new message${diff > 1 ? 's' : ''}`,
            icon: '/favicon.svg',
            tag: 'bb-new-message',
          })
        }
      }
      prevTotal.current = data.total
    } catch { /* network error — ignore */ }
  }, [])

  useEffect(() => {
    void fetchCounts()
    const id = setInterval(() => void fetchCounts(), POLL_MS)
    return () => clearInterval(id)
  }, [fetchCounts])

  // Call when messenger is opened to optimistically clear the dot
  const markAllRead = useCallback((projectId?: string) => {
    setUnread(prev => {
      if (!projectId) return { total: 0, byProject: {} }
      const next = { ...prev.byProject, [projectId]: 0 }
      const total = Object.values(next).reduce((s, v) => s + v, 0)
      return { total, byProject: next }
    })
  }, [])

  return { unread, markAllRead, refetch: fetchCounts }
}
