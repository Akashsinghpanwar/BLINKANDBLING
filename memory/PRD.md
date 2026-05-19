# Blink & Bling Design OS — UI Polish Pass

## Original Problem
User: "run this startup 1.0" → clarified: existing **Blink & Bling Design OS** (jewellery SaaS at `/app/artifacts/startupvisual/`). Goal = **fix UI / improve to a premium, interactive, motion-rich, non-generic-AI aesthetic**. Reference: rubykinglet.ai + 3 supplied screenshots.

## Stack
- React 19 + Vite 7 + Wouter, Framer Motion 12, Tailwind v4
- pnpm workspaces (root: `/app`)
- Backend (not touched in this pass): Express 5 + Drizzle ORM + Postgres at `/app/artifacts/api-server/`

## What's been implemented (Jan 2026)
- **Fixed critical hero headline bug** — Pinyon Script `jewellery` (1.25em / lineHeight 0.85) was colliding with the next line ("crafted end to end" was overlapped & illegible). Rewrote `GradientHeadline.tsx` with proper line-heights, baseline alignment, and per-word `breakBefore` support.
- **Redesigned landing hero** to an editorial asymmetric split (text left + photo card + 2 floating chips: Luna intake + Stone vault). Parallax + floating motion for each card.
- **New `/app/artifacts/startupvisual/src/views/LandingPage.tsx`** — added trusted-by brand strip, refined workflow cards (with halo radial accents), stats grid in portal teaser, hallmark-verified chip, **new testimonial section** with 5-star + studio quote, polished dark CTA band.
- **Global CSS** (`index.css`) — looser `.bb-display` line-height (1.08), `.bb-orb` floating gradient utilities, subtle SVG grain overlay (`.bb-grain`, `.bb-cta-grain`), smoother `.bb-lift` cubic-bezier transitions.
- **Fixed broken Unsplash photo IDs** in `lib/photos.ts` (handSketch, ringBox, pearSolitaire, vintageCushion were 404).
- All `data-testid` attributes added on landing-page interactive elements.

## Verified
- TypeScript `pnpm run typecheck` ✅ clean
- Browser console ✅ no errors / warnings
- Pages verified visually: `/`, `/jeweller/signup`, `/workspace`, `/portal`, `/portal/luna`

## Not touched (out of scope for this UI pass)
- Backend auth, DB schema, API integrations
- Per-page polish of every internal/customer sub-page (only top-level layouts + landing got the heaviest treatment; sub-pages already inherit refined typography & styles)

## Backlog / Next Action Items
- P1: Mobile-specific polish for hero floating cards (already collapses, but could be hand-tuned)
- P1: Pillar-selector image cross-fade preloading
- P2: Add scroll-linked color-wash on hero ring photo
- P2: Premium custom cursor on dark CTA band
- P2: Polish each internal sub-page (Studio3D, Vault, Storefront) with the new motion vocabulary
- P3: Add real auth flow wiring (currently stubbed)

---

## Iteration 2 — Pen-Write + Siri Luna + Magic Movement (Jan 2026)

### Implemented
- **`PenWriteLogo.tsx`** (NEW) — cursive Pinyon Script "Blink & Bling" reveals letter-by-letter via clip-path inset sweep, with a glowing pen-tip dot riding the reveal edge. Multicolor gradient (coral → rose → violet) + drop shadow.
- **Landing intro overlay** — once-per-session (sessionStorage `bb_intro_done`), full-screen pen-write intro that fades out into the regular landing after ~2.4s, then reveals the hero.
- **`LunaVoiceOrb.tsx`** (NEW) — Apple-Siri inspired animated orb:
  - Outer halo bloom (radial multicolor)
  - Conic-gradient rotating rim
  - Frosted glass dome (radial gradient + inner shadow + specular highlight)
  - Inner wave canvas (3 wobbling blobs, screen-blended, blurred, react to state)
  - State pill (`idle/listening/thinking/speaking`) with pulsing dot
  - Floating particles when `speaking`/`listening`
  - Optional `amplitude` prop for real mic reactivity
- **`CustomerPortalLuna.tsx`** + **`VoiceIntake.tsx`** rewritten — orb-centric layout, ambient gradient backdrop, suggestion chips, glass transcript drawer with typing bubble, state-driven animations.
- **`MagicMovement.tsx`** rewritten as a true design bench:
  - Left: prompt textarea + Style / Stone / Metal chip groups + drag-tile reference uploader + Clear / Generate
  - Right: cinematic canvas with sparkle-trail loading state + animated conic spinner + progress bar
  - Bottom: render history rail (last 8) with active highlight, click-to-restore
  - Headline "Magic Movement." with Pinyon Script `Movement`
