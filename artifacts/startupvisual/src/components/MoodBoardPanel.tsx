import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Plus, RefreshCcw, Search } from 'lucide-react'
import { MOOD_BOARD, type MoodTile } from '../lib/photos'

interface Props {
  prompt: string
  styleTag?: string | null
  stoneTag?: string | null
  metalTag?: string | null
  onPick: (tile: MoodTile) => void
}

const COLUMN_COUNT = 2

/**
 * MoodBoardPanel — Pinterest-style inspiration gallery.
 *
 * Mock implementation: filters the local `MOOD_BOARD` pool by selected tags
 * + free-text from the prompt. Two-column masonry layout with hover overlay
 * showing "Add to references" / quick like. Each load gets a fresh shuffle
 * to feel like a new feed.
 */
export default function MoodBoardPanel({
  prompt, styleTag, stoneTag, metalTag, onPick,
}: Props) {
  const [seed, setSeed] = useState(0)
  const [liked, setLiked] = useState<Set<string>>(new Set())

  const tiles = useMemo<MoodTile[]>(() => {
    const tokens = new Set<string>()
    if (styleTag) tokens.add(styleTag.toLowerCase())
    if (stoneTag) tokens.add(stoneTag.toLowerCase())
    if (metalTag) tokens.add(metalTag.toLowerCase())
    prompt
      .toLowerCase()
      .split(/[\s,.;]+/)
      .filter(w => w.length > 3)
      .forEach(w => tokens.add(w))

    const scored = MOOD_BOARD.map(t => {
      const overlap = t.tags.filter(tag =>
        Array.from(tokens).some(tok => tag.includes(tok) || tok.includes(tag))
      ).length
      // tiny shuffle bias per `seed`
      const jitter = ((seed * 13 + t.id.charCodeAt(0)) % 7) * 0.001
      return { tile: t, score: overlap + jitter }
    })
    scored.sort((a, b) => b.score - a.score)
    // if nothing matches, just shuffle the whole pool
    const noMatch = scored.every(s => Math.floor(s.score) === 0)
    if (noMatch) {
      return [...MOOD_BOARD].sort((a, b) => ((seed * 7 + a.id.charCodeAt(0)) % 11) - ((seed * 7 + b.id.charCodeAt(0)) % 11))
    }
    return scored.map(s => s.tile)
  }, [prompt, styleTag, stoneTag, metalTag, seed])

  // split into columns for masonry
  const columns = useMemo(() => {
    const cols: MoodTile[][] = Array.from({ length: COLUMN_COUNT }, () => [])
    tiles.forEach((t, i) => cols[i % COLUMN_COUNT].push(t))
    return cols
  }, [tiles])

  const toggleLike = (id: string) => {
    setLiked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const matchedCount = tiles.filter(t =>
    t.tags.some(tag =>
      [styleTag, stoneTag, metalTag].filter(Boolean).some(tok => tag.includes(tok!.toLowerCase()))
    )
  ).length

  return (
    <div
      data-testid="mood-board-panel"
      className="bb-card"
      style={{
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 540,
        maxHeight: 'calc(100vh - 200px)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 18px',
          borderBottom: '1px solid var(--bb-line)',
          background: 'rgba(255,255,255,0.62)',
          backdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 10,
          display: 'grid', placeItems: 'center',
          background: 'linear-gradient(135deg, #e60023, #b8001c)',
          color: '#fff', flexShrink: 0,
        }}>
          <Search size={14} />
        </div>
        <div style={{ minWidth: 0 }}>
          <strong style={{
            display: 'block',
            color: 'var(--bb-ink)',
            fontFamily: 'var(--app-font-display)',
            fontWeight: 500,
            fontSize: '1rem',
            lineHeight: 1.1,
            letterSpacing: '-0.005em',
          }}>
            Mood board
          </strong>
          <span style={{
            display: 'block',
            color: 'var(--bb-muted)',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginTop: 2,
          }}>
            via Pinterest · {matchedCount > 0 ? `${matchedCount} matches` : 'curated'}
          </span>
        </div>
        <button
          onClick={() => setSeed(s => s + 1)}
          aria-label="Refresh suggestions"
          className="bb-lift"
          data-testid="mood-refresh"
          style={{
            marginLeft: 'auto',
            width: 34, height: 34, borderRadius: 10,
            border: '1px solid var(--bb-line)',
            background: '#fff', color: 'var(--bb-muted)',
            cursor: 'pointer',
            display: 'grid', placeItems: 'center',
          }}
        >
          <RefreshCcw size={15} />
        </button>
      </div>

      {/* Filter pill row — shows what's driving the suggestions */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--bb-line)',
          display: 'flex', flexWrap: 'wrap', gap: 6,
          background: 'rgba(255,255,255,0.42)',
          minHeight: 44,
        }}
      >
        {[styleTag, stoneTag, metalTag].filter(Boolean).map(t => (
          <span
            key={t}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(207,95,145,0.12)',
              border: '1px solid rgba(207,95,145,0.22)',
              color: 'var(--bb-rose)',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </span>
        ))}
        {!styleTag && !stoneTag && !metalTag && (
          <span style={{ color: 'var(--bb-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
            Pick a style or describe the piece to refine
          </span>
        )}
      </div>

      {/* Masonry */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'grid',
          gridTemplateColumns: `repeat(${COLUMN_COUNT}, minmax(0, 1fr))`,
          gap: 10,
          alignContent: 'start',
        }}
      >
        {columns.map((col, ci) => (
          <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence mode="popLayout">
              {col.map((tile, ti) => (
                <motion.div
                  key={`${seed}-${tile.id}`}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{
                    duration: 0.36,
                    delay: ti * 0.04,
                    ease: [0.22, 0.9, 0.32, 1],
                  }}
                  whileHover={{ y: -3 }}
                  className="bb-mood-tile"
                  style={{
                    position: 'relative',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid var(--bb-line)',
                    background: '#fff',
                    boxShadow: '0 4px 12px rgba(51,39,35,0.06)',
                  }}
                >
                  <img
                    src={tile.url}
                    alt={tile.tags.join(', ')}
                    loading="lazy"
                    style={{
                      width: '100%',
                      // alternate aspect ratios for masonry feel
                      aspectRatio: (ti + ci) % 3 === 0 ? '3 / 4' : (ti + ci) % 3 === 1 ? '4 / 5' : '1 / 1',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />

                  {/* Hover overlay — CSS-driven for reliable pointer-events */}
                  <div
                    className="bb-mood-overlay"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 30%, rgba(20,18,28,0.65) 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => toggleLike(tile.id)}
                        aria-label="Like"
                        style={{
                          width: 28, height: 28, borderRadius: 999,
                          border: 0, background: liked.has(tile.id) ? '#e60023' : 'rgba(255,255,255,0.95)',
                          color: liked.has(tile.id) ? '#fff' : 'var(--bb-rose)',
                          cursor: 'pointer', display: 'grid', placeItems: 'center',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        <Heart size={13} fill={liked.has(tile.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <button
                      onClick={() => onPick(tile)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 8,
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
                      }}
                    >
                      <Plus size={12} /> Use as reference
                    </button>
                  </div>

                  {/* Always-visible tag row */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 6, top: 6,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.86)',
                      backdropFilter: 'blur(8px)',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: 'var(--bb-text)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      pointerEvents: 'none',
                    }}
                  >
                    {tile.tags[0]}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}
