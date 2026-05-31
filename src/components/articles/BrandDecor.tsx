// Decorative magazine-flourish elements that add visual layering to
// community spotlight articles. These are intentionally tasteful — no
// stickers, no clipart vibes — just a few subtle accents that make the
// page read as "designed" rather than "templated".

import type { LucideIcon } from 'lucide-react'
import {
  Heart, Trophy, Apple, Star, Sparkles, Award, GraduationCap, Music,
  Quote, Users, Flag, Calendar, BookOpen, Megaphone,
} from 'lucide-react'
import { getColumnBrand } from '@/lib/articles/column-brand'

const WATERMARK_ICONS: Record<string, LucideIcon> = {
  Heart, Trophy, Apple, Star, Sparkles, Award, GraduationCap, Music,
  Quote, Users, Flag, Calendar, BookOpen, Megaphone,
}

// ── BrandWatermark ──────────────────────────────────────────────────────────
// Large faint icon used as a background decoration behind pull quotes,
// in the corners of cards, etc. Picks up the column's watermarkIcon
// config or falls back to the eyebrow icon.
//
// Position is the responsibility of the parent — wrap the watermark in
// an absolutely positioned container.
export function BrandWatermark({
  columnSlug, className, size = 180, fillOpacity = 0.08, strokeOpacity = 0.16,
}: {
  columnSlug:    string | null
  className?:    string
  size?:         number
  fillOpacity?:  number
  strokeOpacity?: number
}) {
  const brand = getColumnBrand(columnSlug)
  const iconName = brand.watermarkIcon ?? brand.icon
  if (!iconName) return null
  const C = WATERMARK_ICONS[iconName]
  if (!C) return null

  // Render at the given size with the brand color at low opacity. Stroke
  // gets higher contrast than fill so the silhouette reads as a hand-drawn
  // outline-with-wash rather than a solid blob.
  return (
    <div className={className} aria-hidden="true">
      <C
        size={size}
        style={{
          color: brand.primary,
          opacity: 1,
          fill: brand.primary + Math.round(fillOpacity * 255).toString(16).padStart(2, '0'),
          strokeOpacity,
        }}
      />
    </div>
  )
}

// ── WashiTape ──────────────────────────────────────────────────────────────
// Decorative "taped to the page" strip centered on the top edge of the hero
// polaroid. Brand-colored, with texture layered on so it actually reads as
// a piece of washi tape: a subtle vertical gradient (lighter at top, darker
// at bottom — mimics the natural shading of a real strip), an inset top
// highlight, and a hint of the bottom edge shadow.
export function WashiTape({ columnSlug }: { columnSlug: string | null }) {
  const brand = getColumnBrand(columnSlug)
  const tapeColor = brand.wordmark?.scriptColor ?? brand.primary

  return (
    <div
      aria-hidden="true"
      className="absolute -top-3 md:-top-4 left-1/2 z-30 h-8 md:h-10 w-32 md:w-40 -translate-x-1/2 rotate-[2.5deg]"
      style={{
        background: `linear-gradient(180deg, ${tapeColor}a8 0%, ${tapeColor}c4 50%, ${tapeColor}a0 100%)`,
        boxShadow:  `inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.12), 0 3px 6px rgba(0,0,0,0.18)`,
      }}
    >
      {/* Subtle vertical sheen — mimics the slight reflective quality of
          washi tape and softens the solid block of color. */}
      <div
        className="absolute inset-y-0 left-1/4 right-1/4 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25), transparent)' }}
      />
    </div>
  )
}

// ── NicknamesBanner ────────────────────────────────────────────────────────
// Faint repeating text strip rendered above a wordmark eyebrow. Inspired
// by the Grands print piece which runs a banner of grandparent nicknames
// across the top of the page. Only renders when the column brand provides
// a `wordmark.nicknames` array.
export function NicknamesBanner({ columnSlug }: { columnSlug: string | null }) {
  const brand = getColumnBrand(columnSlug)
  const names = brand.wordmark?.nicknames
  if (!names || names.length === 0) return null

  // Repeat the list a couple times so the strip stays full at any viewport
  // width without obvious gaps.
  const repeated = [...names, ...names].join(' · ')

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden whitespace-nowrap text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-2 opacity-25"
      style={{ color: brand.wordmark?.scriptColor ?? brand.primary }}
    >
      {repeated}
    </div>
  )
}
