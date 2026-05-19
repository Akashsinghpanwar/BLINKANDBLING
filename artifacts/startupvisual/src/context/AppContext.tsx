import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
  avatar: string
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface AppContextValue {
  user: User
  sidebarCollapsed: boolean
  toasts: Toast[]
  toggleSidebar: () => void
  showToast: (message: string, type?: Toast['type'], duration?: number) => void
  dismissToast: (id: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)

const defaultUser: User = {
  id: 'user_001',
  name: 'Akash',
  email: 'akash@blinkbling.com',
  role: 'internal',
  avatar: 'AK'
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user] = useState<User>(defaultUser)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(v => !v)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  return (
    <AppContext.Provider value={{ user, sidebarCollapsed, toasts, toggleSidebar, showToast, dismissToast }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
