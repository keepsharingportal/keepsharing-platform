// HeroSponsorCard — section sponsor block styled to match the homepage
// inline ad (the one YMCA Summer Family Memberships runs in). Layout:
//
//   <small label above the box, top-left>
//   ┌──────────────────────────────────────────────┐
//   │  [cover image]   eyebrow            [Learn] │
//   │                  Business Name              │
//   │                  short description          │
//   └──────────────────────────────────────────────┘
//
// Two states share the layout — sponsored (real advertiser) vs.
// placeholder (Your Business Here + Claim This Spot CTA).
//
// Example:
//   <HeroSponsorCard
//     sponsor={sponsor}
//     aboveLabel="Family Brain Games Are Sponsored By"
//     verticalSlug="games"
//     placeholderName="Your Business Here"
//     placeholderTagline="Sponsor Family Brain Games — your business anchors every game page River Region families play."
//   />

import Link from 'next/link'
import Image from 'next/image'
import { Star, Trophy, CheckCircle2, ChevronRight } from 'lucide-react'
import { ClaimSpotButton } from '@/components/ClaimSpotButton'

export interface HeroSponsor {
  businessName: string
  slug:         string | null
  headline:     string | null
  /** Optional cover image (when the advertiser uploaded one). Shown
   *  on the left of the card. Falls back to a Star icon glyph. */
  imageUrl?:    string | null
  /** Long description shown under the headline. Falls back silently
   *  when not set. */
  description?: string | null
  /** CTA label on the right pill. Defaults to "Learn More". */
  ctaLabel?:    string | null
  /** External destination. Falls back to the business profile at
   *  /business/<slug> if not set. */
  link?:        string | null
  placementId?: string | null
}

interface Props {
  sponsor:             HeroSponsor | null
  /** Small label rendered ABOVE the card, top-left. e.g.
   *  "Family Brain Games Are Sponsored By". Falls back to
   *  sponsorLabel for legacy callers. */
  aboveLabel?:         string
  /** @deprecated Old centered-eyebrow API. Use aboveLabel instead. */
  sponsorLabel?:       string
  /** Used to build the /advertise/<slug> pitch link in the unsponsored state. */
  verticalSlug?:       string
  /** Big text on the unsponsored placeholder. */
  placeholderName?:    string
  /** Tagline shown under the placeholder name. */
  placeholderTagline?: string
  /** Pitch CTA label on the unsponsored placeholder. */
  placeholderCtaLabel?: string
}

// Shared inner content — keeps the sponsored + unsponsored states in
// lock-step visually. parent decides whether they're wrapped in a
// <Link> (sponsor) or a <ClaimSpotButton> (placeholder).
function CardInner({
  imageUrl, eyebrow, headline, description, ctaLabel,
  isPlaceholder,
}: {
  imageUrl:      string | null | undefined
  eyebrow:       string
  headline:      string
  description:   string | null | undefined
  ctaLabel:      string
  isPlaceholder: boolean
}) {
  return (
    <>
      <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
      <div className="w-full md:w-52 h-40 rounded-2xl overflow-hidden shrink-0 z-10 bg-background shadow-sm">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={headline}
            width={416}
            height={320}
            unoptimized
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Star className="h-12 w-12 text-secondary" />
          </div>
        )}
      </div>
      <div className="flex-1 text-center md:text-left z-10 min-w-0">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">
          {eyebrow}
        </span>
        <h4 className={`font-bold text-lg leading-tight ${isPlaceholder ? 'text-foreground' : 'text-foreground group-hover:text-primary transition-colors'}`}>
          {headline}
        </h4>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{description}</p>
        )}
      </div>
      <span className="shrink-0 z-10 inline-flex items-center justify-center px-4 py-2 bg-background border rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
        {ctaLabel}
      </span>
    </>
  )
}

