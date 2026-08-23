import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Camera, CheckCircle2, CircleDot, Diamond,
  Download, Ear, Film, Gem, Images, Link,
  Loader2, PauseCircle, PlayCircle, RotateCcw,
  Sparkles, Upload, Watch, Wand2, X, ZoomIn,
} from 'lucide-react'
import { useProjects, type GalleryFolder, type GalleryImage } from '../../context/ProjectContext'

type JewelleryType = 'ring' | 'necklace' | 'earrings' | 'bracelet' | 'pendant' | 'bangle' | 'watch'
type GenStatus = 'idle' | 'generating' | 'done' | 'error'

const JEWELLERY_TYPES: { value: JewelleryType; label: string; icon: typeof Gem; hint: string }[] = [
  { value: 'ring',      label: 'Ring',      icon: Diamond,   hint: 'finger' },
  { value: 'necklace',  label: 'Necklace',  icon: Link,      hint: 'neck' },
  { value: 'earrings',  label: 'Earrings',  icon: Ear,       hint: 'ears' },
  { value: 'bracelet',  label: 'Bracelet',  icon: Watch,     hint: 'wrist' },
  { value: 'watch',     label: 'Watch',     icon: Watch,     hint: 'wrist' },
  { value: 'pendant',   label: 'Pendant',   icon: Gem,       hint: 'neck/chest' },
  { value: 'bangle',    label: 'Bangle',    icon: CircleDot, hint: 'wrist' },
]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Drag-to-compare slider (the Zara-like feature)
 * ─────────────────────────────────────────────── */
function ComparisonSlider({
  before, after, visible,
}: { before: string; after: string; visible: boolean }) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const beforeRef     = useRef<HTMLDivElement>(null)
  const lineRef       = useRef<HTMLDivElement>(null)
  const leftLabelRef  = useRef<HTMLSpanElement>(null)
  const rightLabelRef = useRef<HTMLSpanElement>(null)

  const dragging = useRef(false)
  const pctRef   = useRef(50)
  const rafRef   = useRef(0)

  // Write pct directly to DOM — no React state, no re-render, buttery 60 fps
  const applyPct = useCallback((pct: number) => {
    if (beforeRef.current)     beforeRef.current.style.clipPath   = `inset(0 ${100 - pct}% 0 0)`
    if (lineRef.current)       lineRef.current.style.left         = `${pct}%`
    if (leftLabelRef.current)  leftLabelRef.current.style.opacity = pct > 20 ? '1' : '0'
    if (rightLabelRef.current) rightLabelRef.current.style.opacity = pct < 80 ? '1' : '0'
  }, [])

  const moveTo = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    pctRef.current = Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100))
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => applyPct(pctRef.current))
  }, [applyPct])

  // Initialise at 50% and clean up RAF on unmount
  useEffect(() => {
    applyPct(50)
    return () => cancelAnimationFrame(rafRef.current)
  }, [applyPct])

  return (
    <div
      ref={containerRef}
      className="tryon2-slider"
      onPointerDown={e => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        moveTo(e.clientX)
      }}
      onPointerMove={e => { if (dragging.current) moveTo(e.clientX) }}
      onPointerUp={() => { dragging.current = false }}
      onPointerCancel={() => { dragging.current = false }}
    >
      {/* After (result) — full-width base layer */}
      <img
        src={after}
        alt="Try-on result"
        className="tryon2-slider-img"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.7s ease' }}
      />

      {/* Before (original) — GPU-clipped, no inline style on every frame */}
      <div ref={beforeRef} className="tryon2-slider-before">
        <img src={before} alt="Original photo" className="tryon2-slider-img tryon2-slider-img--before" />
      </div>

      {/* Divider — position set by ref, not state */}
      <div ref={lineRef} className="tryon2-slider-line">
        <div className="tryon2-slider-handle">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 5L3 10L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 5L17 10L13 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span ref={leftLabelRef}  className="tryon2-label-pill tryon2-label-pill--left">Original</span>
      <span ref={rightLabelRef} className="tryon2-label-pill tryon2-label-pill--right">Try-On</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Shimmer loading overlay
 * ─────────────────────────────────────────── */
