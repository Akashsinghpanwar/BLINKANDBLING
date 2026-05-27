import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Conversation, type Conversation as ElevenConversation } from '@elevenlabs/client'
import { ArrowRight, Mic, MicOff, Send, Sparkles, X } from 'lucide-react'
import { useLocation } from 'wouter'
import { useApp } from '../../context/AppContext'
import LunaPulseOrb from '../../components/LunaPulseOrb'
import { useProjects, type IntakeDNA } from '../../context/ProjectContext'

interface Message { role: 'user' | 'assistant'; content: string; ts?: number }

type LunaState = 'idle' | 'listening' | 'thinking' | 'speaking'

const SUGGESTIONS = [
  'I love vintage cushion cuts',
  'Yellow gold with hidden halo',
  'Something timeless yet bold',
  'Anniversary band ideas',
]

/** Extract structured IntakeDNA from a raw conversation transcript */
function extractIntakeDNA(messages: Message[], customerName: string): IntakeDNA {
  const userLines = messages.filter(m => m.role === 'user').map(m => m.content)
  const combined = userLines.join(' ').toLowerCase()

  const notes = userLines.join('. ').trim()

  const occasion =
    /anniversary/.test(combined) ? 'Anniversary' :
    /engagement|propose|proposal/.test(combined) ? 'Engagement' :
    /wedding/.test(combined) ? 'Wedding' :
    /birthday/.test(combined) ? 'Birthday' :
    /gift/.test(combined) ? 'Gift' : undefined

  const style =
    /vintage|antique/.test(combined) ? 'Vintage' :
    /modern|contemporary|minimal/.test(combined) ? 'Modern' :
    /bold|statement/.test(combined) ? 'Statement' :
    /timeless|classic/.test(combined) ? 'Classic' : undefined

  const stone =
    /diamond/.test(combined) ? 'Diamond' :
    /sapphire/.test(combined) ? 'Sapphire' :
    /emerald/.test(combined) ? 'Emerald' :
    /ruby/.test(combined) ? 'Ruby' :
    /pearl/.test(combined) ? 'Pearl' :
    /opal/.test(combined) ? 'Opal' : undefined

  const metal =
    /yellow gold/.test(combined) ? 'Yellow Gold' :
    /rose gold/.test(combined) ? 'Rose Gold' :
    /white gold/.test(combined) ? 'White Gold' :
    /platinum/.test(combined) ? 'Platinum' :
    /silver/.test(combined) ? 'Silver' : undefined

  return {
    customer: customerName,
    occasion,
    style,
    stone,
    metal,
    notes,
    capturedAt: new Date().toISOString(),
  }
}

