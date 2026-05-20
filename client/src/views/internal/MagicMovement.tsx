import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CircleDot, Crown, Download, Eraser, Flower2, Gem, ImagePlus,
  Paintbrush, RefreshCcw, Send, Sparkles, Star, Wand2, Watch, X,
} from 'lucide-react'
import { useLocation } from 'wouter'
import { useApp } from '../../context/AppContext'
import { useProjects } from '../../context/ProjectContext'
import { photos } from '../../lib/photos'
import { removeWhiteBackground } from '../../lib/removeBackground'

interface Reference { id: string; url: string; name: string }
interface RenderAngle { angle: string; url: string }
interface Render { id: string; url: string; images: RenderAngle[]; prompt: string; ts: number }

const STYLE_LOCK = 'STYLE LOCK: 2D colored-pencil jewellery sketch only, scanned hand-drawn concept art, visible pencil grain, graphite outlines, faceted gemstone linework, transparent PNG cutout, centered single product, no logo, no text, no realistic photo, no 3D, no CAD, no glossy render'

const CATEGORY_OPTIONS = [
  { id: 'women_watch', label: 'Women watch', icon: Watch },
  { id: 'men_watch',   label: 'Men watch',   icon: Watch },
  { id: 'necklace',   label: 'Necklace',    icon: Gem },
  { id: 'earrings',   label: 'Earrings',    icon: Star },
  { id: 'pendant',    label: 'Pendant',     icon: Flower2 },
  { id: 'bangle',     label: 'Bangle',      icon: Crown },
  { id: 'ring',       label: 'Ring',        icon: CircleDot },
] as const

const SPARKLE_PARTICLES = [
  { x: 74,   y: -82,  duration: 2.55 },
  { x: -92,  y: -54,  duration: 2.85 },
  { x: 112,  y:  34,  duration: 3.05 },
  { x: -66,  y:  92,  duration: 2.45 },
  { x:  34,  y: 116,  duration: 3.20 },
  { x: -126, y:  16,  duration: 2.75 },
  { x: 132,  y: -18,  duration: 2.90 },
  { x: -22,  y: -124, duration: 3.10 },
  { x:  88,  y:  88,  duration: 2.65 },
  { x: -104, y: -96,  duration: 3.35 },
]

function usableImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return trimmed
  return null
}

