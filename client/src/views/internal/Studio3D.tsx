import { useEffect, useState } from 'react'
import { Box, Eye, Lock, Sparkles, Cpu, Layers, Wand2 } from 'lucide-react'
import { Toaster } from '../../components/ui/sonner'
import { TooltipProvider } from '../../components/ui/tooltip'
import CadFileViewer from '../../components/CadFileViewer'
import { useProjects } from '../../context/ProjectContext'

type CadTab = 'bbcad' | 'viewer'

/* ─── BBCad Coming Soon screen ───────────────────────── */
function BBCadComingSoon() {
  const features = [
    { icon: Cpu,    label: 'AI-Powered 3D Modelling',    desc: 'Describe any jewellery piece — AI builds the 3D mesh instantly' },
    { icon: Layers, label: 'Parametric Design Engine',   desc: 'Tweak metal, stone, prongs and shank with real-time preview' },
    { icon: Wand2,  label: 'Sketch → CAD in Seconds',   desc: 'Upload a hand-drawn sketch and get a print-ready STL file' },
  ]

  return (
    <div style={{
      minHeight: 560,
      borderRadius: 20,
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      background: 'linear-gradient(145deg, #0f0c1a 0%, #1a1030 40%, #2b1a3a 70%, #1c1028 100%)',
      boxShadow: '0 28px 80px rgba(10,6,20,0.45)',
      border: '1px solid rgba(180,140,255,0.15)',
    }}>

      {/* animated gradient orbs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '10%',
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,90,255,0.22) 0%, transparent 70%)',
          animation: 'bbcad-pulse 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '5%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)',
          animation: 'bbcad-pulse 8s ease-in-out infinite 2s',
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '20%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,179,255,0.14) 0%, transparent 70%)',
          animation: 'bbcad-pulse 5s ease-in-out infinite 1s',
        }} />

        {/* floating dots grid */}
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 3, height: 3, borderRadius: '50%',
            background: 'rgba(200,160,255,0.35)',
            top: `${8 + (i % 4) * 22}%`,
            left: `${5 + Math.floor(i / 4) * 15}%`,
            animation: `bbcad-float ${3 + (i % 3)}s ease-in-out infinite ${(i * 0.3) % 2}s`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes bbcad-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: 0.7; }
        }
        @keyframes bbcad-float {
          0%, 100% { transform: translateY(0px); opacity: 0.35; }
          50% { transform: translateY(-8px); opacity: 0.7; }
        }
        @keyframes bbcad-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bbcad-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
      `}</style>

      {/* lock icon ring */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(167,90,255,0.25), rgba(236,72,153,0.18))',
          border: '1.5px solid rgba(180,140,255,0.35)',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 0 40px rgba(167,90,255,0.3), inset 0 0 20px rgba(255,255,255,0.05)',
        }}>
          <Lock size={34} style={{ color: 'rgba(220,180,255,0.95)' }} />
        </div>
        {/* spinning ring */}
        <div style={{
          position: 'absolute', inset: -6,
          borderRadius: '50%',
          border: '1.5px solid transparent',
          borderTopColor: 'rgba(167,90,255,0.7)',
          borderRightColor: 'rgba(236,72,153,0.4)',
          animation: 'bbcad-spin 3s linear infinite',
        }} />
      </div>

      {/* "Powered by AI" badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '5px 14px', borderRadius: 999, marginBottom: 18,
        border: '1px solid rgba(167,90,255,0.45)',
        background: 'rgba(167,90,255,0.12)',
        backdropFilter: 'blur(8px)',
      }}>
        <Sparkles size={12} style={{ color: '#c084fc' }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.08em', color: '#c084fc', textTransform: 'uppercase' }}>
          Powered by AI
        </span>
        <Sparkles size={12} style={{ color: '#c084fc' }} />
      </div>

      {/* title */}
      <h2 style={{
        margin: '0 0 10px',
        fontSize: 'clamp(2rem, 6vw, 3rem)',
        fontWeight: 900,
        letterSpacing: '-0.02em',
        background: 'linear-gradient(120deg, #e9d5ff 0%, #f0abfc 40%, #fbcfe8 70%, #bfdbfe 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'bbcad-shimmer 4s linear infinite',
        fontFamily: 'var(--app-font-display)',
      }}>
        BBCad Studio
      </h2>

      <p style={{
        margin: '0 0 8px',
        fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
        fontWeight: 700,
        color: 'rgba(240,220,255,0.9)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        Coming Soon
      </p>

      <p style={{
        margin: '0 0 40px',
        maxWidth: 440,
        fontSize: '0.92rem',
        lineHeight: 1.65,
        color: 'rgba(200,180,230,0.72)',
      }}>
        We are building the world's first AI-native jewellery CAD engine — design, simulate and export production-ready 3D files without touching traditional CAD software.
      </p>

      {/* feature chips */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        width: '100%',
        maxWidth: 620,
        marginBottom: 40,
      }}>
        {features.map(({ icon: Icon, label, desc }) => (
          <div key={label} style={{
            padding: '16px 18px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(180,140,255,0.2)',
            backdropFilter: 'blur(10px)',
            textAlign: 'left',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, marginBottom: 10,
              display: 'grid', placeItems: 'center',
              background: 'linear-gradient(135deg, rgba(167,90,255,0.3), rgba(236,72,153,0.2))',
            }}>
              <Icon size={16} style={{ color: '#d8b4fe' }} />
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(240,220,255,0.95)', marginBottom: 5 }}>{label}</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(180,160,210,0.7)', lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* CTA / notify */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '11px 24px', borderRadius: 999,
        background: 'linear-gradient(135deg, rgba(167,90,255,0.25), rgba(236,72,153,0.18))',
        border: '1px solid rgba(180,140,255,0.4)',
        color: 'rgba(230,210,255,0.9)',
        fontSize: '0.85rem', fontWeight: 800,
      }}>
        <Lock size={14} />
        Feature unlocking soon — stay tuned
      </div>
    </div>
  )
}

export default function Studio3D() {
  const { viewerCadFile } = useProjects()
  const [tab, setTab] = useState<CadTab>('viewer')

  useEffect(() => {
    if (viewerCadFile) setTab('viewer')
  }, [viewerCadFile])

  return (
    <TooltipProvider>
      <div>
        {/* Tab switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'inline-flex', gap: 6, padding: 4, borderRadius: 12, border: '1px solid var(--bb-line)', background: 'rgba(255,255,255,0.76)' }}>
            {/* BBCad tab — locked */}
            <button
              onClick={() => setTab('bbcad')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                minHeight: 36, padding: '8px 14px', borderRadius: 9,
                border: `1px solid ${tab === 'bbcad' ? 'rgba(167,90,255,0.5)' : 'transparent'}`,
                background: tab === 'bbcad' ? 'linear-gradient(135deg,rgba(167,90,255,0.12),rgba(236,72,153,0.08))' : 'transparent',
                color: tab === 'bbcad' ? '#a855f7' : 'var(--bb-muted)',
                fontWeight: 800, cursor: 'pointer',
                position: 'relative',
              }}
            >
              <Box size={15} />
              BBCad
              {/* lock badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.05em',
                padding: '2px 6px', borderRadius: 999,
                background: 'linear-gradient(135deg,#a855f7,#ec4899)',
                color: '#fff',
              }}>
                <Lock size={8} /> SOON
              </span>
            </button>

            {/* CAD Viewer tab — active */}
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
              CAD Viewer
            </button>
          </div>
        </div>

        {tab === 'bbcad' ? <BBCadComingSoon /> : <CadFileViewer />}
      </div>
      <Toaster theme="light" position="bottom-center" />
    </TooltipProvider>
  )
}
