// ── SectionSponsor components ────────────────────────────────────────────────
// Three render variants of the same sponsor data — placed deliberately so
// mobile readers (80% of traffic) see the sponsor at the prime moment, and
// desktop readers see them with persistent sidebar presence.
//
// Mobile-first design notes:
//   - SectionSponsorMobile renders BETWEEN the hero image and the body so
//     readers can't miss it. Visible immediately. Tappable, large.
//   - SectionSponsorSidebar renders only on lg+ (1024px+). On mobile the
//     sidebar stacks at the bottom of the page — too late for sponsor real
//     estate, so mobile gets the prime above-body slot instead.
//   - SectionSponsorOutro renders at the article footer on every breakpoint
//     — a "Thank you to our sponsor" outro reinforces brand association.
//   - SectionSponsorBanner renders BIG on the column archive landing page
//     ("/columns/play-ball") — full-width hero strip on both mobile and
//     desktop, sponsor owns the franchise visually.
//
// All variants render NOTHING when sponsor is null. No empty placeholders.

import Link from 'next/link'
import type { SectionSponsor } from '@/lib/section-sponsors'
import { getColumnBrand } from '@/lib/articles/column-brand'

interface SponsorProps {
  sponsor:    SectionSponsor | null
  columnSlug: string | null
}

// ── 1) Mobile strip ──────────────────────────────────────────────────────────
// Slim banner UNDER the hero image, ABOVE the article body. Visible only on
// mobile/tablet (< lg). Premium real estate for the 80% of mobile readers.
export function SectionSponsorMobile({ sponsor, columnSlug }: SponsorProps) {
  if (!sponsor) return null
  const brand   = getColumnBrand(columnSlug)
  const bgColor = sponsor.accent_color ?? brand.primary
  const inner = (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-sm"
      style={{ backgroundColor: bgColor }}
    >
      {sponsor.logo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sponsor.logo_url}
          alt={sponsor.sponsor_name}
          className="w-10 h-10 rounded-md bg-white object-contain p-1 shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 leading-tight">
          {sponsor.sponsor_label}
        </div>
        <div className="font-bold text-sm leading-tight truncate">
          {sponsor.sponsor_name}
        </div>
      </div>
      {sponsor.cta_url && (
        <span className="text-xs font-bold opacity-90 shrink-0" aria-hidden="true">→</span>
      )}
    </div>
  )
  return (
    <div className="lg:hidden mb-6">
      {sponsor.cta_url
        ? <Link href={sponsor.cta_url} target="_blank" rel="noopener noreferrer sponsored">{inner}</Link>
        : inner}
    </div>
  )
}

// ── 2) Desktop sidebar ───────────────────────────────────────────────────────
// Full sponsor card for the article right column. Visible only on lg+.
// Mobile doesn't render this (the mobile strip above is the equivalent).
export function SectionSponsorSidebar({ sponsor, columnSlug }: SponsorProps) {
  if (!sponsor) return null
  const brand   = getColumnBrand(columnSlug)
  const bgColor = sponsor.accent_color ?? brand.primary

  return (
    <div className="hidden lg:block rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm">
      <div
        className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
        style={{ backgroundColor: bgColor }}
      >
        {sponsor.sponsor_label}
      </div>
      <div className="p-5 text-center">
        {sponsor.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sponsor.logo_url}
            alt={sponsor.sponsor_name}
            className="w-20 h-20 rounded-xl object-contain bg-white border border-border/40 mx-auto mb-3 p-2"
          />
        )}
        <h4 className="font-bold text-lg text-foreground mb-2 leading-tight">
          {sponsor.sponsor_name}
        </h4>
        {sponsor.sponsor_message && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {sponsor.sponsor_message}
          </p>
        )}
        {sponsor.cta_url && (
          <Link
            href={sponsor.cta_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-block w-full rounded-full px-4 py-2 text-sm font-bold text-white"
            style={{ backgroundColor: bgColor }}
          >
            {sponsor.cta_label}
          </Link>
        )}
      </div>
    </div>
  )
}

// ── 3) Footer outro ──────────────────────────────────────────────────────────
// Bigger "Thank you to our sponsor" block at the article footer. Renders on
// all breakpoints — closing reinforcement of the sponsor association.
export function SectionSponsorOutro({ sponsor, columnSlug }: SponsorProps) {
  if (!sponsor) return null
  const brand   = getColumnBrand(columnSlug)
  const bgColor = sponsor.accent_color ?? brand.primary
  const colLabel = brand.label

  return (
    <section className="mt-12 pt-8 border-t border-border/60" aria-label="Sponsor">
      <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm">
        <div
          className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
          style={{ backgroundColor: bgColor }}
        >
          {colLabel} is {sponsor.sponsor_label.toLowerCase()} {sponsor.sponsor_name}
        </div>
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-5 md:gap-7">
          {sponsor.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sponsor.logo_url}
              alt={sponsor.sponsor_name}
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-contain bg-white border border-border/40 p-3 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0 text-center md:text-left">
            <h3 className="text-xl md:text-2xl font-black text-foreground mb-2 leading-tight">
              {sponsor.sponsor_name}
            </h3>
            {sponsor.sponsor_message && (
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
                {sponsor.sponsor_message}
              </p>
            )}
            {sponsor.cta_url && (
              <Link
                href={sponsor.cta_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-block rounded-full px-5 py-2.5 text-sm md:text-base font-bold text-white shadow-sm"
                style={{ backgroundColor: bgColor }}
              >
                {sponsor.cta_label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── 4) Archive banner ────────────────────────────────────────────────────────
// BIG full-width banner at the top of a column landing page
// (e.g. /columns/play-ball). Same content layout as the outro but sized as
// a hero strip — sponsor owns the franchise.
export function SectionSponsorBanner({ sponsor, columnSlug }: SponsorProps) {
  if (!sponsor) return null
  const brand   = getColumnBrand(columnSlug)
  const bgColor = sponsor.accent_color ?? brand.primary
  const colLabel = brand.label

  const content = (
    <div
      className="rounded-2xl overflow-hidden text-white shadow-sm"
      style={{ backgroundColor: bgColor }}
    >
      <div className="px-5 md:px-7 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest bg-black/15">
        {colLabel} is {sponsor.sponsor_label.toLowerCase()} {sponsor.sponsor_name}
      </div>
      <div className="px-5 md:px-7 py-5 md:py-6 flex items-center gap-4 md:gap-6">
        {sponsor.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sponsor.logo_url}
            alt={sponsor.sponsor_name}
            className="w-14 h-14 md:w-20 md:h-20 rounded-xl object-contain bg-white p-2 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-black text-lg md:text-2xl leading-tight truncate">
            {sponsor.sponsor_name}
          </div>
          {sponsor.sponsor_message && (
            <p className="text-sm md:text-base opacity-90 mt-1 line-clamp-2 leading-snug">
              {sponsor.sponsor_message}
            </p>
          )}
        </div>
        {sponsor.cta_url && (
          <span className="hidden sm:inline-block rounded-full px-4 py-2 text-xs md:text-sm font-bold bg-white/15 backdrop-blur shrink-0">
            {sponsor.cta_label} →
          </span>
        )}
      </div>
    </div>
  )

  return sponsor.cta_url
    ? <Link href={sponsor.cta_url} target="_blank" rel="noopener noreferrer sponsored" className="block hover:opacity-95 transition-opacity">{content}</Link>
    : content
}
