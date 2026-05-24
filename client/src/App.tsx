import { useEffect, useState } from 'react'
import LayoutModeSelector from './components/LayoutModeSelector'
import { hasChosenLayoutMode } from './hooks/useLayoutMode'
import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from 'wouter'
import { AppProvider } from './context/AppContext'
import { ProjectProvider, useProjects } from './context/ProjectContext'
import ToastContainer from './components/ToastContainer'
import InternalLayout from './layouts/InternalLayout'
import CustomerPortalLayout from './layouts/CustomerPortalLayout'
import { Lock } from 'lucide-react'

import LandingPage from './views/LandingPage'
import JewellerLogin from './views/auth/JewellerLogin'
import JewellerSignup from './views/auth/JewellerSignup'
import CustomerLogin from './views/auth/CustomerLogin'
import CustomerSignup from './views/auth/CustomerSignup'

import VirtualTryOn from './views/internal/VirtualTryOn'
import Dashboard from './views/internal/Dashboard'
import Customers from './views/internal/Customers'
import CustomerProfile from './views/internal/CustomerProfile'
import VoiceIntake from './views/internal/VoiceIntake'
import MagicMovement from './views/internal/MagicMovement'
import Studio3D from './views/internal/Studio3D'
import ManufacturabilityCheck from './views/internal/ManufacturabilityCheck'
import ProjectTimeline from './views/internal/ProjectTimeline'
import Vault from './views/internal/Vault'
import Storefront from './views/internal/Storefront'
import Settings from './views/internal/Settings'

import CustomerDashboard from './views/customer/CustomerDashboard'
import CustomerPortalLuna from './views/customer/CustomerPortalLuna'
import CustomerTimeline from './views/customer/CustomerTimeline'
import CustomerSettings from './views/customer/CustomerSettings'
import UserGallery from './views/customer/UserGallery'
import { getMe, type AuthUser } from './lib/auth'

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
    cad: portalProject?.cadUnlocked ?? false,
    timeline: true,
    payments: true,
    ...(portalProject?.featureAccess || {}),
  }

  const renderContent = () => {
    if ((!sub || sub === '' || sub === '/') && access.overview) return <CustomerDashboard />
    if (!sub || sub === '' || sub === '/') return <LockedCustomerFeature label="Overview" />
    if (sub === 'luna') return access.luna ? <CustomerPortalLuna /> : <LockedCustomerFeature label="Luna" />
    if (sub === 'gallery') return access.gallery ? <UserGallery /> : <LockedCustomerFeature label="User Gallery" />
    if (sub === 'magic-movement') return access.designs ? <MagicMovement /> : <LockedCustomerFeature label="Designs" />
    if (sub === '3d-studio') return access.cad ? <Studio3D /> : <LockedCustomerFeature label="3D / CAD" />
    if (sub === 'timeline') return access.timeline ? <CustomerTimeline /> : <LockedCustomerFeature label="Timeline" />
    if (sub === 'settings') return <CustomerSettings />
    if (sub === 'payments') return <CustomerSettings />  // legacy redirect
    if (sub === 'virtual-tryon') return <VirtualTryOn />
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

function AppWarmup() {
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/healthz/warmup', {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    }).catch(() => {})

    return () => controller.abort()
  }, [])

  return null
}

export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const [showModeSelector, setShowModeSelector] = useState(() => !hasChosenLayoutMode())
  return (
    <AppProvider>
      <AppWarmup />
      <ProjectProvider>
        <WouterRouter base={base}>
          <Router />
        </WouterRouter>
        <ToastContainer />
      </ProjectProvider>
      {showModeSelector && <LayoutModeSelector onDismiss={() => setShowModeSelector(false)} />}
    </AppProvider>
  )
}
