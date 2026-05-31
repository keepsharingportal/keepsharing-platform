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
// Decorative "taped to the page" strip rendered over the top of the hero
// image. Reads as a small magazine flourish — like a sticky note or piece
// of washi tape holding the photo to the page.
//
// One centered strip across the top of the hero. Brand-colored, semi-
// transparent, with a subtle striped pattern that mimics real washi tape.
export function WashiTape({ columnSlug }: { columnSlug: string | null }) {
  const brand = getColumnBrand(columnSlug)
  // Use a darker shade for the wordmark/identity columns. Falls back to
  // softAccent (where set) so Mom's teal tape, Grands' teal tape, etc.
  // — feel native to each column's secondary palette.
  const tapeColor = brand.wordmark?.scriptColor ?? brand.softAccent ?? brand.primary

  return (
    <div
      aria-hidden="true"
      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-32 md:w-44 h-7 md:h-8 rounded-sm shadow-sm z-10"
      style={{
        background: `repeating-linear-gradient(45deg, ${tapeColor}cc 0 8px, ${tapeColor}99 8px 16px)`,
        transform: 'translate(-50%, -33%) rotate(-2deg)',
      }}
    />
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
