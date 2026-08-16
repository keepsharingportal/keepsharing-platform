// ── ListingImagePlaceholder ───────────────────────────────────────────────────
// Marks a photo slot that has no photo yet.
//
// Listings used to fall back to getFallbackByContext(), which serves a stock
// photo keyed off the slug. That is worse than an empty frame in two ways: a
// reader sees a picture of somebody else's dance studio and reasonably assumes
// it is this one, and nobody on our side can tell which listings actually still
// need a photo — every card looks finished.
//
// So: a monogram panel that reads as deliberate to a reader and obviously empty
// to us. The tint is derived from the business name, so the wall of cards has
// some variety and a given business keeps its colour between pages.
//
// Deliberately NOT a "photo coming soon" message — that dates itself the moment
// a photo doesn't arrive, and it draws a reader's attention to what's missing
// rather than to the business.

import { ImageIcon } from 'lucide-react'

// Soft, low-chroma tints. Muted on purpose: this sits behind real content and
// next to real photographs, and must never out-shout either.
const TINTS = [
  { bg: 'bg-slate-100',   fg: 'text-slate-400',   ring: 'ring-slate-200' },
  { bg: 'bg-stone-100',   fg: 'text-stone-400',   ring: 'ring-stone-200' },
  { bg: 'bg-blue-50',     fg: 'text-blue-300',    ring: 'ring-blue-100' },
  { bg: 'bg-emerald-50',  fg: 'text-emerald-300', ring: 'ring-emerald-100' },
  { bg: 'bg-amber-50',    fg: 'text-amber-400',   ring: 'ring-amber-100' },
  { bg: 'bg-rose-50',     fg: 'text-rose-300',    ring: 'ring-rose-100' },
]

function tintFor(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return TINTS[hash % TINTS.length]
}

/** Up to two initials, skipping filler words so "The Montgomery Ballet" → MB. */
function initialsOf(name: string): string {
  const skip = new Set(['the', 'of', 'and', 'a', 'at', 'for', 'in', 'on'])
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w && !skip.has(w.toLowerCase()))
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

interface Props {
  /** Business name — drives both the monogram and the tint. */
  name:     string
  /** How prominent the monogram should be. */
  size?:    'sm' | 'md' | 'lg'
  /** Show the small camera glyph. Off for tight spaces like the logo chip. */
  showIcon?: boolean
  className?: string
}

export function ListingImagePlaceholder({ name, size = 'md', showIcon = true, className = '' }: Props) {
  const tint     = tintFor(name)
  const initials = initialsOf(name)

  const monogram = size === 'lg' ? 'text-5xl md:text-6xl'
                 : size === 'sm' ? 'text-lg'
                 : 'text-3xl'

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${tint.bg} ${className}`}
      // Decorative: the business name is always rendered as text next to this,
      // so announcing initials again would just be noise for a screen reader.
      aria-hidden="true"
    >
      <span className={`font-black tracking-tight ${monogram} ${tint.fg}`}>{initials}</span>
      {showIcon && size !== 'sm' && (
        <ImageIcon className={`h-4 w-4 ${tint.fg} opacity-70`} strokeWidth={1.75} />
      )}
    </div>
  )
}

/**
 * Standalone (non-absolute) variant for slots that aren't a positioned frame —
 * the logo chip beside a business name, for instance.
 */
export function ListingLogoPlaceholder({ name, className = '' }: { name: string; className?: string }) {
  const tint     = tintFor(name)
  const initials = initialsOf(name)
  return (
    <div
      className={`flex items-center justify-center rounded-xl ring-1 ${tint.bg} ${tint.ring} ${className}`}
      aria-hidden="true"
    >
      <span className={`font-black text-xl md:text-2xl tracking-tight ${tint.fg}`}>{initials}</span>
    </div>
  )
}
