// ── ListingImagePlaceholder ───────────────────────────────────────────────────
// Marks a photo slot that has no photo yet.
//
// Listings used to fall back to getFallbackByContext(), which served a stock
// photo keyed off the slug. That is worse than an empty frame twice over: a
// reader sees a picture of somebody else's dance studio and reasonably assumes
// it is this one, and nobody on our side can tell which listings still need a
// photo, because every card looks finished.
//
// One generic mark, in the site's own colours, identical for every listing.
// (An earlier pass used per-business initials on a rotating tint — that made
// each empty slot look like bespoke branding, which is exactly what an empty
// slot should not look like. A single consistent mark reads as "no photo yet"
// at a glance, and a wall of them is instantly countable.)
//
// Colours come from the theme tokens rather than fixed hex, so this tracks the
// site palette and works on both the light guide pages and the darker cards.

import { ImageIcon } from 'lucide-react'

interface Props {
  /** Icon scale. The frame itself is sized by the parent. */
  size?:      'sm' | 'md' | 'lg'
  className?: string
}

export function ListingImagePlaceholder({ size = 'md', className = '' }: Props) {
  const icon = size === 'lg' ? 'h-12 w-12 md:h-16 md:w-16'
             : size === 'sm' ? 'h-5 w-5'
             : 'h-9 w-9'

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-muted ${className}`}
      // Decorative — the business name is always rendered as text alongside,
      // so announcing this would only add noise for a screen reader.
      aria-hidden="true"
    >
      <ImageIcon className={`${icon} text-primary/25`} strokeWidth={1.5} />
    </div>
  )
}

/**
 * Non-absolute variant for slots that aren't a positioned frame — the logo
 * chip beside a business name, for instance.
 */
export function ListingLogoPlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-border bg-muted ${className}`}
      aria-hidden="true"
    >
      <ImageIcon className="h-6 w-6 md:h-7 md:w-7 text-primary/25" strokeWidth={1.5} />
    </div>
  )
}
