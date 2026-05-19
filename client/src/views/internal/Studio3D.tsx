import { useEffect, useState } from 'react'
import { Box, Eye, Maximize2, Minimize2 } from 'lucide-react'
import { Toaster } from '../../components/ui/sonner'
import { TooltipProvider } from '../../components/ui/tooltip'
import { TopBar } from '../../components/TopBar'
import { LeftRail } from '../../components/LeftRail'
import { LeftPanel } from '../../components/LeftPanel'
import { RightColumn } from '../../components/RightColumn'
import { Viewport } from '../../components/Viewport'
import { BottomGallery } from '../../components/BottomGallery'
import { StatusBar } from '../../components/StatusBar'
import CadFileViewer from '../../components/CadFileViewer'
import { useProjects } from '../../context/ProjectContext'

type CadTab = 'bbcad' | 'viewer'

export default function Studio3D() {
  const { viewerCadFile } = useProjects()
  const [tab, setTab] = useState<CadTab>('bbcad')
  const [maximized, setMaximized] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  useEffect(() => {
    if (viewerCadFile) setTab('viewer')
  }, [viewerCadFile])

  return (
    <TooltipProvider>
      <div style={{
        position: maximized ? 'fixed' : 'relative',
        inset: maximized ? 0 : 'auto',
        zIndex: maximized ? 500 : 'auto',
        background: maximized ? '#f8f8f8' : 'transparent',
        padding: maximized ? 10 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'inline-flex', gap: 6, padding: 4, borderRadius: 12, border: '1px solid var(--bb-line)', background: 'rgba(255,255,255,0.76)' }}>
            {[
              { id: 'bbcad' as const, label: 'BBCad', icon: Box },
              { id: 'viewer' as const, label: 'CAD Viewer', icon: Eye },
            ].map(item => {
              const active = tab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    minHeight: 36,
                    padding: '8px 14px',
                    borderRadius: 9,
                    border: `1px solid ${active ? '#b8b8b8' : 'transparent'}`,
                    background: active ? '#fff' : 'transparent',
                    color: active ? 'var(--bb-ink)' : 'var(--bb-muted)',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  <item.icon size={15} />
                  {item.label}
                </button>
              )
            })}
          </div>

          {tab === 'bbcad' && (
            <button className="bb-btn-secondary bb-lift" onClick={() => setMaximized(v => !v)}>
              {maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              {maximized ? 'Exit full display' : 'Maximize BBCad'}
            </button>
          )}
        </div>

        {tab === 'viewer' ? (
          <CadFileViewer />
        ) : (
          <div
            className="cad-studio-shell"
            style={{
              height: maximized ? 'calc(100vh - 72px)' : 'calc(100vh - 184px)',
              minHeight: maximized ? 0 : 680,
              overflow: 'hidden',
              borderRadius: maximized ? 8 : 18,
              border: '1px solid #b8b8b8',
              boxShadow: '0 22px 60px rgba(35, 31, 32, 0.16)',
              background: '#d4d4d4',
            }}
          >
            <div className="flex h-full w-full flex-col overflow-hidden bg-[#D4D4D4] text-zinc-900">
              <TopBar
                onToggleLeft={() => { setLeftOpen((v) => !v); setRightOpen(false) }}
                onToggleRight={() => { setRightOpen((v) => !v); setLeftOpen(false) }}
              />

              <div className="relative flex flex-1 overflow-hidden">
                <div className="hidden md:flex">
                  <LeftRail />
                </div>

                <div
                  className={
                    'absolute inset-y-0 left-0 z-30 transition-transform md:static md:translate-x-0 ' +
                    (leftOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')
                  }
                >
                  <LeftPanel />
                </div>

                <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="relative min-h-0 flex-1 overflow-hidden">
                    <Viewport />
                  </div>
                  <BottomGallery />
                </main>

                <div
                  className={
                    'absolute inset-y-0 right-0 z-30 transition-transform md:static md:translate-x-0 ' +
                    (rightOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0')
                  }
                >
                  <RightColumn />
                </div>

                {(leftOpen || rightOpen) && (
                  <button
                    type="button"
                    aria-label="Close CAD panel"
                    className="absolute inset-0 z-20 bg-black/30 md:hidden"
                    onClick={() => { setLeftOpen(false); setRightOpen(false) }}
                  />
                )}
              </div>

              <StatusBar />
            </div>
          </div>
        )}
      </div>
      <Toaster theme="light" position="bottom-center" />
    </TooltipProvider>
  )
}