function GeneratingOverlay({ photo, jewelleryType }: { photo: string; jewelleryType: JewelleryType }) {
  const type = JEWELLERY_TYPES.find(t => t.value === jewelleryType) ?? JEWELLERY_TYPES[0]
  const Icon = type.icon

  return (
    <div className="tryon2-gen-overlay">
      {photo && <img src={photo} alt="" className="tryon2-gen-bg" />}
      {/* Shimmer gradient sweep */}
      <div className="tryon2-shimmer" />
      {/* Center badge */}
      <div className="tryon2-gen-badge">
        <div className="tryon2-gen-ring">
          <div className="tryon2-gen-inner">
            <Icon size={26} />
          </div>
        </div>
        <strong>Placing {type.label.toLowerCase()}</strong>
        <span>Matching light · Fitting to {type.hint}</span>
        <div className="tryon2-gen-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Compact photo upload thumb
 * ─────────────────────────────────────────── */
function PhotoThumb({
  photo, onPhoto,
}: { photo: string; onPhoto: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    onPhoto(await fileToBase64(file))
  }

  return (
    <div
      className={`tryon2-thumb ${photo ? 'has-photo' : ''}`}
        onClick={() => ref.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); void handleFile(e.dataTransfer.files[0]) }}
      >
        <input
          ref={ref}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display: 'none' }}
          onChange={e => void handleFile(e.target.files?.[0])}
        />
        {photo ? (
          <>
            <img src={photo} alt="Person" className="tryon2-thumb-img" />
            <button
              type="button"
              className="tryon2-thumb-remove"
              onClick={e => { e.stopPropagation(); onPhoto('') }}
              aria-label="Remove"
            >
              <X size={11} />
            </button>
            <div className="tryon2-thumb-change"><ZoomIn size={14} /> Change</div>
          </>
        ) : (
          <div className="tryon2-thumb-empty">
            <div className="tryon2-thumb-empty-icon">
              <Camera size={22} />
            </div>
            <strong>Upload your photo</strong>
            <span>Upload a photo of yourself (or the customer) to try jewellery on — drag &amp; drop or click</span>
          </div>
        )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Jewellery picker (compact vertical)
 * ─────────────────────────────────────────── */
function JewelleryPicker({
  jewellery, jewelleryType, onJewellery, onJewelleryType, folders,
}: {
  jewellery: string
  jewelleryType: JewelleryType
  onJewellery: (url: string) => void
  onJewelleryType: (t: JewelleryType) => void
  folders: GalleryFolder[]
}) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const allImages: GalleryImage[] = folders.flatMap(f => f.images)

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    onJewellery(await fileToBase64(file))
  }

  return (
    <div className="tryon2-picker-wrap">
      {/* Type grid */}
      <div className="tryon2-type-grid">
        {JEWELLERY_TYPES.map(item => {
          const Icon = item.icon
          const active = item.value === jewelleryType
          return (
            <button
              key={item.value}
              type="button"
              className={`tryon2-type-btn ${active ? 'is-on' : ''}`}
              onClick={() => onJewelleryType(item.value)}
            >
              <Icon size={15} />
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Selected jewellery preview */}
      {jewellery ? (
        <div className="tryon2-jewel-preview">
          <img src={jewellery} alt="Selected jewellery" />
          <div className="tryon2-jewel-badge">
            <CheckCircle2 size={11} /> Selected
          </div>
          <button
            type="button"
            className="tryon2-jewel-remove"
            onClick={() => onJewellery('')}
            aria-label="Remove jewellery"
          >
            <X size={12} />
          </button>
          <label className="tryon2-jewel-change">
            <Upload size={11} /> Change
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => void handleUpload(e.target.files?.[0])}
            />
          </label>
        </div>
      ) : (
        <label className="tryon2-jewel-upload">
          <div className="tryon2-jewel-upload-icon">
            <Upload size={18} />
          </div>
          <strong>Upload design</strong>
          <span>JPG, PNG or WEBP</span>
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => void handleUpload(e.target.files?.[0])}
          />
        </label>
      )}

      {/* Gallery grid — full access to every saved design */}
      {allImages.length > 0 && (
        <div className="tryon2-gallery">
          <span className="tryon2-gallery-label">From gallery ({allImages.length})</span>
          <div className="tryon2-gallery-grid">
            {allImages.map(img => (
              <button
                key={img.id}
                type="button"
                className={`tryon2-gallery-item ${jewellery === img.url ? 'is-on' : ''}`}
                onClick={() => onJewellery(img.url)}
                title={img.label}
              >
                <img src={img.url} alt={img.label} loading="lazy" />
                {jewellery === img.url && <CheckCircle2 size={16} className="tryon2-gallery-check" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Frame-by-frame motion player
 * ─────────────────────────────────────────── */
function FramePlayer({
  frames,
  onDownload,
}: {
  frames: Array<{ url: string; label: string }>
  onDownload: () => void
}) {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (playing && frames.length > 1) {
      intervalRef.current = setInterval(
        () => setActive(a => (a + 1) % frames.length),
        900,
      )
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, frames.length])

  const frame = frames[active]

  return (
    <div className="tryon2-frame-player">
      <div className="tryon2-frame-img-wrap">
        {frames.map((f, i) => (
          <img
            key={i}
            src={f.url}
            alt={f.label}
            className={`tryon2-frame-img ${i === active ? 'is-active' : ''}`}
          />
        ))}
        {frame && <span className="tryon2-frame-label">{frame.label}</span>}
      </div>
      <div className="tryon2-frame-controls">
        <div className="tryon2-frame-dots">
          {frames.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`tryon2-frame-dot ${i === active ? 'is-on' : ''}`}
              onClick={() => { setActive(i); setPlaying(false) }}
              aria-label={`Frame ${i + 1}`}
            />
          ))}
        </div>
        <div className="tryon2-frame-btns">
          <button
            type="button"
            className="tryon2-action-btn"
            onClick={() => setPlaying(p => !p)}
          >
            {playing
              ? <><PauseCircle size={14} /> Pause</>
              : <><PlayCircle size={14} /> Play</>
            }
          </button>
          <button type="button" className="tryon2-action-btn" onClick={onDownload}>
            <Download size={14} /> Download
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Main component
 * ─────────────────────────────────────────── */
export default function VirtualTryOn() {
  const { aiGeneratedFolders, saveTryonFolder } = useProjects()

  // Full access to every saved image — customers can pick any photo from their gallery
  const allGalleryImages: GalleryImage[] = aiGeneratedFolders.flatMap(f => f.images)
  const [showPersonGallery, setShowPersonGallery] = useState(false)

  const [personPhoto, setPersonPhoto] = useState('')
  const [jewellery,   setJewellery  ] = useState('')
  const [jewelleryType, setJewelleryType] = useState<JewelleryType>('ring')
  const [status,  setStatus ] = useState<GenStatus>('idle')
  const [result,  setResult ] = useState('')
  const [errMsg,  setErrMsg ] = useState('')
  const [resultVisible, setResultVisible] = useState(false)

  // Motion frames state
  const [frames,       setFrames      ] = useState<Array<{ url: string; label: string }>>([])
  const [framesStatus, setFramesStatus] = useState<GenStatus>('idle')
  const [framesErr,    setFramesErr   ] = useState('')

  // Reveal animation: once result URL is set, fade it in
  useEffect(() => {
    if (!result) { setResultVisible(false); return }
    const t = setTimeout(() => setResultVisible(true), 60)
    return () => clearTimeout(t)
  }, [result])

  const canGenerate = Boolean(personPhoto && jewellery && status !== 'generating')

  const generate = async () => {
    if (!canGenerate) return
    setStatus('generating')
    setErrMsg('')
    setResult('')
    setResultVisible(false)
    setFrames([])
    setFramesStatus('idle')
    setFramesErr('')

    try {
      const res = await fetch('/api/ai/tryon', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personPhoto, jewelleryImage: jewellery, jewelleryType }),
      })
      const data = await res.json().catch(() => ({})) as { resultUrl?: string; error?: string }
      if (!res.ok || !data.resultUrl) throw new Error(data.error || 'Try-on generation failed')
      setResult(data.resultUrl)
      setStatus('done')
      void saveTryonFolder({
        name: `Virtual Try-On · ${jewelleryType} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        prompt: `Virtual try-on: ${jewelleryType}`,
        images: [{
          url: data.resultUrl,
          label: `${jewelleryType} try-on`,
          prompt: `Virtual try-on: ${jewelleryType}`,
        }],
      }).catch(() => {})
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Try-on generation failed')
      setStatus('error')
    }
  }

  const generateFrames = async () => {
    if (!result || !jewellery) return
    setFramesStatus('generating')
    setFramesErr('')
    setFrames([])
    try {
      const res = await fetch('/api/ai/tryon/frames', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tryonImage: result, jewelleryImage: jewellery, jewelleryType }),
      })
      const data = await res.json().catch(() => ({})) as {
        frames?: Array<{ url: string; label: string }>
        error?: string
      }
      if (!res.ok || !data.frames?.length) throw new Error(data.error || 'Motion sequence failed')
      setFrames(data.frames)
      setFramesStatus('done')
      void saveTryonFolder({
        name: `Motion Sequence · ${jewelleryType} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        prompt: `Virtual try-on motion sequence: ${jewelleryType}`,
        images: data.frames.map(f => ({
          url: f.url,
          label: f.label,
          prompt: `Virtual try-on motion: ${jewelleryType}`,
        })),
      }).catch(() => {})
    } catch (err) {
      setFramesErr(err instanceof Error ? err.message : 'Motion sequence failed')
      setFramesStatus('error')
    }
  }

  const downloadFrames = async () => {
    if (!frames.length) return
    try {
      const first = await loadImage(frames[0].url)
      const canvas = document.createElement('canvas')
      canvas.width = first.naturalWidth || 768
      canvas.height = first.naturalHeight || 1024
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'
      const stream = canvas.captureStream(2)
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: BlobPart[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.start()
      for (const frame of frames) {
        const img = await loadImage(frame.url)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        await sleep(600)
      }
      recorder.stop()
      await new Promise<void>(resolve => { recorder.onstop = () => resolve() })
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bb-motion-${Date.now()}.webm`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      // silent fail — frames still visible in the player
    }
  }

  const reset = () => {
    setPersonPhoto('')
    setJewellery('')
    setResult('')
    setStatus('idle')
    setErrMsg('')
    setFrames([])
    setFramesStatus('idle')
    setFramesErr('')
    setResultVisible(false)
  }

  const download = () => {
    const a = document.createElement('a')
    a.href = result
    a.download = `bb-tryon-${Date.now()}.png`
    a.click()
  }

  const activeType = JEWELLERY_TYPES.find(t => t.value === jewelleryType) ?? JEWELLERY_TYPES[0]

  const step = personPhoto && jewellery ? 3 : personPhoto ? 2 : jewellery ? 2 : 1

  return (
    <div className="tryon2-shell">
      <style>{CSS}</style>

      {/* ── Page header ── */}
      <header className="tryon2-header">
        <div className="tryon2-header-left">
          <span className="tryon2-eyebrow">
            <Sparkles size={10} /> AI Studio
          </span>
          <h1 className="tryon2-title">
            Virtual <span className="tryon2-title-accent">Try‑On</span>
          </h1>
          <p className="tryon2-subtitle">Place any jewellery on a photo using AI</p>
        </div>
        <div className="tryon2-header-right">
          {status !== 'done' && (
            <div className="tryon2-progress-pills">
              {(['Upload', 'Jewellery', 'Generate'] as const).map((label, i) => (
                <div key={label} className={`tryon2-progress-pill ${i + 1 <= step ? 'is-done' : ''} ${i + 1 === step ? 'is-active' : ''}`}>
                  <span className="tryon2-progress-num">{i + 1 < step ? '✓' : i + 1}</span>
                  {label}
                </div>
              ))}
            </div>
          )}
          {status === 'done' && (
            <button type="button" className="tryon2-reset-btn" onClick={reset}>
              <RotateCcw size={14} /> New try-on
            </button>
          )}
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="tryon2-body">

        {/* ── Left: inputs ── */}
        <aside className="tryon2-inputs">
          {/* Step 1 */}
          <div className="tryon2-step-header">
            <div className={`tryon2-step-num ${personPhoto ? 'is-done' : step === 1 ? 'is-active' : ''}`}>
              {personPhoto ? <CheckCircle2 size={13} /> : '1'}
            </div>
            <div className="tryon2-step-label">
              <span>Your Photo</span>
              <small>{personPhoto ? 'Photo added' : 'Upload a clear photo of yourself to try it on'}</small>
            </div>
          </div>
          <div className="tryon2-thumb-wrap">
            <PhotoThumb
              photo={personPhoto}
              onPhoto={setPersonPhoto}
            />
            {/* Pick a photo from the full gallery instead of uploading */}
            {allGalleryImages.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowPersonGallery(v => !v)}
                  style={{
                    width: '100%', minHeight: 40, borderRadius: 10,
                    border: '1.5px solid rgba(207,95,145,0.35)',
                    background: showPersonGallery ? 'rgba(207,95,145,0.08)' : '#fff',
                    color: 'var(--bb-rose)', fontWeight: 800, fontSize: '0.78rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    cursor: 'pointer',
                  }}
                >
                  <Images size={15} /> From my gallery ({allGalleryImages.length})
                </button>
                {showPersonGallery && (
                  <div style={{
                    marginTop: 8, padding: 10, borderRadius: 12,
                    border: '1px solid var(--bb-line)', background: '#fff',
                    maxHeight: 240, overflowY: 'auto',
                  }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: 'var(--bb-muted)' }}>
                      Browse all your saved images — pick any photo to try jewellery on.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: 6 }}>
                      {allGalleryImages.map(img => (
                        <button
                          key={img.id}
                          type="button"
                          title={img.label}
                          onClick={() => { setPersonPhoto(img.url); setShowPersonGallery(false) }}
                          style={{
                            width: '100%', aspectRatio: '1', padding: 0,
                            borderRadius: 8, overflow: 'hidden',
                            border: `2px solid ${personPhoto === img.url ? 'var(--bb-rose)' : 'transparent'}`,
                            cursor: 'pointer', background: 'none',
                          }}
                        >
                          <img src={img.url} alt={img.label} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="tryon2-divider" />

          {/* Step 2 */}
          <div className="tryon2-step-header">
            <div className={`tryon2-step-num ${jewellery ? 'is-done' : step === 2 ? 'is-active' : ''}`}>
              {jewellery ? <CheckCircle2 size={13} /> : '2'}
            </div>
            <div className="tryon2-step-label">
              <span>Jewellery Piece</span>
              <small>{jewellery ? `${activeType.label} selected` : 'Choose type & piece'}</small>
            </div>
          </div>
          <JewelleryPicker
            jewellery={jewellery}
            jewelleryType={jewelleryType}
            onJewellery={setJewellery}
            onJewelleryType={setJewelleryType}
            folders={aiGeneratedFolders}
          />

          <div className="tryon2-divider" />

          {/* Step 3 — Generate CTA */}
          <div className="tryon2-step-header">
            <div className={`tryon2-step-num ${status === 'done' ? 'is-done' : canGenerate ? 'is-active' : ''}`}>
              {status === 'done' ? <CheckCircle2 size={13} /> : '3'}
            </div>
            <div className="tryon2-step-label">
              <span>Generate</span>
              <small>{status === 'done' ? 'Try-on complete!' : 'AI places it naturally'}</small>
            </div>
          </div>
          <div className="tryon2-generate-wrap">
            <button
              type="button"
              className={`tryon2-generate-btn ${canGenerate ? 'is-ready' : ''}`}
              disabled={!canGenerate}
              onClick={() => void generate()}
            >
              {status === 'generating' ? (
                <><Loader2 size={16} className="animate-spin" /> Generating…</>
              ) : (
                <><Wand2 size={16} /> Generate Try-On</>
              )}
            </button>

            {/* Contextual hint */}
            {!personPhoto && !jewellery && (
              <p className="tryon2-hint">Start by uploading a photo above.</p>
            )}
            {personPhoto && !jewellery && (
              <p className="tryon2-hint">Now pick a jewellery piece to continue.</p>
            )}
            {!personPhoto && jewellery && (
              <p className="tryon2-hint">Almost there — upload a customer photo.</p>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className="tryon2-error">⚠ {errMsg}</div>
            )}
          </div>
        </aside>

        {/* ── Right: result canvas ── */}
        <main className="tryon2-canvas">

          {/* Empty state */}
          {status === 'idle' && !result && (
            <div className="tryon2-empty">
              {personPhoto && jewellery ? (
                <div className="tryon2-ready-preview">
                  <div className="tryon2-preview-stack">
                    <img src={personPhoto} alt="Person" className="tryon2-preview-person" />
                    <div className="tryon2-preview-jewel-badge">
                      <img src={jewellery} alt="Jewellery" />
                    </div>
                  </div>
                  <div className="tryon2-ready-text">
                    <div className="tryon2-ready-badge">
                      <Sparkles size={14} /> Ready to generate
                    </div>
                    <h3>Looking good so far!</h3>
                    <p>Hit <strong>Generate Try-On</strong> to see the {activeType.label.toLowerCase()} placed naturally on the photo</p>
                  </div>
                </div>
              ) : (
                <div className="tryon2-idle-art">
                  {/* Animated background orbs */}
                  <div className="tryon2-orb tryon2-orb--1" />
                  <div className="tryon2-orb tryon2-orb--2" />
                  <div className="tryon2-orb tryon2-orb--3" />

                  <div className="tryon2-idle-icon">
                    <Sparkles size={40} />
                  </div>
                  <strong>Try jewellery on a photo</strong>
                  <p>Our AI composites any piece onto a real photo — rings, necklaces, earrings and more.</p>

                  <div className="tryon2-steps-hint">
                    {[
                      { n: '1', t: 'Upload your photo', s: 'A clear photo of yourself — or pick from your gallery', done: !!personPhoto },
                      { n: '2', t: 'Choose jewellery', s: 'From gallery or upload', done: !!jewellery },
                      { n: '3', t: 'Generate', s: 'AI places it naturally', done: false },
                    ].map(s => (
                      <div key={s.n} className={`tryon2-step-hint ${s.done ? 'is-done' : ''}`}>
                        <span>{s.done ? '✓' : s.n}</span>
                        <div>
                          <strong>{s.t}</strong>
                          <p>{s.s}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generating state — shimmer over person photo */}
          {status === 'generating' && (
            <GeneratingOverlay photo={personPhoto} jewelleryType={jewelleryType} />
          )}

          {/* Result — comparison slider */}
          {result && (
            <div
              className={`tryon2-result-wrap ${frames.length > 0 || framesStatus === 'generating' || framesStatus === 'error' ? 'has-frames' : ''}`}
              style={{ opacity: resultVisible ? 1 : 0, transform: resultVisible ? 'none' : 'scale(0.97)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}
            >
              {/* Left: slider + actions */}
              <div className="tryon2-result-left">
                <div className="tryon2-result-slider-wrap">
                  <ComparisonSlider
                    before={personPhoto}
                    after={result}
                    visible={resultVisible}
                  />
                </div>

                <div className="tryon2-result-actions">
                  <button type="button" className="tryon2-action-btn tryon2-action-btn--primary" onClick={download}>
                    <Download size={15} /> Download
                  </button>
                  <button
                    type="button"
                    className="tryon2-action-btn"
                    onClick={() => void generateFrames()}
                    disabled={framesStatus === 'generating'}
                  >
                    {framesStatus === 'generating'
                      ? <><Loader2 size={15} className="animate-spin" /> Making motion…</>
                      : <><Film size={15} /> Make motion</>}
                  </button>
                </div>
                <p className="tryon2-footnote">Drag the handle to compare · Preview only</p>
              </div>

              {/* Right: motion frames — only when present */}
              {(frames.length > 0 || framesStatus === 'generating' || framesStatus === 'error') && (
                <div className="tryon2-frames-block">
                  {framesStatus === 'generating'
                    ? <div className="tryon2-video-loading"><Loader2 size={20} className="animate-spin" /><span>Creating motion sequence… ~90 sec</span></div>
                    : framesStatus === 'error'
                    ? <div className="tryon2-video-error">⚠ {framesErr}</div>
                    : <FramePlayer frames={frames} onDownload={() => void downloadFrames()} />
                  }
                </div>
              )}
            </div>
          )}
        </main>

      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * All CSS in one place
 * ─────────────────────────────────────────── */
const CSS = `
  /* ── Shell ── */
  .tryon2-shell {
    padding: 16px 20px;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 14px;
    /* Exactly fill the space below the sticky header (78px desktop) */
    height: calc(100dvh - 78px);
    overflow: hidden;
  }
  @media (max-width: 860px) {
    .tryon2-shell {
      height: auto;
      min-height: calc(100dvh - 54px);
      overflow: visible;
      padding: 12px 14px;
    }
  }

  /* ── Header ── */
  .tryon2-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .tryon2-header-left { display: flex; flex-direction: column; gap: 3px; }
  .tryon2-header-right { display: flex; align-items: center; gap: 12px; }

  .tryon2-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--bb-rose);
  }

  .tryon2-title {
    margin: 0;
    font-size: clamp(1.7rem, 2.8vw, 2.5rem);
    line-height: 1.08;
    font-weight: 900;
    color: var(--bb-ink);
    letter-spacing: -0.02em;
  }
  .tryon2-title-accent {
    font-family: 'Pinyon Script', cursive;
    color: var(--bb-rose);
    font-size: 1.2em;
    line-height: 1;
  }
  .tryon2-subtitle {
    font-size: 0.8rem;
    color: var(--bb-muted);
    margin: 0;
    font-weight: 500;
  }

  /* ── Progress pills ── */
  .tryon2-progress-pills {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(0,0,0,0.04);
    border-radius: 999px;
    padding: 4px;
  }
  .tryon2-progress-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px 6px 6px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--bb-muted);
    transition: all 0.22s;
    white-space: nowrap;
  }
  .tryon2-progress-pill.is-active {
    background: #fff;
    color: var(--bb-rose);
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  }
  .tryon2-progress-pill.is-done { color: var(--bb-ink); opacity: 0.55; }
  .tryon2-progress-num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(207,95,145,0.12);
    color: var(--bb-rose);
    display: grid;
    place-items: center;
    font-size: 0.65rem;
    font-weight: 900;
    flex-shrink: 0;
    transition: all 0.22s;
  }
  .tryon2-progress-pill.is-active .tryon2-progress-num {
    background: linear-gradient(135deg, var(--bb-rose), var(--bb-coral));
    color: #fff;
    box-shadow: 0 2px 8px rgba(207,95,145,0.4);
  }
  .tryon2-progress-pill.is-done .tryon2-progress-num {
    background: rgba(34,197,94,0.12);
    color: #16a34a;
  }

  .tryon2-reset-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 12px;
    border: 1.5px solid var(--bb-line);
    background: #fff;
    color: var(--bb-muted);
    font-size: 0.8rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.18s;
    white-space: nowrap;
  }
  .tryon2-reset-btn:hover { color: var(--bb-rose); border-color: var(--bb-rose); background: rgba(207,95,145,0.04); }

  /* ── Layout ── */
  .tryon2-body {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 14px;
    align-items: stretch;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  @media (max-width: 1100px) { .tryon2-body { grid-template-columns: 280px minmax(0, 1fr); } }
  @media (max-width: 860px)  {
    .tryon2-body {
      grid-template-columns: 1fr;
      overflow: visible;
      height: auto;
    }
  }

  /* ── Left panel ── */
  .tryon2-inputs {
    background: #fff;
    border: 1px solid var(--bb-line);
    border-radius: 22px;
    padding: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.05);
    /* Fill available column height and scroll internally */
    height: 100%;
    scrollbar-width: thin;
    scrollbar-color: rgba(207,95,145,0.2) transparent;
  }
  .tryon2-inputs::-webkit-scrollbar { width: 4px; }
  .tryon2-inputs::-webkit-scrollbar-track { background: transparent; }
  .tryon2-inputs::-webkit-scrollbar-thumb { background: rgba(207,95,145,0.25); border-radius: 99px; }

  /* ── Step header rows ── */
  .tryon2-step-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px 0;
  }
  .tryon2-step-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    font-size: 0.72rem;
    font-weight: 900;
    background: rgba(0,0,0,0.06);
    color: var(--bb-muted);
    transition: all 0.22s;
  }
  .tryon2-step-num.is-active {
    background: linear-gradient(135deg, var(--bb-rose), var(--bb-coral));
    color: #fff;
    box-shadow: 0 3px 10px rgba(207,95,145,0.35);
  }
  .tryon2-step-num.is-done {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: #fff;
    box-shadow: 0 3px 10px rgba(34,197,94,0.3);
  }
  .tryon2-step-label { display: flex; flex-direction: column; gap: 1px; }
  .tryon2-step-label span { font-size: 0.78rem; font-weight: 800; color: var(--bb-ink); }
  .tryon2-step-label small { font-size: 0.68rem; color: var(--bb-muted); font-weight: 500; }

  .tryon2-step-body { padding: 10px 18px; }
  .tryon2-divider { height: 1px; background: var(--bb-line); margin: 0; }

  /* ── Photo upload ── */
  .tryon2-thumb-wrap { padding: 10px 18px 16px; }
  .tryon2-thumb {
    border-radius: 14px;
    border: 2px dashed rgba(207,95,145,0.3);
    background: linear-gradient(145deg, #fff8f6, #fff5f2);
    min-height: 130px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    display: grid;
    place-items: center;
    transition: all 0.22s;
  }
  .tryon2-thumb:hover {
    border-color: var(--bb-rose);
    background: rgba(207,95,145,0.04);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(207,95,145,0.13);
  }
  .tryon2-thumb.has-photo { border-style: solid; border-color: rgba(207,95,145,0.35); background: #fff; min-height: unset; }
  .tryon2-thumb-img { width: 100%; max-height: 200px; object-fit: cover; display: block; border-radius: 12px; }
  .tryon2-thumb-empty {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 24px 20px; color: var(--bb-muted); text-align: center;
  }
  .tryon2-thumb-empty-icon {
    width: 52px; height: 52px; border-radius: 14px;
    background: linear-gradient(135deg, rgba(207,95,145,0.12), rgba(199,166,106,0.08));
    display: grid; place-items: center; color: var(--bb-rose);
  }
  .tryon2-thumb-empty strong { font-size: 0.84rem; font-weight: 800; color: var(--bb-ink); }
  .tryon2-thumb-empty span { font-size: 0.72rem; color: var(--bb-muted); }
  .tryon2-thumb-remove { position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%; border: 0; background: rgba(0,0,0,0.5); color: #fff; display: grid; place-items: center; cursor: pointer; transition: background 0.15s; }
  .tryon2-thumb-remove:hover { background: rgba(185,28,28,0.85); }
  .tryon2-thumb-change { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px; background: linear-gradient(transparent, rgba(0,0,0,0.6)); color: #fff; font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 5px; opacity: 0; transition: opacity 0.2s; }
  .tryon2-thumb:hover .tryon2-thumb-change { opacity: 1; }

  /* ── Jewellery picker ── */
  .tryon2-picker-wrap { padding: 10px 18px 16px; display: flex; flex-direction: column; gap: 12px; }

  .tryon2-type-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .tryon2-type-btn {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    padding: 10px 6px 9px;
    border-radius: 12px;
    border: 1.5px solid var(--bb-line);
    background: #fafafa;
    color: var(--bb-muted);
    font-size: 0.67rem; font-weight: 800;
    cursor: pointer; transition: all 0.16s; text-align: center; line-height: 1.2;
  }
  .tryon2-type-btn:hover { border-color: rgba(207,95,145,0.45); color: var(--bb-ink); background: #fff; transform: translateY(-1px); box-shadow: 0 3px 12px rgba(0,0,0,0.08); }
  .tryon2-type-btn.is-on {
    border-color: var(--bb-rose);
    background: linear-gradient(135deg, rgba(207,95,145,0.1), rgba(199,166,106,0.06));
    color: var(--bb-rose);
    box-shadow: 0 0 0 3px rgba(207,95,145,0.12), 0 3px 10px rgba(207,95,145,0.15);
    transform: translateY(-1px);
  }
  .tryon2-type-btn svg { flex-shrink: 0; }

  .tryon2-jewel-preview { position: relative; border-radius: 14px; overflow: hidden; border: 2px solid rgba(207,95,145,0.3); background: linear-gradient(145deg, #fdf9f7, #fff); }
  .tryon2-jewel-preview img { width: 100%; max-height: 140px; object-fit: contain; display: block; padding: 8px; }
  .tryon2-jewel-badge { position: absolute; top: 8px; right: 8px; display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.96); border-radius: 999px; padding: 4px 10px; font-size: 0.67rem; font-weight: 900; color: #16a34a; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .tryon2-jewel-remove { position: absolute; top: 8px; left: 8px; width: 26px; height: 26px; border-radius: 50%; border: 0; background: rgba(0,0,0,0.45); color: #fff; display: grid; place-items: center; cursor: pointer; transition: background 0.15s; }
  .tryon2-jewel-remove:hover { background: rgba(185,28,28,0.85); }
  .tryon2-jewel-change { position: absolute; bottom: 0; left: 0; right: 0; padding: 8px; background: linear-gradient(transparent, rgba(0,0,0,0.55)); color: #fff; font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer; opacity: 0; transition: opacity 0.2s; }
  .tryon2-jewel-preview:hover .tryon2-jewel-change { opacity: 1; }
  .tryon2-jewel-upload {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; padding: 18px; border-radius: 13px;
    border: 1.5px dashed rgba(207,95,145,0.32);
    background: linear-gradient(145deg, rgba(255,248,246,0.8), rgba(255,252,250,0.9));
    color: var(--bb-rose); font-size: 0.78rem; font-weight: 800;
    cursor: pointer; transition: all 0.18s; text-align: center;
  }
  .tryon2-jewel-upload:hover { border-color: var(--bb-rose); background: rgba(207,95,145,0.06); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(207,95,145,0.12); }
  .tryon2-jewel-upload-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(207,95,145,0.12); display: grid; place-items: center; }
  .tryon2-jewel-upload span { color: var(--bb-muted); font-size: 0.7rem; font-weight: 600; }

  /* ── Gallery ── */
  .tryon2-gallery { display: flex; flex-direction: column; gap: 8px; }
  .tryon2-gallery-label { font-size: 0.62rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: var(--bb-muted); }
  .tryon2-gallery-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .tryon2-gallery-item { padding: 0; border: 2px solid transparent; border-radius: 10px; overflow: hidden; cursor: pointer; background: #f5f0ed; position: relative; aspect-ratio: 1; transition: all 0.16s; }
  .tryon2-gallery-item:hover { transform: scale(1.05); box-shadow: 0 5px 16px rgba(0,0,0,0.12); border-color: rgba(207,95,145,0.25); }
  .tryon2-gallery-item.is-on { border-color: var(--bb-rose); box-shadow: 0 0 0 3px rgba(207,95,145,0.2); transform: scale(1.03); }
  .tryon2-gallery-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .tryon2-gallery-check { position: absolute; inset: 0; margin: auto; color: var(--bb-rose); filter: drop-shadow(0 1px 5px rgba(255,255,255,0.95)); }

  /* ── Generate CTA ── */
  .tryon2-generate-wrap { padding: 14px 18px 18px; }
  .tryon2-generate-btn {
    width: 100%;
    display: inline-flex; align-items: center; justify-content: center; gap: 9px;
    padding: 15px 20px;
    border-radius: 14px;
    border: none;
    background: rgba(0,0,0,0.06);
    color: var(--bb-muted);
    font-size: 0.9rem; font-weight: 800;
    cursor: default;
    transition: all 0.22s;
    letter-spacing: 0.01em;
    position: relative;
    overflow: hidden;
  }
  .tryon2-generate-btn.is-ready {
    background: linear-gradient(135deg, var(--bb-coral) 0%, var(--bb-rose) 50%, #a855f7 100%);
    color: #fff;
    cursor: pointer;
    box-shadow: 0 6px 24px rgba(207,95,145,0.35);
  }
  .tryon2-generate-btn.is-ready::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%);
    background-size: 200% 100%;
    animation: btn-shimmer 2.5s linear infinite;
  }
  @keyframes btn-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .tryon2-generate-btn.is-ready:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(207,95,145,0.42); }
  .tryon2-generate-btn:disabled { opacity: 1; }

  .tryon2-hint { margin: 6px 18px 14px; font-size: 0.72rem; color: var(--bb-muted); text-align: center; line-height: 1.5; }
  .tryon2-error { margin: 0 18px 14px; padding: 10px 14px; border-radius: 11px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-size: 0.77rem; line-height: 1.5; }

  /* ── Right canvas ── */
  .tryon2-canvas {
    border-radius: 22px;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    background: linear-gradient(160deg, #fdf4f0 0%, #f7ece6 50%, #f2e8f0 100%);
    border: 1px solid var(--bb-line);
    box-shadow: 0 4px 32px rgba(0,0,0,0.06);
    /* Fill column height — same as left panel */
    height: 100%;
    /* Sticky so it stays in view while left scrolls on mobile */
    align-self: stretch;
  }
  /* ── Empty state ── */
  .tryon2-empty {
    width: 100%; height: 100%; min-height: 420px;
    display: grid; place-items: center;
    padding: 48px 40px;
    position: relative;
  }

  /* Animated background orbs */
  .tryon2-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    pointer-events: none;
    animation: orb-float 8s ease-in-out infinite;
  }
  .tryon2-orb--1 { width: 220px; height: 220px; background: rgba(207,95,145,0.12); top: -40px; right: 10%; animation-delay: 0s; }
  .tryon2-orb--2 { width: 160px; height: 160px; background: rgba(199,166,106,0.1); bottom: 10%; left: 5%; animation-delay: -3s; }
  .tryon2-orb--3 { width: 120px; height: 120px; background: rgba(139,107,181,0.1); top: 40%; right: 5%; animation-delay: -5s; }
  @keyframes orb-float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%       { transform: translate(12px, -18px) scale(1.06); }
    66%       { transform: translate(-8px, 10px) scale(0.95); }
  }

  .tryon2-idle-art {
    display: flex; flex-direction: column; align-items: center;
    gap: 18px; text-align: center; max-width: 400px;
    position: relative; z-index: 1;
  }
  .tryon2-idle-icon {
    width: 100px; height: 100px; border-radius: 28px;
    background: linear-gradient(135deg, rgba(207,95,145,0.15), rgba(199,166,106,0.1));
    border: 1.5px solid rgba(207,95,145,0.2);
    display: grid; place-items: center; color: var(--bb-rose);
    box-shadow: 0 12px 40px rgba(207,95,145,0.16);
    animation: icon-pulse 3s ease-in-out infinite;
  }
  @keyframes icon-pulse {
    0%, 100% { box-shadow: 0 12px 40px rgba(207,95,145,0.16); transform: scale(1); }
    50%       { box-shadow: 0 16px 50px rgba(207,95,145,0.26); transform: scale(1.03); }
  }
  .tryon2-idle-art strong { font-size: 1.2rem; color: var(--bb-ink); font-weight: 900; margin: 0; letter-spacing: -0.01em; }
  .tryon2-idle-art > p { color: var(--bb-muted); font-size: 0.86rem; line-height: 1.65; margin: 0; max-width: 280px; }

  .tryon2-steps-hint {
    display: grid; gap: 0; text-align: left; width: 100%;
    background: rgba(255,255,255,0.72);
    border-radius: 16px;
    padding: 4px;
    border: 1px solid rgba(255,255,255,0.9);
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  .tryon2-step-hint {
    display: flex; gap: 12px; align-items: center;
    padding: 11px 12px; border-radius: 12px;
    transition: background 0.16s;
  }
  .tryon2-step-hint:hover { background: rgba(207,95,145,0.05); }
  .tryon2-step-hint.is-done { opacity: 0.6; }
  .tryon2-step-hint > span {
    width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
    display: grid; place-items: center; font-size: 0.76rem; font-weight: 900;
    background: linear-gradient(135deg, var(--bb-rose), var(--bb-coral));
    color: #fff;
    box-shadow: 0 3px 10px rgba(207,95,145,0.3);
  }
  .tryon2-step-hint.is-done > span { background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 3px 10px rgba(34,197,94,0.3); }
  .tryon2-step-hint strong { display: block; font-size: 0.82rem; color: var(--bb-ink); font-weight: 800; margin-bottom: 1px; }
  .tryon2-step-hint p { margin: 0; font-size: 0.72rem; color: var(--bb-muted); }

  /* ── Ready preview ── */
  .tryon2-ready-preview {
    display: flex; flex-direction: column; align-items: center; gap: 28px;
    position: relative; z-index: 1;
  }
  .tryon2-preview-stack { position: relative; width: 200px; height: 264px; }
  .tryon2-preview-person { width: 100%; height: 100%; object-fit: cover; border-radius: 20px; display: block; border: 2.5px solid rgba(255,255,255,0.9); box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
  .tryon2-preview-jewel-badge {
    position: absolute; bottom: -14px; right: -14px;
    width: 80px; height: 80px; border-radius: 18px; overflow: hidden;
    border: 3px solid #fff; box-shadow: 0 8px 28px rgba(0,0,0,0.18);
    background: linear-gradient(145deg, #fdf9f7, #fff);
    animation: jewel-bounce 2s ease-in-out infinite;
  }
  @keyframes jewel-bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-5px); }
  }
  .tryon2-preview-jewel-badge img { width: 100%; height: 100%; object-fit: contain; padding: 6px; }
  .tryon2-ready-text { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .tryon2-ready-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: linear-gradient(135deg, rgba(207,95,145,0.12), rgba(199,166,106,0.08));
    border: 1px solid rgba(207,95,145,0.2);
    padding: 5px 14px; border-radius: 999px;
    font-size: 0.72rem; font-weight: 800; color: var(--bb-rose);
  }
  .tryon2-ready-text h3 { margin: 0; font-size: 1.15rem; font-weight: 900; color: var(--bb-ink); letter-spacing: -0.01em; }
  .tryon2-ready-text p { margin: 0; font-size: 0.83rem; color: var(--bb-muted); line-height: 1.55; max-width: 260px; }
  .tryon2-ready-text strong { color: var(--bb-rose); }

  /* ── Generating overlay ── */
  .tryon2-gen-overlay { position: absolute; inset: 0; overflow: hidden; background: #12080e; display: grid; place-items: center; }
  .tryon2-gen-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(14px) brightness(0.25) saturate(0.4); display: block; }
  .tryon2-shimmer { position: absolute; inset: 0; background: linear-gradient(110deg, transparent 20%, rgba(207,95,145,0.14) 50%, transparent 80%); background-size: 200% 100%; animation: shimmer 2.4s linear infinite; }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .tryon2-gen-badge { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 16px; color: #fff; text-align: center; padding: 40px; }
  .tryon2-gen-ring { width: 100px; height: 100px; border-radius: 50%; padding: 3px; background: conic-gradient(from 0deg, #e38d5a, #cf5f91, #8b6bb5, #3f8874, #e38d5a); animation: spin 3s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .tryon2-gen-inner { width: 100%; height: 100%; border-radius: 50%; background: rgba(18,8,14,0.88); display: grid; place-items: center; color: var(--bb-rose); }
  .tryon2-gen-badge strong { font-size: 1.1rem; font-weight: 800; color: #fff; }
  .tryon2-gen-badge span { font-size: 0.78rem; color: rgba(255,255,255,0.55); }
  .tryon2-gen-dots { display: flex; gap: 8px; margin-top: 4px; }
  .tryon2-gen-dots span { width: 8px; height: 8px; border-radius: 50%; background: var(--bb-rose); animation: dotpulse 1.4s ease-in-out infinite; }
  .tryon2-gen-dots span:nth-child(2) { animation-delay: 0.2s; }
  .tryon2-gen-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dotpulse { 0%,80%,100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }

  /* ── Comparison slider ── */
  .tryon2-slider { position: relative; overflow: hidden; cursor: ew-resize; user-select: none; width: 100%; line-height: 0; touch-action: pan-y; }
  .tryon2-slider-img { width: 100%; display: block; max-height: 720px; object-fit: contain; background: linear-gradient(160deg, #fdf4f0, #f2e8f0); }
  .tryon2-slider-img--before { width: 100%; display: block; }
  .tryon2-slider-before { position: absolute; inset: 0; overflow: hidden; will-change: clip-path; }
  .tryon2-slider-before img { width: 100%; height: 100%; object-fit: contain; display: block; background: linear-gradient(160deg, #fdf4f0, #f2e8f0); }
  .tryon2-slider-line { position: absolute; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,0.98); transform: translateX(-50%); pointer-events: none; box-shadow: 0 0 16px rgba(0,0,0,0.3); will-change: left; }
  .tryon2-slider-handle {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 52px; height: 52px; border-radius: 50%;
    background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,0.22);
    display: grid; place-items: center; color: var(--bb-ink);
    border: 2px solid rgba(207,95,145,0.2);
  }
  .tryon2-label-pill { position: absolute; top: 16px; padding: 6px 14px; border-radius: 999px; background: rgba(0,0,0,0.5); color: #fff; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; backdrop-filter: blur(12px); pointer-events: none; transition: opacity 0.2s; }
  .tryon2-label-pill--left { left: 16px; }
  .tryon2-label-pill--right { right: 16px; }

  /* ── Result ── */
  /* Default (no frames): single column */
  .tryon2-result-wrap {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  /* With frames: side-by-side so nothing is hidden below fold */
  .tryon2-result-wrap.has-frames {
    display: grid;
    grid-template-columns: 1fr 300px;
    grid-template-rows: 1fr;
    gap: 0;
    height: 100%;
    overflow: hidden;
  }

  .tryon2-result-left {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
  .tryon2-result-slider-wrap {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(160deg, #fdf4f0, #f2e8f0);
  }
  /* Make the slider image fill the available height rather than its natural size */
  .tryon2-result-slider-wrap .tryon2-slider { height: 100%; }
  .tryon2-result-slider-wrap .tryon2-slider-img { max-height: 100%; height: 100%; object-fit: contain; width: 100%; }
  .tryon2-result-slider-wrap .tryon2-slider-before img { height: 100%; object-fit: contain; }

  .tryon2-result-actions { display: flex; gap: 10px; padding: 10px 14px; background: rgba(255,255,255,0.95); backdrop-filter: blur(14px); border-top: 1px solid var(--bb-line); flex-wrap: wrap; flex-shrink: 0; }
  .tryon2-action-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 11px; border: 1.5px solid var(--bb-line); background: #fff; color: var(--bb-ink); font-size: 0.79rem; font-weight: 800; cursor: pointer; transition: all 0.16s; white-space: nowrap; }
  .tryon2-action-btn:hover:not(:disabled) { border-color: var(--bb-rose); color: var(--bb-rose); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(207,95,145,0.14); }
  .tryon2-action-btn:disabled { opacity: 0.45; cursor: default; }
  .tryon2-action-btn--primary { background: linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, #a855f7); color: #fff; border-color: transparent; box-shadow: 0 4px 18px rgba(207,95,145,0.3); }
  .tryon2-action-btn--primary:hover:not(:disabled) { opacity: 0.9; color: #fff; transform: translateY(-1px); box-shadow: 0 8px 26px rgba(207,95,145,0.38); }
  .tryon2-footnote { margin: 0; font-size: 0.68rem; color: var(--bb-muted); text-align: center; padding: 7px 14px 10px; flex-shrink: 0; }

  /* ── Frames (right column when side-by-side) ── */
  .tryon2-frames-block {
    border-left: 1px solid var(--bb-line);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
  }
  /* When stacked (no has-frames grid), restore top border */
  .tryon2-result-wrap:not(.has-frames) .tryon2-frames-block {
    border-left: none;
    border-top: 1px solid var(--bb-line);
    height: auto;
  }
  .tryon2-video-loading { display: flex; align-items: center; gap: 12px; padding: 32px 20px; background: #140c0e; color: rgba(255,255,255,0.65); font-size: 0.82rem; justify-content: center; flex: 1; }
  .tryon2-video-error { padding: 18px; background: #3b1c1c; color: #f87171; font-size: 0.82rem; text-align: center; }
  .tryon2-frame-player { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .tryon2-frame-img-wrap { position: relative; flex: 1; min-height: 0; overflow: hidden; background: #140c0e; }
  .tryon2-frame-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; opacity: 0; transition: opacity 0.28s ease; }
  .tryon2-frame-img.is-active { opacity: 1; }
  .tryon2-frame-label { position: absolute; bottom: 10px; left: 10px; padding: 4px 10px; border-radius: 999px; background: rgba(0,0,0,0.62); color: #fff; font-size: 0.67rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; backdrop-filter: blur(8px); pointer-events: none; }
  .tryon2-frame-controls { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.97); border-top: 1px solid var(--bb-line); gap: 10px; flex-wrap: wrap; flex-shrink: 0; }
  .tryon2-frame-dots { display: flex; gap: 6px; align-items: center; }
  .tryon2-frame-dot { width: 8px; height: 8px; border-radius: 50%; border: 0; background: rgba(0,0,0,0.15); cursor: pointer; padding: 0; transition: background 0.15s, transform 0.15s; }
  .tryon2-frame-dot.is-on { background: var(--bb-rose); transform: scale(1.45); }
  .tryon2-frame-btns { display: flex; gap: 7px; }

  @media (max-width: 860px) {
    .tryon2-result-wrap.has-frames { display: flex; flex-direction: column; height: auto; }
    .tryon2-frames-block { border-left: none; border-top: 1px solid var(--bb-line); height: auto; }
    .tryon2-frame-img-wrap { aspect-ratio: 3/4; flex: none; }
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .tryon2-slider-img { max-height: 520px; }
    .tryon2-progress-pills { display: none; }
    .tryon2-canvas { min-height: 480px; height: auto; }
    .tryon2-inputs { height: auto; overflow: visible; }
    .tryon2-gallery-grid { grid-template-columns: repeat(5, 1fr); }
  }
  @media (max-width: 540px) {
    .tryon2-result-actions { flex-direction: column; }
    .tryon2-gallery-grid { grid-template-columns: repeat(4, 1fr); }
    .tryon2-shell { padding: 10px; }
  }
`
