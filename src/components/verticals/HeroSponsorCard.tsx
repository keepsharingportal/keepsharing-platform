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
import { Star } from 'lucide-react'
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
  const cardCls = 'bg-muted/50 border border-border/50 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group hover:border-primary/30 hover:shadow-md transition-all w-full text-left'

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

  // Unsponsored placeholder — lead-capture via ClaimSpotButton so the
  // inquiry email arrives pre-filled with the vertical context.
  const pitchHref = verticalSlug ? `/advertise/${verticalSlug}` : '/advertise'
  const verticalLabel = verticalSlug
    ? `Section sponsor — ${verticalSlug}`
    : 'Section sponsor'
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
        className={cardCls}
      >
        <CardInner
          imageUrl={null}
          eyebrow="Sponsor Opportunity"
          headline={placeholderName}
          description={placeholderTagline}
          ctaLabel={placeholderCtaLabel}
          isPlaceholder
        />
      </ClaimSpotButton>
    </div>
  )
}
