import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Gem, Heart, Sparkles, Plus, RefreshCcw, Watch, Crown,
  CircleDot, Flower2, Star,
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────── */
export interface MoodboardImage {
  id: string
  url: string
  label: string
  category: string
  prompt: string
}

interface Props {
  /** Luna's auto-filled category from intake DNA */
  autoCategory?: string | null
  /** Luna's notes / brief to feed into prompt */
  lunaBrief?: string | null
  /** Called when user picks an image as reference */
  onPick: (image: MoodboardImage) => void
  /** Compact mode — fewer images, smaller layout */
  compact?: boolean
}

/* ──────────────────────────────────────────────────────────
 * Category definitions
 * ────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: 'ring', label: 'Rings', icon: CircleDot },
  { id: 'necklace', label: 'Necklaces', icon: Gem },
  { id: 'earrings', label: 'Earrings', icon: Star },
  { id: 'watch', label: 'Watches', icon: Watch },
  { id: 'pendant', label: 'Pendants', icon: Flower2 },
  { id: 'bangle', label: 'Bangles', icon: Crown },
] as const

type CategoryId = typeof CATEGORIES[number]['id']

/* ──────────────────────────────────────────────────────────
 * Shimmer placeholder while generating
 * ────────────────────────────────────────────────────────── */
function ShimmerCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.8)',
        border: '1px solid var(--bb-line)',
      }}
    >
      <div
        style={{
          aspectRatio: index % 3 === 0 ? '3 / 4' : index % 3 === 1 ? '4 / 5' : '1 / 1',
          background: 'linear-gradient(90deg, #f4ece6 25%, #faf5f0 50%, #f4ece6 75%)',
          backgroundSize: '200% 100%',
          animation: 'bb-shimmer 1.8s linear infinite',
        }}
      />
      <div style={{ padding: '10px 12px' }}>
        <div style={{
          height: 10, width: '70%', borderRadius: 6,
          background: 'linear-gradient(90deg, #f0e8e2 25%, #f8f2ec 50%, #f0e8e2 75%)',
          backgroundSize: '200% 100%',
          animation: 'bb-shimmer 1.8s linear infinite',
        }} />
      </div>
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────
 * Main Component
 * ────────────────────────────────────────────────────────── */