export default function CustomerPortalLuna() {
  const { showToast } = useApp()
  const { portalProject, saveLunaBrief } = useProjects()
  const [, navigate] = useLocation()
  const [state, setState] = useState<LunaState>('idle')
  const [transcript, setTranscript] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [lastLunaError, setLastLunaError] = useState('')
  const [isMicError, setIsMicError] = useState(false)
  const [handingOff, setHandingOff] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const conversationRef = useRef<ElevenConversation | null>(null)
  const manualEndingRef = useRef(false)
  const connectedAtRef = useRef(0)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<number | null>(null)
  const prefetchedSignedUrlRef = useRef<string | null>(null)
  const customerName = portalProject?.customer.name || 'there'
  const firstName = customerName.split(' ')[0] || 'there'
  const rawProjectName = portalProject?.name || 'your jewellery piece'
  const projectName = rawProjectName.includes(' - ') ? rawProjectName.split(' - ').slice(1).join(' - ') : rawProjectName

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [transcript])

  // Pre-fetch signed URL on mount so it's ready when the user taps
  useEffect(() => {
    fetch('/api/voice/signed-url', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: { signedUrl?: string }) => {
        if (typeof data.signedUrl === 'string' && data.signedUrl) {
          prefetchedSignedUrlRef.current = data.signedUrl
        }
      })
      .catch(() => { /* best-effort pre-fetch, ignore errors */ })
  }, [])

  useEffect(() => () => {
    const activeConversation = conversationRef.current
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current)
    if (activeConversation) void activeConversation.endSession()
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
      ) {
        return prev
      }

      return [...prev, { ...message, content }]
    })
  }

  const startSession = async () => {
    setState('thinking')
    setTimeout(() => {
      setState('speaking')
      setChatOpen(true)
      setTranscript([{ role: 'assistant', content: `Hi ${firstName}, I'm Luna. Ask me anything about ${projectName} - design, materials, or timeline.`, ts: Date.now() }])
      showToast('Luna is here', 'success')
      setTimeout(() => setState('listening'), 2400)
    }, 700)
  }

  const send = (text?: string) => {
    const t = (text ?? draft).trim()
    if (!t) return
    setTranscript(prev => [...prev, { role: 'user', content: t, ts: Date.now() }])
    setDraft('')
    setState('thinking')
    setTimeout(() => {
      setState('speaking')
      setTranscript(prev => [...prev, {
        role: 'assistant',
        content: "Lovely. I'll note that for your jeweller so it can be reflected in the next render.",
        ts: Date.now(),
      }])
      setTimeout(() => setState('listening'), 2400)
    }, 900)
  }

  const endSession = () => {
    setState('idle')
    setChatOpen(false)
    if (transcript.length > 1) {
      const dna = extractIntakeDNA(transcript, firstName)
      void saveLunaBrief(dna)
      showToast('Brief captured — opening Magic Moodboard…', 'success')
      setTimeout(() => navigate('/portal/magic-movement'), 800)
    } else {
      showToast('Conversation saved', 'success')
    }
  }

  const startLiveSession = async (isRetry = false) => {
    if (conversationRef.current) return
    if (!isRetry) reconnectAttemptsRef.current = 0
    setState('thinking')

    // Unlock AudioContext during user gesture so browser allows audio playback later
    try {
      const ctx = new AudioContext()
      await ctx.resume()
      void ctx.close()
    } catch { /* ignore — best effort */ }

    try {
      manualEndingRef.current = false
      setChatOpen(true)
      // No pre-mic check — let ElevenLabs handle mic permission inside startSession
      const conversation = await startElevenLabsSession()
      conversation.setVolume({ volume: 1.0 })
      conversationRef.current = conversation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start Luna'
      console.error('Unable to start Luna voice', error)
      conversationRef.current = null

      // Fallback: WebSocket voice session (NOT textOnly — agent requires voice mode)
      try {
        const wsConversation = await startElevenLabsWsSession()
        wsConversation.setVolume({ volume: 1.0 })
        conversationRef.current = wsConversation
        showToast('Luna connected', 'success')
      } catch (wsError) {
        console.error('Luna WebSocket fallback also failed', wsError)
        const isMicDenied = message.toLowerCase().includes('permission') || message.toLowerCase().includes('denied') || message.toLowerCase().includes('notallowed')
        setIsMicError(isMicDenied)
        setLastLunaError(isMicDenied ? 'mic' : message)
        showToast(isMicDenied ? 'Microphone access needed' : 'Luna could not connect', 'error')
        setState('idle')
        setChatOpen(false)
      }
    }
  }

  const createLunaCallbacks = () => ({
      onConnect: ({ conversationId }: { conversationId?: string } = {}) => {
        connectedAtRef.current = Date.now()
        setState('listening')
        setLastLunaError('')
        setIsMicError(false)
        console.info('Luna connected', conversationId)
        showToast('Luna connected', 'success')
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

        // If disconnected within 2 s it's a server rejection — don't retry (it will loop)
        // Only retry if we had a stable connection (>2 s) and haven't retried twice yet
        const canRetry = connectedFor > 2000 && connectedFor < 30000 && reconnectAttemptsRef.current < 2

        if (canRetry) {
          reconnectAttemptsRef.current += 1
          setState('thinking')
          showToast('Luna reconnecting...', 'success')
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
        console.error('Luna session error', error)
        const message = typeof error === 'string' ? error : 'Luna connection error'
        setLastLunaError(message)
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
      customer_name: firstName,
      project_name: projectName,
    })

  const startElevenLabsSession = async () => {
    const callbacks = createLunaCallbacks()
    const dynamicVariables = lunaDynamicVariables()

    // Use pre-fetched signed URL if available, otherwise fetch now
    let signedUrl: string | null = prefetchedSignedUrlRef.current
    prefetchedSignedUrlRef.current = null // consume it
    let signedFailure = 'Signed URL request failed'

    if (!signedUrl) {
      const signedUrlResponse = await fetch('/api/voice/signed-url', { cache: 'no-store' })
      const signedUrlData = (await signedUrlResponse.json().catch(() => ({}))) as { signedUrl?: unknown; error?: string }
      signedFailure = signedUrlData.error || signedFailure
      if (signedUrlResponse.ok && typeof signedUrlData.signedUrl === 'string' && signedUrlData.signedUrl) {
        signedUrl = signedUrlData.signedUrl
      }
    }

    if (signedUrl) {
      try {
        return await Conversation.startSession({
          signedUrl,
          connectionType: 'websocket',
          textOnly: false,
          useWakeLock: false,
          dynamicVariables,
          connectionDelay: { default: 50 },
          ...callbacks,
        })
      } catch (error) {
        signedFailure = error instanceof Error ? error.message : String(error)
        console.warn('Luna WebSocket startup failed, trying WebRTC', error)
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
          connectionDelay: { default: 50 },
          ...callbacks,
        })
      } catch (error) {
        const tokenFailure = error instanceof Error ? error.message : String(error)
        throw new Error(`Voice connection failed: ${tokenFailure || signedFailure}`)
      }
    }

    throw new Error(tokenData.error || signedFailure || 'Unable to start Luna')
  }

  // WebSocket fallback — voice mode (textOnly: false so the agent actually speaks)
  const startElevenLabsWsSession = async (cachedSignedUrl?: string) => {
    const callbacks = createLunaCallbacks()
    const dynamicVariables = lunaDynamicVariables()

    setState('thinking')
    setChatOpen(true)

    let signedUrl = cachedSignedUrl
    if (!signedUrl) {
      const signedUrlResponse = await fetch('/api/voice/signed-url', { cache: 'no-store' })
      const signedUrlData = (await signedUrlResponse.json().catch(() => ({}))) as { signedUrl?: unknown; error?: string }
      if (!signedUrlResponse.ok || typeof signedUrlData.signedUrl !== 'string' || !signedUrlData.signedUrl) {
        throw new Error(signedUrlData.error || 'Unable to start Luna')
      }
      signedUrl = signedUrlData.signedUrl
    }

    return await Conversation.startSession({
      signedUrl,
      connectionType: 'websocket',
      textOnly: false,         // must be false — agent is configured for voice
      useWakeLock: false,
      dynamicVariables,
      connectionDelay: { default: 50 },
      ...callbacks,
    })
  }

  const sendLive = (text?: string) => {
    const t = (text ?? draft).trim()
    if (!t) return

    if (!conversationRef.current) {
      send(t)
      return
    }

    appendMessage({ role: 'user', content: t, ts: Date.now() })
    setDraft('')
    setState('thinking')

    try {
      conversationRef.current.sendUserMessage(t)
    } catch (error) {
      console.error('Unable to send Luna message', error)
      showToast('Message failed', 'error')
      setState('listening')
    }
  }

  const endLiveSession = async () => {
    const conversation = conversationRef.current
    const capturedTranscript = transcript  // snapshot before state clears
    manualEndingRef.current = true
    reconnectAttemptsRef.current = 0
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    conversationRef.current = null
    setState('idle')
    setChatOpen(false)

    try {
      if (conversation) await conversation.endSession()
    } catch (error) {
      console.error('Unable to end Luna session', error)
    }

    // Extract brief and hand off to Magic Moodboard
    if (capturedTranscript.length > 1) {
      const dna = extractIntakeDNA(capturedTranscript, firstName)
      void saveLunaBrief(dna)
      setHandingOff(true)
      showToast('Brief captured — opening Magic Moodboard…', 'success')
      setTimeout(() => navigate('/portal/magic-movement'), 1800)
    } else {
      showToast('Conversation ended', 'success')
    }

    // Pre-fetch next signed URL in background
    fetch('/api/voice/signed-url', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: { signedUrl?: string }) => {
        if (typeof data.signedUrl === 'string' && data.signedUrl) {
          prefetchedSignedUrlRef.current = data.signedUrl
        }
      })
      .catch(() => { /* best-effort */ })
  }

  return (
    <div data-testid="customer-luna" style={{
      position: 'relative',
      minHeight: 'calc(100vh - 122px)',
      padding: 'clamp(28px, 5vh, 56px) clamp(20px, 4vw, 36px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'clamp(24px, 4vh, 44px)',
      overflow: 'hidden',
    }}>
      {/* ambient gradient backdrop */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background:
          'radial-gradient(circle at 50% 38%, rgba(207,95,145,0.16), transparent 45%),' +
          'radial-gradient(circle at 14% 88%, rgba(63,136,116,0.14), transparent 40%),' +
          'radial-gradient(circle at 90% 86%, rgba(227,141,90,0.16), transparent 40%)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}
      >
        <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-3)' }}>AI assistant</span>
        <h1 className="bb-display" style={{
          margin: '12px 0 8px', fontSize: 'clamp(2.2rem, 5vw, 4rem)', lineHeight: 1.05,
        }}>
          Talk to{' '}
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
        <LunaPulseOrb
          state={state}
          size={260}
          onClick={state === 'idle' ? () => void startLiveSession() : undefined}
          testId="luna-orb"
        />
      </motion.div>

      {/* CTA / mic controls */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.2 }}
        style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}
      >
        {state === 'idle' ? (
          <button
            data-testid="luna-start-btn"
            className="bb-btn-primary bb-lift"
            onClick={() => void startLiveSession()}
            style={{ padding: '14px 28px', fontSize: '1rem' }}
          >
            <Mic size={17} /> Start conversation
          </button>
        ) : (
          <button
            data-testid="luna-end-btn"
            className="bb-btn-secondary bb-lift"
            onClick={endLiveSession}
            style={{ padding: '11px 22px' }}
          >
            <MicOff size={15} /> End
          </button>
        )}

        {lastLunaError && (
          isMicError ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              style={{
                width: 'min(520px, 92vw)',
                borderRadius: 18,
                border: '1px solid rgba(207,95,145,0.28)',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(16px)',
                padding: '20px 22px',
                display: 'grid',
                gap: 14,
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
                    Luna needs your mic to talk. Follow the steps for your device:
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { label: 'Chrome / Android', steps: 'Tap the 🔒 lock icon in the address bar → Permissions → Microphone → Allow' },
                  { label: 'Safari / iOS', steps: 'Open Settings app → Safari → Microphone → Allow for this site' },
                  { label: 'Firefox', steps: 'Click the 🔒 lock icon → Permissions → Use the microphone → Allow' },
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
                onClick={() => { setLastLunaError(''); setIsMicError(false); void startLiveSession() }}
                style={{ justifyContent: 'center', padding: '11px 20px', fontSize: '0.88rem' }}
              >
                <Mic size={14} /> Try again
              </button>
            </motion.div>
          ) : (
            <div style={{
              maxWidth: 480,
              padding: '10px 16px',
              borderRadius: 12,
              border: '1px solid rgba(207,95,145,0.18)',
              background: 'rgba(255,255,255,0.78)',
              color: 'var(--bb-muted)',
              fontSize: '0.82rem',
              lineHeight: 1.5,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}>
              <span>{lastLunaError}</span>
              <button
                type="button"
                className="bb-btn-secondary"
                onClick={() => { setLastLunaError(''); setIsMicError(false); void startLiveSession() }}
                style={{ justifyContent: 'center', minHeight: 34, padding: '8px 16px' }}
              >
                <Mic size={14} /> Try again
              </button>
            </div>
          )
        )}

        {/* Suggestion chips */}
        {state !== 'idle' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 580 }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendLive(s)}
                style={{
                  padding: '8px 14px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.78)',
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
                  e.currentTarget.style.background = 'rgba(255,255,255,0.78)'
                }}
              >
                <Sparkles size={12} style={{ color: 'var(--bb-rose)' }} />
                {s}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Handoff transition card ── */}
      <AnimatePresence>
        {handingOff && (
          <motion.div
            key="handoff"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45, ease: [0.22, 0.9, 0.32, 1] }}
            style={{
              position: 'relative', zIndex: 2,
              width: 'min(480px, 100%)',
              borderRadius: 24,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(24px)',
              border: '1px solid var(--bb-line)',
              boxShadow: '0 32px 80px rgba(51,39,35,0.18)',
              padding: '28px 28px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              textAlign: 'center',
            }}
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 10, -10, 0] }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              style={{
                width: 64, height: 64, borderRadius: 18,
                background: 'linear-gradient(135deg, rgba(207,95,145,0.15), rgba(199,166,106,0.1))',
                border: '1px solid rgba(207,95,145,0.2)',
                display: 'grid', placeItems: 'center',
                color: 'var(--bb-rose)',
              }}
            >
              <Sparkles size={28} />
            </motion.div>

            <div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--bb-ink)', display: 'block', marginBottom: 6 }}>
                Brief captured!
              </strong>
              <p style={{ margin: 0, fontSize: '0.87rem', color: 'var(--bb-muted)', lineHeight: 1.6 }}>
                Luna has noted your preferences. Taking you to the Magic Moodboard to generate your concepts…
              </p>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 18px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}>
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowRight size={16} />
              </motion.div>
              Magic Moodboard
            </div>

            {/* Loading dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                  style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--bb-rose)', display: 'inline-block',
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript drawer */}
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
              borderRadius: 22,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.78)',
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
              <strong style={{
                color: 'var(--bb-ink)',
                fontFamily: 'var(--app-font-display)',
                fontWeight: 500,
                letterSpacing: '-0.005em',
              }}>Luna</strong>
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
              ref={ref}
              style={{
                maxHeight: 'min(46vh, 420px)',
                overflowY: 'auto', padding: '18px 20px',
                display: 'grid', gap: 12, alignContent: 'start',
              }}
            >
              {transcript.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 0.9, 0.32, 1] }}
                  style={{
                    padding: '12px 16px', borderRadius: 16, maxWidth: '85%',
                    alignSelf: m.role === 'user' ? 'end' : 'start',
                    background:
                      m.role === 'user'
                        ? 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))'
                        : 'rgba(255,255,255,0.86)',
                    color: m.role === 'user' ? '#fff' : 'var(--bb-text)',
                    fontSize: '0.94rem', lineHeight: 1.5,
                    border: m.role === 'user' ? '0' : '1px solid var(--bb-line)',
                    boxShadow:
                      m.role === 'user'
                        ? '0 12px 24px rgba(207,95,145,0.22)'
                        : '0 8px 18px rgba(51,39,35,0.06)',
                  }}
                >
                  {m.content}
                </motion.div>
              ))}
              {state === 'thinking' && <TypingBubble />}
            </div>
            <div style={{
              padding: 12, borderTop: '1px solid var(--bb-line)',
              display: 'flex', gap: 8, background: 'rgba(255,255,255,0.5)',
            }}>
              <input
                data-testid="luna-input"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendLive()}
                placeholder="Type, or just speak to Luna..."
                style={{
                  flex: 1, border: '1px solid var(--bb-line)',
                  borderRadius: 999, padding: '11px 18px',
                  background: '#fff', outline: 'none', fontSize: '0.92rem',
                }}
              />
              <button
                data-testid="luna-send"
                onClick={() => sendLive()}
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
    <div
      style={{
        padding: '12px 16px', borderRadius: 16,
        alignSelf: 'start', maxWidth: '40%',
        background: 'rgba(255,255,255,0.86)',
        border: '1px solid var(--bb-line)',
        display: 'inline-flex', gap: 6, alignItems: 'center',
      }}
    >
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
