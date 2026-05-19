import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useProjects } from '../../context/ProjectContext'

export default function ProjectTimeline() {
  const { projects, stages } = useProjects()
  const [selectedProject, setSelectedProject] = useState(projects[0])

  const currentStageIndex = stages.findIndex(s => s.id === selectedProject?.stage)
  const progressPercent = Math.round((currentStageIndex / (stages.length - 1)) * 100)

  return (
    <div className="bb-page animate-fade-up">
      <header className="bb-page-header">
        <div>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-3)' }}>Project journey</span>
          <h1 className="bb-display">{selectedProject?.name || 'Select a project'}<span className="bb-script" style={{ fontSize: '1.2em', color: 'var(--bb-rose)', marginLeft: 8 }}>.</span></h1>
          <p>{selectedProject?.customer?.name || ''}</p>
        </div>
        <select value={selectedProject?.id} onChange={e => setSelectedProject(projects.find(p => p.id === e.target.value)!)}
          style={{ border: '1px solid var(--bb-line)', borderRadius: 8, padding: '10px 14px', background: '#fff', color: 'var(--bb-ink)', outline: 'none' }}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        <div className="bb-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Progress</span>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--bb-ink)', lineHeight: 1 }}>{progressPercent}%</div>
            </div>
            <div style={{ width: 100, height: 100, position: 'relative' }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="#efe5df" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#prog)" strokeWidth="8"
                  strokeDasharray={264} strokeDashoffset={264 - (264 * progressPercent / 100)}
                  strokeLinecap="round" />
                <defs>
                  <linearGradient id="prog" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--bb-coral)" />
                    <stop offset="100%" stopColor="var(--bb-rose)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <div style={{ position: 'relative', paddingLeft: 28 }}>
            <div style={{ position: 'absolute', left: 10, top: 14, bottom: 14, width: 2, background: '#efe5df' }}>
              <div style={{ width: '100%', height: `${progressPercent}%`, background: 'linear-gradient(180deg, var(--bb-coral), var(--bb-rose))' }} />
            </div>
            {stages.map((stage, i) => {
              const completed = i < currentStageIndex
              const current = i === currentStageIndex
              return (
                <div key={stage.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: -28, top: 2, width: 20, height: 20, borderRadius: '50%',
                    display: 'grid', placeItems: 'center', border: `2px solid ${completed ? 'var(--bb-rose)' : current ? 'var(--bb-coral)' : 'var(--bb-line)'}`,
                    background: completed ? 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))' : current ? '#fff' : '#fff',
                    zIndex: 1,
                  }}>
                    {completed ? <CheckCircle2 size={12} style={{ color: '#fff' }} /> : (
                      <span style={{ fontSize: '0.55rem', fontWeight: 800, color: current ? 'var(--bb-coral)' : 'var(--bb-muted)' }}>{i + 1}</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: completed ? 'var(--bb-ink)' : current ? 'var(--bb-ink)' : 'var(--bb-muted)', fontSize: '0.92rem' }}>
                      {stage.label}
                    </strong>
                    {current && <span style={{ marginLeft: 10, padding: '2px 8px', borderRadius: 999, background: '#fff4e5', color: 'var(--bb-coral)', fontSize: '0.7rem', fontWeight: 800 }}>In Progress</span>}
                    {completed && <span style={{ marginLeft: 10, padding: '2px 8px', borderRadius: 999, background: '#e6f4ef', color: 'var(--bb-emerald)', fontSize: '0.7rem', fontWeight: 800 }}>Complete</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div className="bb-card" style={{ padding: 20 }}>
            <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 12 }}>Project Details</span>
            {[
              ['Customer', selectedProject?.customer.name],
              ['Budget', selectedProject?.budget],
              ['Metal', selectedProject?.metalPreference],
              ['Stone', selectedProject?.gemstonePreference],
              ['Ring size', selectedProject?.ringSize],
              ['Timeline', selectedProject?.timeline],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--bb-line)', fontSize: '0.86rem' }}>
                <span style={{ color: 'var(--bb-muted)' }}>{k}</span>
                <strong style={{ color: 'var(--bb-ink)' }}>{v}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
