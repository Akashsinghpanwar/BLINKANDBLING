import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import type { Project } from '../context/ProjectContext'
import { loadProjectMessages, saveProjectMessage, seedProjectMessages, type MessageAuthor, type ProjectMessage } from '../lib/messages'

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
  const listRef = useRef<HTMLDivElement | null>(null)
  const projectName = useMemo(() => cleanProjectName(project.name), [project.name])

  useEffect(() => {
    const refresh = () => {
      seedProjectMessages(project.id, project.customer.name, projectName)
      setMessages(loadProjectMessages(project.id))
    }

    refresh()
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail
      if (!detail?.projectId || detail.projectId === project.id) refresh()
    }

    window.addEventListener('bb-project-messages-updated', onUpdate)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('bb-project-messages-updated', onUpdate)
      window.removeEventListener('storage', refresh)
    }
  }, [project.id, project.customer.name, projectName])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const send = () => {
    const text = draft.trim()
    if (!text) return
    saveProjectMessage({
      id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      projectId: project.id,
      author: viewer,
      authorName: viewer === 'jeweller' ? 'Jeweller' : project.customer.name,
      text,
      createdAt: new Date().toISOString(),
      readByJeweller: viewer === 'jeweller',
      readByCustomer: viewer === 'customer',
    })
    setDraft('')
  }

  return (
    <div
      style={{
        width: 'min(420px, calc(100vw - 34px))',
        overflow: 'hidden',
        borderRadius: 18,
        background: '#fff',
        border: '1px solid var(--bb-line)',
        boxShadow: '0 32px 74px rgba(51,39,35,0.22)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: 16,
        color: '#fff',
        background: 'linear-gradient(135deg, #211820, #563044 54%, #8b6bb5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.14)', color: '#fff' }}>
            <MessageCircle size={19} />
          </div>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', fontFamily: 'var(--app-font-display)', fontWeight: 600, fontSize: '1.08rem' }}>
              Project messages
            </strong>
            <span style={{ display: 'block', marginTop: 2, color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {project.customer.name} - {projectName}
            </span>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close messages" style={{ width: 34, height: 34, borderRadius: 12, border: 0, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
            <X size={17} />
          </button>
        )}
      </div>

      <div ref={listRef} style={{ maxHeight: 360, minHeight: 260, overflowY: 'auto', padding: 14, display: 'grid', alignContent: 'start', gap: 10, background: 'linear-gradient(180deg, #fffefe, #fbf8f5)' }}>
        {messages.map(message => {
          const mine = message.author === viewer
          return (
            <div key={message.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '82%',
                padding: '10px 12px',
                borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                color: mine ? '#fff' : 'var(--bb-text)',
                background: mine ? 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 58%, var(--bb-violet))' : '#fff',
                border: mine ? '1px solid rgba(255,255,255,0.16)' : '1px solid var(--bb-line)',
                boxShadow: mine ? '0 12px 24px rgba(207,95,145,0.20)' : '0 10px 20px rgba(51,39,35,0.06)',
              }}>
                <span style={{ display: 'block', marginBottom: 4, fontSize: '0.68rem', fontWeight: 800, opacity: mine ? 0.78 : 0.62, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {message.authorName}
                </span>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.48 }}>{message.text}</p>
                <span style={{ display: 'block', marginTop: 6, fontSize: '0.68rem', opacity: mine ? 0.72 : 0.5 }}>
                  {new Date(message.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderTop: '1px solid var(--bb-line)', background: '#fff' }}
      >
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder={viewer === 'jeweller' ? `Message ${project.customer.name}` : 'Message your jeweller'}
          style={{ flex: 1, minWidth: 0, border: '1px solid var(--bb-line)', borderRadius: 999, padding: '11px 14px', outline: 'none', fontSize: '0.9rem', background: '#fdfcfa', color: 'var(--bb-ink)' }}
        />
        <button type="submit" className="bb-btn-primary" aria-label="Send message" style={{ minHeight: 40, padding: '10px 14px', flexShrink: 0 }}>
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}
