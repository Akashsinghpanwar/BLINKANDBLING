import { useState } from 'react'
import { useLocation, Link } from 'wouter'
import { ArrowRight } from 'lucide-react'
import { signup } from '../../lib/auth'
import SplitAuthLayout from '../../components/SplitAuthLayout'
import { photos } from '../../lib/photos'

export default function CustomerSignup() {
  const [, navigate] = useLocation()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await signup({ fullName, email, password, role: 'customer' })
      navigate('/portal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SplitAuthLayout
      side="left"
      photo={photos.earringsPair}
      eyebrow="Your custom piece"
    >
      <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-2)' }}>Create your account</span>
      <h1 className="bb-display" style={{ margin: '14px 0 14px', fontSize: 'clamp(2rem, 3.6vw, 2.6rem)' }}>
        Start your piece.
      </h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
        <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Jane Smith" type="text" />
        <Field label="Email address" value={email} onChange={setEmail} placeholder="your@email.com" type="email" />
        <Field label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" type="password" />

        {error && <ErrorBox>{error}</ErrorBox>}

        <button type="submit" className="bb-btn-primary bb-lift" disabled={isLoading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
          <span>{isLoading ? 'Creating account...' : 'Create account'}</span>
          {!isLoading && <ArrowRight size={17} />}
        </button>

        <p style={{ color: 'var(--bb-muted)', fontSize: '0.86rem', textAlign: 'center', marginTop: 8 }}>
          Already have an account?{' '}
          <Link href="/customer/login" className="bb-no-underline" style={{ color: 'var(--bb-rose)', fontWeight: 700 }}>
            Sign in
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

function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#b03a3a', background: '#fdecec', padding: '10px 12px', borderRadius: 10, fontSize: '0.9rem' }}>{children}</div>
}
