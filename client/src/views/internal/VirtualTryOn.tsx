import { useRef, useState } from 'react'
import {
  Camera, Upload, Sparkles, Download, RotateCcw,
  ChevronLeft, ChevronRight, Loader2, ImageIcon,
  CheckCircle2, AlertCircle, Wand2, X,
} from 'lucide-react'
import { useProjects, type GalleryFolder, type GalleryImage } from '../../context/ProjectContext'

type Step = 'upload-photo' | 'pick-jewellery' | 'result'
type JewelleryType = 'ring' | 'necklace' | 'earrings' | 'bracelet' | 'pendant' | 'bangle'

const JEWELLERY_TYPES: { value: JewelleryType; label: string; emoji: string; hint: string }[] = [
  { value: 'ring',      label: 'Ring',      emoji: '💍', hint: 'finger' },
  { value: 'necklace',  label: 'Necklace',  emoji: '📿', hint: 'neck' },
  { value: 'earrings',  label: 'Earrings',  emoji: '👂', hint: 'ears' },
  { value: 'bracelet',  label: 'Bracelet',  emoji: '⌚', hint: 'wrist' },
  { value: 'pendant',   label: 'Pendant',   emoji: '🔮', hint: 'neck/chest' },
  { value: 'bangle',    label: 'Bangle',    emoji: '✨', hint: 'wrist' },
]

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/* ─── Step 1: Photo upload ────────────────────────────── */
function PhotoUploadStep({
  photo, onPhoto,
}: {
  photo: string | null
  onPhoto: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const b64 = await fileToBase64(file)
    onPhoto(b64)
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--bb-ink)' }}>
          Upload your photo
        </h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--bb-muted)', lineHeight: 1.55 }}>
          Use a clear photo showing the area where you'll wear the jewellery — face + ears for earrings, neck for necklaces, hand for rings.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); void handleFile(e.dataTransfer.files[0]) }}
        style={{
          borderRadius: 20,
          border: photo ? '2px solid var(--bb-rose)' : '2px dashed rgba(207,95,145,0.35)',
          background: photo ? 'transparent' : 'rgba(255,247,244,0.6)',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'all 0.2s',
          minHeight: photo ? 'auto' : 220,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display: 'none' }}
          onChange={e => void handleFile(e.target.files?.[0])}
        />
        {photo ? (
          <>
            <img
              src={photo}
              alt="Your photo"
              style={{ width: '100%', maxHeight: 420, objectFit: 'contain', display: 'block' }}
            />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onPhoto('') }}
              style={{
                position: 'absolute', top: 10, right: 10,
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', background: 'rgba(0,0,0,0.55)',
                color: '#fff', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}
            >
              <X size={15} />
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
              display: 'grid', placeItems: 'center',
              background: 'linear-gradient(135deg, rgba(207,95,145,0.15), rgba(240,171,200,0.1))',
            }}>
              <Camera size={30} style={{ color: 'var(--bb-rose)' }} />
            </div>
            <strong style={{ display: 'block', color: 'var(--bb-ink)', marginBottom: 6 }}>
              Drop your photo here
            </strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--bb-muted)' }}>
              or tap to browse · JPG, PNG, WEBP
            </span>
            <div style={{ marginTop: 14 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: '0.75rem', color: 'var(--bb-rose)', fontWeight: 700,
                padding: '5px 12px', borderRadius: 999,
                border: '1px solid rgba(207,95,145,0.3)',
                background: 'rgba(207,95,145,0.07)',
              }}>
                <Camera size={12} /> Use camera on mobile
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
      }}>
        {[
          { tip: '💡 Good lighting', desc: 'Natural or bright indoor light works best' },
          { tip: '📐 Face the camera', desc: 'Front-facing angle gives clearest results' },
        ].map(({ tip, desc }) => (
          <div key={tip} style={{
            padding: '10px 14px', borderRadius: 12,
            background: '#fff', border: '1px solid var(--bb-line)',
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 3 }}>{tip}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--bb-muted)', lineHeight: 1.4 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Step 2: Pick jewellery ─────────────────────────── */
function PickJewelleryStep({
  jewellery, jewelleryType,
  onJewellery, onJewelleryType, aiGeneratedFolders,
}: {
  jewellery: string | null
  jewelleryType: JewelleryType
  onJewellery: (url: string) => void
  onJewelleryType: (t: JewelleryType) => void
  aiGeneratedFolders: GalleryFolder[]
}) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    const b64 = await fileToBase64(file)
    onJewellery(b64)
  }

  const allImages: GalleryImage[] = aiGeneratedFolders.flatMap(f => f.images)

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--bb-ink)' }}>
          Choose your jewellery
        </h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--bb-muted)', lineHeight: 1.55 }}>
          Pick from your AI gallery or upload any design image.
        </p>
      </div>

      {/* Jewellery type */}
      <div>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--bb-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Jewellery type
        </span>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {JEWELLERY_TYPES.map(jt => (
            <button
              key={jt.value}
              type="button"
              onClick={() => onJewelleryType(jt.value)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700,
                border: `1.5px solid ${jewelleryType === jt.value ? 'var(--bb-rose)' : 'var(--bb-line)'}`,
                background: jewelleryType === jt.value ? 'linear-gradient(135deg,rgba(207,95,145,0.12),rgba(240,171,200,0.08))' : '#fff',
                color: jewelleryType === jt.value ? 'var(--bb-rose)' : 'var(--bb-muted)',
                cursor: 'pointer',
              }}
            >
              {jt.emoji} {jt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected preview */}
      {jewellery && (
        <div style={{
          borderRadius: 16, overflow: 'hidden', position: 'relative',
          border: '2px solid var(--bb-rose)',
          background: 'rgba(255,247,244,0.6)',
        }}>
          <img src={jewellery} alt="Selected jewellery" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }} />
          <div style={{
            position: 'absolute', top: 8, right: 8,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
            fontSize: '0.72rem', fontWeight: 800, color: 'var(--bb-rose)',
          }}>
            <CheckCircle2 size={12} /> Selected
          </div>
          <button
            type="button"
            onClick={() => onJewellery('')}
            style={{
              position: 'absolute', top: 8, left: 8,
              width: 28, height: 28, borderRadius: '50%',
              border: 'none', background: 'rgba(0,0,0,0.45)',
              color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center',
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Upload custom */}
      <div>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--bb-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          Upload custom design
        </span>
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
          border: '1.5px dashed rgba(207,95,145,0.4)',
          background: 'rgba(255,247,244,0.5)',
          fontSize: '0.85rem', fontWeight: 700, color: 'var(--bb-rose)',
        }}>
          <Upload size={15} /> Upload design image
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => void handleUpload(e.target.files?.[0])}
          />
        </label>
      </div>

      {/* Gallery grid */}
      {allImages.length > 0 && (
        <div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--bb-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            From your AI gallery ({allImages.length})
          </span>

          {/* Folder filter chips */}
          {aiGeneratedFolders.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setActiveFolder(null)}
                style={{
                  fontSize: '0.73rem', padding: '4px 10px', borderRadius: 999, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${activeFolder === null ? 'var(--bb-rose)' : 'var(--bb-line)'}`,
                  background: activeFolder === null ? 'rgba(207,95,145,0.1)' : '#fff',
                  color: activeFolder === null ? 'var(--bb-rose)' : 'var(--bb-muted)',
                }}
              >
                All
              </button>
              {aiGeneratedFolders.slice(0, 5).map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFolder(f.id)}
                  style={{
                    fontSize: '0.73rem', padding: '4px 10px', borderRadius: 999, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${activeFolder === f.id ? 'var(--bb-rose)' : 'var(--bb-line)'}`,
                    background: activeFolder === f.id ? 'rgba(207,95,145,0.1)' : '#fff',
                    color: activeFolder === f.id ? 'var(--bb-rose)' : 'var(--bb-muted)',
                    maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
            gap: 8,
            maxHeight: 280,
            overflowY: 'auto',
            paddingRight: 4,
          }}>
            {(activeFolder
              ? aiGeneratedFolders.find(f => f.id === activeFolder)?.images ?? []
              : allImages
            ).map(img => {
              const selected = jewellery === img.url
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onJewellery(img.url)}
                  style={{
                    padding: 0, border: `2px solid ${selected ? 'var(--bb-rose)' : 'transparent'}`,
                    borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                    background: 'transparent', position: 'relative',
                    boxShadow: selected ? '0 0 0 3px rgba(207,95,145,0.2)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                  {selected && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'grid', placeItems: 'center',
                      background: 'rgba(207,95,145,0.18)',
                    }}>
                      <CheckCircle2 size={20} style={{ color: 'var(--bb-rose)' }} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {allImages.length === 0 && (
        <div style={{
          padding: '24px 20px', borderRadius: 14, textAlign: 'center',
          background: '#fff', border: '1px solid var(--bb-line)',
          color: 'var(--bb-muted)', fontSize: '0.85rem',
        }}>
          <ImageIcon size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
          No designs in gallery yet. Generate some in the Designs tab or upload a design above.
        </div>
      )}
    </div>
  )
}

/* ─── Result panel ───────────────────────────────────── */
function ResultPanel({
  resultUrl, personPhoto, onReset, onDownload,
}: {
  resultUrl: string
  personPhoto: string
  onReset: () => void
  onDownload: () => void
}) {
  const [showOriginal, setShowOriginal] = useState(false)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--bb-ink)' }}>
            ✨ Your virtual try-on
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--bb-muted)' }}>
            AI-generated preview — tap to compare with original
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid var(--bb-line)', background: '#fff',
            fontSize: '0.82rem', fontWeight: 700, color: 'var(--bb-muted)',
          }}
        >
          <RotateCcw size={14} /> Try again
        </button>
      </div>

      {/* Image comparison */}
      <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--bb-line)', boxShadow: '0 18px 50px rgba(40,30,28,0.14)' }}>
        <img
          src={showOriginal ? personPhoto : resultUrl}
          alt={showOriginal ? 'Original photo' : 'Try-on result'}
          style={{ width: '100%', display: 'block', maxHeight: 560, objectFit: 'contain', background: '#f9f4f1' }}
        />

        {/* Toggle pill */}
        <div style={{
          position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
          display: 'inline-flex', borderRadius: 999, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>
          {['Result', 'Original'].map(label => (
            <button
              key={label}
              type="button"
              onClick={() => setShowOriginal(label === 'Original')}
              style={{
                padding: '8px 18px', border: 'none', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 800,
                background: (label === 'Original') === showOriginal
                  ? 'rgba(255,255,255,0.96)'
                  : 'rgba(255,255,255,0.45)',
                color: (label === 'Original') === showOriginal ? 'var(--bb-ink)' : 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          type="button"
          onClick={onDownload}
          className="bb-btn-primary bb-lift"
          style={{ justifyContent: 'center' }}
        >
          <Download size={15} /> Download
        </button>
        <button
          type="button"
          onClick={onReset}
          className="bb-btn-secondary bb-lift"
          style={{ justifyContent: 'center' }}
        >
          <RotateCcw size={15} /> New try-on
        </button>
      </div>

      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--bb-muted)', textAlign: 'center', lineHeight: 1.5 }}>
        This is an AI-generated preview for visualisation only. Actual jewellery appearance may vary slightly.
      </p>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────── */
export default function VirtualTryOn() {
  const { aiGeneratedFolders } = useProjects()
  const [step, setStep] = useState<Step>('upload-photo')
  const [personPhoto, setPersonPhoto] = useState<string>('')
  const [jewellery, setJewellery] = useState<string>('')
  const [jewelleryType, setJewelleryType] = useState<JewelleryType>('ring')
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [resultUrl, setResultUrl] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')

  const canProceedStep1 = !!personPhoto
  const canProceedStep2 = !!jewellery
  const steps = ['upload-photo', 'pick-jewellery', 'result'] as const
  const stepIndex = steps.indexOf(step)

  const generate = async () => {
    if (!personPhoto || !jewellery) return
    setStatus('generating')
    setErrorMsg('')
    try {
      const res = await fetch('/api/ai/tryon', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personPhoto,
          jewelleryImage: jewellery,
          jewelleryType,
        }),
      })
      const data = await res.json().catch(() => ({})) as { resultUrl?: string; error?: string }
      if (!res.ok || !data.resultUrl) {
        throw new Error(data.error || 'Try-on generation failed')
      }
      setResultUrl(data.resultUrl)
      setStatus('done')
      setStep('result')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Generation failed')
      setStatus('error')
    }
  }

  const reset = () => {
    setStep('upload-photo')
    setPersonPhoto('')
    setJewellery('')
    setResultUrl('')
    setStatus('idle')
    setErrorMsg('')
  }

  const download = () => {
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = `bb-tryon-${Date.now()}.png`
    a.click()
  }

  const jt = JEWELLERY_TYPES.find(j => j.value === jewelleryType)!

  return (
    <div style={{ padding: 'clamp(14px,3vw,28px)', display: 'grid', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Header ── */}
      <section style={{
        borderRadius: 20,
        padding: 'clamp(16px,3vw,26px)',
        background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1054 50%, #1e0a38 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        boxShadow: '0 20px 60px rgba(26,10,46,0.35)',
        border: '1px solid rgba(180,140,255,0.2)',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 8,
            padding: '4px 12px', borderRadius: 999,
            background: 'rgba(167,90,255,0.2)', border: '1px solid rgba(167,90,255,0.4)',
          }}>
            <Sparkles size={11} style={{ color: '#c084fc' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.08em', color: '#c084fc', textTransform: 'uppercase' }}>
              Powered by AI
            </span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(1.3rem,3vw,1.9rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            Virtual Try-On
          </h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(220,200,255,0.75)', lineHeight: 1.5 }}>
            See exactly how any jewellery piece looks on you — before it's made.
          </p>
        </div>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg,rgba(167,90,255,0.3),rgba(236,72,153,0.2))',
          display: 'grid', placeItems: 'center', flexShrink: 0,
          border: '1px solid rgba(180,140,255,0.3)',
          fontSize: '2.2rem',
        }}>
          💍
        </div>
      </section>

      {/* ── Step indicator ── */}
      {step !== 'result' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {[
            { key: 'upload-photo',    label: 'Your photo',  num: 1 },
            { key: 'pick-jewellery',  label: 'Jewellery',   num: 2 },
            { key: 'result',          label: 'Result',      num: 3 },
          ].map((s, i) => {
            const done = stepIndex > i
            const active = step === s.key
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    fontSize: '0.8rem', fontWeight: 900, flexShrink: 0,
                    background: done ? 'var(--bb-rose)' : active ? 'linear-gradient(135deg,var(--bb-rose),var(--bb-coral))' : '#f0e8e4',
                    color: done || active ? '#fff' : 'var(--bb-muted)',
                    boxShadow: active ? '0 4px 14px rgba(207,95,145,0.4)' : 'none',
                  }}>
                    {done ? '✓' : s.num}
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: active ? 800 : 500, color: active ? 'var(--bb-ink)' : 'var(--bb-muted)', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 2, margin: '0 12px', background: done ? 'var(--bb-rose)' : '#f0e8e4', borderRadius: 2 }} />}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ display: 'grid', gridTemplateColumns: step === 'result' ? '1fr' : 'clamp(300px,42%,460px) 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left: step form */}
        {step !== 'result' && (
          <section className="bb-card" style={{ padding: 'clamp(16px,3vw,24px)', borderRadius: 20, boxShadow: '0 16px 48px rgba(40,30,28,0.10)' }}>
            {step === 'upload-photo' && (
              <PhotoUploadStep
                photo={personPhoto}
                onPhoto={url => { setPersonPhoto(url); if (!url) return }}
              />
            )}
            {step === 'pick-jewellery' && (
              <PickJewelleryStep
                jewellery={jewellery}
                jewelleryType={jewelleryType}
                onJewellery={setJewellery}
                onJewelleryType={setJewelleryType}
                aiGeneratedFolders={aiGeneratedFolders}
              />
            )}

            {/* Nav buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              {step !== 'upload-photo' && (
                <button
                  type="button"
                  onClick={() => setStep(step === 'pick-jewellery' ? 'upload-photo' : 'pick-jewellery')}
                  className="bb-btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              {step === 'upload-photo' && (
                <button
                  type="button"
                  onClick={() => setStep('pick-jewellery')}
                  disabled={!canProceedStep1}
                  className="bb-btn-primary bb-lift"
                  style={{ flex: 1, justifyContent: 'center', opacity: canProceedStep1 ? 1 : 0.45 }}
                >
                  Next: Pick jewellery <ChevronRight size={16} />
                </button>
              )}
              {step === 'pick-jewellery' && (
                <button
                  type="button"
                  onClick={generate}
                  disabled={!canProceedStep2 || status === 'generating'}
                  className="bb-btn-primary bb-lift"
                  style={{ flex: 1, justifyContent: 'center', opacity: canProceedStep2 ? 1 : 0.45 }}
                >
                  {status === 'generating'
                    ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
                    : <><Wand2 size={16} /> Generate Try-On</>
                  }
                </button>
              )}
            </div>

            {/* Error */}
            {status === 'error' && (
              <div style={{
                marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start',
                padding: '10px 14px', borderRadius: 10,
                background: '#fef2f2', border: '1px solid #fecaca',
              }}>
                <AlertCircle size={15} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: '0.82rem', color: '#b91c1c' }}>{errorMsg}</span>
              </div>
            )}
          </section>
        )}

        {/* Right: preview */}
        <section className="bb-card" style={{ padding: step === 'result' ? 0 : 'clamp(16px,3vw,24px)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 16px 48px rgba(40,30,28,0.10)' }}>
          {step === 'result' ? (
            <div style={{ padding: 'clamp(16px,3vw,24px)' }}>
              <ResultPanel
                resultUrl={resultUrl}
                personPhoto={personPhoto}
                onReset={reset}
                onDownload={download}
              />
            </div>
          ) : status === 'generating' ? (
            <div style={{ minHeight: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32, textAlign: 'center' }}>
              {/* Animated spinner */}
              <div style={{ position: 'relative', width: 90, height: 90 }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: 'var(--bb-rose)',
                  borderRightColor: 'rgba(207,95,145,0.4)',
                  animation: 'spin 1s linear infinite',
                }} />
                <div style={{
                  position: 'absolute', inset: 8, borderRadius: '50%',
                  background: 'linear-gradient(135deg,rgba(207,95,145,0.1),rgba(240,171,200,0.08))',
                  display: 'grid', placeItems: 'center', fontSize: '1.8rem',
                }}>
                  {jt.emoji}
                </div>
              </div>
              <div>
                <strong style={{ display: 'block', marginBottom: 6, color: 'var(--bb-ink)' }}>AI is styling you…</strong>
                <span style={{ fontSize: '0.83rem', color: 'var(--bb-muted)', lineHeight: 1.5 }}>
                  Placing {jt.label.toLowerCase()} on your {jt.hint}.<br />This takes about 20–40 seconds.
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 260 }}>
                {['Analysing your photo', 'Identifying jewellery', 'Compositing design', 'Rendering result'].map((s, i) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Loader2 size={13} style={{ color: 'var(--bb-rose)', flexShrink: 0, animation: 'spin 1.4s linear infinite', animationDelay: `${i * 0.2}s` }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--bb-muted)' }}>{s}</span>
                  </div>
                ))}
              </div>
              <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : (
            /* Preview pane: shows photos side by side when both selected */
            <div style={{ minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
              {personPhoto || jewellery ? (
                <div style={{ display: 'grid', gridTemplateColumns: personPhoto && jewellery ? '1fr 1fr' : '1fr', gap: 12, width: '100%' }}>
                  {personPhoto && (
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--bb-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your photo</span>
                      <img src={personPhoto} alt="You" style={{ width: '100%', borderRadius: 12, objectFit: 'cover', aspectRatio: '3/4', border: '1px solid var(--bb-line)' }} />
                    </div>
                  )}
                  {jewellery && (
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--bb-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {jt.emoji} {jt.label}
                      </span>
                      <img src={jewellery} alt="Jewellery" style={{ width: '100%', borderRadius: 12, objectFit: 'contain', aspectRatio: '1', border: '1px solid var(--bb-line)', background: '#f9f4f1' }} />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--bb-muted)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 14 }}>✨</div>
                  <strong style={{ display: 'block', marginBottom: 6, color: 'var(--bb-ink)' }}>Your try-on preview</strong>
                  <span style={{ fontSize: '0.84rem' }}>Upload your photo and select a jewellery piece to begin.</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── How it works (shown only on step 1) ── */}
      {step === 'upload-photo' && status === 'idle' && (
        <section className="bb-card" style={{ padding: 'clamp(16px,3vw,24px)', borderRadius: 20 }}>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-rose)', display: 'block', marginBottom: 14 }}>How it works</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
            {[
              { n: '1', title: 'Upload your photo',   desc: 'A clear selfie or portrait — face, neck or hands visible', emoji: '📸' },
              { n: '2', title: 'Pick a design',       desc: 'Choose from your AI gallery or upload any jewellery image', emoji: '💎' },
              { n: '3', title: 'AI composites it',    desc: 'Our model places the jewellery naturally on your photo',  emoji: '🤖' },
              { n: '4', title: 'Download & share',    desc: 'Save the result and share it with your customer',         emoji: '✨' },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: 'grid', placeItems: 'center', fontSize: '1.1rem',
                  background: 'linear-gradient(135deg,rgba(207,95,145,0.12),rgba(240,171,200,0.08))',
                  border: '1px solid rgba(207,95,145,0.2)',
                }}>
                  {step.emoji}
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--bb-ink)', marginBottom: 3 }}>{step.title}</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--bb-muted)', lineHeight: 1.5 }}>{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
