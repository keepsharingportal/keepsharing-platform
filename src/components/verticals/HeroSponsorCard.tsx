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
import { Star, Trophy, ChevronRight } from 'lucide-react'
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
      {/* Decorative blur — kept small at this compact size. */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />
      {/* Image / icon area sized to match the placeholder Trophy chip
          so the two states share footprint. Compact 16x16 / 20x20. */}
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shrink-0 z-10 bg-background shadow-sm">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={headline}
            width={160}
            height={160}
            unoptimized
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Star className="h-7 w-7 text-secondary" />
          </div>
        )}
      </div>
      <div className="flex-1 text-center md:text-left z-10 min-w-0">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">
          {eyebrow}
        </span>
        <h4 className={`font-bold text-base md:text-lg leading-tight ${isPlaceholder ? 'text-foreground' : 'text-foreground group-hover:text-primary transition-colors'}`}>
          {headline}
        </h4>
        {description && (
          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
        )}
      </div>
      <span className="shrink-0 z-10 inline-flex items-center justify-center px-4 py-2 bg-background border rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors whitespace-nowrap">
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
  // pattern) but trimmed for use under a hero. Earlier rev used p-6
  // and a 40-tall image, which made the card visually heavier than
  // the hero title above it.
  const cardCls = 'bg-card border-2 border-border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 relative overflow-hidden group hover:border-primary/40 hover:shadow-md transition-all w-full text-left'

  // Label tone — uses the secondary brand (teal/green) so it
  // visually pairs with the green Daily Challenge pill instead of
  // sitting in muted gray. Keeps the sponsor unit feeling on-brand.
  const labelCls = 'text-[11px] font-bold uppercase tracking-widest text-secondary mb-2 ml-1'

  if (sponsor) {
    const href = sponsor.link ?? (sponsor.slug ? `/business/${sponsor.slug}` : '#')
    return (
      <div className="max-w-2xl mx-auto w-full">
        <p className={labelCls}>{labelText}</p>
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

  // ── Unsponsored placeholder — compact pitch ────────────────────────────────
  //
  // Sized to match the sponsored YMCA card so the spot doesn't visually
  // outsize the title above it. Earlier rev used p-8 + text-3xl which
  // read as a competing hero. This version uses the same p-4/p-5 footprint
  // as the sponsored card with a horizontal flow:
  //   [trophy chip icon]  eyebrow + headline + tagline  [Claim This Spot →]
  //
  // Lead capture still routes through ClaimSpotButton so the inquiry
  // email arrives pre-filled with the vertical context.
  const pitchHref = verticalSlug ? `/advertise/${verticalSlug}` : '/advertise'
  const verticalLabel = verticalSlug
    ? `Section sponsor — ${verticalSlug}`
    : 'Section sponsor'
  const placeholderCardCls = 'relative overflow-hidden bg-card border-2 border-primary/40 rounded-2xl p-4 md:p-5 w-full text-center md:text-left flex flex-col md:flex-row items-center gap-4 hover:border-primary hover:shadow-md transition-all group'
  return (
    <div className="max-w-2xl mx-auto w-full">
      <p className={labelCls}>{labelText}</p>
      <ClaimSpotButton
        as="a"
        href={pitchHref}
        placementType="section_sponsor"
        placementLabel={verticalLabel}
        className={placeholderCardCls}
      >
        {/* Trophy icon in a soft primary square — same footprint as
            the sponsored card's image area so the two states share
            visual weight. w-16 h-16 fits a tighter hero. */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Trophy className="h-8 w-8 md:h-9 md:w-9 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 block">
            Sponsor Opportunity
          </span>
          <h3 className="font-bold text-foreground text-base md:text-lg leading-tight mb-1">
            {placeholderName}
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-snug">
            {placeholderTagline}
          </p>
        </div>

        <span className="shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-sm group-hover:bg-primary/90 group-hover:gap-1.5 transition-all whitespace-nowrap">
          {placeholderCtaLabel} <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </ClaimSpotButton>
    </div>
  )
}
