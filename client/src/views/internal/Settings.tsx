import { useState, useEffect } from 'react'
import {
  BadgeCheck, Bell, ChevronRight, CreditCard,
  Eye, EyeOff, KeyRound, Sparkles, UserRound, Users,
  Zap, Shield, Globe, Palette, Save, Loader2, Building2, Phone,
} from 'lucide-react'

const TABS = [
  { id: 'profile',  label: 'Profile',      icon: UserRound,  desc: 'Your account info' },
  { id: 'api',      label: 'Integrations', icon: Zap,        desc: 'API keys & services' },
  { id: 'team',     label: 'Team',         icon: Users,      desc: 'Members & roles' },
  { id: 'billing',  label: 'Billing',      icon: CreditCard, desc: 'Plan & payments' },
]

const API_KEYS = [
  { name: 'ElevenLabs',  desc: 'Voice AI — Luna assistant',       masked: 'sk_1870...e7f',       status: 'active', color: '#6366f1', icon: '🎙️' },
  { name: 'OpenRouter',  desc: 'Image generation & vision',       masked: 'sk-or-v1...bd9c',     status: 'active', color: '#f59e0b', icon: '🤖' },
  { name: 'Meshy AI',    desc: '3D model generation',             masked: 'tsk_23...n1O',        status: 'active', color: '#10b981', icon: '🧊' },
  { name: 'Azure OpenAI',desc: 'Fallback image rendering',        masked: 'eyJ...xkYQ',          status: 'active', color: '#0ea5e9', icon: '☁️' },
]

