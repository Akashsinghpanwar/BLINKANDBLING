import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import type { Project } from '../context/ProjectContext'
import { fetchMessages, postMessage, seedMessages, markRead, type MessageAuthor, type ProjectMessage } from '../lib/messages'

function cleanProjectName(name: string) {
  return name.includes(' - ') ? name.split(' - ').slice(1).join(' - ') : name
}

export default function ProjectMessenger({
  project,
  viewer,
  onClose,
}: {
  project: Project
  viewer: MessageAuthor
  onClose?: () => void
}) {
  const [messages, setMessages] = useState<ProjectMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const projectName = useMemo(() => cleanProjectName(project.name), [project.name])

  // Initial load + seed welcome message
  useEffect(() => {
    let mounted = true
    seedMessages(project.id, project.customer.name, projectName).then(msgs => {
      if (mounted) setMessages(msgs)
    })
    markRead(project.id, viewer)
    return () => { mounted = false }
  }, [project.id, project.customer.name, projectName, viewer])

  // Poll every 5 s for new messages
  useEffect(() => {
    const interval = setInterval(async () => {
      const msgs = await fetchMessages(project.id)
      setMessages(msgs)
    }, 5000)
    return () => clearInterval(interval)
  }, [project.id])

  // Auto-scroll on new messages
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setDraft('')
    const msg: ProjectMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      projectId: project.id,
      author: viewer,
      authorName: viewer === 'jeweller' ? 'Jeweller' : project.customer.name,
      text,
      createdAt: new Date().toISOString(),
      readByJeweller: viewer === 'jeweller',
      readByCustomer: viewer === 'customer',
    }
    const updated = await postMessage(msg)
    setMessages(updated)
    setSending(false)
  }

  return (
    <div style={{
      width: 'min(420px, calc(100vw - 34px))',
      overflow: 'hidden',
      borderRadius: 18,
      background: '#fff',
      border: '1px solid var(--bb-line)',
      boxShadow: '0 32px 74px rgba(51,39,35,0.22)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: 16, color: '#fff',
        background: 'linear-gradient(135deg, #211820, #563044 54%, #8b6bb5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.14)' }}>
            <MessageCircle size={19} />
          </div>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', fontFamily: 'var(--app-font-display)', fontWeight: 600, fontSize: '1.08rem' }}>
              Project messages
            </strong>
            <span style={{ display: 'block', marginTop: 2, color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {project.customer.name} — {projectName}
            </span>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close messages"
            style={{ width: 34, height: 34, borderRadius: 12, border: 0, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer' }}>
            <X size={17} />
          </button>
        )}
      </div>

      {/* Messages list */}
      <div ref={listRef} style={{ maxHeight: 360, minHeight: 260, overflowY: 'auto', padding: 14, display: 'grid', alignContent: 'start', gap: 10, background: 'linear-gradient(180deg,#fffefe,#fbf8f5)' }}>
        {messages.map(msg => {
          const mine = msg.author === viewer
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '82%', padding: '10px 12px',
                borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                color: mine ? '#fff' : 'var(--bb-text)',
                background: mine ? 'linear-gradient(135deg,var(--bb-coral),var(--bb-rose) 58%,var(--bb-violet))' : '#fff',
                border: mine ? '1px solid rgba(255,255,255,0.16)' : '1px solid var(--bb-line)',
                boxShadow: mine ? '0 12px 24px rgba(207,95,145,0.20)' : '0 10px 20px rgba(51,39,35,0.06)',
              }}>
                <span style={{ display: 'block', marginBottom: 4, fontSize: '0.68rem', fontWeight: 800, opacity: mine ? 0.78 : 0.62, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {msg.authorName}
                </span>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.48 }}>{msg.text}</p>
                <span style={{ display: 'block', marginTop: 6, fontSize: '0.68rem', opacity: mine ? 0.72 : 0.5 }}>
                  {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && (
          <p style={{ color: 'var(--bb-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 'auto' }}>No messages yet</p>
        )}
      </div>

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); void send() }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderTop: '1px solid var(--bb-line)', background: '#fff' }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={viewer === 'jeweller' ? `Message ${project.customer.name}` : 'Message your jeweller'}
          disabled={sending}
          style={{ flex: 1, minWidth: 0, border: '1px solid var(--bb-line)', borderRadius: 999, padding: '11px 14px', outline: 'none', fontSize: '0.9rem', background: '#fdfcfa', color: 'var(--bb-ink)' }}
        />
        <button type="submit" className="bb-btn-primary" disabled={sending}
          aria-label="Send message" style={{ minHeight: 40, padding: '10px 14px', flexShrink: 0 }}>
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}
