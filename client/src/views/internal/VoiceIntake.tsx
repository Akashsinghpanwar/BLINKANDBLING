import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, MicOff, Send, Sparkles, X } from 'lucide-react'
import { Conversation, type Conversation as ElevenConversation } from '@elevenlabs/client'
import { useApp } from '../../context/AppContext'
import { useProjects } from '../../context/ProjectContext'
import LunaVoiceOrb from '../../components/LunaVoiceOrb'

interface Message { role: 'user' | 'assistant'; content: string; ts?: number }

type LunaState = 'idle' | 'listening' | 'thinking' | 'speaking'

const PROMPTS = [
  "It's for an engagement",
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
  const [lastError, setLastError] = useState('')
  const [isMicError, setIsMicError] = useState(false)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const conversationRef = useRef<ElevenConversation | null>(null)
  const manualEndingRef = useRef(false)
  const connectedAtRef = useRef(0)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (transcriptRef.current)
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
  }, [transcript])

  // Clean up on unmount
  useEffect(() => () => {
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current)
    const c = conversationRef.current
    if (c) void c.endSession()
  }, [])

  const appendMessage = (message: Message) => {
    const content = message.content.trim()
    if (!content) return
    setTranscript(prev => {
      const last = prev[prev.length - 1]
      if (
        last?.role === message.role &&
        last.content.trim() === content &&
        Date.now() - (last.ts ?? 0) < 3500
      ) return prev
      return [...prev, { ...message, content }]
    })
  }

  const createCallbacks = () => ({
    onConnect: ({ conversationId }: { conversationId?: string } = {}) => {
      connectedAtRef.current = Date.now()
      setState('listening')
      setLastError('')
      setIsMicError(false)
      setChatOpen(true)
      setTranscript([{
        role: 'assistant',
        content: "Hi, I'm Luna. Tell me about the piece you have in mind — the occasion, who it's for, and any styles you love.",
        ts: Date.now(),
      }])
      console.info('Luna connected', conversationId)
      showToast('Luna is connected', 'success')
    },

    onDisconnect: (details: unknown) => {
      conversationRef.current = null
      if (manualEndingRef.current) {
        manualEndingRef.current = false
        setState('idle')
        return
      }
      console.warn('Luna disconnected', details)
      const connectedFor = Date.now() - connectedAtRef.current
      // < 2 s = server rejection, don't retry — it will loop
      const canRetry = connectedFor > 2000 && connectedFor < 30000 && reconnectAttemptsRef.current < 2
      if (canRetry) {
        reconnectAttemptsRef.current += 1
        setState('thinking')
        showToast('Luna reconnecting…', 'success')
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null
          void startLiveSession(true)
        }, 900)
        return
      }
      setState('idle')
      showToast('Luna disconnected. Tap to reconnect.', 'error')
    },

    onStatusChange: ({ status }: { status: string }) => {
      if (status === 'connecting' || status === 'disconnecting') setState('thinking')
      if (status === 'disconnected') setState('idle')
    },

    onModeChange: ({ mode }: { mode: string }) => {
      setState(mode === 'speaking' ? 'speaking' : 'listening')
    },

    onMessage: (event: { source?: string; role?: string; message?: string }) => {
      const content = event.message?.trim()
      if (!content) return
      appendMessage({
        role: event.source === 'user' || event.role === 'user' ? 'user' : 'assistant',
        content,
        ts: Date.now(),
      })
    },

    onError: (error: unknown) => {
      console.error('Luna error', error)
      const message = typeof error === 'string' ? error : 'Luna connection error'
      setLastError(message)
      showToast(message, 'error')
      setState('idle')
    },
  })

  const lunaDynamicVariables = () => ({
    brand_name: 'Blink & Bling',
    brand_positioning: 'jewellery design studio',
    primary_language: 'English',
    secondary_language_style: 'Hinglish',
    tone_style: 'warm, natural, helpful',
    currency: 'GBP',
    customer_name: 'New client',
    project_name: 'custom jewellery piece',
  })

  const startElevenLabsSession = async () => {
    const callbacks = createCallbacks()
    const dynamicVariables = lunaDynamicVariables()

    // Prefer signed WebSocket voice sessions. The current ElevenLabs LiveKit
    // WebRTC path can connect, then drop during negotiation before fallback runs.
    const signedResponse = await fetch('/api/voice/signed-url', { cache: 'no-store' })
    const signedData = (await signedResponse.json().catch(() => ({}))) as { signedUrl?: unknown; error?: string }
    let signedFailure = signedData.error ?? 'Signed URL request failed'

    if (signedResponse.ok && typeof signedData.signedUrl === 'string' && signedData.signedUrl) {
      try {
        return await Conversation.startSession({
          signedUrl: signedData.signedUrl,
          connectionType: 'websocket',
          textOnly: false,
          useWakeLock: false,
          dynamicVariables,
          connectionDelay: { default: 250 },
          ...callbacks,
        })
      } catch (err) {
        signedFailure = err instanceof Error ? err.message : String(err)
        console.warn('Luna WebSocket failed, trying WebRTC', err)
      }
    }

    // Fall back to WebRTC only if WebSocket cannot start.
    const tokenResponse = await fetch('/api/voice/conversation-token', { cache: 'no-store' })
    const tokenData = (await tokenResponse.json().catch(() => ({}))) as { token?: unknown; error?: string }

    if (tokenResponse.ok && typeof tokenData.token === 'string' && tokenData.token) {
      try {
        return await Conversation.startSession({
          conversationToken: tokenData.token,
          connectionType: 'webrtc',
          textOnly: false,
          useWakeLock: false,
          dynamicVariables,
          connectionDelay: { default: 250 },
          ...callbacks,
        })
      } catch (err) {
        const tokenFailure = err instanceof Error ? err.message : String(err)
        throw new Error(`Voice connection failed: ${tokenFailure || signedFailure}`)
      }
    }

    throw new Error(tokenData.error ?? signedFailure ?? 'Unable to start Luna')
  }

  const startLiveSession = async (isRetry = false) => {
    if (conversationRef.current) return
    if (!isRetry) reconnectAttemptsRef.current = 0
    setState('thinking')

    // Unlock AudioContext during user gesture so browser allows playback later
    try {
      const ctx = new AudioContext()
      await ctx.resume()
      void ctx.close()
    } catch { /* best effort */ }

    try {
      manualEndingRef.current = false
      const conversation = await startElevenLabsSession()
      conversation.setVolume({ volume: 1.0 })
      conversationRef.current = conversation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start Luna'
      console.error('Luna failed', err)
      conversationRef.current = null
      const isMicDenied =
        message.toLowerCase().includes('permission') ||
        message.toLowerCase().includes('denied') ||
        message.toLowerCase().includes('notallowed')
      setIsMicError(isMicDenied)
      setLastError(isMicDenied ? 'mic' : message)
      showToast(isMicDenied ? 'Microphone access needed' : 'Luna could not connect', 'error')
      setState('idle')
    }
  }

  const endLiveSession = async () => {
    const conversation = conversationRef.current
    manualEndingRef.current = true
    reconnectAttemptsRef.current = 0
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    conversationRef.current = null
    setState('idle')

    const userText = transcript.filter(m => m.role === 'user').map(m => m.content).join(' ')
    setChatOpen(false)

    try {
      if (conversation) await conversation.endSession()
    } catch (err) {
      console.error('Unable to end session', err)
    }

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
    if (conversationRef.current) {
      appendMessage({ role: 'user', content: t, ts: Date.now() })
      setDraft('')
      try { conversationRef.current.sendUserMessage(t) } catch (err) {
        console.error('Send failed', err)
        showToast('Message failed', 'error')
      }
    } else {
      appendMessage({ role: 'user', content: t, ts: Date.now() })
      setDraft('')
    }
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
          onClick={state === 'idle' ? () => void startLiveSession() : undefined}
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
            onClick={() => void startLiveSession()}
            style={{ padding: '14px 28px', fontSize: '1rem' }}
          >
            <Mic size={17} /> Start conversation
          </button>
        ) : (
          <button
            data-testid="intake-end-btn"
            className="bb-btn-secondary bb-lift"
            onClick={endLiveSession}
            style={{ padding: '11px 22px' }}
          >
            <MicOff size={15} /> End session
          </button>
        )}

        {/* Error / mic permission banner */}
        {lastError && (
          isMicError ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              style={{
                width: 'min(520px, 92vw)', borderRadius: 18,
                border: '1px solid rgba(207,95,145,0.28)',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(16px)',
                padding: '20px 22px', display: 'grid', gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(207,95,145,0.12)',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <MicOff size={17} style={{ color: 'var(--bb-rose)' }} />
                </span>
                <div>
                  <strong style={{ fontSize: '0.94rem', color: 'var(--bb-ink)', display: 'block' }}>
                    Microphone access needed
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--bb-muted)' }}>
                    Luna needs your mic to talk. Follow the steps for your browser:
                  </span>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { label: 'Chrome / Edge', steps: 'Click the 🔒 lock icon in the address bar → Permissions → Microphone → Allow' },
                  { label: 'Firefox', steps: 'Click the 🔒 lock icon → Permissions → Use the microphone → Allow' },
                  { label: 'Safari', steps: 'Safari menu → Settings for This Website → Microphone → Allow' },
                ].map(({ label, steps }) => (
                  <div key={label} style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(244,223,226,0.35)',
                    border: '1px solid rgba(207,95,145,0.14)',
                  }}>
                    <strong style={{ fontSize: '0.78rem', color: 'var(--bb-rose)', display: 'block', marginBottom: 3 }}>{label}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--bb-text)', lineHeight: 1.5 }}>{steps}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="bb-btn-primary bb-lift"
                onClick={() => { setLastError(''); setIsMicError(false); void startLiveSession() }}
                style={{ justifyContent: 'center', padding: '11px 20px', fontSize: '0.88rem' }}
              >
                <Mic size={14} /> Try again
              </button>
            </motion.div>
          ) : (
            <div style={{
              maxWidth: 480, padding: '10px 16px', borderRadius: 12,
              border: '1px solid rgba(207,95,145,0.18)',
              background: 'rgba(255,255,255,0.78)',
              color: 'var(--bb-muted)', fontSize: '0.82rem', lineHeight: 1.5,
              textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <span>{lastError}</span>
              <button
                type="button"
                className="bb-btn-secondary"
                onClick={() => { setLastError(''); setIsMicError(false); void startLiveSession() }}
                style={{ justifyContent: 'center', minHeight: 34, padding: '8px 16px' }}
              >
                <Mic size={14} /> Try again
              </button>
            </div>
          )
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
                  e.currentTarget.style.background = 'rgba(255,255,255,0.95)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = 'var(--bb-line)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.8)'
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
              {state === 'thinking' && <TypingBubble />}
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

function TypingBubble() {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 16,
      alignSelf: 'start', maxWidth: '40%',
      background: 'rgba(255,255,255,0.86)',
      border: '1px solid var(--bb-line)',
      display: 'inline-flex', gap: 6, alignItems: 'center',
    }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 }}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--bb-rose)', display: 'inline-block',
          }}
        />
      ))}
    </div>
  )
}
