import { useState, useEffect } from 'react'

export type LayoutMode = 'auto' | 'desktop' | 'mobile'

const STORAGE_KEY = 'bb-layout-mode'

// Shared state so all consumers stay in sync within the same tab
let _listeners: Array<(m: LayoutMode) => void> = []
let _current: LayoutMode = (localStorage.getItem(STORAGE_KEY) as LayoutMode | null) ?? 'auto'

export function setGlobalMode(m: LayoutMode) {
  _current = m
  localStorage.setItem(STORAGE_KEY, m)
  _listeners.forEach(fn => fn(m))
}

export function useLayoutMode() {
  const [mode, setMode] = useState<LayoutMode>(_current)

  useEffect(() => {
    const handler = (m: LayoutMode) => setMode(m)
    _listeners.push(handler)
    return () => { _listeners = _listeners.filter(fn => fn !== handler) }
  }, [])

  return { mode, setMode: setGlobalMode }
}

/** Returns true when mobile layout should be used */
export function useIsMobileLayout() {
  const { mode } = useLayoutMode()
  const [screenMobile, setScreenMobile] = useState(() => window.innerWidth <= 920)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 920px)')
    const onChange = () => setScreenMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  // Structural layout MUST agree with the CSS breakpoint (920px) — the mobile
  // styles are media-query driven, so a "Desktop" choice on a narrow screen
  // would clash (desktop grid + fixed bottom bar = broken layout).
  // The chosen mode can force mobile on wide screens, never desktop on narrow ones.
  if (mode === 'mobile') return true
  return screenMobile
}

/** True when no mode has been chosen yet (first install) */
export function hasChosenLayoutMode(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}
