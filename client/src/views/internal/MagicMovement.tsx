import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react'
import { useLocation } from 'wouter'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CircleDot, Crown, Download, Eraser, Flower2, Gem, ImagePlus, Images,
  Pencil, RefreshCcw, Send, Sparkles, Star, Wand2, Watch, X, Check,
  Timer, Heart, Link, Disc3, Diamond, Type, Box,
} from 'lucide-react'
import { useAnnotationCanvas } from '../../hooks/useAnnotationCanvas'
import { useApp } from '../../context/AppContext'
import { useProjects, type GalleryImage } from '../../context/ProjectContext'
import { photos } from '../../lib/photos'
import { removeWhiteBackground } from '../../lib/removeBackground'
import { useBackgroundJobs, type ImageGenJob } from '../../store/backgroundJobs'

interface Reference { id: string; url: string; name: string }
interface RenderAngle { angle: string; url: string }
interface Render { id: string; url: string; images: RenderAngle[]; prompt: string; ts: number }
type RenderJobStatus = 'queued' | 'running' | 'completed' | 'failed'

const STYLE_LOCK = 'STYLE LOCK: 2D colored-pencil jewellery sketch only, scanned hand-drawn concept art, visible pencil grain, graphite outlines, faceted gemstone linework, transparent PNG cutout, centered single product, no logo, no text, no realistic photo, no 3D, no CAD, no glossy render'

