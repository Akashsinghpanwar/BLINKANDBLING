import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { motion, AnimatePresence } from 'framer-motion'
import { Box, CreditCard, Images, LayoutDashboard, Lock, LogOut, MessageCircle, Mic2, Sparkles, Timer } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import BlinkBlingLogo from '../components/BlinkBlingLogo'
import { useProjects } from '../context/ProjectContext'
import ProjectMessenger from '../components/ProjectMessenger'

const PORTAL_COMPACT_MQ = '(max-width: 920px)'

const navItems = [
  { name: 'Overview', path: '/portal', icon: LayoutDashboard, feature: 'overview' as const },
  { name: 'Luna', path: '/portal/luna', icon: Mic2, feature: 'luna' as const },
  { name: 'Designs', path: '/portal/magic-movement', icon: Sparkles, feature: 'designs' as const },
  { name: 'User Gallery', path: '/portal/gallery', icon: Images, feature: 'gallery' as const },
  { name: '3D Preview', path: '/portal/3d-studio', icon: Box, feature: 'cad' as const },
{ name: 'Payments', path: '/portal/payments', icon: CreditCard, feature: 'payments' as const },
]

interface Props { children: React.ReactNode }

function usePortalCompact() {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(PORTAL_COMPACT_MQ)
    const onChange = () => setCompact(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return compact
}

export default function CustomerPortalLayout({ children }: Props) {
  const [location, navigate] = useLocation()
  const [showMessenger, setShowMessenger] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isCompact = usePortalCompact()
  const { portalProject } = useProjects()
  const customerName = portalProject?.customer.name || 'Customer'
  const access = {
    overview: true,
    luna: true,
    designs: true,
    gallery: true,
    cad: portalProject?.cadUnlocked ?? false,
    timeline: true,
    payments: true,
    ...(portalProject?.featureAccess || {}),
  }

  const isActive = (path: string) => path === '/portal' ? location === '/portal' : location.startsWith(path)
  const sidebarExpanded = !isCompact && sidebarOpen

  useEffect(() => {
    const openMessenger = () => setShowMessenger(true)
    window.addEventListener('bb-open-messenger', openMessenger)
    return () => window.removeEventListener('bb-open-messenger', openMessenger)
  }, [])

  return (
    <motion.div
      className="bb-portal-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <header className="bb-portal-header">
        <motion.div
          className="bb-portal-header__brand"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <BlinkBlingLogo variant="mark" size="md" />
          <motion.div
            className="bb-portal-header__brand-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.12 }}
          >
            <BlinkBlingLogo variant="wordmark" size="sm" style={{ display: 'block' }} />
            <span className="bb-portal-header__eyebrow">Customer Portal</span>
          </motion.div>
        </motion.div>

        <motion.div
          className="bb-portal-header__actions"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <button
            type="button"
            onClick={() => setShowMessenger(v => !v)}
            className="bb-lift bb-portal-header__icon-btn"
            aria-label={showMessenger ? 'Close messenger' : 'Open messenger'}
            style={{
              border: `1px solid ${showMessenger ? '#e5c6bd' : 'var(--bb-line)'}`,
              background: showMessenger ? '#fff7f4' : '#fff',
              color: showMessenger ? 'var(--bb-rose)' : 'var(--bb-muted)',
            }}
          >
            <MessageCircle size={18} />
          </button>
          <motion.div
            className="bb-portal-header__user"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div className="bb-portal-header__avatar">{customerName.charAt(0)}</div>
            <strong className="bb-portal-header__user-name">{customerName}</strong>
          </motion.div>
          <button
            type="button"
            className="bb-btn-secondary bb-lift bb-portal-header__logout"
            onClick={() => navigate('/')}
            aria-label="Logout"
          >
            <LogOut size={16} />
            <span className="bb-portal-header__logout-label">Logout</span>
          </button>
        </motion.div>
      </header>

      <div className="bb-app-shell bb-portal-shell">
        <aside
          className={`bb-app-sidebar bb-portal-sidebar${sidebarExpanded ? ' is-expanded' : ''}`}
          onMouseEnter={() => { if (!isCompact) setSidebarOpen(true) }}
          onMouseLeave={() => { if (!isCompact) setSidebarOpen(false) }}
        >
          <nav>
            {navItems.map(item => {
              const active = isActive(item.path)
              const locked = !access[item.feature]
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className="bb-portal-nav-link"
                  style={{
                    color: active ? 'var(--bb-ink)' : 'var(--bb-muted)',
                    background: active ? '#fff' : 'transparent',
                    border: `1px solid ${active ? '#efd9d0' : 'transparent'}`,
                    boxShadow: active ? 'var(--bb-soft-shadow)' : 'none',
                  }}
                >
                  <item.icon size={18} style={{ color: active ? 'var(--bb-rose)' : 'inherit', flexShrink: 0 }} />
                  <span className="bb-portal-nav-label">{item.name}</span>
                  {locked && (
                    <Lock size={13} className="bb-portal-nav-lock" style={{ color: 'var(--bb-muted)' }} />
                  )}
                  {active && (
                    <motion.span layoutId="portal-active-dot" className="bb-portal-nav-dot" />
                  )}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="bb-portal-main">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <AnimatePresence>
        {showMessenger && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 0.9, 0.32, 1] }}
            className="bb-portal-messenger"
            style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 80 }}
          >
            {portalProject
              ? <ProjectMessenger project={portalProject} viewer="customer" onClose={() => setShowMessenger(false)} />
              : null}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

