// ── NominateCTA ───────────────────────────────────────────────────────────────
// Per-column nominate call-to-action. Two variants:
//
//   - 'article': compact footer block on a single spotlight article. Renders
//                on every breakpoint at the end of the article body, after
//                the gallery + Quick Hits, before the trending sidebar.
//   - 'archive': larger block at the top of a column landing page so visitors
//                arriving from a magazine QR can act immediately.
//
// Mobile-first sizing: both variants use comfortable touch targets (≥ 48px
// button height) and full-width buttons on mobile. Desktop gets a centered
// pill button.
//
// Returns null when the column has no nominate config — keeps the article
// surface clean for non-community-spotlight columns.

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getNominateCTA } from '@/lib/articles/nominate-cta'
import { getColumnBrand } from '@/lib/articles/column-brand'

interface Props {
  columnSlug: string | null
  variant:    'article' | 'archive'
}

export function NominateCTA({ columnSlug, variant }: Props) {
  const cta = getNominateCTA(columnSlug)
  if (!cta) return null

  const brand   = getColumnBrand(columnSlug)
  const btnBg   = brand.primary
  const accentBg = brand.accent

  if (variant === 'archive') {
    return (
      <section
        className="rounded-2xl border border-border/40 bg-card p-5 md:p-7 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-6"
        aria-label={cta.label}
      >
        <div
          className="hidden md:flex w-14 h-14 rounded-full items-center justify-center shrink-0"
          style={{ backgroundColor: accentBg + '22' }}
        >
          <ArrowRight className="w-6 h-6" style={{ color: btnBg }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg md:text-xl font-black text-foreground leading-tight mb-1">
            {cta.headline}
          </h3>
          <p className="text-sm md:text-base text-muted-foreground leading-snug">
            {cta.pitch}
          </p>
        </div>
        <Link
          href={cta.href}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm md:text-base font-bold text-white shadow-sm whitespace-nowrap shrink-0"
          style={{ backgroundColor: btnBg }}
        >
          {cta.label} <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    )
  }

  // Article variant — slimmer, sits at the end of a single spotlight article.
  return (
    <section
      className="mt-10 rounded-2xl border-2 border-dashed p-5 md:p-6 text-center"
      style={{ borderColor: btnBg + '40', backgroundColor: btnBg + '08' }}
      aria-label={cta.label}
    >
      <p className="text-base md:text-lg font-bold text-foreground leading-snug mb-2">
        {cta.headline}
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-prose mx-auto mb-4">
        {cta.pitch}
      </p>
      <Link
        href={cta.href}
        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-full px-6 py-3 text-sm md:text-base font-bold text-white shadow-sm"
        style={{ backgroundColor: btnBg }}
      >
        {cta.label} <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  )
}
