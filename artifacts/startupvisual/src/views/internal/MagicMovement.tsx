import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CircleDot, Crown, Download, Eraser, Flower2, Gem, ImagePlus, Paintbrush, RefreshCcw, Send,
  Sparkles, Star, Wand2, Watch,
} from 'lucide-react'
import { useLocation } from 'wouter'
import { useApp } from '../../context/AppContext'
import { useProjects } from '../../context/ProjectContext'
import { photos } from '../../lib/photos'

interface Reference { id: string; url: string; name: string; useOnly: string; likes: string; dislikes: string }
interface RenderAngle { angle: string; url: string }
interface Render { id: string; url: string; images: RenderAngle[]; prompt: string; ts: number }

const USE_ONLY_OPTIONS = ['overall vibe', 'band', 'stone shape', 'setting', 'details']
const CATEGORY_OPTIONS = [
  { id: 'women_watch', label: 'Women watch', icon: Watch },
  { id: 'men_watch', label: 'Men watch', icon: Watch },
  { id: 'necklace', label: 'Necklace', icon: Gem },
  { id: 'earrings', label: 'Earrings', icon: Star },
  { id: 'pendant', label: 'Pendant', icon: Flower2 },
  { id: 'bangle', label: 'Bangle', icon: Crown },
  { id: 'ring', label: 'Ring', icon: CircleDot },
] as const
const SPARKLE_PARTICLES = [
  { x: 74, y: -82, duration: 2.55 },
  { x: -92, y: -54, duration: 2.85 },
  { x: 112, y: 34, duration: 3.05 },
  { x: -66, y: 92, duration: 2.45 },
  { x: 34, y: 116, duration: 3.2 },
  { x: -126, y: 16, duration: 2.75 },
  { x: 132, y: -18, duration: 2.9 },
  { x: -22, y: -124, duration: 3.1 },
  { x: 88, y: 88, duration: 2.65 },
  { x: -104, y: -96, duration: 3.35 },
]

function usableImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return trimmed
  return null
}

