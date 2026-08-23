import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, BadgePoundSterling, Bot, Box, CalendarDays, CalendarPlus, CheckCircle2, Images, LayoutDashboard, Lock, Mail, MessageCircle, Pencil, Save, Sparkles, Unlock, Wand2, X } from 'lucide-react'
import { useProjects } from '../../context/ProjectContext'
import { useApp } from '../../context/AppContext'
import ProjectMessenger from '../../components/ProjectMessenger'

interface Props {
  projectId: string
}

type AppointmentItem = {
  id: string
  date: string
  time: string
  title: string
  meta: string
  tone: string
  customerId?: string
  customerName?: string
}

const scheduleStorageKey = 'bb-jeweller-schedule-v1'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function loadAppointments(): AppointmentItem[] {
  try {
    const raw = localStorage.getItem(scheduleStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AppointmentItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatPhoneForWhatsApp(phone: string) {
  return phone.replace(/[^\d]/g, '')
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: 'block', flexShrink: 0 }}>
      <path
        fill="currentColor"
        d="M12.04 2a9.9 9.9 0 0 0-8.53 14.95L2.31 22l5.18-1.17A9.96 9.96 0 1 0 12.04 2Zm0 1.78a8.18 8.18 0 0 1 6.92 12.53 8.18 8.18 0 0 1-10.98 2.77l-.34-.19-3.02.68.7-2.94-.22-.36A8.17 8.17 0 0 1 12.04 3.78Zm-3.5 4.31c-.2 0-.52.08-.79.38-.27.3-1.03 1-1.03 2.45 0 1.44 1.05 2.84 1.2 3.03.14.2 2.03 3.25 5.03 4.43 2.49.98 3 .78 3.54.73.54-.05 1.74-.71 1.99-1.4.24-.69.24-1.27.17-1.4-.07-.12-.27-.2-.57-.35-.3-.14-1.74-.86-2.01-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.91-2.2-.24-.57-.49-.49-.67-.49Z"
      />
    </svg>
  )
}

