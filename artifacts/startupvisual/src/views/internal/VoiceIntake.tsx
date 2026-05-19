import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, MicOff, Send, Sparkles, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useProjects } from '../../context/ProjectContext'
import LunaVoiceOrb from '../../components/LunaVoiceOrb'

interface Message { role: 'user' | 'assistant'; content: string }

type LunaState = 'idle' | 'listening' | 'thinking' | 'speaking'

const PROMPTS = [
  'It\'s for an engagement',
  'Anniversary, 10 years',
  'Vintage halo, cushion stone',
  'Modern, minimal band',
]

export default function VoiceIntake() {
  const { showToast } = useApp()
  const { setIntakeDNA } = useProjects()
  const [state, setState] = useState<LunaState>('idle')
  const [transcript, setTranscript] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const transcriptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
  }, [transcript])

  const startSession = async () => {
    setState('thinking')
    try { await fetch('/api/voice/signed-url').catch(() => null) } catch {}
    setTimeout(() => {
      setState('speaking')
      setChatOpen(true)
      setTranscript([{
        role: 'assistant',
        content: "Hi, I'm Luna. Tell me about the piece you have in mind — the occasion, who it's for, and any styles you love.",
      }])
      showToast('Luna is listening', 'success')
      setTimeout(() => setState('listening'), 2400)
    }, 600)
  }

  const endSession = () => {
    setState('idle')
    setChatOpen(false)
    const userText = transcript.filter(m => m.role === 'user').map(m => m.content).join(' ')
    if (userText) {
      const lower = userText.toLowerCase()
      setIntakeDNA({
        customer: 'New client',
        occasion: lower.includes('engagement') ? 'Engagement' : lower.includes('anniversary') ? 'Anniversary' : 'Custom piece',
        style: lower.includes('vintage') ? 'Vintage' : lower.includes('modern') ? 'Modern' : lower.includes('art deco') ? 'Art Deco' : 'Minimalist',
        stone: lower.includes('emerald') ? 'Emerald' : lower.includes('sapphire') ? 'Sapphire' : 'Diamond',
        metal: lower.includes('platinum') ? 'Platinum' : lower.includes('yellow') ? '18K Yellow Gold' : '18K White Gold',
        notes: userText,
        capturedAt: new Date().toISOString(),
      })
      showToast('Design DNA captured — sent to bench', 'success')
    } else {
      showToast('Session ended', 'success')
    }
  }

  const sendMessage = (text?: string) => {
    const t = (text ?? draft).trim()
    if (!t) return
    setTranscript(prev => [...prev, { role: 'user', content: t }])
    setDraft('')
    setState('thinking')
    setTimeout(() => {
      setState('speaking')
      setTranscript(prev => [...prev, { role: 'assistant', content: "Lovely. Tell me about the metal and stone you'd like, and any references that inspire you." }])
      setTimeout(() => setState('listening'), 2400)
    }, 800)
  }

  return (
    <div className="bb-page" data-testid="voice-intake" style={{
      minHeight: 'calc(100vh - 120px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 'clamp(22px, 4vh, 44px)', overflow: 'hidden',
    }}>
      {/* ambient backdrop */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background:
          'radial-gradient(circle at 50% 32%, rgba(207,95,145,0.18), transparent 45%),' +
          'radial-gradient(circle at 10% 90%, rgba(63,136,116,0.16), transparent 45%),' +
          'radial-gradient(circle at 90% 92%, rgba(139,107,181,0.16), transparent 45%)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}
      >
        <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-1)' }}>Voice intake</span>
        <h1 className="bb-display" style={{
          margin: '12px 0 6px', fontSize: 'clamp(2.2rem, 5vw, 4rem)', lineHeight: 1.05,
        }}>
          Meet{' '}
          <span style={{
            fontFamily: "'Pinyon Script', cursive",
            color: 'var(--bb-rose)',
            fontSize: '1.18em',
            display: 'inline-block',
            paddingBottom: '0.06em',
            lineHeight: 1,
          }}>
            Luna
          </span>
          <span>.</span>
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 0.9, 0.32, 1] }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <LunaVoiceOrb
          state={state}
          size={260}
          onClick={state === 'idle' ? startSession : undefined}
          testId="intake-orb"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.2 }}
        style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}
      >
        {state === 'idle' ? (
          <button
            data-testid="intake-start-btn"
            className="bb-btn-primary bb-lift"
            onClick={startSession}
            style={{ padding: '14px 28px', fontSize: '1rem' }}
          >
            <Mic size={17} /> Start conversation
          </button>
        ) : (
          <button
            data-testid="intake-end-btn"
            className="bb-btn-secondary bb-lift"
            onClick={endSession}
            style={{ padding: '11px 22px' }}
          >
            <MicOff size={15} /> End session
          </button>
        )}

        {state !== 'idle' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 600 }}>
            {PROMPTS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                style={{
                  padding: '8px 14px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid var(--bb-line)',
                  color: 'var(--bb-text)',
                  fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  backdropFilter: 'blur(12px)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, background 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.borderColor = '#e5c6bd'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = 'var(--bb-line)'
                }}
              >
                <Sparkles size={12} style={{ color: 'var(--bb-rose)' }} />
                {s}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="transcript"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 0.9, 0.32, 1] }}
            style={{
              position: 'relative', zIndex: 1,
              width: 'min(680px, 100%)',
              borderRadius: 22, overflow: 'hidden',
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(22px) saturate(1.2)',
              border: '1px solid var(--bb-line)',
              boxShadow: '0 30px 70px rgba(51,39,35,0.14)',
            }}
          >
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--bb-line)',
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.4)',
            }}>
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--bb-pillar-1)',
                  boxShadow: '0 0 8px var(--bb-pillar-1)',
                }}
              />
              <strong style={{ color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>Luna</strong>
              <span style={{
                color: 'var(--bb-muted)', fontSize: '0.74rem',
                textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700,
              }}>{state}</span>
              <button
                onClick={() => setChatOpen(false)}
                style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: 'var(--bb-muted)', cursor: 'pointer', display: 'flex', padding: 6 }}
                aria-label="Collapse"
              >
                <X size={16} />
              </button>
            </div>
            <div
              ref={transcriptRef}
              style={{
                maxHeight: 'min(46vh, 420px)', overflowY: 'auto',
                padding: '18px 20px',
                display: 'grid', gap: 12, alignContent: 'start',
              }}
            >
              {transcript.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32 }}
                  style={{
                    padding: '12px 16px', borderRadius: 16, maxWidth: '85%',
                    alignSelf: msg.role === 'user' ? 'end' : 'start',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))'
                      : 'rgba(255,255,255,0.86)',
                    color: msg.role === 'user' ? '#fff' : 'var(--bb-text)',
                    fontSize: '0.94rem', lineHeight: 1.5,
                    border: msg.role === 'user' ? '0' : '1px solid var(--bb-line)',
                    boxShadow: msg.role === 'user'
                      ? '0 12px 24px rgba(207,95,145,0.22)'
                      : '0 8px 18px rgba(51,39,35,0.06)',
                  }}
                >{msg.content}</motion.div>
              ))}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid var(--bb-line)', display: 'flex', gap: 8, background: 'rgba(255,255,255,0.5)' }}>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type or speak to Luna…"
                style={{ flex: 1, border: '1px solid var(--bb-line)', borderRadius: 999, padding: '11px 18px', background: '#fff', outline: 'none', fontSize: '0.92rem' }}
              />
              <button
                onClick={() => sendMessage()}
                className="bb-btn-primary"
                aria-label="Send"
                style={{ padding: '10px 16px', minHeight: 'auto' }}
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
