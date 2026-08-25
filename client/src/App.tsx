import { Component, lazy, Suspense, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'
import LayoutModeSelector from './components/LayoutModeSelector'
import { hasChosenLayoutMode } from './hooks/useLayoutMode'
import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from 'wouter'
import { AppProvider } from './context/AppContext'
import { ProjectProvider, useProjects } from './context/ProjectContext'
import ToastContainer from './components/ToastContainer'
import InternalLayout from './layouts/InternalLayout'
import CustomerPortalLayout from './layouts/CustomerPortalLayout'
import { Lock } from 'lucide-react'

const LandingPage = lazy(() => import('./views/LandingPage'))
const JewellerLogin = lazy(() => import('./views/auth/JewellerLogin'))
const JewellerSignup = lazy(() => import('./views/auth/JewellerSignup'))
const CustomerLogin = lazy(() => import('./views/auth/CustomerLogin'))
const CustomerSignup = lazy(() => import('./views/auth/CustomerSignup'))

const VirtualTryOn = lazy(() => import('./views/internal/VirtualTryOn'))
const Dashboard = lazy(() => import('./views/internal/Dashboard'))
const Customers = lazy(() => import('./views/internal/Customers'))
const CustomerProfile = lazy(() => import('./views/internal/CustomerProfile'))
const VoiceIntake = lazy(() => import('./views/internal/VoiceIntake'))
const MagicMovement = lazy(() => import('./views/internal/MagicMovement'))
const Studio3D = lazy(() => import('./views/internal/Studio3D'))
const ManufacturabilityCheck = lazy(() => import('./views/internal/ManufacturabilityCheck'))
const ProjectTimeline = lazy(() => import('./views/internal/ProjectTimeline'))
const Vault = lazy(() => import('./views/internal/Vault'))
const Storefront = lazy(() => import('./views/internal/Storefront'))
const Settings = lazy(() => import('./views/internal/Settings'))

const CustomerDashboard = lazy(() => import('./views/customer/CustomerDashboard'))
const CustomerPortalLuna = lazy(() => import('./views/customer/CustomerPortalLuna'))
const CustomerTimeline = lazy(() => import('./views/customer/CustomerTimeline'))
const CustomerSettings = lazy(() => import('./views/customer/CustomerSettings'))
const UserGallery = lazy(() => import('./views/customer/UserGallery'))
import { getMe, type AuthUser } from './lib/auth'
import BackgroundJobManager from './components/BackgroundJobManager'

function InternalPage() {
  const [location] = useLocation()
  const sub = location.replace(/^\/workspace\/?/, '') || ''

  const renderContent = () => {
    if (!sub || sub === '' || sub === '/') return <Dashboard />
    if (sub === 'customers') return <Customers />
    if (sub.startsWith('customers/')) return <CustomerProfile projectId={sub.split('/')[1]} />
    if (sub === 'intake') return <VoiceIntake />
    if (sub === 'magic-movement') return <MagicMovement />
    if (sub === '3d-studio') return <Studio3D />
    if (sub === 'manufacturability') return <ManufacturabilityCheck />
    if (sub === 'timeline') return <ProjectTimeline />
    if (sub === 'vault') return <Vault />
    if (sub === 'store') return <Storefront />
    if (sub === 'settings') return <Settings />
    if (sub === 'virtual-tryon') return <VirtualTryOn />
    return <Dashboard />
  }

  return <InternalLayout>{renderContent()}</InternalLayout>
}

function PortalPage() {
  const [location, navigate] = useLocation()
  const { portalProject, refreshPortalProject } = useProjects()
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined)
  const [portalProjectLoaded, setPortalProjectLoaded] = useState(false)
  const sub = location.replace(/^\/portal\/?/, '') || ''

  useEffect(() => {
    let alive = true
    getMe()
      .then(me => { if (alive) setUser(me) })
      .catch(() => { if (alive) setUser(null) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!user || portalProjectLoaded) return
    if (user.role === 'customer' || !portalProject) {
      void refreshPortalProject().finally(() => setPortalProjectLoaded(true))
      return
    }
    setPortalProjectLoaded(true)
  }, [user, portalProject, portalProjectLoaded, refreshPortalProject])

  useEffect(() => {
    if (user === null) navigate('/customer/login')
  }, [user, navigate])

  if (user === undefined) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--bb-muted)' }}>Opening portal...</div>
  }
  if (user === null) return null

  const access = {
    overview: true,
    luna: true,
    designs: true,
    gallery: true,
    cad: true, // 3D viewer + generation always available to customers
    timeline: true,
    payments: true,
    virtualTryOn: true,
    ...(portalProject?.featureAccess || {}),
  }

  const renderContent = () => {
    if ((!sub || sub === '' || sub === '/') && access.overview) return <CustomerDashboard />
    if (!sub || sub === '' || sub === '/') return <LockedCustomerFeature label="Overview" />
    if (sub === 'luna') return access.luna ? <CustomerPortalLuna /> : <LockedCustomerFeature label="Luna" />
    if (sub === 'gallery') return access.gallery ? <UserGallery /> : <LockedCustomerFeature label="User Gallery" />
    if (sub === 'magic-movement') return access.designs ? <MagicMovement /> : <LockedCustomerFeature label="Designs" />
    if (sub === '3d-studio') return <Studio3D mode="customer" />
    if (sub === 'timeline') return access.timeline ? <CustomerTimeline /> : <LockedCustomerFeature label="Timeline" />
    if (sub === 'settings') return <CustomerSettings />
    if (sub === 'payments') return <CustomerSettings />  // legacy redirect
    if (sub === 'virtual-tryon') return access.virtualTryOn ? <VirtualTryOn /> : <LockedCustomerFeature label="Virtual Try On" />
    return <CustomerDashboard />
  }

  return <CustomerPortalLayout>{renderContent()}</CustomerPortalLayout>
}