export default function CustomerProfile({ projectId }: Props) {
  const [, navigate] = useLocation()
  const { showToast } = useApp()
  const { projects, stages, setFeatureAccess, refreshProjects, setPortalProject, updateProject } = useProjects()
  const [hasRefreshed, setHasRefreshed] = useState(false)
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentItem | null>(null)
  const [showMessenger, setShowMessenger] = useState(false)
  const [savingField, setSavingField] = useState<string | null>(null)
  const project = projects.find(p => p.id === projectId)

  useEffect(() => {
    let alive = true
    if (!project) {
      refreshProjects().finally(() => {
        if (alive) setHasRefreshed(true)
      })
    } else {
      setHasRefreshed(true)
    }
    return () => { alive = false }
  }, [project, refreshProjects])

  useEffect(() => {
    setAppointments(loadAppointments())
  }, [projectId])

  const tools = useMemo(() => {
    if (!project) return []
    const access = {
      overview: true,
      luna: true,
      designs: true,
      gallery: true,
      cad: project.cadUnlocked,
      timeline: true,
      payments: true,
      ...(project.featureAccess || {}),
    }
    return [
      { label: 'Overview', feature: 'overview' as const, icon: LayoutDashboard, status: access.overview ? 'Live for customer' : 'Hidden from customer', description: 'Brief, budget and project summary', accent: '#3f8874', soft: 'rgba(63,136,116,0.10)', locked: !access.overview },
      { label: 'Luna', feature: 'luna' as const, icon: Bot, status: access.luna ? 'Live assistant access' : 'Assistant locked', description: 'Voice assistant and project Q&A', accent: '#6f66b3', soft: 'rgba(111,102,179,0.11)', locked: !access.luna },
      { label: 'Designs', feature: 'designs' as const, icon: Sparkles, status: access.designs ? 'Designs visible' : 'Designs hidden', description: 'Concepts, renders and revisions', accent: '#cf5f91', soft: 'rgba(207,95,145,0.11)', locked: !access.designs },
      { label: 'User Gallery', feature: 'gallery' as const, icon: Images, status: access.gallery ? 'Gallery visible' : 'Gallery hidden', description: 'Uploads, references and saved files', accent: '#d38a57', soft: 'rgba(211,138,87,0.13)', locked: !access.gallery },
      { label: 'Timeline', feature: 'timeline' as const, icon: CalendarDays, status: access.timeline ? 'Timeline visible' : 'Timeline hidden', description: 'Milestones and production updates', accent: '#8b6bb5', soft: 'rgba(139,107,181,0.12)', locked: !access.timeline },
      { label: 'Payments', feature: 'payments' as const, icon: BadgePoundSterling, status: access.payments ? 'Checkout enabled' : 'Checkout locked', description: 'Deposits, invoices and balances', accent: '#2f9075', soft: 'rgba(47,144,117,0.11)', locked: !access.payments },
      {
        label: '3D / CAD',
        feature: 'cad' as const,
        icon: Box,
        status: access.cad ? 'CAD viewer enabled' : 'CAD viewer locked',
        description: '3D model review and file access',
        accent: access.cad ? '#2f9075' : '#8f929c',
        soft: access.cad ? 'rgba(47,144,117,0.11)' : 'rgba(143,146,156,0.10)',
        locked: !access.cad,
      },
      {
        label: 'Virtual Try On',
        feature: 'virtualTryOn' as const,
        icon: Wand2,
        status: access.virtualTryOn ? 'Try-on enabled' : 'Try-on locked',
        description: 'Virtual try-on with customer photos',
        accent: access.virtualTryOn ? '#b3578f' : '#8f929c',
        soft: access.virtualTryOn ? 'rgba(179,87,143,0.11)' : 'rgba(143,146,156,0.10)',
        locked: !access.virtualTryOn,
      },
    ]
  }, [project])

  const toggleFeature = async (feature: typeof tools[number]['feature'], unlocked: boolean) => {
    if (!project) return
    try {
      await setFeatureAccess(project.id, feature, unlocked)
      showToast(`${unlocked ? 'Unlocked' : 'Locked'} ${feature.toUpperCase()} for ${project.customer.name}`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update feature access', 'error')
      void refreshProjects()
    }
  }

  const startAppointment = () => {
    if (!project) return
    setAppointmentDraft({
      id: `sched_${Date.now()}`,
      date: todayIso(),
      time: '10:00',
      title: `${project.customer.name} appointment`,
      meta: 'Consultation',
      tone: 'var(--bb-rose)',
      customerId: project.id,
      customerName: project.customer.name,
    })
  }

  const saveAppointment = () => {
    if (!project || !appointmentDraft || !appointmentDraft.date || !appointmentDraft.time) return
    const allAppointments = loadAppointments()
    const nextAppointment = {
      ...appointmentDraft,
      title: appointmentDraft.title.trim() || `${project.customer.name} appointment`,
      meta: appointmentDraft.meta.trim() || 'Scheduled',
      customerId: project.id,
      customerName: project.customer.name,
    }
    const exists = allAppointments.some(item => item.id === nextAppointment.id)
    const nextAppointments = exists
      ? allAppointments.map(item => item.id === nextAppointment.id ? nextAppointment : item)
      : [...allAppointments, nextAppointment]

    localStorage.setItem(scheduleStorageKey, JSON.stringify(nextAppointments))
    setAppointments(nextAppointments)
    setAppointmentDraft(null)
    showToast(`Appointment scheduled for ${project.customer.name}`, 'success')
  }

  if (!project && !hasRefreshed) {
    return (
      <div className="bb-page" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--bb-muted)' }}>
        Loading customer profile...
      </div>
    )
  }

  if (!project) {
    return (
      <div className="bb-page">
        <button className="bb-btn-secondary" onClick={() => navigate('/workspace/customers')}><ArrowLeft size={16} /> Clients</button>
        <h1 style={{ color: 'var(--bb-ink)' }}>Customer not found</h1>
      </div>
    )
  }

  const initials = project.customer.name.split(' ').map(n => n[0]).join('')
  const customerAppointments = appointments
    .filter(item => item.customerId === project.id || item.customerName === project.customer.name)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
  const whatsappNumber = formatPhoneForWhatsApp(project.customer.phone || '')
  const whatsappText = encodeURIComponent(`Hi ${project.customer.name}, this is Blink & Bling about your custom jewellery project.`)

  return (
    <div className="bb-page animate-fade-up">
      <header className="bb-page-header">
        <div>
          <button
            onClick={() => navigate('/workspace/customers')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, background: 'transparent', color: 'var(--bb-rose)', fontWeight: 800, padding: 0, marginBottom: 14 }}
          >
            <ArrowLeft size={16} /> Clients
          </button>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-2)', display: 'block' }}>Customer profile</span>
          <h1 className="bb-display">{project.customer.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="bb-btn-secondary bb-lift"
            onClick={() => {
              setPortalProject(project)
              navigate('/portal')
            }}
          >
            <MessageCircle size={16} /> Access customer portal
          </button>
        </div>
      </header>

      <section className="bb-stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.8fr) minmax(0, 1.2fr)', gap: 18, marginBottom: 22 }}>
        <div className="bb-card" style={{ padding: 24, display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 58, height: 58, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))' }}>
              {initials}
            </div>
            <div>
              <strong style={{ color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontSize: '1.25rem', fontWeight: 500 }}>{project.customer.name}</strong>
              <span style={{ display: 'block', color: 'var(--bb-muted)', fontSize: '0.84rem', marginTop: 4 }}>{project.customer.email}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <a className="bb-lift bb-no-underline" href={`mailto:${project.customer.email}`} style={profileActionStyle}>
              <Mail size={18} /> Email
            </a>
            <button type="button" className="bb-lift" onClick={() => setShowMessenger(true)} style={{ ...profileActionStyle, background: 'linear-gradient(135deg, #20222b, #4b3446)', boxShadow: '0 12px 28px rgba(32,34,43,0.24), 0 0 18px rgba(139,107,181,0.22)' }}>
              <MessageCircle size={18} /> Message
            </button>
            <a
              className="bb-lift bb-no-underline"
              href={whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${whatsappText}` : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!whatsappNumber}
              style={{
                minHeight: 38,
                height: 42,
                padding: '0 14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                color: whatsappNumber ? '#9ff3d6' : 'rgba(255,255,255,0.48)',
                background: 'linear-gradient(135deg, #133b33, #1f6f5c)',
                border: '1px solid rgba(159,243,214,0.28)',
                borderRadius: 12,
                fontWeight: 800,
                lineHeight: 1,
                boxShadow: whatsappNumber ? '0 12px 28px rgba(31,111,92,0.28), 0 0 18px rgba(159,243,214,0.22)' : 'none',
                opacity: whatsappNumber ? 1 : 0.48,
                pointerEvents: whatsappNumber ? 'auto' : 'none',
              }}
            >
              <WhatsAppIcon size={18} /> WhatsApp
            </a>
            <button type="button" className="bb-lift" onClick={startAppointment} style={{ ...profileActionStyle, color: '#fff', background: 'linear-gradient(135deg, #8a4d3d, #b04f7d 56%, #7656a2)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 14px 30px rgba(176,79,125,0.32), 0 0 20px rgba(207,95,145,0.22)' }}>
              <CalendarPlus size={18} /> Schedule
            </button>
          </div>

          {appointmentDraft && (
            <div style={{ display: 'grid', gap: 9, padding: 14, borderRadius: 14, border: '1px solid var(--bb-line)', background: '#fffaf7' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 8 }}>
                <input type="date" value={appointmentDraft.date} onChange={e => setAppointmentDraft({ ...appointmentDraft, date: e.target.value })} style={profileFieldStyle} />
                <input type="time" value={appointmentDraft.time} onChange={e => setAppointmentDraft({ ...appointmentDraft, time: e.target.value })} style={profileFieldStyle} />
              </div>
              <input placeholder="Appointment title" value={appointmentDraft.title} onChange={e => setAppointmentDraft({ ...appointmentDraft, title: e.target.value })} style={profileFieldStyle} />
              <input placeholder="Notes" value={appointmentDraft.meta} onChange={e => setAppointmentDraft({ ...appointmentDraft, meta: e.target.value })} style={profileFieldStyle} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="bb-btn-secondary" onClick={() => setAppointmentDraft(null)} style={{ minHeight: 34, padding: '8px 12px' }}><X size={14} /> Cancel</button>
                <button type="button" className="bb-btn-primary" onClick={saveAppointment} style={{ minHeight: 34, padding: '8px 12px' }}><Save size={14} /> Save</button>
              </div>
            </div>
          )}

          {customerAppointments.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-4)' }}>Appointments</span>
              {customerAppointments.slice(0, 3).map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '74px 1fr', gap: 10, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--bb-line)' }}>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--bb-rose)', fontSize: '0.86rem' }}>{item.time}</strong>
                    <span style={{ color: 'var(--bb-muted)', fontSize: '0.7rem', fontWeight: 700 }}>{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--bb-ink)', fontSize: '0.9rem' }}>{item.title}</strong>
                    <span style={{ color: 'var(--bb-muted)', fontSize: '0.78rem' }}>{item.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gap: 4 }}>
            <EditableField
              label="Project name"
              value={project.name.includes(' - ') ? project.name.split(' - ').slice(1).join(' - ') : project.name}
              saving={savingField === 'projectName'}
              onSave={async v => {
                setSavingField('projectName')
                await updateProject(project.id, { projectName: `${project.customer.name} - ${v}` })
                setSavingField(null)
                showToast('Project name saved', 'success')
              }}
            />
            <EditableField
              label="Stage"
              value={project.stage}
              type="select"
              options={stages.map(s => ({ value: s.id, label: s.label }))}
              saving={savingField === 'stage'}
              onSave={async v => {
                setSavingField('stage')
                await updateProject(project.id, { stage: v })
                setSavingField(null)
                showToast('Stage updated', 'success')
              }}
            />
            <EditableField
              label="Budget"
              value={project.budget === 'Not set' ? '' : project.budget}
              placeholder="e.g. £2,500"
              saving={savingField === 'budget'}
              onSave={async v => {
                setSavingField('budget')
                await updateProject(project.id, { budget: v })
                setSavingField(null)
                showToast('Budget saved', 'success')
              }}
            />
            <EditableField
              label="Metal"
              value={project.metalPreference === 'Not set' ? '' : project.metalPreference}
              placeholder="e.g. 18ct Yellow Gold"
              saving={savingField === 'metalPreference'}
              onSave={async v => {
                setSavingField('metalPreference')
                await updateProject(project.id, { metalPreference: v })
                setSavingField(null)
                showToast('Metal preference saved', 'success')
              }}
            />
            <EditableField
              label="Stone"
              value={project.gemstonePreference === 'Not set' ? '' : project.gemstonePreference}
              placeholder="e.g. Round brilliant diamond"
              saving={savingField === 'gemstonePreference'}
              onSave={async v => {
                setSavingField('gemstonePreference')
                await updateProject(project.id, { gemstonePreference: v })
                setSavingField(null)
                showToast('Stone preference saved', 'success')
              }}
            />
            <EditableField
              label="Ring size"
              value={project.ringSize === 'Not set' ? '' : project.ringSize}
              placeholder="e.g. M / 6 / 52mm"
              saving={savingField === 'ringSize'}
              onSave={async v => {
                setSavingField('ringSize')
                await updateProject(project.id, { ringSize: v })
                setSavingField(null)
                showToast('Ring size saved', 'success')
              }}
            />
            <EditableField
              label="Timeline"
              value={project.timeline === 'Not set' ? '' : project.timeline}
              placeholder="e.g. 8 weeks"
              saving={savingField === 'timeline'}
              onSave={async v => {
                setSavingField('timeline')
                await updateProject(project.id, { timeline: v })
                setSavingField(null)
                showToast('Timeline saved', 'success')
              }}
            />
            {/* Access code — read-only */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--bb-line)', padding: '10px 0' }}>
              <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem', flexShrink: 0 }}>Access code</span>
              <strong style={{ color: 'var(--bb-ink)', fontSize: '0.86rem', letterSpacing: '0.05em' }}>{project.accessCode || 'Not generated'}</strong>
            </div>
          </div>
        </div>

        <div className="bb-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
            <div>
              <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-3)' }}>Access control</span>
              <h2 style={{ margin: '7px 0 0', color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>Customer tools</h2>
            </div>
            <button
              onClick={() => toggleFeature('cad', !project.cadUnlocked)}
              className={project.cadUnlocked ? 'bb-btn-secondary bb-lift' : 'bb-btn-primary bb-lift'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {project.cadUnlocked ? <Lock size={16} /> : <Unlock size={16} />}
              {project.cadUnlocked ? 'Lock CAD' : 'Unlock CAD'}
            </button>
          </div>

          <div className="bb-grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
            {tools.map(tool => (
              <div
                key={tool.label}
                className="bb-lift"
                style={{
                  position: 'relative',
                  minHeight: 156,
                  padding: 18,
                  borderRadius: 18,
                  border: `1px solid ${tool.locked ? '#ded5cf' : `${tool.accent}33`}`,
                  background: tool.locked
                    ? 'linear-gradient(135deg, rgba(248,245,242,0.92), rgba(255,255,255,0.92))'
                    : `linear-gradient(135deg, #fff 0%, ${tool.soft} 100%)`,
                  boxShadow: tool.locked ? '0 12px 28px rgba(51,39,35,0.05)' : '0 18px 38px rgba(51,39,35,0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    right: -34,
                    top: -36,
                    width: 118,
                    height: 118,
                    borderRadius: '50%',
                    background: tool.locked ? 'rgba(143,146,156,0.08)' : tool.soft,
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{
                    width: 46,
                    height: 46,
                    borderRadius: 15,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    background: tool.locked ? 'linear-gradient(135deg, #9a9ca5, #7d808a)' : `linear-gradient(135deg, ${tool.accent}, ${tool.accent}cc)`,
                    boxShadow: tool.locked ? 'none' : `0 14px 26px ${tool.accent}33`,
                    position: 'relative',
                    zIndex: 1,
                  }}>
                    <tool.icon size={22} strokeWidth={2.2} />
                  </div>
                  <span style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 9px',
                    borderRadius: 999,
                    color: tool.locked ? '#7d808a' : tool.accent,
                    background: tool.locked ? 'rgba(143,146,156,0.10)' : tool.soft,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}>
                    {tool.locked ? <Lock size={13} /> : <CheckCircle2 size={13} />}
                    {tool.locked ? 'Locked' : 'Live'}
                  </span>
                </div>
                <strong style={{ display: 'block', color: 'var(--bb-ink)', marginTop: 16, fontSize: '1.04rem', position: 'relative', zIndex: 1 }}>{tool.label}</strong>
                <span style={{ display: 'block', color: 'var(--bb-muted)', fontSize: '0.78rem', marginTop: 5, lineHeight: 1.45, position: 'relative', zIndex: 1 }}>{tool.description}</span>
                <span style={{ display: 'block', color: tool.locked ? 'var(--bb-muted)' : tool.accent, fontSize: '0.72rem', fontWeight: 800, marginTop: 8, position: 'relative', zIndex: 1 }}>{tool.status}</span>
                <button
                  onClick={() => toggleFeature(tool.feature, tool.locked)}
                  className={tool.locked ? 'bb-btn-primary' : 'bb-btn-secondary'}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    marginTop: 14,
                    minHeight: 36,
                    padding: '8px 10px',
                    fontSize: '0.78rem',
                    position: 'relative',
                    zIndex: 1,
                    ...(tool.locked ? {} : { borderColor: `${tool.accent}33`, color: tool.accent, background: '#fff' }),
                  }}
                >
                  {tool.locked ? <Unlock size={13} /> : <Lock size={13} />}
                  {tool.locked ? 'Unlock' : 'Lock'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {showMessenger && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMessenger(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(32,34,43,0.16)', backdropFilter: 'blur(3px)' }}
            />
            <motion.div
              initial={{ opacity: 0, x: 36, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 36, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 0.9, 0.32, 1] }}
              style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 90 }}
            >
              <ProjectMessenger project={project} viewer="jeweller" onClose={() => setShowMessenger(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Inline-editable field ───────────────────────────────────────────────────
interface EditableFieldProps {
  label: string
  value: string
  placeholder?: string
  saving?: boolean
  type?: 'text' | 'select'
  options?: { value: string; label: string }[]
  onSave: (value: string) => Promise<void>
}

function EditableField({ label, value, placeholder, saving, type = 'text', options, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  // Sync external value changes (e.g. after optimistic update)
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  const startEdit = () => {
    setDraft(value)
    setEditing(true)
    setTimeout(() => (inputRef.current as HTMLElement | null)?.focus(), 10)
  }

  const commit = async () => {
    if (!editing) return
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed === value) return          // no change
    await onSave(trimmed)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(value)
  }

  const displayValue = value || 'Not set'
  const isEmpty = !value

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderBottom: '1px solid var(--bb-line)', padding: '10px 0' }}
    >
      {editing ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: 'var(--bb-muted)', fontSize: '0.78rem', fontWeight: 700 }}>{label}</span>
          {type === 'select' && options ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Escape') cancel() }}
              style={{ ...editInputStyle }}
            >
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={placeholder}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
              style={{ ...editInputStyle }}
            />
          )}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button type="button" onClick={cancel} style={smallBtnStyle}>Cancel</button>
            <button type="button" onClick={commit} style={{ ...smallBtnStyle, background: 'var(--bb-rose)', color: '#fff', border: 'none' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={startEdit}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, cursor: 'pointer', borderRadius: 8, padding: '2px 4px', margin: '-2px -4px', transition: 'background 0.15s', background: hovered ? 'rgba(207,95,145,0.05)' : 'transparent' }}
        >
          <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem', flexShrink: 0 }}>{label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {saving && <span style={{ fontSize: '0.7rem', color: 'var(--bb-rose)' }}>Saving…</span>}
            <strong style={{ color: isEmpty ? 'var(--bb-muted)' : 'var(--bb-ink)', fontSize: '0.86rem', textAlign: 'right', fontWeight: isEmpty ? 400 : 700, fontStyle: isEmpty ? 'italic' : 'normal' }}>
              {type === 'select' && options ? (options.find(o => o.value === value)?.label ?? displayValue) : displayValue}
            </strong>
            <Pencil size={11} style={{ color: 'var(--bb-muted)', opacity: hovered ? 1 : 0, flexShrink: 0, transition: 'opacity 0.15s' }} />
          </div>
        </div>
      )}
    </div>
  )
}

const editInputStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid var(--bb-rose)',
  borderRadius: 9,
  padding: '9px 11px',
  background: '#fff',
  color: 'var(--bb-ink)',
  outline: 'none',
  fontSize: '0.86rem',
}

const smallBtnStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  fontWeight: 700,
  padding: '5px 12px',
  borderRadius: 8,
  border: '1px solid var(--bb-line)',
  background: '#fff',
  color: 'var(--bb-muted)',
  cursor: 'pointer',
}

const profileFieldStyle = {
  width: '100%',
  border: '1px solid var(--bb-line)',
  borderRadius: 10,
  padding: '9px 11px',
  background: '#fff',
  color: 'var(--bb-ink)',
  outline: 'none',
  fontSize: '0.86rem',
}

const profileActionStyle = {
  height: 42,
  minHeight: 42,
  padding: '0 14px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'linear-gradient(135deg, #1f2028, #342a35)',
  color: '#fff',
  fontWeight: 800,
  fontSize: '0.9rem',
  lineHeight: 1,
  cursor: 'pointer',
  textDecoration: 'none',
  boxShadow: '0 12px 28px rgba(32,34,43,0.24), 0 0 18px rgba(207,95,145,0.14)',
  flex: '0 0 auto',
}
