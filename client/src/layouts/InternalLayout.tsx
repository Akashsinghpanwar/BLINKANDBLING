import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, LogOut, Search, Users } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import BlinkBlingLogo from '../components/BlinkBlingLogo'
import { logout } from '../lib/auth'

const navItems = [
  { name: 'Overview', path: '/workspace', icon: LayoutDashboard },
  { name: 'Clients', path: '/workspace/customers', icon: Users },
]

interface Props { children: React.ReactNode }

export default function InternalLayout({ children }: Props) {
  const [location, navigate] = useLocation()
  const [hovering, setHovering] = useState(false)
  const expanded = hovering

  const isActive = (path: string) => path === '/workspace' ? location === '/workspace' : location.startsWith(path)
  const pageLabel = navItems.find(item => isActive(item.path))?.name || 'Workspace'
  const handleLogout = async () => {
    await logout().catch(() => undefined)
    navigate('/jeweller/login')
  }

  return (
    <motion.div
      className="internal-layout bb-app-shell"
      animate={{ gridTemplateColumns: expanded ? '236px minmax(0,1fr)' : '76px minmax(0,1fr)' }}
      transition={{ duration: 0.32, ease: [0.22, 0.9, 0.32, 1] }}
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: expanded ? '236px minmax(0,1fr)' : '76px minmax(0,1fr)',
        background: 'radial-gradient(circle at 90% 0%, rgba(244,223,226,0.7), transparent 30%), radial-gradient(circle at 0% 100%, rgba(207,232,222,0.32), transparent 30%), linear-gradient(135deg, #fffefe 0%, #fbf8f5 55%, #f7eee9 100%)',
      }}
    >
      <aside
        className="bb-app-sidebar"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovering(false) }}
        style={{
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

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                style={{
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
                }}
              >
                <item.icon size={20} style={{ flexShrink: 0, color: active ? 'var(--bb-rose)' : 'inherit' }} />
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
              </Link>
            )
          })}
        </nav>
      </aside>

      <section style={{ minWidth: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="bb-app-header" style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          minHeight: 78,
          padding: '16px 28px 12px',
          borderBottom: '1px solid rgba(232,222,216,0.55)',
          background: 'rgba(255,255,255,0.74)',
          backdropFilter: 'blur(22px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
            <span className="bb-eyebrow" style={{ flexShrink: 0 }}>{pageLabel}</span>
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
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--bb-ink)', fontWeight: 700 }}>
            <div style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: '50%', color: '#fff', background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))' }}>
              AK
            </div>
            <span className="bb-hide-mobile">Akash</span>
            <button
              type="button"
              className="bb-btn-secondary bb-lift"
              onClick={handleLogout}
              aria-label="Logout"
              style={{ minHeight: 38, padding: '9px 13px', display: 'inline-flex', alignItems: 'center', gap: 7 }}
            >
              <LogOut size={16} />
              <span className="bb-hide-mobile">Logout</span>
            </button>
          </div>
        </header>

        <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          <PageTransition>{children}</PageTransition>
        </main>
      </section>
    </motion.div>
  )
}
