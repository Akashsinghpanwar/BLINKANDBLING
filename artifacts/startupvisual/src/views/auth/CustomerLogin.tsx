import { useState } from 'react'
import { useLocation } from 'wouter'
import { ArrowRight, KeyRound } from 'lucide-react'
import { loginWithCustomerCode } from '../../lib/auth'
import SplitAuthLayout from '../../components/SplitAuthLayout'
import { photos } from '../../lib/photos'

export default function CustomerLogin() {
  const [, navigate] = useLocation()
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await loginWithCustomerCode(accessCode.trim().toUpperCase())
      navigate('/portal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid access code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SplitAuthLayout side="left" photo={photos.diamondNeck} eyebrow="Customer approval">
      <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-1)' }}>Customer Portal</span>
      <h1 className="bb-display" style={{ margin: '14px 0 14px', fontSize: 'clamp(2rem, 3.6vw, 2.6rem)' }}>
        Enter your access code.
      </h1>
      <p style={{ margin: '0 0 18px', color: 'var(--bb-muted)', lineHeight: 1.55 }}>
        Use the code shared by your jeweller to open your workspace.
      </p>

      <form onSubmit={onLogin} style={{ display: 'grid', gap: 16 }}>
        <label style={{ display: 'grid', gap: 7 }}>
          <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.04em' }}>Access code</span>
          <div style={{ position: 'relative' }}>
            <KeyRound size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--bb-muted)' }} />
            <input
              value={accessCode}
              onChange={e => setAccessCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              type="text"
              placeholder="AKASH001456"
              required
              autoFocus
              style={{
                width: '100%',
                border: '1px solid var(--bb-line)',
                borderRadius: 10,
                background: '#fdfcfa',
                color: 'var(--bb-ink)',
                padding: '14px 14px 14px 44px',
                outline: 'none',
                letterSpacing: '0.08em',
                fontWeight: 800,
                textTransform: 'uppercase',
              }}
            />
          </div>
        </label>

        {error && <div style={{ color: '#b03a3a', background: '#fdecec', padding: '10px 12px', borderRadius: 10, fontSize: '0.9rem' }}>{error}</div>}

        <button type="submit" className="bb-btn-primary bb-lift" disabled={isLoading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          <span>{isLoading ? 'Opening portal...' : 'Open customer portal'}</span>
          {!isLoading && <ArrowRight size={17} />}
        </button>
      </form>
    </SplitAuthLayout>
  )
}
