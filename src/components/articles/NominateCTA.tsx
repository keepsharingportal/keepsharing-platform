// ── NominateCTA ───────────────────────────────────────────────────────────────
// Per-column nominate call-to-action. Three render variants, each using the
// column's brand color so it feels native to the franchise:
//
//   - 'pill':    compact brand-colored button shown near the article meta row.
//                Right-aligned on desktop, full-width on mobile. The "see this
//                at the top" CTA that captures readers before they commit to
//                the article.
//   - 'article': prominent footer block after Quick Hits / before the sponsor
//                outro. Title-styled headline + brand-colored solid button.
//   - 'archive': larger block at the top of a column landing page so visitors
//                arriving from a magazine QR can act immediately.
//
// All variants use brand colors from getColumnBrand() — Mom to Mom = rose,
// Play Ball = navy, Teacher of the Month = apple red, Grands = amber.
// Mobile-first sizing throughout: ≥48px tap targets, full-width on small
// viewports, comfortable line-height.
//
// Returns null when the column has no nominate config — keeps the article
// surface clean for non-community-spotlight columns.

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getNominateCTA } from '@/lib/articles/nominate-cta'
import { getColumnBrand } from '@/lib/articles/column-brand'

interface Props {
  columnSlug: string | null
  variant:    'pill' | 'article' | 'archive'
}

export function NominateCTA({ columnSlug, variant }: Props) {
  const cta = getNominateCTA(columnSlug)
  if (!cta) return null

  const brand = getColumnBrand(columnSlug)
  const btnBg = brand.primary

  // ── PILL — compact, sits near the article meta row ──────────────────────
  if (variant === 'pill') {
    return (
      <div className="flex justify-stretch sm:justify-end mb-6">
        <Link
          href={cta.href}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:shadow transition-shadow"
          style={{ backgroundColor: btnBg }}
        >
          {cta.label}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  // ── ARCHIVE — top of column landing page ────────────────────────────────
  if (variant === 'archive') {
    return (
      <section
        className="rounded-2xl border border-border/40 bg-card p-5 md:p-7 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-6"
        aria-label={cta.label}
      >
        <div
          className="hidden md:flex w-14 h-14 rounded-full items-center justify-center shrink-0"
          style={{ backgroundColor: btnBg + '22' }}
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

  // ── ARTICLE — bottom-of-article footer block ────────────────────────────
  // Brand-tinted background + accent strip + title-weight headline. More
  // visual presence than the previous dashed-border treatment.
  return (
    <section
      className="mt-10 rounded-2xl overflow-hidden border border-border/40 shadow-sm"
      aria-label={cta.label}
    >
      {/* Brand accent strip — same pattern as SectionSponsorOutro for visual
          consistency. Reader's eye recognizes "this is a Play Ball thing" */}
      <div
        className="px-5 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-white"
        style={{ backgroundColor: btnBg }}
      >
        {brand.label} · Got someone in mind?
      </div>
      <div
        className="px-5 md:px-7 py-6 md:py-8 text-center"
        style={{ backgroundColor: btnBg + '0d' }}
      >
        <h3 className="text-xl md:text-3xl font-black text-foreground leading-tight mb-2 md:mb-3">
          {cta.headline}
        </h3>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-prose mx-auto mb-5 md:mb-6">
          {cta.pitch}
        </p>
        <Link
          href={cta.href}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-full px-6 py-3 md:px-7 md:py-3.5 text-sm md:text-base font-bold text-white shadow-sm hover:shadow transition-shadow"
          style={{ backgroundColor: btnBg }}
        >
          {cta.label} <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
        </Link>
      </div>
    </section>
  )
}