export default function MagicMoodboard({
  autoCategory,
  lunaBrief,
  onPick,
  compact = false,
}: Props) {
  const [category, setCategory] = useState<CategoryId>('ring')
  const [images, setImages] = useState<MoodboardImage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [hasGenerated, setHasGenerated] = useState(false)
  const pendingJobsRef = useRef<Set<string>>(new Set())

  // Auto-select category from Luna's intake DNA
  useEffect(() => {
    if (!autoCategory) return
    const norm = autoCategory.toLowerCase()
    const match = CATEGORIES.find(c =>
      norm.includes(c.id) ||
      (c.id === 'watch' && /watch|wrist|chronograph/i.test(norm)) ||
      (c.id === 'ring' && /ring|solitaire|halo|band/i.test(norm)) ||
      (c.id === 'necklace' && /necklace|choker|collar/i.test(norm)) ||
      (c.id === 'earrings' && /earring|stud|drop/i.test(norm)) ||
      (c.id === 'pendant' && /pendant|locket/i.test(norm)) ||
      (c.id === 'bangle' && /bangle|bracelet|cuff/i.test(norm))
    )
    if (match) setCategory(match.id)
  }, [autoCategory])

  const pollJob = useCallback(async (jobId: string, expectedLabel: string, expectedCategory: string) => {
    const POLL_INTERVAL = 3500
    const MAX_POLLS = 52  // ~3 minutes

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise(r => window.setTimeout(r, POLL_INTERVAL))
      if (!pendingJobsRef.current.has(jobId)) return  // cancelled

      try {
        const res = await fetch(`/api/ai-render/jobs/${jobId}`, { cache: 'no-store' })
        if (!res.ok) continue
        const job = await res.json()

        if (job.status === 'completed') {
          const url = job.result?.images?.[0]?.url || job.result?.imageUrl
          if (url) {
            setImages(prev => [...prev, {
              id: jobId,
              url,
              label: job.moodboardLabel || expectedLabel,
              category: job.moodboardCategory || expectedCategory,
              prompt: '',
            }])
          }
          pendingJobsRef.current.delete(jobId)
          if (pendingJobsRef.current.size === 0) setIsLoading(false)
          return
        }

        if (job.status === 'failed') {
          pendingJobsRef.current.delete(jobId)
          if (pendingJobsRef.current.size === 0) setIsLoading(false)
          return
        }
      } catch {
        // network hiccup — keep polling
      }
    }

    // timeout
    pendingJobsRef.current.delete(jobId)
    if (pendingJobsRef.current.size === 0) setIsLoading(false)
  }, [])

  const generateConcepts = useCallback(async () => {
    // Cancel any previous polls
    pendingJobsRef.current.clear()
    setIsLoading(true)
    setImages([])
    setHasGenerated(true)

    try {
      const count = compact ? 4 : 6
      const res = await fetch('/api/ai-render/moodboard-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, brief: lunaBrief || '', count }),
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()

      if (!Array.isArray(data?.jobs) || data.jobs.length === 0) {
        throw new Error('No jobs returned')
      }

      // Kick off a poll loop for every job
      for (const job of data.jobs) {
        pendingJobsRef.current.add(job.id)
        void pollJob(job.id, job.moodboardLabel || category, job.moodboardCategory || category)
      }
    } catch {
      setIsLoading(false)
    }
  }, [category, lunaBrief, compact, pollJob])

  const toggleLike = (id: string) => {
    setLiked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const imageCount = compact ? 4 : 6

  return (
    <div
      data-testid="magic-moodboard"
      className="bb-card"
      style={{
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: compact ? 400 : 560,
        maxHeight: compact ? 'none' : 'calc(100vh - 180px)',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--bb-line)',
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          display: 'grid', placeItems: 'center',
          background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet))',
          color: '#fff', flexShrink: 0,
          boxShadow: '0 8px 18px rgba(207,95,145,0.24)',
        }}>
          <Sparkles size={16} />
        </div>
        <div style={{ minWidth: 0 }}>
          <strong style={{
            display: 'block',
            color: 'var(--bb-ink)',
            fontFamily: 'var(--app-font-display)',
            fontWeight: 500,
            fontSize: '1.05rem',
            lineHeight: 1.1,
            letterSpacing: '-0.005em',
          }}>
            Magic Moodboard
          </strong>
          <span style={{
            display: 'block',
            color: 'var(--bb-muted)',
            fontSize: '0.68rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginTop: 2,
          }}>
            AI concept directions · pencil-sketch style
          </span>
        </div>
        {hasGenerated && (
          <button
            onClick={generateConcepts}
            disabled={isLoading}
            aria-label="Regenerate concepts"
            className="bb-lift"
            data-testid="mood-refresh"
            style={{
              marginLeft: 'auto',
              width: 36, height: 36, borderRadius: 10,
              border: '1px solid var(--bb-line)',
              background: '#fff', color: 'var(--bb-muted)',
              cursor: isLoading ? 'progress' : 'pointer',
              display: 'grid', placeItems: 'center',
              opacity: isLoading ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            <RefreshCcw size={15} style={{
              animation: isLoading ? 'spin 1s linear infinite' : 'none',
            }} />
          </button>
        )}
      </div>

      {/* ── Category pills ── */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--bb-line)',
          display: 'flex', flexWrap: 'wrap', gap: 6,
          background: 'rgba(255,255,255,0.5)',
        }}
      >
        {CATEGORIES.map(cat => {
          const active = category === cat.id
          const Icon = cat.icon
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: active
                  ? '1px solid rgba(207,95,145,0.35)'
                  : '1px solid var(--bb-line)',
                background: active
                  ? 'linear-gradient(135deg, rgba(227,141,90,0.12), rgba(207,95,145,0.12))'
                  : 'rgba(255,255,255,0.7)',
                color: active ? 'var(--bb-rose)' : 'var(--bb-text)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={12} />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        <AnimatePresence mode="wait">
          {!hasGenerated && !isLoading ? (
            /* ── Empty state: Generate button ── */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                display: 'grid', placeItems: 'center',
                minHeight: compact ? 260 : 380,
                textAlign: 'center',
                padding: 24,
              }}
            >
              <div>
                <motion.div
                  animate={{ rotate: [0, 6, -6, 0], y: [0, -4, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    margin: '0 auto 18px',
                    display: 'grid', placeItems: 'center',
                    background: 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose) 55%, var(--bb-violet))',
                    boxShadow: '0 18px 40px rgba(207,95,145,0.26)',
                    color: '#fff',
                  }}
                >
                  <Sparkles size={28} />
                </motion.div>
                <h3
                  className="bb-display"
                  style={{ margin: '0 0 8px', fontSize: '1.35rem', lineHeight: 1.15 }}
                >
                  Generate concepts
                </h3>
                <p style={{
                  margin: '0 auto 20px', maxWidth: 280,
                  color: 'var(--bb-muted)', fontSize: '0.84rem', lineHeight: 1.55,
                }}>
                  {lunaBrief
                    ? 'Luna has your brief ready. Tap generate to see concept directions.'
                    : 'Pick a category and generate AI pencil-sketch concept directions.'}
                </p>
                <button
                  onClick={generateConcepts}
                  className="bb-btn-primary bb-lift"
                  data-testid="mood-generate"
                  style={{ padding: '12px 28px', fontSize: '0.9rem' }}
                >
                  <Sparkles size={16} />
                  Generate {CATEGORIES.find(c => c.id === category)?.label}
                </button>
              </div>
            </motion.div>
          ) : isLoading ? (
            /* ── Loading shimmer grid ── */
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 10,
                alignContent: 'start',
              }}
            >
              {Array.from({ length: imageCount }).map((_, i) => (
                <ShimmerCard key={i} index={i} />
              ))}
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '12px 0',
                color: 'var(--bb-muted)',
                fontSize: '0.76rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Crafting concept directions...
                </motion.span>
              </div>
            </motion.div>
          ) : (
            /* ── Results grid ── */
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 10,
                alignContent: 'start',
              }}
            >
              {images.map((img, i) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.06,
                    ease: [0.22, 0.9, 0.32, 1],
                  }}
                  whileHover={{ y: -3 }}
                  className="bb-mood-tile"
                  style={{
                    position: 'relative',
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: '1px solid var(--bb-line)',
                    background: '#fff',
                    boxShadow: '0 4px 14px rgba(51,39,35,0.06)',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    loading="lazy"
                    style={{
                      width: '100%',
                      aspectRatio: (i % 3 === 0) ? '3 / 4' : (i % 3 === 1) ? '4 / 5' : '1 / 1',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />

                  {/* Hover overlay */}
                  <div
                    className="bb-mood-overlay"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 20%, rgba(20,18,28,0.72) 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLike(img.id) }}
                        aria-label="Like"
                        style={{
                          width: 30, height: 30, borderRadius: 999,
                          border: 0,
                          background: liked.has(img.id) ? '#e60023' : 'rgba(255,255,255,0.95)',
                          color: liked.has(img.id) ? '#fff' : 'var(--bb-rose)',
                          cursor: 'pointer', display: 'grid', placeItems: 'center',
                          backdropFilter: 'blur(8px)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Heart size={13} fill={liked.has(img.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{
                        color: 'rgba(255,255,255,0.85)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                      }}>
                        {img.label}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onPick(img) }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 10,
                          border: 0,
                          background: 'rgba(255,255,255,0.96)',
                          color: 'var(--bb-ink)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          justifyContent: 'center',
                          boxShadow: '0 6px 14px rgba(0,0,0,0.22)',
                          transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                      >
                        <Plus size={12} /> Use as reference
                      </button>
                    </div>
                  </div>

                  {/* Category tag */}
                  <div style={{
                    position: 'absolute', left: 6, top: 6,
                    padding: '3px 8px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.88)',
                    backdropFilter: 'blur(8px)',
                    fontSize: '0.6rem', fontWeight: 800,
                    color: 'var(--bb-rose)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    pointerEvents: 'none',
                  }}>
                    {img.category}
                  </div>
                </motion.div>
              ))}

              {/* Generate more button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: images.length * 0.06 + 0.1 }}
                onClick={generateConcepts}
                disabled={isLoading}
                style={{
                  gridColumn: '1 / -1',
                  padding: '14px 20px',
                  borderRadius: 12,
                  border: '1.5px dashed var(--bb-line)',
                  background: 'rgba(255,255,255,0.5)',
                  color: 'var(--bb-muted)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--bb-rose)'
                  e.currentTarget.style.color = 'var(--bb-rose)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--bb-line)'
                  e.currentTarget.style.color = 'var(--bb-muted)'
                }}
              >
                <RefreshCcw size={14} />
                Generate fresh directions
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
