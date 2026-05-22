import { useState } from 'react'
import { useLocation } from 'wouter'
import { ArrowRight, Copy, Crown, Plus, Search, X } from 'lucide-react'
import { useProjects } from '../../context/ProjectContext'
import { useApp } from '../../context/AppContext'

export default function Customers() {
  const [, navigate] = useLocation()
  const { showToast } = useApp()
  const { projects, stages, addProject } = useProjects()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newClient, setNewClient] = useState({ fullName: '', email: '', phone: '', projectName: 'Custom jewellery project' })
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const stageProgress = (stageId: string) => {
    const idx = stages.findIndex(s => s.id === stageId)
    if (idx < 0) return 10
    return Math.round(((idx + 1) / stages.length) * 100)
  }

  const filtered = projects.filter(p => {
    const status = p.status === 'manufacturing' ? 'active' : p.status === 'pending_approval' ? 'pending' : 'active'
    const matchesSearch =
      p.customer.name.toLowerCase().includes(q.toLowerCase()) ||
      p.name.toLowerCase().includes(q.toLowerCase())
    return matchesSearch && (filter === 'all' || status === filter)
  })

  const stageColor = (stage: string) => {
    if (stage === 'production') return { background: '#e6f4ef', color: 'var(--bb-emerald)' }
    if (stage === '3d_render') return { background: '#f0e8ff', color: 'var(--bb-violet)' }
    if (stage === 'concept_review') return { background: '#fff4f5', color: 'var(--bb-rose)' }
    return { background: '#f5ede8', color: 'var(--bb-coral)' }
  }

  return (
    <div className="bb-page animate-fade-up">
      <header
        className="bb-page-header"
        style={{
          padding: 24,
          borderRadius: 22,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,244,245,0.72))',
          border: '1px solid var(--bb-line)',
          boxShadow: 'var(--bb-soft-shadow)',
        }}
      >
        <div>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-2)' }}>Clients</span>
          <h1 className="bb-display">Customer <span className="bb-script" style={{ fontSize: '1.25em', color: 'var(--bb-rose)' }}>workspaces</span>.</h1>
        </div>
        <button className="bb-btn-primary bb-lift" onClick={() => setShowAdd(true)}><Plus size={16} /> Add client</button>
      </header>

      <section style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 220, padding: '10px 14px', background: '#fff', border: '1px solid var(--bb-line)', borderRadius: 999 }}>
          <Search size={16} style={{ color: 'var(--bb-muted)' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search clients"
            style={{ width: '100%', border: 0, background: 'transparent', color: 'var(--bb-ink)', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'active', 'pending'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                border: '1px solid',
                borderRadius: 999,
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: '0.82rem',
                borderColor: filter === s ? 'var(--bb-rose)' : 'var(--bb-line)',
                color: filter === s ? 'var(--bb-rose)' : 'var(--bb-muted)',
                background: filter === s ? '#fff4f5' : '#fff',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="bb-grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 16 }}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center', color: 'var(--bb-muted)' }}>
            <Plus size={36} style={{ opacity: 0.25, marginBottom: 14 }} />
            <strong style={{ display: 'block', color: 'var(--bb-ink)', marginBottom: 6, fontFamily: 'var(--app-font-display)', fontWeight: 500, fontSize: '1.1rem' }}>
              {q ? 'No clients match your search' : 'No clients yet'}
            </strong>
            <p style={{ margin: '0 auto', maxWidth: 340, fontSize: '0.86rem', lineHeight: 1.6 }}>
              {q ? 'Try a different name or project.' : 'Click "Add client" to create your first customer workspace and generate an access code.'}
            </p>
          </div>
        )}
        {filtered.map(project => {
          const initials = project.customer.name.split(' ').map(n => n[0]).join('')
          const sc = stageColor(project.stage)
          const progress = stageProgress(project.stage)
          return (
            <article
              key={project.id}
              onClick={() => navigate(`/workspace/customers/${project.id}`)}
              className="bb-card bb-lift"
              style={{ padding: 0, cursor: 'pointer', display: 'grid', overflow: 'hidden' }}
            >
              <div style={{ height: 5, background: `linear-gradient(90deg, ${sc.color}, var(--bb-rose))` }} />
              <div style={{ padding: 18, display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 50, height: 50, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', background: `linear-gradient(135deg, ${sc.color}, var(--bb-rose))` }}>
                      {initials}
                    </div>
                    {project.status === 'pending_approval' && (
                      <span style={{ position: 'absolute', right: -3, bottom: -3, width: 19, height: 19, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#fff', border: '1px solid var(--bb-line)', color: 'var(--bb-coral)' }}>
                        <Crown size={11} />
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, color: 'var(--bb-ink)', fontSize: '1.02rem', fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>{project.customer.name}</h3>
                    <p style={{ margin: '4px 0 0', color: 'var(--bb-muted)', fontSize: '0.82rem' }}>{project.name.split(/ [-–—] /)[1]?.trim() || project.name}</p>
                  </div>
                  <ArrowRight size={16} style={{ color: 'var(--bb-muted)', flexShrink: 0 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'end', gap: 12 }}>
                  <div>
                    <div style={{ height: 7, borderRadius: 999, background: '#efe5df', overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${sc.color}, var(--bb-rose))` }} />
                    </div>
                    <span style={{ color: 'var(--bb-muted)', fontSize: '0.75rem', fontWeight: 700 }}>{progress}% complete</span>
                  </div>
                  <strong style={{ color: 'var(--bb-ink)', fontSize: '0.88rem' }}>{project.budget}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800, ...sc, textTransform: 'capitalize' }}>{project.stage.replace('_', ' ')}</span>
                  <span style={{ color: 'var(--bb-muted)', fontSize: '0.78rem' }}>{project.timeline}</span>
                </div>
                {project.accessCode && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 10px', borderRadius: 10, background: '#fff7f4', border: '1px solid #efd9d0' }}>
                    <span style={{ color: 'var(--bb-muted)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Code</span>
                    <strong style={{ color: 'var(--bb-ink)', letterSpacing: '0.08em', fontSize: '0.82rem' }}>{project.accessCode}</strong>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </section>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(22,18,20,0.62)', backdropFilter: 'blur(8px)' }}>
          <form
            className="bb-card"
            onSubmit={async e => {
              e.preventDefault()
              setIsAdding(true)
              try {
                const project = await addProject(newClient)
                setCreatedCode(project.accessCode || '')
                showToast('Client workspace created', 'success')
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'Could not add client', 'error')
              } finally {
                setIsAdding(false)
              }
            }}
            style={{ width: 'min(520px, 94vw)', padding: 24, display: 'grid', gap: 14 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-2)' }}>New client</span>
                <h2 style={{ margin: '6px 0 0', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>Create customer workspace</h2>
              </div>
              <button type="button" className="bb-icon-btn" onClick={() => { setShowAdd(false); setCreatedCode(null) }}><X size={16} /></button>
            </div>

            {createdCode ? (
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ padding: 18, borderRadius: 14, background: '#fff7f4', border: '1px solid #efd9d0', textAlign: 'center' }}>
                  <span style={{ display: 'block', color: 'var(--bb-muted)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Customer access code</span>
                  <strong style={{ color: 'var(--bb-ink)', fontSize: '1.65rem', letterSpacing: '0.1em' }}>{createdCode}</strong>
                </div>
                <button type="button" className="bb-btn-secondary" onClick={() => { navigator.clipboard?.writeText(createdCode); showToast('Code copied', 'success') }} style={{ justifyContent: 'center' }}>
                  <Copy size={16} /> Copy code
                </button>
                <button type="button" className="bb-btn-primary" onClick={() => { setShowAdd(false); setCreatedCode(null); setNewClient({ fullName: '', email: '', phone: '', projectName: 'Custom jewellery project' }) }} style={{ justifyContent: 'center' }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <AddField label="Full name" value={newClient.fullName} onChange={v => setNewClient(prev => ({ ...prev, fullName: v }))} placeholder="Akash Panwar" required />
                <AddField label="Email" value={newClient.email} onChange={v => setNewClient(prev => ({ ...prev, email: v }))} placeholder="client@email.com" type="email" />
                <AddField label="Phone" value={newClient.phone} onChange={v => setNewClient(prev => ({ ...prev, phone: v }))} placeholder="+44..." />
                <AddField label="Project" value={newClient.projectName} onChange={v => setNewClient(prev => ({ ...prev, projectName: v }))} placeholder="Engagement ring" required />
                <button type="submit" className="bb-btn-primary" disabled={isAdding} style={{ justifyContent: 'center' }}>
                  {isAdding ? 'Creating...' : 'Create code'}
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  )
}

function AddField({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <label style={{ display: 'grid', gap: 7 }}>
      <span style={{ color: 'var(--bb-muted)', fontSize: '0.78rem', fontWeight: 800 }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} required={required}
        style={{ border: '1px solid var(--bb-line)', borderRadius: 10, padding: '12px 13px', outline: 'none', color: 'var(--bb-ink)', background: '#fff' }} />
    </label>
  )
}
