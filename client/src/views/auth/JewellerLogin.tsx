import { useState } from 'react'
import { useLocation, Link } from 'wouter'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { login as apiLogin, resetPasswordDirect } from '../../lib/auth'
import SplitAuthLayout from '../../components/SplitAuthLayout'
import { photos } from '../../lib/photos'

type Mode = 'login' | 'reset'

export default function JewellerLogin() {
  const [, navigate] = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await apiLogin({ email, password, expectedRole: 'jeweller' })
      navigate('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await resetPasswordDirect({ email, password: newPassword, expectedRole: 'jeweller' })
      navigate('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SplitAuthLayout
      side="right"
      photo={photos.workshop}
      eyebrow="The bench"
    >
      <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-2)' }}>Jeweller workspace</span>
      <h1 className="bb-display" style={{ margin: '14px 0 14px', fontSize: 'clamp(2rem, 3.6vw, 2.6rem)' }}>
        {mode === 'login' ? 'Welcome back.' : 'Reset your password.'}
      </h1>

      <form onSubmit={mode === 'login' ? onLogin : onReset} style={{ display: 'grid', gap: 16 }}>
        {mode === 'login' ? (
          <>
            <Field label="Email address" value={email} onChange={setEmail} placeholder="you@studio.com" type="email" />
            <PasswordField label="Password" value={password} onChange={setPassword} show={showPassword} toggle={() => setShowPassword(s => !s)} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--bb-muted)', fontSize: '0.84rem', fontWeight: 600 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" /> Remember me
              </label>
              <button type="button" onClick={() => setMode('reset')} style={{ color: 'var(--bb-rose)', textDecoration: 'none', background: 'transparent', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Forgot password?</button>
            </div>
          </>
        ) : (
          <>
            <Field label="Email address" value={email} onChange={setEmail} placeholder="you@studio.com" type="email" />
            <PasswordField label="New password" value={newPassword} onChange={setNewPassword} show={showPassword} toggle={() => setShowPassword(s => !s)} />
          </>
        )}

        {error && <ErrorBox>{error}</ErrorBox>}

        <button type="submit" className="bb-btn-primary bb-lift" disabled={isLoading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          <span>{isLoading ? 'Please wait...' : mode === 'login' ? 'Sign in to workspace' : 'Reset password'}</span>
          {!isLoading && <ArrowRight size={17} />}
        </button>

        {mode !== 'login' && (
          <button type="button" onClick={() => { setMode('login'); setError(null) }}
            style={{ background: 'transparent', border: 'none', color: 'var(--bb-rose)', fontWeight: 700, cursor: 'pointer' }}>
            Back to sign in
          </button>
        )}

        <p style={{ color: 'var(--bb-muted)', fontSize: '0.86rem', textAlign: 'center', marginTop: 8 }}>
          New to Blink &amp; Bling?{' '}
          <Link href="/jeweller/signup" className="bb-no-underline" style={{ color: 'var(--bb-rose)', fontWeight: 700 }}>
            Create a studio account
          </Link>
        </p>
      </form>
    </SplitAuthLayout>
  )
}

function Field({ label, value, onChange, placeholder, type }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type: string
}) {
  return (
    <label style={{ display: 'grid', gap: 7 }}>
      <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder} required
        style={{ width: '100%', border: '1px solid var(--bb-line)', borderRadius: 10, background: '#fdfcfa', color: 'var(--bb-ink)', padding: '13px 14px', outline: 'none' }} />
    </label>
  )
}

function PasswordField({ label, value, onChange, show, toggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void
}) {
  return (
    <label style={{ display: 'grid', gap: 7 }}>
      <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <input value={value} onChange={e => onChange(e.target.value)} type={show ? 'text' : 'password'} placeholder={label} required
          style={{ width: '100%', border: '1px solid var(--bb-line)', borderRadius: 10, background: '#fdfcfa', color: 'var(--bb-ink)', padding: '13px 44px 13px 14px', outline: 'none' }} />
        <button type="button" onClick={toggle} aria-label={show ? 'Hide password' : 'Show password'}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--bb-muted)', cursor: 'pointer', padding: 6, display: 'flex' }}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#b03a3a', background: '#fdecec', padding: '10px 12px', borderRadius: 10, fontSize: '0.9rem' }}>{children}</div>
}