const CATEGORY_OPTIONS = [
  { id: 'women_watch', label: 'Women\nWatch',  icon: Watch   },
  { id: 'men_watch',   label: 'Men\nWatch',    icon: Timer   },
  { id: 'necklace',   label: 'Necklace',      icon: Link    },
  { id: 'earrings',   label: 'Earrings',      icon: Gem     },
  { id: 'pendant',    label: 'Pendant',       icon: Heart   },
  { id: 'bangle',     label: 'Bangle',        icon: Disc3   },
  { id: 'ring',       label: 'Ring',          icon: Diamond },
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
  const [location, setLocation] = useLocation()
  const isCustomerPortal = location.startsWith('/portal')
  const {
    intakeDNA,
    saveAiGeneratedImage,
    aiGeneratedImages,
    pendingMagicReference, setPendingMagicReference,
    pendingEditResult, setPendingEditResult,
    setPending3DImageUrl,
  } = useProjects()

  const { addImageJob, removeJob, cancelAllImageJobs } = useBackgroundJobs()

  // ── Derive generating state from global store ──
  const activeImageJob = useBackgroundJobs(s =>
    s.jobs.find((j): j is ImageGenJob =>
      j.type === 'image-gen' && (j.status === 'queued' || j.status === 'running'),
    ) ?? null,
  )
  const completedImageJob = useBackgroundJobs(s =>
    s.jobs.find((j): j is ImageGenJob =>
      j.type === 'image-gen' && (j.status === 'completed' || j.status === 'failed'),
    ) ?? null,
  )

  // Local UI state
  const [prompt, setPrompt]     = useState('')
  const [category, setCategory] = useState<typeof CATEGORY_OPTIONS[number]['id']>('women_watch')
  const [references, setReferences] = useState<Reference[]>([])
  const [generated, setGenerated]   = useState<Render | null>(null)
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [history, setHistory]       = useState<Render[]>([])
  const [progress, setProgress]     = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Derived from store — no local isGenerating/jobStatus state needed
  const isGenerating = Boolean(activeImageJob)
  const jobStatus: RenderJobStatus | null = activeImageJob?.status ?? null

  const fileRef = useRef<HTMLInputElement>(null)
  // Track which completed jobs we have already rendered to avoid double-display
  const displayedJobIdRef = useRef<string | null>(null)

  // Gallery picker for reference images + finalize flow
  const [showGalleryPicker, setShowGalleryPicker] = useState(false)
  const [finalized2D, setFinalized2D] = useState(false)
  const galleryImages = aiGeneratedImages

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

  /* ── Pending edit result from gallery ── */
  useEffect(() => {
    if (!pendingEditResult) return
    const rendered: Render = {
      id: `edit_gallery_${Date.now()}`,
      url: pendingEditResult.url,
      images: [{ angle: 'Edited', url: pendingEditResult.url }],
      prompt: pendingEditResult.prompt || '',
      ts: Date.now(),
    }
    setGenerated(rendered)
    setHistory(prev => [rendered, ...prev].slice(0, 8))
    setDisplayUrl(null)
    setPendingEditResult(null)
    showToast('Edited design loaded', 'success')
  }, [pendingEditResult])

  /* ── Pending image sent from gallery — load straight into generated canvas ── */
  useEffect(() => {
    if (!pendingMagicReference) return
    const rendered: Render = {
      id: `gallery_${Date.now()}`,
      url: pendingMagicReference.url,
      images: [{ angle: 'From gallery', url: pendingMagicReference.url }],
      prompt: pendingMagicReference.prompt || '',
      ts: Date.now(),
    }
    setGenerated(rendered)
    setHistory(prev => [rendered, ...prev].slice(0, 8))
    void removeWhiteBackground(rendered.url).then(transparent => setDisplayUrl(transparent))
    if (!prompt.trim() && pendingMagicReference.prompt) setPrompt(pendingMagicReference.prompt)
    setPendingMagicReference(null)
    showToast('Image loaded in Magic Editor', 'success')
  }, [pendingMagicReference])

  /* ── Progress animation ── */
  useEffect(() => {
    if (!isGenerating) {
      setProgress(0)
      setElapsedSeconds(0)
      return undefined
    }
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
      setElapsedSeconds(elapsed)
      const target = jobStatus === 'queued'
        ? Math.min(18, 4 + elapsed * 1.8)
        : Math.min(92, 18 + Math.sqrt(elapsed) * 8.5)
      setProgress(prev => Math.max(prev, target))
    }, 1000)
    return () => window.clearInterval(id)
  }, [isGenerating, jobStatus])

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

  // finishGeneration: display the result — gallery save is handled by BackgroundJobManager
  const finishGeneration = useCallback(async (
    data: { imageUrl?: unknown; images?: unknown },
    finalPrompt: string,
  ) => {
    setProgress(100)
    const imageSet: RenderAngle[] = Array.isArray(data?.images) && data.images.length
      ? data.images.filter((img: unknown): img is RenderAngle =>
          Boolean(img && typeof img === 'object' && usableImageUrl((img as RenderAngle).url)))
      : []
    const aiUrl = usableImageUrl(data?.imageUrl) || imageSet[0]?.url
    const primary = aiUrl || photos.goldStack
    const rendered: Render = {
      id: Date.now() + '',
      url: primary,
      images: imageSet.length ? imageSet : [{ angle: '45-degree front', url: primary }],
      prompt: finalPrompt,
      ts: Date.now(),
    }

    setGenerated(rendered)
    setHistory(prev => [rendered, ...prev].slice(0, 8))
    // Note: gallery save is done by BackgroundJobManager regardless of which page we're on

    const transparent = await removeWhiteBackground(rendered.url)
    setDisplayUrl(transparent)
  }, [])

  /* ── Watch global store for job completion / failure ── */
  useEffect(() => {
    if (!completedImageJob) return
    if (displayedJobIdRef.current === completedImageJob.id) return
    displayedJobIdRef.current = completedImageJob.id

    if (completedImageJob.status === 'completed') {
      void finishGeneration(completedImageJob.result ?? {}, completedImageJob.prompt)
    } else {
      // failed — clear the progress UI
      setProgress(0)
      setElapsedSeconds(0)
    }

    // Remove consumed job from global store
    removeJob(completedImageJob.id)
  }, [completedImageJob, finishGeneration, removeJob])

  /* ── Generate ── */
  const generate = async () => {
    if (!prompt.trim()) { showToast('Describe the piece first', 'error'); return }

    // Cancel any existing active job
    cancelAllImageJobs()
    displayedJobIdRef.current = null

    setProgress(2)
    setElapsedSeconds(0)
    setGenerated(null)
    setDisplayUrl(null)
    const finalPrompt = buildPrompt()
    try {
      const res = await fetch('/api/ai-render/jobs', {
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
      const data = await res.json().catch(() => null) as { id?: string; status?: RenderJobStatus; error?: string } | null
      if (!res.ok) {
        showToast(typeof data?.error === 'string' ? data.error : `Generation failed (${res.status})`, 'error')
        return
      }
      if (!data?.id) throw new Error('Render job was not created')

      // Register in global store — BackgroundJobManager will poll from here on,
      // even if the user navigates away from this page.
      addImageJob(data.id, finalPrompt, category)
      showToast('Render queued — you can navigate away and we will notify you when done', 'info', 5000)
    } catch (error) {
      cancelAllImageJobs()
      showToast(error instanceof Error ? error.message : 'Could not reach the API. Start the server or set API_PROXY_TARGET when using Vite dev.', 'error')
    }
  }

  /* ── Inline annotation edit ── */
  const [annotateMode, setAnnotateMode] = useState(false)
  const [isApplyingEdit, setIsApplyingEdit] = useState(false)

  const {
    annotationTool, setAnnotationTool,
    annotateNotes, setAnnotateNotes,
    pendingText, pendingTextValue, setPendingTextValue,
    textAnnotations,
    canvasRef: annotationCanvasRef,
    imageWrapRef,
    onPointerDown: annotatePointerDown,
    onPointerMove: annotatePointerMove,
    onPointerUp: annotatePointerUp,
    onCanvasClick: annotateCanvasClick,
    commitPendingText,
    clearAnnotations,
    resetAll,
    buildAnnotatedComposite,
  } = useAnnotationCanvas(annotateMode, displayUrl ?? generated?.url)

  const closeAnnotateMode = () => { resetAll(); setAnnotateMode(false) }

  const applyAnnotationEdit = async () => {
    if (!generated) return
    if (!annotateNotes.trim() && textAnnotations.length === 0) {
      showToast('Draw on the image or write a text label first', 'error')
      return
    }
    setIsApplyingEdit(true)
    try {
      const { dataUrl, textLabels } = await buildAnnotatedComposite(displayUrl ?? generated.url)
      const res = await fetch('/api/ai-render/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseImage: dataUrl,
          prompt: annotateNotes,
          textLabels,
          previousPrompt: generated.prompt,
          category,
        }),
      })
      const data = await res.json().catch(() => null) as { imageUrl?: string; error?: string } | null
      if (!res.ok || !data?.imageUrl) throw new Error(data?.error || `Edit failed (${res.status})`)

      const edited: Render = {
        id: `edit_${Date.now()}`,
        url: data.imageUrl,
        images: [{ angle: 'Edited', url: data.imageUrl }],
        prompt: [generated.prompt, textLabels.length ? `Labels: ${textLabels.join(', ')}` : '', annotateNotes].filter(Boolean).join('\n\nEdit: '),
        ts: Date.now(),
      }
      setGenerated(edited)
      setHistory(prev => [edited, ...prev].slice(0, 8))
      setDisplayUrl(null)
      saveAiGeneratedImage({
        url: edited.url,
        label: `Edited - ${new Date(edited.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        prompt: edited.prompt,
      })
      showToast('Edit applied', 'success')
      closeAnnotateMode()

      const transparent = await removeWhiteBackground(edited.url)
      setDisplayUrl(transparent)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Edit failed', 'error')
    } finally {
      setIsApplyingEdit(false)
    }
  }

  const clearAll = () => {
    cancelAllImageJobs()
    displayedJobIdRef.current = null
    setProgress(0)
    setElapsedSeconds(0)
    setPrompt('')
    setCategory('women_watch')
    setReferences([])
  }

  const hasLuna = Boolean(intakeDNA?.occasion || intakeDNA?.notes)

  /* ─────────────────────────────────────────
   * RENDER
   * ───────────────────────────────────────── */
  return (
    <div className="bb-page bb-mm-page" data-testid="magic-movement" style={{ position: 'relative' }}>
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
        <header className="bb-page-header bb-mm-header">
          <div>
            <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-2)' }}>Design bench</span>
            <h1 className="bb-display">
              Magic{' '}
              <span style={{
                fontFamily: "'Pinyon Script', cursive",
                color: 'var(--bb-rose)', fontSize: '1.2em',
                display: 'inline-block', paddingBottom: '0.06em', lineHeight: 1,
              }}>
                Movement<span style={{ fontFamily: 'var(--app-font-display)', color: 'var(--bb-ink)', fontSize: '0.78em' }}>.</span>
              </span>
            </h1>
          </div>
        </header>

        {/* ── Two-column grid ── */}
        <div
          className="bb-mm-workbench"
          style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 18, alignItems: 'start' }}
        >

          {/* ════════════════════════════════
              LEFT SIDEBAR — prompt composer
              ════════════════════════════════ */}
          <div
            className="bb-card bb-lift bb-mm-composer"
            style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 580 }}
          >
            {/* ── Category grid ── */}
            <div>
              <label style={{ ...LABEL_STYLE, fontSize: '0.78rem', color: 'var(--bb-ink)', fontWeight: 800 }}>
                1 · What are we designing?
              </label>
              <div className="bb-mm-category-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
              }}>
                {CATEGORY_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  const active = category === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCategory(opt.id)}
                      title={opt.label.replace('\n', ' ')}
                      className="bb-mm-category-button"
                      data-active={active ? 'true' : 'false'}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: 6,
                        padding: '10px 4px', borderRadius: 12, cursor: 'pointer',
                        border: `1.5px solid ${active ? 'transparent' : 'var(--bb-line)'}`,
                        background: active
                          ? 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet))'
                          : 'rgba(255,255,255,0.72)',
                        color: active ? '#fff' : 'var(--bb-muted)',
                        boxShadow: active
                          ? '0 4px 14px rgba(207,95,145,0.35)'
                          : '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.18s ease',
                        minHeight: 62,
                      }}
                    >
                      <div className="bb-mm-category-icon" style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: active ? 'rgba(255,255,255,0.20)' : 'rgba(207,95,145,0.08)',
                        display: 'grid', placeItems: 'center',
                        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                      }}>
                        <Icon size={17} strokeWidth={1.8} />
                      </div>
                      <span className="bb-mm-category-label" style={{
                        fontSize: '0.60rem', fontWeight: 700, textAlign: 'center',
                        lineHeight: 1.25, whiteSpace: 'pre-line',
                      }}>
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
              <div className="bb-mm-prompt-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ ...LABEL_STYLE, fontSize: '0.78rem', color: 'var(--bb-ink)', fontWeight: 800, marginBottom: 0 }}>
                  2 · Describe your design
                </label>
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
                className="bb-mm-prompt-input"
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

              <div className="bb-mm-prompt-note" style={{
                marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                color: 'var(--bb-muted)', fontSize: '0.72rem', fontWeight: 700,
              }}>
                <Sparkles size={12} style={{ color: 'var(--bb-rose)', flexShrink: 0 }} />
                <span>Luna brief + your prompt → one transparent pencil-sketch concept.</span>
              </div>
            </div>

            {/* ── References ── */}
            <div>
              <label style={{ ...LABEL_STYLE, fontSize: '0.78rem', color: 'var(--bb-ink)', fontWeight: 800 }}>
                3 · Reference images
              </label>
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

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  data-testid="mm-upload-ref"
                  className="bb-mm-reference-button"
                  style={{
                    flex: 1, minHeight: 54, borderRadius: 12,
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
                  <ImagePlus size={16} /> Upload image
                </button>
                <button
                  onClick={() => setShowGalleryPicker(v => !v)}
                  data-testid="mm-gallery-ref"
                  style={{
                    flex: 1, minHeight: 54, borderRadius: 12,
                    border: '1.5px solid rgba(207,95,145,0.35)',
                    background: showGalleryPicker ? 'rgba(207,95,145,0.10)' : '#fff',
                    color: 'var(--bb-rose)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 7, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700,
                  }}
                >
                  <Images size={16} /> From gallery
                </button>
              </div>

              {/* Gallery picker — pick any saved design as a reference */}
              {showGalleryPicker && (
                <div style={{
                  marginTop: 8, padding: 10, borderRadius: 12,
                  border: '1px solid var(--bb-line)', background: '#fff',
                  maxHeight: 220, overflowY: 'auto',
                }}>
                  {galleryImages.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--bb-muted)' }}>
                      No gallery images yet — designs you generate will appear here.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: 6 }}>
                      {(galleryImages as GalleryImage[]).map(img => {
                        const alreadyAdded = references.some(r => r.url === img.url)
                        return (
                          <button
                            key={img.id}
                            type="button"
                            disabled={alreadyAdded}
                            title={alreadyAdded ? 'Already added' : (img.label || 'Add as reference')}
                            onClick={() => {
                              setReferences(prev => prev.some(r => r.url === img.url) ? prev : [
                                { id: `gallery_ref_${img.id}`, url: img.url, name: img.label || 'Gallery reference' },
                                ...prev,
                              ])
                              showToast('Image added to references', 'success')
                            }}
                            style={{
                              position: 'relative', width: '100%', aspectRatio: '1',
                              objectFit: 'cover', borderRadius: 8, overflow: 'hidden',
                              border: `2px solid ${alreadyAdded ? 'rgba(63,136,116,0.5)' : 'transparent'}`,
                              opacity: alreadyAdded ? 0.45 : 1,
                              cursor: alreadyAdded ? 'default' : 'pointer',
                              padding: 0, background: 'none',
                            }}
                          >
                            <img src={img.url} alt={img.label || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {alreadyAdded && (
                              <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#3f8874' }}>
                                <Check size={16} />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Action buttons ── */}
            <div
              className="bb-mm-actions"
              style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 8, marginTop: 'auto' }}
            >
              <button onClick={clearAll} className="bb-btn-ghost" style={{ padding: '11px 12px', flexShrink: 0 }}>
                <Eraser size={14} /> Clear
              </button>
              <button
                data-testid="mm-generate"
                onClick={generate}
                disabled={isGenerating}
                className="bb-btn-primary bb-lift"
                title="Generate your 2D concept sketch"
                style={{
                  width: '100%', minWidth: 0, padding: '11px 14px', justifyContent: 'center',
                  fontSize: '0.84rem', whiteSpace: 'nowrap',
                  opacity: isGenerating ? 0.65 : 1,
                  cursor: isGenerating ? 'progress' : 'pointer',
                  boxShadow: isGenerating ? undefined : '0 10px 26px rgba(207,95,145,0.35)',
                }}
              >
                <Sparkles size={15} />
                {isGenerating ? (jobStatus === 'queued' ? 'Queued…' : 'Rendering…') : 'Generate concept'}
              </button>
            </div>
          </div>

          {/* ════════════════════════════════
              RIGHT — floating canvas (no card, no history box)
              ════════════════════════════════ */}
          <div className="bb-mm-canvas" style={{
            position: 'relative', minHeight: 580,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <GeneratingState key="gen" progress={progress} prompt={buildPrompt()} status={jobStatus} elapsedSeconds={elapsedSeconds} />
              ) : generated ? (
                <motion.div
                  key={generated.id}
                  initial={{ opacity: 0, scale: 0.92, y: 24, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, ease: [0.22, 0.9, 0.32, 1] }}
                  className="bb-mm-result"
                  style={{ width: '100%', maxWidth: 700, textAlign: 'center' }}
                >
                  {/* Generated image + annotation overlay */}
                  <div
                    ref={imageWrapRef}
                    style={{ position: 'relative', display: 'inline-block', width: '100%' }}
                  >
                    <img
                      className="bb-mm-result-image"
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
                    {annotateMode && (
                      <>
                        <canvas
                          ref={annotationCanvasRef}
                          onPointerDown={annotatePointerDown}
                          onPointerMove={annotatePointerMove}
                          onPointerUp={annotatePointerUp}
                          onPointerCancel={annotatePointerUp}
                          onClick={annotateCanvasClick}
                          style={{
                            position: 'absolute', left: 0, top: 0,
                            cursor: annotationTool === 'text' ? 'text' : 'crosshair',
                            touchAction: 'none', background: 'transparent',
                          }}
                        />
                        {pendingText && (
                          <input
                            autoFocus
                            value={pendingTextValue}
                            onChange={e => setPendingTextValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitPendingText() } if (e.key === 'Escape') { commitPendingText() } }}
                            onBlur={commitPendingText}
                            style={{
                              position: 'absolute',
                              left: pendingText.x,
                              top: pendingText.y - 28,
                              minWidth: 100, maxWidth: 260,
                              padding: '3px 7px',
                              border: '1.5px solid #e11d48',
                              borderRadius: 5,
                              background: 'rgba(255,255,255,0.97)',
                              color: '#e11d48',
                              fontWeight: 700,
                              fontSize: 13,
                              outline: 'none',
                              zIndex: 5,
                              boxShadow: '0 2px 10px rgba(225,29,72,0.18)',
                            }}
                            placeholder="Type & press Enter…"
                          />
                        )}
                      </>
                    )}
                  </div>

                  {/* Icon action buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="bb-mm-result-actions"
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

                    {/* Annotate (inline) */}
                    <button
                      onClick={() => annotateMode ? closeAnnotateMode() : setAnnotateMode(true)}
                      title={annotateMode ? 'Close annotate' : 'Annotate & edit'}
                      style={annotateMode ? ICON_BTN_HOVER : ICON_BTN}
                      onMouseEnter={e => Object.assign(e.currentTarget.style, ICON_BTN_HOVER)}
                      onMouseLeave={e => Object.assign(e.currentTarget.style, annotateMode ? ICON_BTN_HOVER : ICON_BTN)}
                    >
                      <Pencil size={16} />
                      <span style={ICON_LABEL}>{annotateMode ? 'Close' : 'Annotate'}</span>
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

                  {/* ── Next-step guidance ── */}
                  <AnimatePresence>
                    {!annotateMode && !finalized2D && (
                      <motion.div
                        key="next-step"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ delay: 0.35, duration: 0.4 }}
                        style={{
                          marginTop: 18, padding: '14px 18px', borderRadius: 14,
                          background: 'linear-gradient(135deg, rgba(63,136,116,0.08), rgba(207,95,145,0.08))',
                          border: '1px solid rgba(207,95,145,0.22)',
                          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                          justifyContent: 'center',
                        }}
                      >
                        <div style={{ flex: '1 1 260px', textAlign: 'left' }}>
                          <strong style={{ display: 'block', fontSize: '0.86rem', color: 'var(--bb-ink)', marginBottom: 3 }}>
                            ✅ Your 2D concept is ready
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--bb-muted)', lineHeight: 1.5 }}>
                            Annotate anything you'd like changed — or finalise the design to continue to 3D.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setFinalized2D(true); showToast('Design finalised — continuing to 3D preview', 'success') }}
                          className="bb-lift"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '12px 20px', borderRadius: 999,
                            background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet))',
                            color: '#fff', fontWeight: 800, fontSize: '0.88rem',
                            border: 0, cursor: 'pointer',
                            boxShadow: '0 10px 26px rgba(207,95,145,0.35)',
                          }}
                        >
                          <Check size={16} /> I'm happy with this design → Continue to 3D
                        </button>
                      </motion.div>
                    )}
                    {finalized2D && (
                      <motion.div
                        key="finalized"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{
                          marginTop: 18, padding: '16px 18px', borderRadius: 14,
                          background: 'rgba(63,136,116,0.07)',
                          border: '1px solid rgba(63,136,116,0.28)',
                          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                          justifyContent: 'center',
                        }}
                      >
                        <span style={{ fontSize: '0.84rem', color: '#2f7a62', fontWeight: 700 }}>
                          🎉 Design finalised! Your next steps: generate the 3D model, then try it on virtually.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPending3DImageUrl(displayUrl ?? generated.url)
                            setLocation(isCustomerPortal ? '/portal/3d-studio' : '/workspace/3d-studio')
                          }}
                          className="bb-lift"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '12px 20px', borderRadius: 999,
                            background: 'linear-gradient(135deg, #3f8874, #2f9075)',
                            color: '#fff', fontWeight: 800, fontSize: '0.88rem',
                            border: 0, cursor: 'pointer',
                            boxShadow: '0 10px 26px rgba(47,144,117,0.32)',
                          }}
                        >
                          <Box size={16} /> Generate 3D model
                        </button>
                        <button
                          type="button"
                          onClick={() => setFinalized2D(false)}
                          style={{
                            padding: '10px 16px', borderRadius: 999,
                            background: 'transparent', color: 'var(--bb-muted)',
                            fontWeight: 700, fontSize: '0.8rem',
                            border: '1px solid var(--bb-line)', cursor: 'pointer',
                          }}
                        >
                          Keep editing in 2D
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Annotation editor */}
                  <AnimatePresence>
                    {annotateMode && (
                      <motion.div
                        key="annotate-bar"
                        initial={{ opacity: 0, y: 8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{
                          marginTop: 18,
                          padding: 14,
                          background: 'rgba(255,255,255,0.78)',
                          backdropFilter: 'blur(14px)',
                          border: '1px solid rgba(207,95,145,0.18)',
                          borderRadius: 14,
                          boxShadow: '0 10px 28px rgba(207,95,145,0.10)',
                          textAlign: 'left',
                        }}
                      >
                        {/* Tool selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--bb-rose)', flex: 1 }}>
                            Annotation tool
                          </span>
                          <button
                            type="button"
                            onClick={() => setAnnotationTool('pen')}
                            title="Draw / circle areas"
                            style={{
                              ...ICON_BTN,
                              ...(annotationTool === 'pen' ? { background: 'rgba(207,95,145,0.12)', color: 'var(--bb-rose)', border: '1px solid rgba(207,95,145,0.3)' } : {}),
                              padding: '7px 12px',
                            }}
                          >
                            <Pencil size={13} /><span style={ICON_LABEL}>Draw</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnnotationTool('text')}
                            title="Click on image to type a label"
                            style={{
                              ...ICON_BTN,
                              ...(annotationTool === 'text' ? { background: 'rgba(207,95,145,0.12)', color: 'var(--bb-rose)', border: '1px solid rgba(207,95,145,0.3)' } : {}),
                              padding: '7px 12px',
                            }}
                          >
                            <Type size={13} /><span style={ICON_LABEL}>Text</span>
                          </button>
                        </div>
                        {annotationTool === 'text' && (
                          <p style={{ margin: '0 0 10px', fontSize: '0.76rem', color: 'var(--bb-muted)', lineHeight: 1.45 }}>
                            Click anywhere on the image to type a label — it will be placed exactly where you click.
                          </p>
                        )}
                        <textarea
                          value={annotateNotes}
                          onChange={e => setAnnotateNotes(e.target.value)}
                          placeholder="Optional extra notes (e.g. keep the setting style, use platinum)…"
                          rows={2}
                          style={{
                            width: '100%', padding: '10px 12px', borderRadius: 10,
                            border: '1px solid var(--bb-line)', background: '#fff',
                            color: 'var(--bb-ink)', fontSize: '0.88rem',
                            resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button type="button" onClick={clearAnnotations} disabled={isApplyingEdit} style={ICON_BTN}>
                            <Eraser size={14} /><span style={ICON_LABEL}>Clear</span>
                          </button>
                          <button
                            type="button"
                            onClick={applyAnnotationEdit}
                            disabled={isApplyingEdit || (!annotateNotes.trim() && textAnnotations.length === 0)}
                            style={{
                              ...ICON_BTN,
                              color: '#fff',
                              background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet))',
                              border: '1px solid transparent',
                              opacity: (isApplyingEdit || (!annotateNotes.trim() && textAnnotations.length === 0)) ? 0.7 : 1,
                            }}
                          >
                            {isApplyingEdit
                              ? <Sparkles size={14} style={{ animation: 'spin 1.4s linear infinite' }} />
                              : <Check size={14} />}
                            <span style={ICON_LABEL}>{isApplyingEdit ? 'Applying…' : 'Apply AI edit'}</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
      className="bb-mm-empty"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      style={{ textAlign: 'center', maxWidth: 380 }}
    >
      <motion.div
        className="bb-mm-empty-icon"
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
      <h3 className="bb-display bb-mm-empty-title" style={{ margin: '0 0 8px', fontSize: '1.55rem', lineHeight: 1.15 }}>
        Generate {category}
      </h3>
      <p style={{ margin: 0, color: 'var(--bb-muted)', lineHeight: 1.55, fontSize: '0.88rem' }}>
        One transparent pencil-sketch concept will appear here.
      </p>
    </motion.div>
  )
}

function GeneratingState({
  progress,
  prompt,
  status,
  elapsedSeconds,
}: {
  progress: number
  prompt: string
  status: RenderJobStatus | null
  elapsedSeconds: number
}) {
  const statusLabel = status === 'queued' ? 'Queued for render' : 'Rendering concept'
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = `${elapsedSeconds % 60}`.padStart(2, '0')
  return (
    <motion.div
      className="bb-mm-generating"
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
        className="bb-mm-generating-icon"
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
      <h3 className="bb-display" style={{ margin: '0 0 8px', fontSize: '1.45rem' }}>{statusLabel}</h3>
      <p style={{ color: 'var(--bb-muted)', margin: '0 auto 18px', fontSize: '0.86rem', lineHeight: 1.5, maxWidth: 300 }}>
        {prompt || 'Composing prompt…'}
      </p>
      <div style={{
        width: '100%', maxWidth: 420, margin: '0 auto',
        height: 14, borderRadius: 999,
        background: 'rgba(207,95,145,0.14)', overflow: 'hidden',
        border: '1px solid rgba(207,95,145,0.25)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--bb-coral), var(--bb-rose), var(--bb-violet))',
            boxShadow: '0 0 12px rgba(207,95,145,0.55)',
          }}
        />
      </div>
      <span style={{
        display: 'block', marginTop: 10, color: '#a03470',
        fontSize: '0.82rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800,
      }}>
        {Math.round(progress)}% · {minutes}:{seconds}
      </span>
    </motion.div>
  )
}