function LockedCustomerFeature({ label }: { label: string }) {
  return (
    <div style={{ minHeight: 'calc(100vh - 180px)', display: 'grid', placeItems: 'center', padding: 28 }}>
      <div className="bb-card" style={{ maxWidth: 520, padding: 34, textAlign: 'center' }}>
        <div style={{ width: 58, height: 58, borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto 18px', background: '#f5ede8', color: 'var(--bb-coral)' }}>
          <Lock size={24} />
        </div>
        <h1 style={{ margin: '0 0 10px', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>{label} locked</h1>
        <p style={{ margin: 0, color: 'var(--bb-muted)', lineHeight: 1.65 }}>
          Your jeweller will unlock this feature when it is ready for review.
        </p>
      </div>
    </div>
  )
}

function PageLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: 'linear-gradient(180deg, #fffaf7, #f7eef5)',
      color: 'var(--bb-muted)',
    }}>
      <div style={{ display: 'grid', gap: 14, justifyItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: '3px solid rgba(207,95,145,0.18)',
          borderTopColor: 'var(--bb-rose)',
          animation: 'spin 0.9s linear infinite',
        }} />
        <strong style={{ color: 'var(--bb-ink)' }}>Loading workspace...</strong>
      </div>
    </div>
  )
}

const ROUTE_RELOAD_KEY = 'bb-route-reload-attempted'
const DEV_SW_RESET_KEY = 'bb-dev-sw-reset-done'
const ROUTE_RELOAD_WINDOW_MS = 10_000
const ROUTE_RELOAD_MAX_ATTEMPTS = 2

function isLikelyStaleRouteModuleError(error: Error) {
  const message = `${error.name || ''} ${error.message || ''}`.toLowerCase()
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('old dev-server module')
  )
}

class RouteErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Route render failed', error, info)

    if (isLikelyStaleRouteModuleError(error)) {
      try {
        const now = Date.now()
        const previous = JSON.parse(sessionStorage.getItem(ROUTE_RELOAD_KEY) || 'null') as
          | { key?: string; at?: number; count?: number }
          | null
        const withinWindow = previous?.key === this.props.resetKey && now - (previous.at || 0) < ROUTE_RELOAD_WINDOW_MS
        const count = withinWindow ? (previous?.count || 0) + 1 : 1

        if (withinWindow && count > ROUTE_RELOAD_MAX_ATTEMPTS) return

        sessionStorage.setItem(ROUTE_RELOAD_KEY, JSON.stringify({
          key: this.props.resetKey,
          at: now,
          count,
        }))
        const browserCaches = globalThis.caches
        if (browserCaches) {
          void browserCaches.keys()
            .then(keys => Promise.all(keys.map(key => browserCaches.delete(key))))
            .finally(() => globalThis.location.reload())
          return
        }
        globalThis.location.reload()
      } catch {
        globalThis.location.reload()
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    const detail = `${this.state.error.name || 'Error'}: ${this.state.error.message || 'Unknown route error'}`

    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="bb-card" style={{ maxWidth: 520, padding: 28, textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 10px', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontWeight: 600 }}>
            This page did not load
          </h1>
          <p style={{ margin: 0, color: 'var(--bb-muted)', lineHeight: 1.6 }}>
            Refresh the page. If it keeps happening, the browser may still have an old dev-server module cached.
          </p>
          {import.meta.env.DEV && (
            <pre style={{
              margin: '18px 0 0',
              padding: 12,
              borderRadius: 10,
              background: '#fff7f4',
              border: '1px solid var(--bb-line)',
              color: '#8f1d3f',
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 12,
              lineHeight: 1.45,
            }}>
              {detail}
            </pre>
          )}
        </div>
      </div>
    )
  }
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/jeweller/login" component={JewellerLogin} />
      <Route path="/jeweller/signup" component={JewellerSignup} />
      <Route path="/customer/login" component={CustomerLogin} />
      <Route path="/customer/signup" component={CustomerSignup} />
      <Route path="/workspace" component={InternalPage} />
      <Route path="/workspace/customers" component={InternalPage} />
      <Route path="/workspace/customers/:id" component={InternalPage} />
      <Route path="/workspace/:rest*" component={InternalPage} />
      <Route path="/portal" component={PortalPage} />
      <Route path="/portal/:rest*" component={PortalPage} />
      <Route><Redirect to="/" /></Route>
    </Switch>
  )
}

function RoutedApp() {
  const [location] = useLocation()

  return (
    <RouteErrorBoundary resetKey={location}>
      <Suspense fallback={<PageLoading />}>
        <Router />
      </Suspense>
    </RouteErrorBoundary>
  )
}

function AppWarmup() {
  useEffect(() => {
    const controller = new AbortController()

    if (import.meta.env.DEV && 'serviceWorker' in navigator) {
      const resetDevServiceWorker = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          if (registrations.length === 0) return
          await Promise.all(registrations.map(registration => registration.unregister()))
          if ('caches' in window) {
            const keys = await window.caches.keys()
            await Promise.all(keys.map(key => window.caches.delete(key)))
          }
          if (navigator.serviceWorker.controller && sessionStorage.getItem(DEV_SW_RESET_KEY) !== '1') {
            sessionStorage.setItem(DEV_SW_RESET_KEY, '1')
            window.location.reload()
          }
        } catch (error) {
          console.warn('Dev service worker cleanup failed', error)
        }
      }

      void resetDevServiceWorker()
    }

    void fetch('/api/healthz/warmup', {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    }).catch(() => {})

    return () => controller.abort()
  }, [])

  return null
}

function RouteChunkWarmup() {
  useEffect(() => {
    const warmRoutes = () => {
      void import('./views/internal/Studio3D')
      void import('./views/customer/UserGallery')
      void import('./views/internal/Dashboard')
      void import('./views/customer/CustomerDashboard')
    }

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(warmRoutes, { timeout: 2000 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = globalThis.setTimeout(warmRoutes, 900)
    return () => globalThis.clearTimeout(timeoutId)
  }, [])

  return null
}

export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const [showModeSelector, setShowModeSelector] = useState(() => !hasChosenLayoutMode())
  return (
    <AppProvider>
      <AppWarmup />
      <RouteChunkWarmup />
      <ProjectProvider>
        <BackgroundJobManager />
        <WouterRouter base={base}>
          <RoutedApp />
        </WouterRouter>
        <ToastContainer />
      </ProjectProvider>
      {showModeSelector && <LayoutModeSelector onDismiss={() => setShowModeSelector(false)} />}
    </AppProvider>
  )
}