const PLAN_FEATURES = [
  'Unlimited AI concept renders',
  'Virtual try-on (photo + motion)',
  'Luna voice assistant',
  '3D model exports',
  'Up to 10 active clients',
  'Gallery & CAD file storage',
]

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function Settings() {
  const [activeTab, setActiveTab]   = useState('profile')
  const [saveState, setSaveState]   = useState<SaveState>('idle')
  const [showKeys, setShowKeys]     = useState<Record<string, boolean>>({})
  const [loading, setLoading]       = useState(true)
  const [profile, setProfile]       = useState({
    fullName: '',
    email:    '',
    studio:   '',
    phone:    '',
  })
  // Track what was last saved so we can detect dirty state
  const [savedProfile, setSavedProfile] = useState(profile)

  // Load real profile from server on mount
  useEffect(() => {
    fetch('/api/auth/profile', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          const p = {
            fullName: data.profile.fullName || '',
            email:    data.profile.email    || '',
            studio:   data.profile.studio   || '',
            phone:    data.profile.phone    || '',
          }
          setProfile(p)
          setSavedProfile(p)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isDirty = JSON.stringify(profile) !== JSON.stringify(savedProfile)

  const handleSave = async () => {
    setSaveState('saving')
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      if (data.profile) {
        const p = {
          fullName: data.profile.fullName || '',
          email:    data.profile.email    || '',
          studio:   data.profile.studio   || '',
          phone:    data.profile.phone    || '',
        }
        setProfile(p)
        setSavedProfile(p)
      }
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  const handleDiscard = () => {
    setProfile(savedProfile)
  }

  const toggleKey = (name: string) =>
    setShowKeys(prev => ({ ...prev, [name]: !prev[name] }))

  const activeTabData = TABS.find(t => t.id === activeTab)!

  const initials = profile.fullName
    ? profile.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AK'

  return (
    <div style={{
      padding: 'clamp(20px, 3vw, 36px) clamp(16px, 3vw, 40px)',
      maxWidth: 1100,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 28,
    }}>
      <style>{CSS}</style>

      {/* ── Page header ── */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--bb-rose)' }}>
            Workspace
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 900, color: 'var(--bb-ink)', lineHeight: 1.1 }}>
            Settings
          </h1>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px', borderRadius: 999,
          background: 'rgba(207,95,145,0.08)',
          border: '1px solid rgba(207,95,145,0.18)',
          fontSize: '0.78rem', fontWeight: 700, color: 'var(--bb-rose)',
        }}>
          <Sparkles size={13} /> Studio Plan
        </div>
      </header>

      {/* ── Layout: sidebar + content ── */}
      <div className="st-layout">

        {/* ── Left tabs ── */}
        <aside className="st-sidebar">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`st-tab ${active ? 'is-active' : ''}`}
                >
                  <span className="st-tab-icon">
                    <Icon size={17} />
                  </span>
                  <span className="st-tab-text">
                    <strong>{tab.label}</strong>
                    <small>{tab.desc}</small>
                  </span>
                  {active && <ChevronRight size={14} className="st-tab-arrow" />}
                </button>
              )
            })}
          </nav>

          {/* Quick info card */}
          <div className="st-info-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="st-avatar">{initials}</div>
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--bb-ink)', display: 'block' }}>
                  {profile.fullName || 'Your Name'}
                </strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--bb-muted)' }}>Jeweller · Owner</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Right content ── */}
        <main className="st-content">
          <div className="st-content-header">
            <activeTabData.icon size={18} style={{ color: 'var(--bb-rose)' }} />
            <div>
              <h2 className="st-content-title">{activeTabData.label}</h2>
              <p className="st-content-desc">{activeTabData.desc}</p>
            </div>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── Profile ── */}
            {activeTab === 'profile' && (
              <>
                {/* Avatar section */}
                <div className="st-section">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="st-avatar-lg">{initials}</div>
                    <div>
                      <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--bb-muted)', lineHeight: 1.5 }}>
                        Profile photo is shown to clients in their portal.
                      </p>
                      <button className="st-btn-outline">Change photo</button>
                    </div>
                  </div>
                </div>

                {/* Fields */}
                <div className="st-section">
                  <h3 className="st-section-title">Personal Information</h3>
                  {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', color: 'var(--bb-muted)', fontSize: '0.85rem' }}>
                      <Loader2 size={16} className="st-spin" /> Loading your profile…
                    </div>
                  ) : (
                    <div className="st-grid-2">
                      <label className="st-field">
                        <span className="st-label">Full Name</span>
                        <input
                          value={profile.fullName}
                          onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                          type="text"
                          className="st-input"
                          placeholder="Your full name"
                        />
                      </label>
                      <label className="st-field">
                        <span className="st-label">Email Address</span>
                        <input
                          value={profile.email}
                          onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                          type="email"
                          className="st-input"
                          placeholder="your@email.com"
                        />
                      </label>
                      <label className="st-field">
                        <span className="st-label">Studio / Company</span>
                        <div className="st-input-icon-wrap">
                          <Building2 size={14} className="st-input-icon" />
                          <input
                            value={profile.studio}
                            onChange={e => setProfile(p => ({ ...p, studio: e.target.value }))}
                            type="text"
                            className="st-input st-input-padded"
                            placeholder="Blink & Bling Jewelers"
                          />
                        </div>
                      </label>
                      <label className="st-field">
                        <span className="st-label">Phone</span>
                        <div className="st-input-icon-wrap">
                          <Phone size={14} className="st-input-icon" />
                          <input
                            value={profile.phone}
                            onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                            type="tel"
                            className="st-input st-input-padded"
                            placeholder="+44 7700 000000"
                          />
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* Notifications */}
                <div className="st-section">
                  <h3 className="st-section-title">Notifications</h3>
                  {[
                    { label: 'New client message', desc: 'When a customer sends you a message' },
                    { label: 'AI render complete',  desc: 'When image generation finishes' },
                  ].map((n, i) => (
                    <div key={i} className="st-toggle-row">
                      <div>
                        <strong className="st-toggle-label">{n.label}</strong>
                        <span className="st-toggle-desc">{n.desc}</span>
                      </div>
                      <label className="st-switch">
                        <input type="checkbox" defaultChecked />
                        <span className="st-switch-track" />
                      </label>
                    </div>
                  ))}
                </div>

                {/* Save bar */}
                <div className={`st-save-bar ${isDirty ? 'is-visible' : ''}`}>
                  <span style={{ fontSize: '0.83rem', color: 'var(--bb-muted)' }}>
                    {isDirty ? 'You have unsaved changes' : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="st-btn-outline"
                      onClick={handleDiscard}
                      disabled={saveState === 'saving'}
                    >
                      Discard
                    </button>
                    <button
                      className={`st-btn-primary ${saveState === 'saved' ? 'is-saved' : ''} ${saveState === 'error' ? 'is-error' : ''}`}
                      onClick={handleSave}
                      disabled={saveState === 'saving' || !isDirty}
                    >
                      {saveState === 'saving' ? (
                        <><Loader2 size={14} className="st-spin" /> Saving…</>
                      ) : saveState === 'saved' ? (
                        <>✓ Saved!</>
                      ) : saveState === 'error' ? (
                        <>! Failed — retry</>
                      ) : (
                        <><Save size={14} /> Save changes</>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── API Keys ── */}
            {activeTab === 'api' && (
              <>
                <div className="st-alert">
                  <Shield size={15} />
                  API keys are stored securely in your environment. They are never exposed to clients.
                </div>

                <div className="st-section">
                  <h3 className="st-section-title">Connected Services</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {API_KEYS.map(api => (
                      <div key={api.name} className="st-api-row">
                        <span className="st-api-icon">{api.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--bb-ink)' }}>{api.name}</strong>
                            <span className="st-badge-green">
                              <BadgeCheck size={11} /> Active
                            </span>
                          </div>
                          <span style={{ fontSize: '0.76rem', color: 'var(--bb-muted)' }}>{api.desc}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <code className="st-key-code">
                            {showKeys[api.name] ? api.masked : '••••••••••••'}
                          </code>
                          <button
                            className="st-icon-btn"
                            onClick={() => toggleKey(api.name)}
                            title={showKeys[api.name] ? 'Hide' : 'Show'}
                          >
                            {showKeys[api.name] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="st-section">
                  <h3 className="st-section-title">Other Configuration</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { icon: Globe,   label: 'Public Base URL',       val: 'wet-quail-8.loca.lt',               desc: 'Used for AI video frame serving' },
                      { icon: Bell,    label: 'ElevenLabs Agent ID',    val: 'agent_9001...',                     desc: 'Luna voice assistant agent' },
                      { icon: Palette, label: 'Image Model',            val: 'gemini-3.1-flash-image-preview',    desc: 'Default AI image generation model' },
                    ].map(({ icon: Icon, label, val, desc }) => (
                      <div key={label} className="st-config-row">
                        <Icon size={15} style={{ color: 'var(--bb-muted)', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: '0.84rem', color: 'var(--bb-ink)', display: 'block' }}>{label}</strong>
                          <span style={{ fontSize: '0.74rem', color: 'var(--bb-muted)' }}>{desc}</span>
                        </div>
                        <code style={{ fontSize: '0.75rem', color: 'var(--bb-muted)', background: 'rgba(0,0,0,0.04)', padding: '3px 8px', borderRadius: 6 }}>{val}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Team ── */}
            {activeTab === 'team' && (
              <>
                <div className="st-section">
                  <h3 className="st-section-title">Members</h3>
                  {[
                    { name: profile.fullName || 'Akash', email: profile.email || 'akash@blinkbling.com', role: 'Owner', active: true },
                  ].map(m => (
                    <div key={m.email} className="st-member-row">
                      <div className="st-avatar-sm" style={{ background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))' }}>
                        {(m.name[0] || 'A').toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--bb-ink)', display: 'block' }}>{m.name}</strong>
                        <span style={{ fontSize: '0.76rem', color: 'var(--bb-muted)' }}>{m.email}</span>
                      </div>
                      <span className="st-badge-green">{m.role}</span>
                    </div>
                  ))}
                </div>

                <div className="st-invite-card">
                  <Users size={22} style={{ color: 'var(--bb-rose)' }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: 4 }}>Invite a team member</strong>
                    <span style={{ fontSize: '0.82rem', color: 'var(--bb-muted)' }}>Add designers, assistants or account managers.</span>
                  </div>
                  <button className="st-btn-primary" style={{ flexShrink: 0 }}>Send invite</button>
                </div>
              </>
            )}

            {/* ── Billing ── */}
            {activeTab === 'billing' && (
              <>
                <div className="st-plan-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--bb-rose)' }}>
                        Current Plan
                      </span>
                      <h3 style={{ margin: '4px 0 6px', fontSize: '1.4rem', fontWeight: 900, color: 'var(--bb-ink)' }}>Studio Plan</h3>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--bb-muted)' }}>Billed monthly · Next renewal 27 Jun 2026</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--bb-rose)', lineHeight: 1 }}>£49</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--bb-muted)' }}>/mo</span>
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'rgba(207,95,145,0.15)', margin: '18px 0' }} />

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                    {PLAN_FEATURES.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--bb-ink)' }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(207,95,145,0.12)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <BadgeCheck size={11} style={{ color: 'var(--bb-rose)' }} />
                        </span>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="st-section">
                  <h3 className="st-section-title">Payment Method</h3>
                  <div className="st-payment-row">
                    <span style={{ fontSize: '1.4rem' }}>💳</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--bb-ink)', display: 'block' }}>Visa ending in 4242</strong>
                      <span style={{ fontSize: '0.76rem', color: 'var(--bb-muted)' }}>Expires 08/2027</span>
                    </div>
                    <button className="st-btn-outline">Update</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="st-btn-primary">Upgrade plan</button>
                  <button className="st-btn-outline">Manage subscription</button>
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}

const CSS = `
  .st-layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 760px) {
    .st-layout { grid-template-columns: 1fr; }
  }

  /* ── Sidebar ── */
  .st-sidebar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: sticky;
    top: 24px;
  }

  .st-tab {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px 13px;
    border-radius: 13px;
    border: 1.5px solid transparent;
    background: transparent;
    color: var(--bb-muted);
    cursor: pointer;
    text-align: left;
    transition: all 0.17s;
  }
  .st-tab:hover { background: rgba(255,255,255,0.7); color: var(--bb-ink); }
  .st-tab.is-active {
    background: #fff;
    border-color: rgba(207,95,145,0.28);
    color: var(--bb-ink);
    box-shadow: 0 2px 14px rgba(51,39,35,0.08);
  }
  .st-tab-icon {
    width: 32px; height: 32px; border-radius: 9px;
    background: rgba(207,95,145,0.08);
    display: grid; place-items: center; flex-shrink: 0;
    color: var(--bb-rose);
    transition: background 0.17s;
  }
  .st-tab:not(.is-active) .st-tab-icon { background: rgba(0,0,0,0.04); color: var(--bb-muted); }
  .st-tab-text { flex: 1; line-height: 1.2; }
  .st-tab-text strong { display: block; font-size: 0.88rem; font-weight: 800; }
  .st-tab-text small  { display: block; font-size: 0.7rem; font-weight: 500; color: var(--bb-muted); margin-top: 1px; }
  .st-tab.is-active .st-tab-text small { color: rgba(207,95,145,0.7); }
  .st-tab-arrow { color: var(--bb-rose); flex-shrink: 0; }

  .st-info-card {
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(255,255,255,0.6);
    border: 1px solid var(--bb-line);
  }
  .st-avatar {
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg, var(--bb-coral), var(--bb-rose));
    color: #fff; font-size: 0.78rem; font-weight: 900;
    display: grid; place-items: center; flex-shrink: 0;
  }
  .st-avatar-lg {
    width: 64px; height: 64px; border-radius: 18px;
    background: linear-gradient(135deg, var(--bb-coral), var(--bb-rose));
    color: #fff; font-size: 1.1rem; font-weight: 900;
    display: grid; place-items: center; flex-shrink: 0;
    box-shadow: 0 6px 20px rgba(207,95,145,0.28);
  }
  .st-avatar-sm {
    width: 38px; height: 38px; border-radius: 10px;
    color: #fff; font-size: 0.78rem; font-weight: 900;
    display: grid; place-items: center; flex-shrink: 0;
  }

  /* ── Content panel ── */
  .st-content {
    background: #fff;
    border-radius: 20px;
    border: 1px solid var(--bb-line);
    box-shadow: 0 2px 20px rgba(51,39,35,0.05);
    overflow: visible;
  }
  .st-content-header {
    display: flex; align-items: center; gap: 12px;
    padding: 20px 24px;
    border-bottom: 1px solid var(--bb-line);
    border-radius: 20px 20px 0 0;
    background: linear-gradient(135deg, rgba(255,247,244,0.6), rgba(255,251,248,0.8));
  }
  .st-content-title { margin: 0; font-size: 1.05rem; font-weight: 900; color: var(--bb-ink); }
  .st-content-desc  { margin: 2px 0 0; font-size: 0.76rem; color: var(--bb-muted); }

  /* ── Sections ── */
  .st-section {
    background: #fafafa;
    border: 1px solid var(--bb-line);
    border-radius: 14px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .st-section-title {
    margin: 0;
    font-size: 0.72rem; font-weight: 900;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--bb-muted);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--bb-line);
  }

  /* ── Form ── */
  .st-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 600px) { .st-grid-2 { grid-template-columns: 1fr; } }
  .st-field { display: grid; gap: 6px; }
  .st-label { font-size: 0.74rem; font-weight: 800; color: var(--bb-muted); letter-spacing: 0.04em; }
  .st-input {
    border: 1.5px solid var(--bb-line);
    border-radius: 10px;
    padding: 10px 13px;
    color: var(--bb-ink);
    outline: none;
    background: #fff;
    font-size: 0.9rem;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.16s, box-shadow 0.16s;
    font-family: inherit;
  }
  .st-input:focus { border-color: rgba(207,95,145,0.5); box-shadow: 0 0 0 3px rgba(207,95,145,0.1); }
  .st-input-icon-wrap { position: relative; }
  .st-input-icon {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    color: var(--bb-muted); pointer-events: none;
  }
  .st-input-padded { padding-left: 34px; }

  /* ── Save bar ── */
  .st-save-bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap;
    padding: 14px 18px;
    border-radius: 14px;
    background: rgba(255,247,244,0.7);
    border: 1.5px solid rgba(207,95,145,0.18);
    opacity: 0;
    transform: translateY(6px);
    pointer-events: none;
    transition: all 0.22s;
  }
  .st-save-bar.is-visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  /* ── Toggles ── */
  .st-toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; padding: 10px 0;
    border-bottom: 1px solid rgba(0,0,0,0.04);
  }
  .st-toggle-row:last-child { border-bottom: 0; padding-bottom: 0; }
  .st-toggle-label { display: block; font-size: 0.86rem; font-weight: 700; color: var(--bb-ink); }
  .st-toggle-desc   { font-size: 0.74rem; color: var(--bb-muted); }
  .st-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; cursor: pointer; }
  .st-switch input { opacity: 0; width: 0; height: 0; }
  .st-switch-track {
    position: absolute; inset: 0; border-radius: 999px;
    background: #e2e8f0; transition: background 0.18s;
  }
  .st-switch-track::after {
    content: ''; position: absolute;
    width: 16px; height: 16px; left: 3px; top: 3px;
    border-radius: 50%; background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.18);
    transition: transform 0.18s;
  }
  .st-switch input:checked + .st-switch-track { background: var(--bb-rose); }
  .st-switch input:checked + .st-switch-track::after { transform: translateX(18px); }

  /* ── Buttons ── */
  .st-btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; border-radius: 11px; border: none;
    background: linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet));
    color: #fff; font-size: 0.86rem; font-weight: 800; cursor: pointer;
    transition: all 0.17s; box-shadow: 0 3px 12px rgba(207,95,145,0.25);
    font-family: inherit;
  }
  .st-btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 5px 18px rgba(207,95,145,0.32); }
  .st-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .st-btn-primary.is-saved { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 3px 12px rgba(16,185,129,0.25); }
  .st-btn-primary.is-error { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 3px 12px rgba(239,68,68,0.25); }
  .st-btn-outline {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 18px; border-radius: 11px;
    border: 1.5px solid var(--bb-line); background: #fff;
    color: var(--bb-ink); font-size: 0.86rem; font-weight: 700; cursor: pointer;
    transition: all 0.17s; font-family: inherit;
  }
  .st-btn-outline:hover:not(:disabled) { border-color: var(--bb-rose); color: var(--bb-rose); }
  .st-btn-outline:disabled { opacity: 0.55; cursor: not-allowed; }
  .st-icon-btn {
    width: 28px; height: 28px; border-radius: 7px;
    border: 1px solid var(--bb-line); background: #fff;
    color: var(--bb-muted); display: grid; place-items: center;
    cursor: pointer; transition: all 0.15s;
  }
  .st-icon-btn:hover { border-color: var(--bb-rose); color: var(--bb-rose); }

  /* ── API rows ── */
  .st-api-row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 12px;
    border: 1px solid var(--bb-line); background: #fff;
    transition: box-shadow 0.15s, border-color 0.15s;
  }
  .st-api-row:hover { border-color: rgba(207,95,145,0.25); box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
  .st-api-icon { font-size: 1.4rem; flex-shrink: 0; }
  .st-key-code {
    font-size: 0.74rem; color: var(--bb-muted);
    background: rgba(0,0,0,0.04); padding: 4px 8px;
    border-radius: 6px; letter-spacing: 0.04em;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }
  .st-config-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px; border-radius: 10px;
    border: 1px solid rgba(0,0,0,0.04); background: #fff;
  }

  /* ── Alert ── */
  .st-alert {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 11px;
    background: rgba(16,185,129,0.07);
    border: 1px solid rgba(16,185,129,0.2);
    color: #065f46; font-size: 0.82rem; font-weight: 600;
  }

  /* ── Badges ── */
  .st-badge-green {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 999px;
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.2);
    color: #065f46; font-size: 0.68rem; font-weight: 800;
    white-space: nowrap;
  }

  /* ── Team ── */
  .st-member-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(0,0,0,0.04);
  }
  .st-member-row:last-child { border-bottom: 0; }
  .st-invite-card {
    display: flex; align-items: center; gap: 14px;
    padding: 18px 20px; border-radius: 14px;
    border: 1.5px dashed rgba(207,95,145,0.28);
    background: rgba(255,247,244,0.5);
    flex-wrap: wrap;
  }

  /* ── Billing ── */
  .st-plan-card {
    padding: 22px 24px; border-radius: 16px;
    background: linear-gradient(135deg, rgba(255,247,244,0.9), rgba(255,251,248,1));
    border: 1.5px solid rgba(207,95,145,0.22);
    box-shadow: 0 4px 20px rgba(207,95,145,0.08);
  }
  .st-payment-row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 12px;
    border: 1px solid var(--bb-line); background: #fff;
  }

  /* ── Spin ── */
  @keyframes st-spin { to { transform: rotate(360deg); } }
  .st-spin { animation: st-spin 0.8s linear infinite; }
`
