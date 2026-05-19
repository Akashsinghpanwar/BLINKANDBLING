import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Conversation, type Conversation as ElevenConversation } from '@elevenlabs/client'
import { Mic, MicOff, Send, Sparkles, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import LunaPulseOrb from '../../components/LunaPulseOrb'
import { useProjects } from '../../context/ProjectContext'

interface Message { role: 'user' | 'assistant'; content: string; ts?: number }

type LunaState = 'idle' | 'listening' | 'thinking' | 'speaking'

const SUGGESTIONS = [
  'I love vintage cushion cuts',
  'Yellow gold with hidden halo',
  'Something timeless yet bold',
  'Anniversary band ideas',
]

const LUNA_AGENT_ID = 'agent_9001kf27vrfxe8ta2svmvhktjnrx'

export default function CustomerPortalLuna() {
  const { showToast } = useApp()
  const { portalProject } = useProjects()
  const [state, setState] = useState<LunaState>('idle')
  const [transcript, setTranscript] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [lastLunaError, setLastLunaError] = useState('')
  const [backupVoiceOpen, setBackupVoiceOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const conversationRef = useRef<ElevenConversation | null>(null)
  const manualEndingRef = useRef(false)
  const connectedAtRef = useRef(0)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<number | null>(null)
  const customerName = portalProject?.customer.name || 'there'
  const firstName = customerName.split(' ')[0] || 'there'
  const rawProjectName = portalProject?.name || 'your jewellery piece'
  const projectName = rawProjectName.includes(' - ') ? rawProjectName.split(' - ').slice(1).join(' - ') : rawProjectName

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [transcript])

  useEffect(() => () => {
    const activeConversation = conversationRef.current
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current)
    if (activeConversation) void activeConversation.endSession()
  }, [])

  useEffect(() => {
    if (!backupVoiceOpen) return
    const scriptId = 'elevenlabs-convai-widget'
    if (document.getElementById(scriptId)) return
    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
    script.async = true
    script.type = 'text/javascript'
    document.body.appendChild(script)
  }, [backupVoiceOpen])

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
    showToast('Conversation saved', 'success')
  }

  const startLiveSession = async (isRetry = false) => {
    if (conversationRef.current) return
    if (!isRetry) reconnectAttemptsRef.current = 0
    setState('thinking')

    try {
      manualEndingRef.current = false
      setChatOpen(true)
      await ensureMicrophoneReady()
      const conversation = await startElevenLabsSession()
      conversation.setVolume({ volume: 0.9 })
      conversationRef.current = conversation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start Luna'
      console.error('Unable to start Luna', error)
      conversationRef.current = null
      setLastLunaError(message)
      showToast(`${message}. Trying text Luna.`, 'error')

      try {
        const textConversation = await startElevenLabsTextSession()
        conversationRef.current = textConversation
        appendMessage({
          role: 'assistant',
          content: `Hi ${firstName}, Luna voice could not start here, but text chat is ready for ${projectName}.`,
          ts: Date.now(),
        })
        showToast('Luna text mode ready', 'success')
      } catch (textError) {
        console.error('Unable to start Luna text mode', textError)
        void startSession()
      }
    }
  }

  const ensureMicrophoneReady = async () => {
    if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      throw new Error('Open Luna on localhost or HTTPS so the microphone can start')
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not available in this browser')
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    stream.getTracks().forEach(track => track.stop())
  }

  const createLunaCallbacks = () => ({
      onConnect: ({ conversationId }: { conversationId?: string } = {}) => {
        connectedAtRef.current = Date.now()
        setState('listening')
        setLastLunaError('')
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
        const canRetry = connectedFor < 15000 && reconnectAttemptsRef.current < 2

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
        showToast('Luna disconnected. Tap Start to reconnect.', 'error')
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

    const tokenResponse = await fetch('/api/voice/conversation-token', { cache: 'no-store' })
    const tokenData = (await tokenResponse.json().catch(() => ({}))) as { token?: unknown; error?: string }
    let tokenFailure = tokenData.error || 'Token request failed'

    if (tokenResponse.ok && typeof tokenData.token === 'string' && tokenData.token) {
      try {
        return await Conversation.startSession({
          conversationToken: tokenData.token,
          connectionType: 'webrtc',
          textOnly: false,
          useWakeLock: false,
          overrides: {
            conversation: { textOnly: false },
          },
          dynamicVariables,
          connectionDelay: { default: 250 },
          ...callbacks,
        })
      } catch (error) {
        tokenFailure = error instanceof Error ? error.message : String(error)
        console.warn('Luna WebRTC startup failed, trying signed URL', error)
      }
    }

    console.warn('Luna WebRTC token startup unavailable, falling back to signed URL', tokenData.error)
    const signedUrlResponse = await fetch('/api/voice/signed-url', { cache: 'no-store' })
    const signedUrlData = (await signedUrlResponse.json().catch(() => ({}))) as { signedUrl?: unknown; error?: string }

    if (!signedUrlResponse.ok || typeof signedUrlData.signedUrl !== 'string' || !signedUrlData.signedUrl) {
      throw new Error(signedUrlData.error || tokenData.error || 'Unable to start Luna')
    }

    try {
      return await Conversation.startSession({
        signedUrl: signedUrlData.signedUrl,
        connectionType: 'websocket',
        textOnly: false,
        useWakeLock: false,
        overrides: {
          conversation: { textOnly: false },
        },
        dynamicVariables,
        connectionDelay: { default: 250 },
        ...callbacks,
      })
    } catch (error) {
      const signedFailure = error instanceof Error ? error.message : String(error)
      throw new Error(`Voice connection failed: ${signedFailure || tokenFailure}`)
    }
  }

  const startElevenLabsTextSession = async () => {
    const callbacks = createLunaCallbacks()
    const dynamicVariables = lunaDynamicVariables()

    setState('thinking')
    setChatOpen(true)

    const signedUrlResponse = await fetch('/api/voice/signed-url', { cache: 'no-store' })
    const signedUrlData = (await signedUrlResponse.json().catch(() => ({}))) as { signedUrl?: unknown; error?: string }

    if (!signedUrlResponse.ok || typeof signedUrlData.signedUrl !== 'string' || !signedUrlData.signedUrl) {
      throw new Error(signedUrlData.error || 'Unable to start Luna text chat')
    }

    return await Conversation.startSession({
      signedUrl: signedUrlData.signedUrl,
      connectionType: 'websocket',
      textOnly: true,
      useWakeLock: false,
      dynamicVariables,
      connectionDelay: { default: 150 },
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
      showToast('Conversation saved', 'success')
    } catch (error) {
      console.error('Unable to end Luna session', error)
      showToast('Conversation ended locally', 'success')
    }
  }

  const mountBackupWidget = (node: HTMLDivElement | null) => {
    if (!node || node.querySelector('elevenlabs-convai')) return
    const widget = document.createElement('elevenlabs-convai')
    widget.setAttribute('agent-id', LUNA_AGENT_ID)
    node.appendChild(widget)
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
          <div style={{
            maxWidth: 520,
            padding: '10px 14px',
            borderRadius: 14,
            border: '1px solid rgba(207,95,145,0.22)',
            background: 'rgba(255,255,255,0.78)',
            color: 'var(--bb-muted)',
            fontSize: '0.82rem',
            lineHeight: 1.5,
            textAlign: 'center',
            display: 'grid',
            gap: 10,
          }}>
            <span>{lastLunaError}</span>
            <button
              type="button"
              className="bb-btn-secondary"
              onClick={() => setBackupVoiceOpen(true)}
              style={{ justifyContent: 'center', minHeight: 34, padding: '8px 14px', margin: '0 auto' }}
            >
              <Mic size={14} /> Open Luna voice backup
            </button>
          </div>
        )}

        {backupVoiceOpen && (
          <div style={{
            width: 'min(520px, 92vw)',
            borderRadius: 16,
            border: '1px solid var(--bb-line)',
            background: 'rgba(255,255,255,0.82)',
            padding: 12,
            boxShadow: '0 18px 42px rgba(40,32,30,0.12)',
          }}>
            <div ref={mountBackupWidget} />
          </div>
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
