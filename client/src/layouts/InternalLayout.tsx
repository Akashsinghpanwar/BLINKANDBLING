import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { useIsMobileLayout } from '../hooks/useLayoutMode'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, LayoutDashboard, LogOut, Search, Settings, Users, Wand2 } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import BlinkBlingLogo from '../components/BlinkBlingLogo'
import { logout } from '../lib/auth'
import { useUnreadMessages } from '../hooks/useUnreadMessages'

const navItems = [
  { name: 'Overview', path: '/workspace', icon: LayoutDashboard },
  { name: 'Clients', path: '/workspace/customers', icon: Users },
  { name: 'Try-On', path: '/workspace/virtual-tryon', icon: Wand2 },
  { name: 'Settings', path: '/workspace/settings', icon: Settings },
]

interface Props { children: React.ReactNode }

export default function InternalLayout({ children }: Props) {
  const [location, navigate] = useLocation()
  const [hovering, setHovering] = useState(false)
  const isMobile = useIsMobileLayout()
  const expanded = hovering && !isMobile
  const { unread } = useUnreadMessages()

  const isActive = (path: string) => path === '/workspace' ? location === '/workspace' : location.startsWith(path)
  const pageLabel = navItems.find(item => isActive(item.path))?.name || 'Workspace'
  const handleLogout = async () => {
    await logout().catch(() => undefined)
    navigate('/jeweller/login')
  }

  // ── Nav link styles ───────────────────────────────────────────────
  const linkStyle = (active: boolean): React.CSSProperties => isMobile ? {
    flex: '1 1 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 48,
    padding: '6px 4px',
    borderRadius: 10,
    textDecoration: 'none',
    color: active ? 'var(--bb-rose)' : 'var(--bb-muted)',
    background: 'transparent',
    border: '1px solid transparent',
  } : {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    padding: '9px 12px',
    borderRadius: 12,
    textDecoration: 'none',
    border: `1px solid ${active ? '#efd9d0' : 'transparent'}`,
    color: active ? 'var(--bb-ink)' : 'var(--bb-muted)',
    background: active ? '#fff' : 'transparent',
    boxShadow: active ? 'var(--bb-soft-shadow)' : 'none',
  }

  return (
    <div
      className="internal-layout"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : (expanded ? '236px minmax(0,1fr)' : '76px minmax(0,1fr)'),
        transition: 'grid-template-columns 0.32s cubic-bezier(0.22, 0.9, 0.32, 1)',
        background: 'radial-gradient(circle at 90% 0%, rgba(244,223,226,0.7), transparent 30%), radial-gradient(circle at 0% 100%, rgba(207,232,222,0.32), transparent 30%), linear-gradient(135deg, #fffefe 0%, #fbf8f5 55%, #f7eee9 100%)',
      }}
    >
      {/* ── Sidebar / Bottom tab bar ─────────────────────────── */}
      <aside
        className="bb-app-sidebar"
        onMouseEnter={() => !isMobile && setHovering(true)}
        onMouseLeave={() => !isMobile && setHovering(false)}
        style={isMobile ? {
          // Mobile: fixed bottom tab bar — all layout via inline style, no CSS override needed
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          padding: `6px 8px env(safe-area-inset-bottom, 8px)`,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(20px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
          borderTop: '1px solid rgba(232,222,216,0.55)',
          boxShadow: '0 -4px 20px rgba(51,39,35,0.07)',
        } : {
          // Desktop: sticky left sidebar
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          padding: '20px 14px',
          borderRight: '1px solid rgba(232,222,216,0.55)',
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(22px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.2)',
        }}
      >
        {/* Logo — desktop only */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '0 6px' }}>
            <BlinkBlingLogo variant="mark" size="md" />
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, whiteSpace: 'nowrap' }}
                >
                  <BlinkBlingLogo variant="wordmark" size="sm" />
                  <span style={{ color: 'var(--bb-muted)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Jeweller Portal</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Nav items */}
        <nav style={isMobile ? {
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 0,
        } : {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          {navItems.map(item => {
            const active = isActive(item.path)
            return (
              <Link key={item.path} href={item.path} style={linkStyle(active)}>
                <item.icon size={isMobile ? 22 : 20} style={{ flexShrink: 0, color: active ? 'var(--bb-rose)' : 'inherit' }} />
                {isMobile
                  ? <span style={{ fontSize: '0.68rem', lineHeight: 1.2, fontWeight: active ? 700 : 500 }}>{item.name}</span>
                  : (
                    <AnimatePresence>
                      {expanded && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.16 }}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          <strong style={{ fontSize: '0.92rem', lineHeight: 1.15, fontWeight: 700 }}>{item.name}</strong>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  )
                }
              </Link>
            )
          })}

        </nav>
      </aside>

      {/* ── Main content area ─────────────────────────────────── */}
      <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <header className="bb-app-header" style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 10 : 20,
          minHeight: isMobile ? 54 : 78,
          padding: isMobile ? '10px 14px' : '16px 28px 12px',
          borderBottom: '1px solid rgba(232,222,216,0.55)',
          background: 'rgba(255,255,255,0.74)',
          backdropFilter: 'blur(22px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.2)',
          flexWrap: isMobile ? 'nowrap' : undefined,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16, minWidth: 0, flex: 1 }}>
            {isMobile && <BlinkBlingLogo variant="mark" size="sm" />}
            <span className="bb-eyebrow" style={{ flexShrink: 0 }}>{pageLabel}</span>
            {!isMobile && (
              <div style={{
                width: 'min(520px, 42vw)',
                minWidth: 220,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 13px',
                background: '#fff',
                border: '1px solid var(--bb-line)',
                borderRadius: 999,
              }}>
                <Search size={17} style={{ color: 'var(--bb-muted)', flexShrink: 0 }} />
                <input placeholder="Search clients" style={{ width: '100%', border: 0, background: 'transparent', color: 'var(--bb-ink)', outline: 0, fontSize: '0.9rem' }} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, color: 'var(--bb-ink)', fontWeight: 700, flexShrink: 0 }}>
            {/* Notification bell */}
            <Link
              href="/workspace/customers"
              style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 12, border: `1px solid ${unread.total > 0 ? '#fbb' : 'var(--bb-line)'}`, background: unread.total > 0 ? '#fff5f5' : '#fff', color: unread.total > 0 ? '#e63950' : 'var(--bb-muted)', textDecoration: 'none', transition: 'all 0.2s' }}
              aria-label={unread.total > 0 ? `${unread.total} unread messages` : 'No new messages'}
            >
              <Bell size={17} />
              {unread.total > 0 && (
                <span className="bb-notif-badge">{unread.total > 99 ? '99+' : unread.total}</span>
              )}
            </Link>
            {!isMobile && (
              <div style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: '50%', color: '#fff', background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))' }}>
                AK
              </div>
            )}
            {!isMobile && <span>Akash</span>}
            <button
              type="button"
              className="bb-btn-secondary bb-lift"
              onClick={handleLogout}
              aria-label="Logout"
              style={{ minHeight: 38, padding: isMobile ? '9px 10px' : '9px 13px', display: 'inline-flex', alignItems: 'center', gap: 7 }}
            >
              <LogOut size={16} />
              {!isMobile && <span>Logout</span>}
            </button>
          </div>
        </header>

        <main style={{
          flex: 1,
          minWidth: 0,
          overflow: 'auto',
          paddingBottom: isMobile ? 'calc(68px + env(safe-area-inset-bottom, 0px))' : 0,
        }}>
          <PageTransition>{children}</PageTransition>
        </main>
      </section>
    </div>
  )
}