- **Photo fallbacks** in `pickFallbackPhoto()` pick a sensible jewelry shot per style/stone tag for the demo render.

### Verified
- `pnpm typecheck` ✅ clean
- Visual: pen-write intro, completed hero, Luna orb (idle + listening + chat drawer), Magic Movement (composer + rendered output + history rail) — all captured cleanly.

### Next backlog (P1-P2)
- Customer profile view with **CAD viewer gating** (jeweller-approval-aware)
- Jeweller-side **customer-first dashboard**: live activity feed (Luna sessions, render approvals)
- BBCAD button + notification flow visualisation (mockup only — actual backend exists separately per user)
- Apply orb / pen-write motion vocabulary to remaining sub-pages (Studio3D, Vault, Storefront)

---

## Iteration 3 — Pinterest-style Mood Board (Jan 2026)

### Implemented
- **`MoodBoardPanel.tsx`** (NEW) — Pinterest-style 2-column masonry inspiration gallery, mounted as a third column on `MagicMovement.tsx`.
  - Header: red Pinterest icon + "Mood board" title + "VIA PINTEREST · N matches" subtitle + refresh shuffle button
  - Filter pill row shows active style / stone / metal tags driving the suggestions
  - Tag-overlap scoring: tiles ranked by match against selected chips + tokenised prompt words; shuffle fallback when no match
  - Mixed aspect ratios (3/4, 4/5, 1/1) for authentic masonry rhythm
  - Hover overlay (CSS-driven `:hover` + `:focus-within` + touch fallback) reveals:
    - **Heart / Like** toggle (Pinterest red when liked)
    - **+ Use as reference** CTA → instantly adds the tile to the composer's `References` grid with toast
  - Always-visible top-left tag chip on each tile
- **`MOOD_BOARD` pool** added to `lib/photos.ts` — 19 tagged jewellery photos (style + stone + metal + element tags) sourced from existing Unsplash IDs (all verified live).
- **Responsive grid** — `bb-mm-grid` CSS:
  - ≤1280px → 2-col layout, mood-board spans full width below
  - ≤880px → single column stack
- Verified flows: filter by chip → matches update + count badge updates · refresh shuffles order · click "Use as reference" → reference added + toast · duplicate-prevention guards.

### Verified
- `pnpm typecheck` ✅ clean
- E2E screenshot run: filter activates → mood updates → 2 references added from mood board → toast confirmation visible

### Next backlog
- Real Pinterest API integration (saved for backend phase user mentioned)
- Wire `liked` set to a "Saved" tab in customer portal
- Persist mood-board state per project in `ProjectContext`
- Drag-to-reorder reference tiles

---

## Iteration 4 — Intro tweak + Animated 4-step Journey (Jan 2026)

### Implemented
- **Pen-write intro:**
  - Duration: 2.4s → **3s**
  - Removed once-per-session `sessionStorage` gate — **plays on every load** (per user request)
- **`WorkflowJourney.tsx`** (NEW) replaces the static 3-card "How it works" with a cinematic 4-step animated journey:
  - **4 steps** instead of 3: `01 Intake · 02 Studio · 03 Forge · 04 Delivery` — each with its own pillar color (emerald / rose / violet / coral) and lucide icon
  - **Connecting path** at the top: dotted background + solid multi-color progress line that animates as the active step moves
  - **Animated step nodes** — active node scales up, pulses with a colored ring, past steps show check-style outline
  - **Auto-cycle** every 4.5s · **hover-to-pause** · click any step to jump
  - **Active step panel** with big serif numeral, title, copy, progress dots ("AUTO-PLAY / PAUSED" indicator), and a **dedicated mini-preview illustration per step**:
    - `01 Intake` → glowing Luna orb + live transcript bubble
    - `02 Studio` → 3 staggered concept cards with shimmer sweep + "Curated by AI · 3 concepts in 28s" chip
    - `03 Forge` → dark canvas with a rendered ring SVG (rotating gently) + Platinum/1.4ct/Halo chips
    - `04 Delivery` → production timeline with Cast/Set/Polish/Ship stages (3 done + Ship "IN PROGRESS" pulsing)
  - Per-step corner glow on the panel tied to the active color
- **Headline updated**: "From conversation to *creation*, in four moves." (Pinyon Script `creation` accent)
- **Responsive**: at ≤880px panel collapses to single column and labels under step nodes hide.

### Verified
- `pnpm typecheck` ✅ clean
- All four steps captured visually — connecting line animates correctly, mini-previews render, auto-play vs paused indicator works
- 3s pen-write intro plays on every page load

### Next backlog
- Subtle audio cue on auto-advance (luxury bell tone) — disabled by default, opt-in
- Click-through: tapping a step CTA could deep-link to the matching workspace section
- Reduce-motion fallback already in place, audit other components
