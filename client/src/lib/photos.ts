const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`

export const photos = {
  haloRing:        u('1605100804763-247f67b3557e', 1400),
  pearSolitaire:   u('1518895949257-7621c3c786d7'),
  vintageCushion:  u('1573408301185-9146fe634ad0'),
  multiStoneRings: u('1535632787350-4e68ef0ac584', 1400),
  workshop:        u('1515562141207-7a88fb7ce338', 1400),
  diamondNeck:     u('1599643478518-a784e5dc4c8f', 1400),
  earringsPair:    u('1611591437281-460bfbe1220a'),
  goldStack:       u('1602173574767-37ac01994b2a'),
  gemCloseup:      u('1611652022419-a9419f74343d'),
  ringBox:         u('1617038260897-41a1f14a8ca0', 1400),
  pearlNecklace:   u('1601121141461-9d6647bca1ed'),
  handSketch:      u('1531995811006-35cb42e1a022', 1400),
} as const

export interface MoodTile {
  id: string
  url: string
  tags: string[]
  source?: string
}

const m = (id: string, tags: string[], source = 'pinterest') => ({
  id, url: u(id, 700), tags, source,
})

export const MOOD_BOARD: MoodTile[] = [
  m('1605100804763-247f67b3557e', ['vintage','diamond','halo','platinum','engagement']),
  m('1611652022419-a9419f74343d', ['emerald','closeup','stone','green']),
  m('1535632787350-4e68ef0ac584', ['modern','diamond','stack','minimal']),
  m('1617038260897-41a1f14a8ca0', ['box','presentation','ring','platinum']),
  m('1531995811006-35cb42e1a022', ['sketch','concept','vintage','art deco']),
  m('1518895949257-7621c3c786d7', ['solitaire','pear','diamond','minimal']),
  m('1573408301185-9146fe634ad0', ['cushion','vintage','art deco','diamond']),
  m('1599643478518-a784e5dc4c8f', ['necklace','diamond','statement','art deco']),
  m('1611591437281-460bfbe1220a', ['earrings','pair','diamond','modern']),
  m('1602173574767-37ac01994b2a', ['gold','yellow','stack','minimal','band']),
  m('1601121141461-9d6647bca1ed', ['pearl','necklace','classic','timeless']),
  m('1515562141207-7a88fb7ce338', ['workshop','bench','craft','artisan']),
  m('1633934542430-0905ccb5f050', ['ring','vintage','rose','rose gold']),
  m('1610375461246-83df859d849d', ['ring','modern','minimal','sapphire']),
  m('1620625515032-6ed0c1790c75', ['ring','vintage','art deco','diamond']),
  m('1607703703520-bb638e84caf2', ['gold','ring','yellow','classic']),
  m('1543295204-2ae345412549', ['necklace','gold','statement','modern']),
  m('1568526381923-caf3fd520382', ['ring','diamond','classic','solitaire']),
  m('1556905055-8f358a7a47b2', ['gold','ring','band','yellow']),
]

export const PILLAR_TABS = [
  {
    id: 'concept',
    label: 'Concept',
    sub: 'the brief',
    accent: '#3f8874',
    title: 'Voice intake meets visual direction.',
    body: 'Capture client preferences, references, budget, metal, stone, and occasion before the first concept is made.',
    photo: photos.handSketch,
  },
  {
    id: 'studio',
    label: 'Studio',
    sub: 'the bench',
    accent: '#cf5f91',
    title: 'Concepts, renders, and revisions stay together.',
    body: 'Generate options, shortlist the best directions, refine details, and keep every design version in one studio view.',
    photo: photos.haloRing,
  },
  {
    id: 'vault',
    label: 'Vault',
    sub: 'the archive',
    accent: '#8b6bb5',
    title: 'Files and approvals stay traceable.',
    body: 'Keep renders, CAD references, notes, certificates, and signed-off concepts organized by project.',
    photo: photos.gemCloseup,
  },
] as const
