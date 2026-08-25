import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { ArrowLeft, Box, Eye, Pencil, Sparkles } from 'lucide-react'
import { Toaster } from '../../components/ui/sonner'
import { TooltipProvider } from '../../components/ui/tooltip'
import CadFileViewer from '../../components/CadFileViewer'
import BBCadStudio from '../../components/BBCadStudio'
import { useProjects } from '../../context/ProjectContext'

type CadTab = 'bbcad' | 'viewer'

interface Props {
  /** customer = show 3D generation + read-only viewer; jeweller (default) = full access */
  mode?: 'jeweller' | 'customer'
}

export default function Studio3D({ mode = 'jeweller' }: Props) {
  const { viewerCadFile } = useProjects()
  const [, navigate] = useLocation()
  const isCustomer = mode === 'customer'
  // Initialize directly from viewerCadFile — a pending file set by the gallery
  // must open the viewer tab even though CadFileViewer consumes (nulls) the
  // pending file in its own mount effect, which runs BEFORE this parent effect.
  const [tab, setTab] = useState<CadTab>(() => (viewerCadFile ? 'viewer' : 'bbcad'))

  useEffect(() => {
    if (viewerCadFile) setTab('viewer')
  }, [viewerCadFile])

  return (
    <TooltipProvider>
      <div style={{
        height: 'calc(100dvh - 78px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        overflow: 'hidden',
        padding: '16px 20px',
        boxSizing: 'border-box',
      }}>
        <style>{`
          @media (max-width: 640px) {
            .studio3d-shell { height: auto !important; min-height: calc(100dvh - 78px); overflow: visible !important; padding: 10px 8px !important; }
            .studio3d-content { overflow: visible !important; }
            .studio3d-tabbar { flex-wrap: wrap !important; gap: 8px !important; }
          }
        `}</style>
        {/* Tab switcher */}
        <div className="studio3d-tabbar" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexShrink: 0 }}>
          <div style={{
            display: 'inline-flex', gap: 6, padding: 4, borderRadius: 12,
            border: '1px solid var(--bb-line)',
            background: 'rgba(255,255,255,0.76)',
          }}>
            {/* 3D Generation tab */}
            <button
              onClick={() => setTab('bbcad')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                minHeight: 36, padding: '8px 14px', borderRadius: 9,
                border: `1px solid ${tab === 'bbcad' ? 'rgba(167,90,255,0.5)' : 'transparent'}`,
                background: tab === 'bbcad'
                  ? 'linear-gradient(135deg,rgba(167,90,255,0.12),rgba(236,72,153,0.08))'
                  : 'transparent',
                color: tab === 'bbcad' ? '#a855f7' : 'var(--bb-muted)',
                fontWeight: 800, cursor: 'pointer',
              }}
            >
              <Box size={15} />
              {isCustomer ? 'Generate 3D' : 'BBCad'}
              {/* AI badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.05em',
                padding: '2px 6px', borderRadius: 999,
                background: 'linear-gradient(135deg,#a855f7,#ec4899)',
                color: '#fff',
              }}>
                <Sparkles size={8} /> AI
              </span>
            </button>

            {/* Viewer tab */}
            <button
              onClick={() => setTab('viewer')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                minHeight: 36, padding: '8px 14px', borderRadius: 9,
                border: `1px solid ${tab === 'viewer' ? '#b8b8b8' : 'transparent'}`,
                background: tab === 'viewer' ? '#fff' : 'transparent',
                color: tab === 'viewer' ? 'var(--bb-ink)' : 'var(--bb-muted)',
                fontWeight: 800, cursor: 'pointer',
              }}
            >
              <Eye size={15} />
              {isCustomer ? '3D Viewer' : 'CAD Viewer'}
            </button>
          </div>

          {/* Back to 2D — customers can go back and refine their concept */}
          {isCustomer && (
            <button
              onClick={() => navigate('/portal/magic-movement')}
              title="Go back to your 2D design to make changes"
              className="bb-lift"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                minHeight: 36, padding: '8px 16px', borderRadius: 999,
                background: '#fff', color: 'var(--bb-rose)',
                border: '1px solid rgba(207,95,145,0.35)',
                fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
              }}
            >
              <Pencil size={14} /> Edit 2D design
            </button>
          )}
        </div>

        <div className="studio3d-content" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {tab === 'bbcad'
            ? <BBCadStudio onOpenInViewer={() => setTab('viewer')} />
            : <CadFileViewer canDelete={!isCustomer} />
          }
        </div>
      </div>
      <Toaster theme="light" position="bottom-center" />
    </TooltipProvider>
  )
}
