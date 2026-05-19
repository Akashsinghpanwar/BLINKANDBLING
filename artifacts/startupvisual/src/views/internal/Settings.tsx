import { useState } from 'react'
import { BadgeCheck, CreditCard, KeyRound, UserRound, Users } from 'lucide-react'

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'api', label: 'API Keys', icon: KeyRound },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

const API_KEYS = [
  { name: 'ElevenLabs', status: 'configured', masked: 'sk_1870...e7f' },
  { name: 'OpenRouter', status: 'configured', masked: 'sk-or-v1...bd9c' },
  { name: 'TripoAI', status: 'configured', masked: 'tsk_23...n1O' },
  { name: 'Supabase', status: 'configured', masked: 'eyJ...xkYQ' },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState({ name: 'Akash', email: 'akash@blinkbling.com', company: 'Blink & Bling Jewelers', role: 'Designer' })

  return (
    <div className="bb-page animate-fade-up">
      <header className="bb-page-header">
        <div>
          <span className="bb-eyebrow">Settings</span>
          <h1>Workspace settings.</h1>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
        <aside style={{ display: 'grid', gap: 6 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 8,
                border: `1px solid ${activeTab === tab.id ? '#e5c6bd' : 'transparent'}`,
                background: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? 'var(--bb-ink)' : 'var(--bb-muted)',
                fontWeight: 750, fontSize: '0.9rem', cursor: 'pointer',
                boxShadow: activeTab === tab.id ? 'var(--bb-soft-shadow)' : 'none',
              }}>
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="bb-card" style={{ padding: 28 }}>
          {activeTab === 'profile' && (
            <>
              <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Profile</span>
              <h2 style={{ margin: '0 0 24px', color: 'var(--bb-ink)', fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.8rem' }}>Profile Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {(Object.keys(profile) as (keyof typeof profile)[]).map(k => (
                  <label key={k} style={{ display: 'grid', gap: 7 }}>
                    <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem', fontWeight: 700, textTransform: 'capitalize' }}>{k === 'email' ? 'Email Address' : k.charAt(0).toUpperCase() + k.slice(1)}</span>
                    <input value={profile[k]} onChange={e => setProfile(prev => ({ ...prev, [k]: e.target.value }))}
                      type={k === 'email' ? 'email' : 'text'}
                      style={{ border: '1px solid var(--bb-line)', borderRadius: 8, padding: '11px 13px', color: 'var(--bb-ink)', outline: 'none', background: '#fff' }} />
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="bb-btn-primary">Save Changes</button>
                <button className="bb-btn-secondary">Cancel</button>
              </div>
            </>
          )}

          {activeTab === 'api' && (
            <>
              <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Integrations</span>
              <h2 style={{ margin: '0 0 24px', color: 'var(--bb-ink)', fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.8rem' }}>API Integrations</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {API_KEYS.map(api => (
                  <div key={api.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid var(--bb-line)', borderRadius: 8 }}>
                    <div>
                      <strong style={{ color: 'var(--bb-ink)', display: 'block' }}>{api.name}</strong>
                      <code style={{ color: 'var(--bb-muted)', fontSize: '0.8rem' }}>{api.masked}</code>
                    </div>
                    <span className="bb-badge"><BadgeCheck size={14} /> {api.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'team' && (
            <>
              <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Team</span>
              <h2 style={{ margin: '0 0 12px', color: 'var(--bb-ink)', fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.8rem' }}>Team Members</h2>
            </>
          )}

          {activeTab === 'billing' && (
            <>
              <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 6 }}>Billing</span>
              <h2 style={{ margin: '0 0 18px', color: 'var(--bb-ink)', fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '1.8rem' }}>Current Plan</h2>
              <div style={{ padding: 20, borderRadius: 12, background: 'linear-gradient(135deg, rgba(227,141,90,0.08), rgba(207,95,145,0.08))', border: '1px solid #f0dbd5', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ color: 'var(--bb-ink)', fontSize: '1.2rem' }}>Studio Plan</strong>
                  <span style={{ fontWeight: 800, color: 'var(--bb-rose)', fontSize: '1.5rem' }}>£49<small style={{ fontSize: '0.9rem', fontWeight: 400 }}>/mo</small></span>
                </div>
              </div>
              <button className="bb-btn-secondary">Manage subscription</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
