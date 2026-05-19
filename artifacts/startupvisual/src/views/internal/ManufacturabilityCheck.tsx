import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

const initialChecks = [
  { id: 1, name: 'Minimum Wall Thickness', status: 'pass', severity: 'blocker', value: '1.2mm', required: '0.8mm', fix: null },
  { id: 2, name: 'Prong Clearance', status: 'pass', severity: 'blocker', value: '0.5mm', required: '0.3mm', fix: null },
  { id: 3, name: 'Stone Setting Depth', status: 'warning', severity: 'warn', value: '75%', required: '80%', fix: 'Increase bezel height by 0.3mm' },
  { id: 4, name: 'Sharp Edge Detection', status: 'pass', severity: 'warn', value: 'None found', required: 'No sharp edges', fix: null },
  { id: 5, name: 'Ring Size Compatibility', status: 'pass', severity: 'blocker', value: 'Size 6.5', required: '4-12', fix: null },
  { id: 6, name: 'Hollow Area Risk', status: 'fail', severity: 'blocker', value: '2 areas detected', required: '0 hollow areas', fix: 'Fill hollow sections or add support structures' },
  { id: 7, name: 'Metal Flow Analysis', status: 'warning', severity: 'info', value: 'Minor restriction', required: 'Smooth flow', fix: 'Consider widening channel at position 3' },
  { id: 8, name: 'Casting Shrinkage', status: 'pass', severity: 'info', value: '2.5% accounted', required: '2-3%', fix: null },
]

export default function ManufacturabilityCheck() {
  const [checks, setChecks] = useState(initialChecks)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [expandedCheck, setExpandedCheck] = useState<number | null>(null)

  const passCount = checks.filter(c => c.status === 'pass').length
  const warnCount = checks.filter(c => c.status === 'warning').length
  const failCount = checks.filter(c => c.status === 'fail').length

  const overallStatus = failCount > 0 ? 'fail' : warnCount > 0 ? 'warning' : 'pass'
  const overallScore = Math.round(((passCount + warnCount * 0.5) / checks.length) * 100)

  const runChecks = () => {
    setIsRunning(true)
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); setTimeout(() => setIsRunning(false), 400); return 100 }
        return p + 12.5
      })
    }, 200)
  }

  const statusIcon = (status: string) => {
    if (status === 'pass') return <CheckCircle2 size={18} style={{ color: 'var(--bb-emerald)' }} />
    if (status === 'fail') return <XCircle size={18} style={{ color: '#ad3f70' }} />
    return <AlertTriangle size={18} style={{ color: '#996b1d' }} />
  }

  const statusColor = (status: string) => {
    if (status === 'pass') return { bg: '#e6f4ef', color: 'var(--bb-emerald)' }
    if (status === 'fail') return { bg: '#fff0f3', color: '#ad3f70' }
    return { bg: '#fef9ed', color: '#996b1d' }
  }

  return (
    <div className="bb-page animate-fade-up">
      <header className="bb-page-header">
        <div>
          <span className="bb-eyebrow">Manufacturing</span>
          <h1>Manufacturability Check.</h1>
        </div>
        <button className="bb-btn-primary" onClick={runChecks} disabled={isRunning}>
          <CheckCircle2 size={17} /> {isRunning ? 'Analyzing...' : 'Run All Checks'}
        </button>
      </header>

      {isRunning && (
        <div style={{ marginBottom: 20, height: 7, borderRadius: 999, background: '#efe5df', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--bb-coral), var(--bb-rose))', transition: 'width 0.2s ease', borderRadius: 999 }} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Overall Score', value: `${overallScore}%`, color: overallStatus === 'pass' ? 'var(--bb-emerald)' : overallStatus === 'fail' ? '#ad3f70' : '#996b1d' },
          { label: 'Passed', value: passCount, color: 'var(--bb-emerald)' },
          { label: 'Warnings', value: warnCount, color: '#996b1d' },
          { label: 'Failed', value: failCount, color: '#ad3f70' },
        ].map(s => (
          <div key={s.label} className="bb-card" style={{ padding: 18, textAlign: 'center' }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: 'var(--bb-muted)', fontSize: '0.82rem', marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bb-card" style={{ overflow: 'hidden' }}>
        {checks.map((check, i) => {
          const sc = statusColor(check.status)
          const isExpanded = expandedCheck === check.id
          return (
            <div key={check.id}
              style={{ borderBottom: i < checks.length - 1 ? '1px solid var(--bb-line)' : 'none' }}>
              <button
                onClick={() => setExpandedCheck(isExpanded ? null : check.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                  border: 0, background: isExpanded ? '#fffbf9' : 'transparent', cursor: 'pointer', textAlign: 'left',
                }}>
                {statusIcon(check.status)}
                <span style={{ flex: 1, color: 'var(--bb-ink)', fontWeight: 750 }}>{check.name}</span>
                <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem', marginRight: 12 }}>{check.value}</span>
                <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800, background: sc.bg, color: sc.color }}>
                  {check.status}
                </span>
              </button>
              {isExpanded && (
                <div style={{ padding: '0 20px 16px 52px', display: 'grid', gap: 8 }}>
                  <div style={{ color: 'var(--bb-muted)', fontSize: '0.86rem' }}>Required: <strong style={{ color: 'var(--bb-ink)' }}>{check.required}</strong></div>
                  {check.fix && (
                    <div style={{ padding: '10px 14px', background: '#fef9ed', border: '1px solid #f0dfa5', borderRadius: 8, color: '#8a6a1d', fontSize: '0.84rem' }}>
                      <strong>Suggested fix:</strong> {check.fix}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