export default function MagicMovement() {
  const { showToast } = useApp()
  const { intakeDNA, saveAiGeneratedFolder, setEditorImage, pendingMagicReference, setPendingMagicReference } = useProjects()
  const [, setLocation] = useLocation()
  const [prompt, setPrompt] = useState('')
  const [imagePrompt, setImagePrompt] = useState('STYLE LOCK: 2D colored-pencil jewellery sketch only, scanned hand-drawn concept art, visible pencil grain, graphite outlines, faceted gemstone linework, transparent PNG cutout, centered single product, no logo, no text, no realistic photo, no 3D, no CAD, no glossy render')
  const [category, setCategory] = useState<typeof CATEGORY_OPTIONS[number]['id']>('women_watch')
  const [references, setReferences] = useState<Reference[]>([])
  const [generated, setGenerated] = useState<Render | null>(null)
  const [history, setHistory] = useState<Render[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const galleryBatchRef = useRef<{
    timer: number | null
    name: string
    prompt: string
    images: Array<{ url: string; label: string; prompt?: string; angle?: string }>
  }>({ timer: null, name: '', prompt: '', images: [] })

  const saveAiGeneratedImage = (image: { url: string; label: string; prompt?: string; angle?: string }) => {
    const batch = galleryBatchRef.current
    if (!batch.images.length) {
      batch.name = new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      batch.prompt = image.prompt || ''
    }
    batch.images.push({
      ...image,
      angle: image.angle || image.label.split(' - ')[0],
    })
    if (batch.timer) window.clearTimeout(batch.timer)
    batch.timer = window.setTimeout(() => {
      const payload = { name: batch.name, prompt: batch.prompt, images: [...batch.images] }
      batch.images = []
      batch.prompt = ''
      batch.name = ''
      batch.timer = null
      void saveAiGeneratedFolder(payload).catch(() => showToast('Render created, but gallery save failed', 'error'))
    }, 0)
  }

  useEffect(() => {
    if (intakeDNA && !prompt) {
      const parts = [intakeDNA.occasion, intakeDNA.notes].filter(Boolean)
      setPrompt(parts.join(', '))
      const source = parts.join(' ').toLowerCase()
      const matched = CATEGORY_OPTIONS.find(option =>
        source.includes(option.id.replace('_', ' ')) ||
        (option.id === 'men_watch' && /men|male|masculine|chronograph/.test(source)) ||
        (option.id === 'women_watch' && /women|female|feminine|bracelet watch|mother/.test(source)) ||
        (option.id === 'necklace' && /necklace|choker|collar/.test(source)) ||
        (option.id === 'earrings' && /earring|stud/.test(source)) ||
        (option.id === 'pendant' && /pendant|locket/.test(source)) ||
        (option.id === 'bangle' && /bangle|bracelet|cuff/.test(source)) ||
        (option.id === 'ring' && /ring|solitaire|halo/.test(source))
      )
      if (matched) setCategory(matched.id)
    }
  }, [intakeDNA])

  useEffect(() => {
    if (!pendingMagicReference) return
    setReferences(prev => {
      if (prev.some(ref => ref.url === pendingMagicReference.url)) return prev
      return [{
        id: `gallery_ref_${Date.now()}`,
        url: pendingMagicReference.url,
        name: pendingMagicReference.label || 'Gallery reference',
        useOnly: 'overall vibe',
        likes: '',
        dislikes: '',
      }, ...prev]
    })
    if (!prompt.trim() && pendingMagicReference.prompt) setPrompt(pendingMagicReference.prompt)
    setPendingMagicReference(null)
    showToast('Image added to Magic Movement references', 'success')
  }, [pendingMagicReference, prompt, setPendingMagicReference, showToast])

  // simulated progress when generating
  useEffect(() => {
    if (!isGenerating) { setProgress(0); return }
    let p = 0
    const id = window.setInterval(() => {
      p = Math.min(95, p + Math.random() * 9 + 3)
      setProgress(p)
    }, 220)
    return () => window.clearInterval(id)
  }, [isGenerating])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setReferences(prev => [...prev, {
        id: Date.now() + Math.random() + '',
        url: ev.target!.result as string,
        name: file.name,
        useOnly: 'overall vibe',
        likes: '',
        dislikes: '',
      }])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const buildPrompt = () => {
    const refNotes = references.map((ref, index) => {
      const parts = [
        `Reference ${index + 1}: use only for ${ref.useOnly}`,
        ref.likes ? `like ${ref.likes}` : '',
        ref.dislikes ? `avoid ${ref.dislikes}` : '',
      ].filter(Boolean)
      return parts.join('; ')
    })
    const lunaBrief = intakeDNA?.notes ? `Luna brief: ${intakeDNA.notes}` : ''
    return [lunaBrief, prompt, ...refNotes].filter(Boolean).join('\n')
  }

  const generate = async () => {
    if (!prompt.trim()) {
      showToast('Describe the piece first', 'error')
      return
    }
    setIsGenerating(true)
    setGenerated(null)
    try {
      const res = await fetch('/api/ai-render/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: buildPrompt(),
          imagePrompt,
          category,
          references,
          count: 1,
        }),
      }).catch(() => null)
      const data = await res?.json().catch(() => null)
      setProgress(100)
      const fallback = pickFallbackPhoto()
      const imageSet: RenderAngle[] = Array.isArray(data?.images) && data.images.length
        ? data.images.filter((image: unknown): image is RenderAngle => {
            return Boolean(image && typeof image === 'object' && usableImageUrl((image as RenderAngle).url))
          })
        : []
      const primaryUrl = usableImageUrl(data?.imageUrl) || imageSet[0]?.url || fallback
      const rendered: Render = {
        id: Date.now() + '',
        url: primaryUrl,
        images: imageSet.length ? imageSet : [{ angle: '45-degree front', url: primaryUrl }],
        prompt: buildPrompt(),
        ts: Date.now(),
      }
      // tiny pause to let the progress bar slide to 100%
      setTimeout(() => {
        setGenerated(rendered)
        setHistory(prev => [rendered, ...prev].slice(0, 8))
        saveAiGeneratedImage({
          url: rendered.url,
          label: `${rendered.images[0]?.angle || 'Concept'} - ${new Date(rendered.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          prompt: rendered.prompt,
        })
        setIsGenerating(false)
        showToast(usableImageUrl(data?.imageUrl) ? 'Design ready' : 'Demo design rendered', 'success')
      }, 350)
    } catch {
      setIsGenerating(false)
      showToast('Generation failed', 'error')
    }
  }

  const clearAll = () => {
    setPrompt('')
    setImagePrompt('STYLE LOCK: 2D colored-pencil jewellery sketch only, scanned hand-drawn concept art, visible pencil grain, graphite outlines, faceted gemstone linework, transparent PNG cutout, centered single product, no logo, no text, no realistic photo, no 3D, no CAD, no glossy render')
    setCategory('women_watch')
    setReferences([])
  }

  const updateReference = (id: string, patch: Partial<Reference>) => {
    setReferences(prev => prev.map(ref => ref.id === id ? { ...ref, ...patch } : ref))
  }

  const openMagicEditor = () => {
    if (!generated) return
    setEditorImage({
      id: generated.id,
      url: generated.url,
      label: 'Magic Movement render',
      angle: generated.images.find(image => image.url === generated.url)?.angle || '',
      prompt: generated.prompt,
      source: 'ai',
      createdAt: new Date(generated.ts).toISOString(),
    })
    setLocation('/workspace/magic-editor')
  }

  return (
    <div className="bb-page" data-testid="magic-movement" style={{ position: 'relative' }}>
      {/* Aurora backdrop */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background:
          'radial-gradient(circle at 10% 8%, rgba(227,141,90,0.18), transparent 36%),' +
          'radial-gradient(circle at 92% 14%, rgba(207,95,145,0.18), transparent 36%),' +
          'radial-gradient(circle at 50% 96%, rgba(139,107,181,0.18), transparent 40%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <header className="bb-page-header">
          <div>
            <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-2)' }}>Design bench</span>
            <h1 className="bb-display">
              Magic{' '}
              <span style={{
                fontFamily: "'Pinyon Script', cursive",
                color: 'var(--bb-rose)',
                fontSize: '1.2em', display: 'inline-block', paddingBottom: '0.06em', lineHeight: 1,
              }}>Movement</span>
              <span>.</span>
            </h1>
          </div>
          {generated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="bb-btn-secondary bb-lift" onClick={generate}>
                <RefreshCcw size={15} /> Regenerate
              </button>
              <button className="bb-btn-secondary bb-lift" onClick={openMagicEditor}>
                <Paintbrush size={15} /> Magic edit
              </button>
              <a
                href={generated.url}
                download
                className="bb-btn-primary bb-lift"
                style={{ textDecoration: 'none' }}
                data-testid="download-render"
              >
                <Download size={15} /> Download
              </a>
            </div>
          )}
        </header>

        <div
          className="bb-mm-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 0.82fr) minmax(0, 1.18fr)',
            gap: 18, alignItems: 'stretch',
          }}
        >
          {/* LEFT: prompt composer */}
          <div
            className="bb-card bb-lift"
            style={{
              padding: 24,
              position: 'relative',
              overflow: 'hidden',
              minHeight: 626,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {intakeDNA && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginBottom: 18, padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(207,95,145,0.07)',
                  border: '1px solid rgba(207,95,145,0.18)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <Wand2 size={16} style={{ color: 'var(--bb-rose)' }} />
                <span style={{ fontSize: '0.84rem', color: 'var(--bb-text)' }}>
                  Auto-filled from <strong style={{ color: 'var(--bb-ink)' }}>Luna intake</strong>
                </span>
              </motion.div>
            )}

            <Section label="Category">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORY_OPTIONS.map(option => {
                  const Icon = option.icon
                  const active = category === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setCategory(option.id)}
                      style={{
                        border: active ? '1px solid rgba(207,95,145,0.42)' : '1px solid var(--bb-line)',
                        background: active ? 'rgba(207,95,145,0.10)' : '#fff',
                        color: active ? 'var(--bb-rose)' : 'var(--bb-text)',
                        minHeight: 36,
                        borderRadius: 999,
                        padding: '8px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                      }}
                    >
                      <Icon size={14} />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </Section>

            <Section label="Design prompt">
              <textarea
                data-testid="mm-prompt"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                placeholder="Create a rose-gold women's bracelet watch with a mother-of-pearl dial, diamond bezel, pink sapphire accents..."
                style={{
                  width: '100%', border: '1px solid var(--bb-line)',
                  borderRadius: 14, padding: '14px 16px',
                  background: '#fff', color: 'var(--bb-ink)', outline: 'none',
                  resize: 'vertical', fontSize: '0.95rem', lineHeight: 1.55,
                }}
              />
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--bb-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                }}
              >
                <Sparkles size={14} style={{ color: 'var(--bb-rose)' }} />
                <span>Luna brief plus your prompt becomes one transparent pencil-sketch concept.</span>
              </motion.div>
            </Section>

            <Section label="Image prompt">
              <textarea
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                rows={3}
                placeholder="STYLE LOCK: 2D colored-pencil sketch only, visible pencil grain, graphite outlines, transparent PNG cutout, no realistic photo, no 3D, no CAD..."
                style={{
                  width: '100%',
                  border: '1px solid var(--bb-line)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  background: '#fff',
                  color: 'var(--bb-ink)',
                  outline: 'none',
                  resize: 'vertical',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                }}
              />
            </Section>

            <Section label="References" style={{ flex: 1 }}>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
              <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
                <AnimatePresence initial={false}>
                  {references.map(ref => (
                  <motion.div
                    key={ref.id}
                    layout
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    style={{
                      position: 'relative', borderRadius: 12,
                      border: '1px solid var(--bb-line)', padding: 8, background: 'rgba(255,255,255,0.7)',
                      display: 'grid', gridTemplateColumns: '74px minmax(0, 1fr)', gap: 10,
                    }}
                  >
                    <img src={ref.url} alt={ref.name} style={{ width: 74, height: 74, objectFit: 'cover', borderRadius: 10 }} />
                    <div style={{ display: 'grid', gap: 6 }}>
                      <select
                        value={ref.useOnly}
                        onChange={e => updateReference(ref.id, { useOnly: e.target.value })}
                        style={{ border: '1px solid var(--bb-line)', borderRadius: 8, padding: '6px 8px', background: '#fff', fontSize: '0.72rem' }}
                      >
                        {USE_ONLY_OPTIONS.map(opt => <option key={opt} value={opt}>Use only: {opt}</option>)}
                      </select>
                      <input
                        value={ref.likes}
                        onChange={e => updateReference(ref.id, { likes: e.target.value })}
                        placeholder="What I like..."
                        style={{ border: 0, borderBottom: '1px solid var(--bb-line)', background: 'transparent', padding: '3px 0', fontSize: '0.72rem', outline: 'none' }}
                      />
                      <input
                        value={ref.dislikes}
                        onChange={e => updateReference(ref.id, { dislikes: e.target.value })}
                        placeholder="What I don't like..."
                        style={{ border: 0, borderBottom: '1px solid var(--bb-line)', background: 'transparent', padding: '3px 0', fontSize: '0.72rem', outline: 'none' }}
                      />
                    </div>
                    <button
                      onClick={() => setReferences(prev => prev.filter(r => r.id !== ref.id))}
                      aria-label="Remove reference"
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 20, height: 20, borderRadius: '50%',
                        border: 0, background: 'rgba(0,0,0,0.6)', color: '#fff',
                        cursor: 'pointer', fontSize: 12, lineHeight: 1,
                      }}
                    >x</button>
                  </motion.div>
                  ))}
                </AnimatePresence>
                <button
                  onClick={() => fileRef.current?.click()}
                  data-testid="mm-upload-ref"
                  style={{
                    minHeight: 74, borderRadius: 12,
                    border: '1.5px dashed var(--bb-line)',
                    background: 'rgba(255,255,255,0.55)',
                    color: 'var(--bb-muted)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', gap: 4, fontSize: '0.7rem', fontWeight: 600,
                    transition: 'border-color 0.2s ease, color 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bb-rose)'; e.currentTarget.style.color = 'var(--bb-rose)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bb-line)'; e.currentTarget.style.color = 'var(--bb-muted)' }}
                >
                  <ImagePlus size={18} />
                  Add
                </button>
              </div>
            </Section>

            <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 18 }}>
              <button
                onClick={clearAll}
                className="bb-btn-ghost"
                style={{ padding: '12px 16px' }}
              >
                <Eraser size={15} /> Clear
              </button>
              <button
                data-testid="mm-generate"
                onClick={generate}
                disabled={isGenerating}
                className="bb-btn-primary bb-lift"
                style={{
                  flex: 1, padding: '14px 20px', justifyContent: 'center',
                  opacity: isGenerating ? 0.65 : 1, cursor: isGenerating ? 'progress' : 'pointer',
                }}
              >
                <Sparkles size={17} />
                {isGenerating ? 'Generating...' : 'Generate concepts'}
                <Send size={14} style={{ marginLeft: 4 }} />
              </button>
            </div>
          </div>

          {/* RIGHT: canvas */}
          <div
            className="bb-card"
            style={{
              position: 'relative', overflow: 'hidden',
              padding: 0, minHeight: 540,
              height: '100%',
              display: 'grid', gridTemplateRows: '1fr auto',
            }}
          >
            <div
              style={{
                position: 'relative',
                minHeight: 538,
                background:
                  'radial-gradient(circle at 30% 20%, rgba(227,141,90,0.10), transparent 50%),' +
                  'radial-gradient(circle at 80% 80%, rgba(139,107,181,0.10), transparent 50%),' +
                  'linear-gradient(135deg, #fdfbf8, #f4ece6)',
                display: 'grid', placeItems: 'center',
                padding: 24,
              }}
            >
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <GeneratingState key="generating" progress={progress} prompt={buildPrompt()} />
                ) : generated ? (
                  <motion.div
                    key={generated.id}
                    initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.7, ease: [0.22, 0.9, 0.32, 1] }}
                    style={{ width: '100%', maxWidth: 540 }}
                  >
                    <div style={{
                      position: 'relative', borderRadius: 18, overflow: 'hidden',
                      minHeight: 360,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'radial-gradient(circle at 50% 52%, rgba(255,255,255,0.96), rgba(255,255,255,0.46) 58%, transparent 74%)',
                    }}>
                      <img
                        src={generated.url}
                        alt="Generated render"
                        style={{ width: '100%', maxHeight: 420, display: 'block', objectFit: 'contain', filter: 'drop-shadow(0 24px 28px rgba(51,39,35,0.18))' }}
                      />
                      <div style={{
                        position: 'absolute', left: 14, bottom: 14, right: 14,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                        color: '#fff',
                      }}>
                        <div>
                          <span style={{
                            display: 'block', fontSize: '0.66rem',
                            textTransform: 'uppercase', letterSpacing: '0.18em',
                            opacity: 0.85, marginBottom: 4,
                            textShadow: '0 1px 3px rgba(0,0,0,0.45)',
                          }}>Concept - v{history.length + 1}</span>
                          <strong style={{
                            fontFamily: 'var(--app-font-display)', fontWeight: 500,
                            fontSize: '1.05rem',
                            textShadow: '0 2px 8px rgba(0,0,0,0.45)',
                          }}>
                            {generated.prompt.slice(0, 64)}{generated.prompt.length > 64 ? '...' : ''}
                          </strong>
                        </div>
                      </div>
                    </div>
                    <div style={{
                      marginTop: 12,
                      borderRadius: 12,
                      border: '1px solid var(--bb-line)',
                      background: 'rgba(255,255,255,0.72)',
                      padding: '11px 13px',
                      color: 'var(--bb-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      lineHeight: 1.5,
                    }}>
                      Concept visuals only. CAD and manufacturability validation come after a design is selected.
                    </div>
                  </motion.div>
                ) : (
                  <EmptyCanvas
                    key="empty"
                    category={CATEGORY_OPTIONS.find(option => option.id === category)?.label || 'Jewellery'}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Render history rail */}
            <div style={{
              borderTop: '1px solid var(--bb-line)',
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(14px)',
              padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 12,
              minHeight: 88,
            }}>
              <div>
                <span style={{
                  display: 'block', color: 'var(--bb-muted)',
                  fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 4,
                }}>Renders</span>
                <strong style={{ color: 'var(--bb-ink)', fontFamily: 'var(--app-font-display)', fontSize: '1rem', fontWeight: 500 }}>
                  {history.length}/8
                </strong>
              </div>
              <div style={{
                flex: 1, display: 'flex', gap: 8,
                overflowX: 'auto', paddingBottom: 2,
              }}>
                {history.length === 0 ? (
                  <span style={{ color: 'var(--bb-muted)', fontSize: '0.82rem' }}>
                    Generations will appear here as you iterate.
                  </span>
                ) : history.map((r, i) => (
                  <motion.button
                    key={r.id}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setGenerated(r)}
                    style={{
                      flex: '0 0 auto', width: 60, height: 60, borderRadius: 12,
                      overflow: 'hidden', border: generated?.id === r.id ? '2px solid var(--bb-rose)' : '1px solid var(--bb-line)',
                      padding: 0, cursor: 'pointer', background: '#fff',
                      boxShadow: generated?.id === r.id ? '0 8px 20px rgba(207,95,145,0.22)' : 'none',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <img src={r.url} alt={`render ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function Section({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 18, ...style }}>
      <label style={{
        display: 'block', color: 'var(--bb-muted)',
        fontSize: '0.7rem', fontWeight: 700, marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: '0.14em',
      }}>{label}</label>
      {children}
    </div>
  )
}

function EmptyCanvas({ category }: { category: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      style={{ textAlign: 'center', maxWidth: 360 }}
    >
      <motion.div
        animate={{
          rotate: [0, 8, -8, 0],
          y: [0, -6, 0],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 96, height: 96, borderRadius: '50%',
          margin: '0 auto 22px',
          display: 'grid', placeItems: 'center',
          background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet))',
          boxShadow: '0 22px 50px rgba(207,95,145,0.28)',
          color: '#fff',
        }}
      >
        <Sparkles size={36} />
      </motion.div>
      <h3 className="bb-display" style={{ margin: '0 0 8px', fontSize: '1.6rem', lineHeight: 1.15 }}>
        Generate {category}
      </h3>
      <p style={{ margin: 0, color: 'var(--bb-muted)', lineHeight: 1.55, fontSize: '0.9rem' }}>
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
      {/* Sparkle trail */}
      {SPARKLE_PARTICLES.map((particle, i) => (
        <motion.span
          key={i}
          animate={{
            x: [0, particle.x],
            y: [0, particle.y],
            opacity: [0, 1, 0],
            scale: [0.4, 1, 0.4],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: i * 0.18,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            left: '50%', top: '38%',
            width: 6, height: 6, borderRadius: '50%',
            background:
              i % 3 === 0 ? '#cf5f91' :
              i % 3 === 1 ? '#e38d5a' : '#8b6bb5',
            boxShadow: '0 0 10px currentColor',
            pointerEvents: 'none',
          }}
        />
      ))}

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 110, height: 110, borderRadius: '50%',
          margin: '0 auto 22px',
          background:
            'conic-gradient(from 0deg, #e38d5a, #cf5f91, #8b6bb5, #3f8874, #e38d5a)',
          padding: 4,
        }}
      >
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: '#fff',
          display: 'grid', placeItems: 'center',
          color: 'var(--bb-rose)',
        }}>
          <Gem size={34} />
        </div>
      </motion.div>

      <h3 className="bb-display" style={{ margin: '0 0 8px', fontSize: '1.5rem' }}>
        Crafting your design
      </h3>
      <p style={{ color: 'var(--bb-muted)', margin: '0 auto 18px', fontSize: '0.88rem', lineHeight: 1.5, maxWidth: 320 }}>
        {prompt || 'Composing prompt...'}
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
        fontSize: '0.74rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700,
      }}>
        {Math.round(progress)}%
      </span>
    </motion.div>
  )
}

function pickFallbackPhoto() {
  return photos.goldStack
}