export function HeroSponsorCard({
  sponsor,
  aboveLabel,
  sponsorLabel,
  verticalSlug,
  placeholderName     = 'Your Business Here',
  placeholderTagline  = 'Be the only sponsor for this section — your business anchors every page River Region families see in this vertical.',
  placeholderCtaLabel = 'Claim This Spot',
}: Props) {
  const labelText = aboveLabel ?? sponsorLabel ?? 'Sponsored By'

  // Card container classes — mirrors the homepage inline ad (YMCA
  // pattern) so sponsor blocks look the same wherever they appear.
  // Border bumped to border-2 + full-opacity border-border so the
  // card reads clearly against tinted-cream hero backgrounds (where
  // the original border/50 was washing out and almost invisible).
  const cardCls = 'bg-card border-2 border-border rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group hover:border-primary/40 hover:shadow-md transition-all w-full text-left'

  if (sponsor) {
    const href = sponsor.link ?? (sponsor.slug ? `/business/${sponsor.slug}` : '#')
    return (
      <div className="max-w-3xl mx-auto w-full">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 ml-1">
          {labelText}
        </p>
        <Link href={href} className={cardCls}>
          <CardInner
            imageUrl={sponsor.imageUrl}
            eyebrow="Sponsor"
            headline={sponsor.businessName}
            description={sponsor.headline ?? sponsor.description ?? null}
            ctaLabel={sponsor.ctaLabel || 'Learn More'}
            isPlaceholder={false}
          />
        </Link>
      </div>
    )
  }

  // ── Unsponsored placeholder — explicit sales card ─────────────────────────
  //
  // Different layout from the sponsored state. The YMCA-style image+
  // text+CTA layout reads as a thin half-empty skeleton when there's
  // no advertiser yet — the giant empty image box and the muted
  // outline CTA together fail to sell.
  //
  // This version is a focused pitch:
  //   - Trophy chip + 'SPONSOR OPPORTUNITY' eyebrow
  //   - Punchy headline (placeholderName, repurposed)
  //   - Supporting one-liner (placeholderTagline)
  //   - Three quick value bullets so prospects can see what they get
  //   - One bold primary-color CTA pill
  //
  // Lead capture still routes through ClaimSpotButton so the inquiry
  // email arrives pre-filled with the vertical context.
  const pitchHref = verticalSlug ? `/advertise/${verticalSlug}` : '/advertise'
  const verticalLabel = verticalSlug
    ? `Section sponsor — ${verticalSlug}`
    : 'Section sponsor'
  const placeholderCardCls = 'relative overflow-hidden bg-card border-2 border-primary/40 rounded-2xl p-6 md:p-8 w-full text-center md:text-left flex flex-col md:flex-row items-center gap-6 hover:border-primary hover:shadow-lg transition-all group'
  return (
    <div className="max-w-3xl mx-auto w-full">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 ml-1">
        {labelText}
      </p>
      <ClaimSpotButton
        as="a"
        href={pitchHref}
        placementType="section_sponsor"
        placementLabel={verticalLabel}
        className={placeholderCardCls}
      >
        {/* Decorative orb — same one as the sponsored card so the
            two states share family resemblance. */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

        <div className="flex-1 z-10">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
            <Trophy className="h-3 w-3" />
            Sponsor Opportunity
          </div>
          <h3 className="font-black text-foreground text-2xl md:text-3xl leading-tight mb-2">
            {placeholderName}
          </h3>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4 max-w-lg md:mx-0 mx-auto">
            {placeholderTagline}
          </p>
          <ul className="hidden md:flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-foreground/80 mb-1">
            <li className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              One advertiser
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Top of every page
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Annual exclusive
            </li>
          </ul>
        </div>

        <span className="shrink-0 z-10 inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm md:text-base font-bold shadow-sm group-hover:bg-primary/90 group-hover:gap-2 transition-all whitespace-nowrap">
          {placeholderCtaLabel} <ChevronRight className="h-4 w-4" />
        </span>
      </ClaimSpotButton>
    </div>
  )
}
