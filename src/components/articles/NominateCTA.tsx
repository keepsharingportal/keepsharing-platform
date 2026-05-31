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

  const brand    = getColumnBrand(columnSlug)
  // Button background — actionColor overrides primary when a column wants
  // its buttons in a secondary color (Teacher uses navy buttons even though
  // its identity color is apple-red). The eyebrow + CTA strip header keep
  // using primary so the column's identity stays consistent.
  const btnBg    = brand.actionColor ?? brand.primary
  const accentBg = brand.accent
  // identityBg = primary, used for the badge/strip-header that's tied to
  // the column's identity (vs the action button color).
  const identityBg = brand.primary

  // ── PILL — compact, sits inline in the article meta row ────────────────
  // White background with column-accent ring (gold/amber per column) and
  // brand-colored text. Sized small enough to fit on the meta line beside
  // the date + share buttons on desktop. Stacks full-width on mobile.
  //
  // Renders bare (no wrapper) so the caller — ArticleAuthorBlock — can
  // place it in the right flex slot.
  if (variant === 'pill') {
    return (
      <Link
        href={cta.href}
        className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-bold bg-white border-2 shadow-sm hover:shadow transition-all hover:bg-gray-50"
        style={{ color: btnBg, borderColor: accentBg }}
      >
        {cta.label}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
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
  // Two variants based on the column's brand style:
  //   soft: pale tint bg + small corner pill badge (Mom — magazine-feature vibe)
  //   bold: full-bleed brand-color strip header (Play Ball — sports-poster vibe)
  // Both end with the same solid brand-color action button — the button is
  // always the loud action regardless of variant.
  const isSoft = brand.style === 'soft'

  if (isSoft) {
    // Soft palette inherits from the column brand — Mom uses the site's
    // peach + teal so the box reads cohesive with the newsletter strip
    // and home page Community Spotlights cards. Falls back to brand
    // primary tints when no soft palette is configured.
    //
    // Two colors at play:
    //   identityBg = brand identity (apple-red for Teacher) → badge in corner
    //   btnBg      = action color (navy for Teacher)        → action button
    const bgColor     = brand.softBg     ?? (identityBg + '0e')
    const borderColor = brand.softBorder ?? (identityBg + '22')
    return (
      <section
        className="mt-10 rounded-2xl overflow-hidden border px-5 md:px-7 py-6 md:py-8 text-center"
        style={{ backgroundColor: bgColor, borderColor }}
        aria-label={cta.label}
      >
        <span
          className="inline-block text-[10px] md:text-xs font-black uppercase tracking-widest text-white rounded-full px-3 py-1 mb-3"
          style={{ backgroundColor: identityBg }}
        >
          {brand.label} · Got someone in mind?
        </span>
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
      </section>
    )
  }

  return (
    <section
      className="mt-10 rounded-2xl overflow-hidden border border-border/40 shadow-sm"
      aria-label={cta.label}
    >
      <div
        className="px-5 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-white"
        style={{ backgroundColor: identityBg }}
      >
        {brand.label} · Got someone in mind?
      </div>
      <div
        className="px-5 md:px-7 py-6 md:py-8 text-center"
        style={{ backgroundColor: identityBg + '0d' }}
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