export default function MagicMovement() {
  const { showToast } = useApp()
  const {
    intakeDNA, saveAiGeneratedFolder, setEditorImage,
    pendingMagicReference, setPendingMagicReference,
  } = useProjects()
  const [, setLocation] = useLocation()

  const [prompt, setPrompt]     = useState('')
  const [category, setCategory] = useState<typeof CATEGORY_OPTIONS[number]['id']>('women_watch')
  const [references, setReferences] = useState<Reference[]>([])
  const [generated, setGenerated]   = useState<Render | null>(null)
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [history, setHistory]       = useState<Render[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress]     = useState(0)

  const fileRef = useRef<HTMLInputElement>(null)
  const galleryBatchRef = useRef<{
    timer: number | null
    name: string; prompt: string
    images: Array<{ url: string; label: string; prompt?: string; angle?: string }>
  }>({ timer: null, name: '', prompt: '', images: [] })

  /* ── Gallery save helper ── */
  const saveAiGeneratedImage = (image: { url: string; label: string; prompt?: string; angle?: string }) => {
    const batch = galleryBatchRef.current
    if (!batch.images.length) {
      batch.name   = new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      batch.prompt = image.prompt || ''
    }
    batch.images.push({ ...image, angle: image.angle || image.label.split(' - ')[0] })
    if (batch.timer) window.clearTimeout(batch.timer)
    batch.timer = window.setTimeout(() => {
      const payload = { name: batch.name, prompt: batch.prompt, images: [...batch.images] }
      batch.images = []; batch.prompt = ''; batch.name = ''; batch.timer = null
      void saveAiGeneratedFolder(payload).catch(() => showToast('Render created, but gallery save failed', 'error'))
    }, 0)
  }

  /* ── Auto-fill from Luna intake ── */
  useEffect(() => {
    if (intakeDNA && !prompt) applyLuna()
  }, [intakeDNA])

  const applyLuna = () => {
    if (!intakeDNA) return
    const parts = [intakeDNA.occasion, intakeDNA.notes].filter(Boolean)
    if (parts.length) setPrompt(parts.join(', '))
    const source = parts.join(' ').toLowerCase()
    const matched = CATEGORY_OPTIONS.find(opt =>
      source.includes(opt.id.replace('_', ' ')) ||
      (opt.id === 'men_watch'   && /men|male|masculine|chronograph/.test(source)) ||
      (opt.id === 'women_watch' && /women|female|feminine|bracelet watch|mother/.test(source)) ||
      (opt.id === 'necklace'    && /necklace|choker|collar/.test(source)) ||
      (opt.id === 'earrings'    && /earring|stud/.test(source)) ||
      (opt.id === 'pendant'     && /pendant|locket/.test(source)) ||
      (opt.id === 'bangle'      && /bangle|bracelet|cuff/.test(source)) ||
      (opt.id === 'ring'        && /ring|solitaire|halo/.test(source))
    )
    if (matched) setCategory(matched.id)
    showToast('Luna brief applied', 'success')
  }

  /* ── Pending magic reference ── */
  useEffect(() => {
    if (!pendingMagicReference) return
    setReferences(prev => {
      if (prev.some(r => r.url === pendingMagicReference.url)) return prev
      return [{
        id: `gallery_ref_${Date.now()}`,
        url: pendingMagicReference.url,
        name: pendingMagicReference.label || 'Gallery reference',
      }, ...prev]
    })
    if (!prompt.trim() && pendingMagicReference.prompt) setPrompt(pendingMagicReference.prompt)
    setPendingMagicReference(null)
    showToast('Image added to references', 'success')
  }, [pendingMagicReference])

  /* ── Progress animation ── */
  useEffect(() => {
    if (!isGenerating) { setProgress(0); return }
    let p = 0
    const id = window.setInterval(() => {
      p = Math.min(95, p + Math.random() * 9 + 3)
      setProgress(p)
    }, 220)
    return () => window.clearInterval(id)
  }, [isGenerating])

  /* ── File upload ── */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setReferences(prev => [...prev, {
        id: Date.now() + Math.random() + '',
        url: ev.target!.result as string,
        name: file.name,
      }])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  /* ── Build final prompt ── */
  const buildPrompt = () => {
    const lunaBrief = intakeDNA?.notes ? `Luna brief: ${intakeDNA.notes}` : ''
    return [lunaBrief, prompt].filter(Boolean).join('\n')
  }

  /* ── Generate ── */
  const generate = async () => {
    if (!prompt.trim()) { showToast('Describe the piece first', 'error'); return }
    setIsGenerating(true)
    setGenerated(null)
    setDisplayUrl(null)
    const finalPrompt = buildPrompt()
    try {
      const res = await fetch('/api/ai-render/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          imagePrompt: STYLE_LOCK,
          category,
          references: references.map(r => ({ ...r, useOnly: 'overall vibe', likes: '', dislikes: '' })),
          count: 1,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setIsGenerating(false)
        showToast(typeof data?.error === 'string' ? data.error : `Generation failed (${res.status})`, 'error')
        return
      }
      setProgress(100)
      const imageSet: RenderAngle[] = Array.isArray(data?.images) && data.images.length
        ? data.images.filter((img: unknown): img is RenderAngle =>
            Boolean(img && typeof img === 'object' && usableImageUrl((img as RenderAngle).url)))
        : []
      const aiUrl   = usableImageUrl(data?.imageUrl) || imageSet[0]?.url
      const primary = aiUrl || photos.goldStack
      const rendered: Render = {
        id: Date.now() + '',
        url: primary,
        images: imageSet.length ? imageSet : [{ angle: '45-degree front', url: primary }],
        prompt: finalPrompt,
        ts: Date.now(),
      }
      setTimeout(async () => {
        setGenerated(rendered)
        setHistory(prev => [rendered, ...prev].slice(0, 8))
        saveAiGeneratedImage({
          url: rendered.url,
          label: `${rendered.images[0]?.angle || 'Concept'} - ${new Date(rendered.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          prompt: rendered.prompt,
        })
        setIsGenerating(false)
        showToast(aiUrl ? 'Design ready' : 'AI unavailable — showing placeholder', aiUrl ? 'success' : 'error')
        // Strip white background so image floats on the aurora gradient
        const transparent = await removeWhiteBackground(rendered.url)
        setDisplayUrl(transparent)
      }, 350)
    } catch {
      setIsGenerating(false)
      showToast('Could not reach the API. Start the server or set API_PROXY_TARGET when using Vite dev.', 'error')
    }
  }

  const openMagicEditor = () => {
    if (!generated) return
    setEditorImage({
      id: generated.id, url: generated.url,
      label: 'Magic Movement render',
      angle: generated.images.find(img => img.url === generated.url)?.angle || '',
      prompt: generated.prompt, source: 'ai',
      createdAt: new Date(generated.ts).toISOString(),
    })
    setLocation('/workspace/magic-editor')
  }

  const clearAll = () => {
    setPrompt('')
    setCategory('women_watch')
    setReferences([])
  }

  const hasLuna = Boolean(intakeDNA?.occasion || intakeDNA?.notes)

  /* ─────────────────────────────────────────
   * RENDER
   * ───────────────────────────────────────── */
  return (
    <div className="bb-page" data-testid="magic-movement" style={{ position: 'relative' }}>
      {/* Aurora backdrop */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background:
          'radial-gradient(circle at 10% 8%,  rgba(227,141,90,0.15), transparent 36%),' +
          'radial-gradient(circle at 92% 14%, rgba(207,95,145,0.15), transparent 36%),' +
          'radial-gradient(circle at 50% 96%, rgba(139,107,181,0.15), transparent 40%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── Page header ── */}
        <header className="bb-page-header">
          <div>
            <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-2)' }}>Design bench</span>
            <h1 className="bb-display">
              Magic{' '}
              <span style={{
                fontFamily: "'Pinyon Script', cursive",
                color: 'var(--bb-rose)', fontSize: '1.2em',
                display: 'inline-block', paddingBottom: '0.06em', lineHeight: 1,
              }}>Movement</span>
              <span>.</span>
            </h1>
          </div>
        </header>

        {/* ── Two-column grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '252px 1fr', gap: 14, alignItems: 'start' }}>

          {/* ════════════════════════════════
              LEFT SIDEBAR — prompt composer
              ════════════════════════════════ */}
          <div
            className="bb-card bb-lift"
            style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 580 }}
          >
            {/* ── Category chips ── */}
            <div>
              <label style={LABEL_STYLE}>Category</label>
              {/* Scrollable single-row chip strip */}
              <div style={{
                display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
                scrollbarWidth: 'none',
              }}>
                {CATEGORY_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  const active = category === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCategory(opt.id)}
                      style={{
                        flexShrink: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                        padding: '10px 12px', borderRadius: 14, cursor: 'pointer',
                        border: active ? '1.5px solid transparent' : '1.5px solid var(--bb-line)',
                        background: active
                          ? 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet))'
                          : 'rgba(255,255,255,0.72)',
                        color: active ? '#fff' : 'var(--bb-muted)',
                        boxShadow: active
                          ? '0 4px 16px rgba(207,95,145,0.32)'
                          : '0 1px 4px rgba(0,0,0,0.04)',
                        transition: 'all 0.18s ease',
                        minWidth: 58,
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: active ? 'rgba(255,255,255,0.18)' : 'rgba(207,95,145,0.07)',
                        display: 'grid', placeItems: 'center',
                      }}>
                        <Icon size={15} style={{ flexShrink: 0 }} />
                      </div>
                      <span style={{ fontSize: '0.64rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Design prompt with Apply Luna ── */}
            <div style={{ flex: 1 }}>
              {/* Apply Luna — small chip above textarea */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={LABEL_STYLE}>Design prompt</label>
                <button
                  onClick={applyLuna}
                  disabled={!hasLuna}
                  title={hasLuna ? 'Fill prompt from Luna intake' : 'No Luna brief yet'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 999,
                    border: hasLuna
                      ? '1px solid rgba(207,95,145,0.35)'
                      : '1px solid var(--bb-line)',
                    background: hasLuna ? 'rgba(207,95,145,0.07)' : 'transparent',
                    color: hasLuna ? 'var(--bb-rose)' : 'var(--bb-muted)',
                    fontSize: '0.7rem', fontWeight: 800, cursor: hasLuna ? 'pointer' : 'default',
                    opacity: hasLuna ? 1 : 0.45,
                    transition: 'all 0.18s ease',
                  }}
                >
                  <Wand2 size={12} />
                  Apply Luna
                </button>
              </div>

              <textarea
                data-testid="mm-prompt"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={5}
                placeholder="Describe the piece — metal, stones, occasion, style..."
                style={{
                  width: '100%', border: '1px solid var(--bb-line)',
                  borderRadius: 12, padding: '10px 12px',
                  background: '#fff', color: 'var(--bb-ink)', outline: 'none',
                  resize: 'vertical', fontSize: '0.86rem', lineHeight: 1.55,
                  boxSizing: 'border-box',
                }}
              />

              <div style={{
                marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                color: 'var(--bb-muted)', fontSize: '0.72rem', fontWeight: 700,
              }}>
                <Sparkles size={12} style={{ color: 'var(--bb-rose)', flexShrink: 0 }} />
                <span>Luna brief + your prompt → one transparent pencil-sketch concept.</span>
              </div>
            </div>

            {/* ── References ── */}
            <div>
              <label style={LABEL_STYLE}>References</label>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />

              {references.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <AnimatePresence initial={false}>
                    {references.map(ref => (
                      <motion.div
                        key={ref.id}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}
                      >
                        <img
                          src={ref.url} alt={ref.name}
                          style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--bb-line)' }}
                        />
                        <button
                          onClick={() => setReferences(prev => prev.filter(r => r.id !== ref.id))}
                          aria-label="Remove"
                          style={{
                            position: 'absolute', top: -5, right: -5,
                            width: 18, height: 18, borderRadius: '50%',
                            border: 0, background: 'rgba(0,0,0,0.65)', color: '#fff',
                            cursor: 'pointer', fontSize: 10, lineHeight: 1,
                            display: 'grid', placeItems: 'center',
                          }}
                        >
                          <X size={9} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              <button
                onClick={() => fileRef.current?.click()}
                data-testid="mm-upload-ref"
                style={{
                  width: '100%', minHeight: 54, borderRadius: 12,
                  border: '1.5px dashed var(--bb-line)',
                  background: 'rgba(255,255,255,0.55)',
                  color: 'var(--bb-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 7, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700,
                  transition: 'border-color 0.18s ease, color 0.18s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bb-rose)'; e.currentTarget.style.color = 'var(--bb-rose)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bb-line)'; e.currentTarget.style.color = 'var(--bb-muted)' }}
              >
                <ImagePlus size={16} /> Add reference image
              </button>
            </div>

            {/* ── Action buttons ── */}
            <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
              <button onClick={clearAll} className="bb-btn-ghost" style={{ padding: '11px 14px' }}>
                <Eraser size={14} /> Clear
              </button>
              <button
                data-testid="mm-generate"
                onClick={generate}
                disabled={isGenerating}
                className="bb-btn-primary bb-lift"
                style={{
                  flex: 1, padding: '13px 18px', justifyContent: 'center',
                  opacity: isGenerating ? 0.65 : 1,
                  cursor: isGenerating ? 'progress' : 'pointer',
                }}
              >
                <Sparkles size={16} />
                {isGenerating ? 'Generating...' : 'Generate concept'}
                {!isGenerating && <Send size={13} style={{ marginLeft: 3 }} />}
              </button>
            </div>
          </div>

          {/* ════════════════════════════════
              RIGHT — floating canvas (no card, no history box)
              ════════════════════════════════ */}
          <div style={{
            position: 'relative', minHeight: 580,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <GeneratingState key="gen" progress={progress} prompt={buildPrompt()} />
              ) : generated ? (
                <motion.div
                  key={generated.id}
                  initial={{ opacity: 0, scale: 0.92, y: 24, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, ease: [0.22, 0.9, 0.32, 1] }}
                  style={{ width: '100%', maxWidth: 700, textAlign: 'center' }}
                >
                  {/* Generated image */}
                  <img
                    src={displayUrl ?? generated.url}
                    alt="Generated render"
                    style={{
                      width: '100%', maxHeight: 600,
                      display: 'block', objectFit: 'contain',
                      filter:
                        'drop-shadow(0 32px 56px rgba(139,107,181,0.32))' +
                        ' drop-shadow(0 12px 28px rgba(207,95,145,0.22))',
                    }}
                  />

                  {/* Icon action buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    style={{
                      marginTop: 22,
                      display: 'inline-flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    {/* Regenerate */}
                    <button
                      onClick={generate}
                      title="Regenerate"
                      style={ICON_BTN}
                      onMouseEnter={e => Object.assign(e.currentTarget.style, ICON_BTN_HOVER)}
                      onMouseLeave={e => Object.assign(e.currentTarget.style, ICON_BTN)}
                    >
                      <RefreshCcw size={16} />
                      <span style={ICON_LABEL}>Regenerate</span>
                    </button>

                    {/* Magic edit */}
                    <button
                      onClick={openMagicEditor}
                      title="Magic edit"
                      style={ICON_BTN}
                      onMouseEnter={e => Object.assign(e.currentTarget.style, ICON_BTN_HOVER)}
                      onMouseLeave={e => Object.assign(e.currentTarget.style, ICON_BTN)}
                    >
                      <Paintbrush size={16} />
                      <span style={ICON_LABEL}>Magic edit</span>
                    </button>

                    {/* Download */}
                    <a
                      href={displayUrl ?? generated.url}
                      download="concept.png"
                      data-testid="download-render"
                      title="Download"
                      style={{ ...ICON_BTN, textDecoration: 'none', color: '#fff', background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet))' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(207,95,145,0.35)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                    >
                      <Download size={16} />
                      <span style={ICON_LABEL}>Download</span>
                    </a>
                  </motion.div>

                  {/* Concept label */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    style={{
                      marginTop: 12,
                      fontSize: '0.68rem', color: 'var(--bb-muted)',
                      letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
                    }}
                  >
                    Concept · v{history.length}
                  </motion.div>
                </motion.div>
              ) : (
                <EmptyCanvas
                  key="empty"
                  category={CATEGORY_OPTIONS.find(o => o.id === category)?.label || 'Jewellery'}
                />
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  )
}

/* ── Shared label style ── */
const LABEL_STYLE: CSSProperties = {
  display: 'block', color: 'var(--bb-muted)',
  fontSize: '0.68rem', fontWeight: 700, marginBottom: 8,
  textTransform: 'uppercase', letterSpacing: '0.14em',
}

/* ── Icon action button styles ── */
const ICON_BTN: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', borderRadius: 999, cursor: 'pointer',
  border: '1px solid rgba(255,255,255,0.8)',
  background: 'rgba(255,255,255,0.62)',
  backdropFilter: 'blur(12px)',
  color: 'var(--bb-ink)', fontSize: '0.76rem', fontWeight: 700,
  boxShadow: '0 2px 12px rgba(139,107,181,0.10)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
}
const ICON_BTN_HOVER: CSSProperties = {
  ...ICON_BTN,
  transform: 'translateY(-2px)',
  boxShadow: '0 8px 24px rgba(139,107,181,0.18)',
}
const ICON_LABEL: CSSProperties = { fontSize: '0.74rem', fontWeight: 700 }

/* ── Sub-components ── */

function EmptyCanvas({ category }: { category: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      style={{ textAlign: 'center', maxWidth: 380 }}
    >
      <motion.div
        animate={{ rotate: [0, 8, -8, 0], y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 96, height: 96, borderRadius: '50%',
          margin: '0 auto 22px', display: 'grid', placeItems: 'center',
          background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet))',
          boxShadow: '0 22px 50px rgba(207,95,145,0.28)', color: '#fff',
        }}
      >
        <Sparkles size={36} />
      </motion.div>
      <h3 className="bb-display" style={{ margin: '0 0 8px', fontSize: '1.55rem', lineHeight: 1.15 }}>
        Generate {category}
      </h3>
      <p style={{ margin: 0, color: 'var(--bb-muted)', lineHeight: 1.55, fontSize: '0.88rem' }}>
        One transparent pencil-sketch concept will appear here.
      </p>
    </motion.div>
  )
}

function GeneratingState({ progress, prompt }: { progress: number; prompt: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ textAlign: 'center', maxWidth: 380, position: 'relative' }}
    >
      {SPARKLE_PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          animate={{ x: [0, p.x], y: [0, p.y], opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: i * 0.18, ease: 'easeOut' }}
          style={{
            position: 'absolute', left: '50%', top: '38%',
            width: 6, height: 6, borderRadius: '50%', pointerEvents: 'none',
            background: i % 3 === 0 ? '#cf5f91' : i % 3 === 1 ? '#e38d5a' : '#8b6bb5',
            boxShadow: '0 0 10px currentColor',
          }}
        />
      ))}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 110, height: 110, borderRadius: '50%',
          margin: '0 auto 22px',
          background: 'conic-gradient(from 0deg, #e38d5a, #cf5f91, #8b6bb5, #3f8874, #e38d5a)',
          padding: 4,
        }}
      >
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: '#fff', display: 'grid', placeItems: 'center',
          color: 'var(--bb-rose)',
        }}>
          <Gem size={34} />
        </div>
      </motion.div>
      <h3 className="bb-display" style={{ margin: '0 0 8px', fontSize: '1.45rem' }}>Crafting your design</h3>
      <p style={{ color: 'var(--bb-muted)', margin: '0 auto 18px', fontSize: '0.86rem', lineHeight: 1.5, maxWidth: 300 }}>
        {prompt || 'Composing prompt…'}
      </p>
      <div style={{
        width: 260, maxWidth: '90%', margin: '0 auto',
        height: 6, borderRadius: 999,
        background: 'rgba(207,95,145,0.12)', overflow: 'hidden',
      }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--bb-coral), var(--bb-rose), var(--bb-violet))',
            boxShadow: '0 0 10px rgba(207,95,145,0.45)',
          }}
        />
      </div>
      <span style={{
        display: 'block', marginTop: 8, color: 'var(--bb-muted)',
        fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700,
      }}>
        {Math.round(progress)}%
      </span>
    </motion.div>
  )
}
