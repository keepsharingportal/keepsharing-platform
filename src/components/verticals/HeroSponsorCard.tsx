// HeroSponsorCard — centered white sponsor card meant to live INSIDE a photo
// hero. Two states (sponsored / unsponsored) share the same visual treatment
// so the page looks polished whether you have a sponsor wired or not.
//
// This is the same card pattern used on the /games (Family Brain Games) hub.
// Use it on any vertical's photo hero where you want one focal sponsor
// placement instead of a separate sponsor strip below.
//
// Layout matches the Brain Games hub exactly:
//   row 1 (horizontal): SPONSORED BY · Business Name · [Learn More button]
//   row 2 (italic):     short tagline
//
// No outer max-width — the card sizes to its content so a 3-word business
// name doesn't wrap into 3 lines on a narrow card.
//
// Example:
//   <HeroSponsorCard
//     sponsor={sponsor}
//     sponsorLabel="Proudly Presented By"
//     verticalSlug="school-zone"
//     placeholderName="Your Business Here"
//     placeholderTagline="Own School Zone for a year — your business anchors every page River Region families see in this vertical."
//   />

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ClaimSpotButton } from '@/components/ClaimSpotButton'

export interface HeroSponsor {
  businessName: string
  slug:         string | null
  headline:     string | null
  placementId?: string | null
}

interface Props {
  sponsor:             HeroSponsor | null
  /** Eyebrow text. Defaults to "Sponsored by" — also matches Brain Games. */
  sponsorLabel?:       string
  /** Used to build the /advertise/<slug> pitch link in the unsponsored state. */
  verticalSlug?:       string
  /** Big text on the unsponsored placeholder. */
  placeholderName?:    string
  /** Italic tagline below on the unsponsored placeholder. */
  placeholderTagline?: string
  /** Pitch CTA label on the unsponsored placeholder. */
  placeholderCtaLabel?: string
  /**
   * 'md' (default) — full size used by Brain Games & School Zone.
   * 'sm'           — ~25% shrunk variant for a tighter hero footprint.
   */
  size?: 'md' | 'sm'
}

// Tailwind class bundles per size. Kept separate so the two sizes don't drift.
const SIZE_CLASSES = {
  md: {
    container: 'gap-3 px-6 py-5 md:px-8 md:py-6',
    inner:     'gap-3 sm:gap-5',
    name:      'text-xl md:text-2xl',
    button:    'text-sm px-5 py-2',
    icon:      'h-4 w-4',
    tagline:   'text-sm max-w-md',
  },
  sm: {
    container: 'gap-2 px-4 py-3 md:px-6 md:py-4',
    inner:     'gap-2 sm:gap-3',
    name:      'text-base md:text-lg',
    button:    'text-xs px-4 py-1.5',
    icon:      'h-3.5 w-3.5',
    tagline:   'text-xs max-w-sm',
  },
} as const

export function HeroSponsorCard({
  sponsor,
  sponsorLabel        = 'Sponsored by',
  verticalSlug,
  placeholderName     = 'Your Business Here',
  placeholderTagline  = 'Be the only sponsor for this section — your business anchors every page River Region families see in this vertical.',
  placeholderCtaLabel = 'Claim This Spot',
  size                = 'md',
}: Props) {
  const s = SIZE_CLASSES[size]

  if (sponsor) {
    return (
      <div className={`inline-flex flex-col items-center rounded-2xl bg-card border border-border/60 shadow-sm ${s.container}`}>
        <div className={`flex flex-col sm:flex-row items-center ${s.inner}`}>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {sponsorLabel}
            </span>
            <span className={`font-black text-primary whitespace-nowrap ${s.name}`}>
              {sponsor.businessName}
            </span>
          </div>
          {sponsor.slug && (
            <Link
              href={`/business/${sponsor.slug}`}
              className={`inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors whitespace-nowrap ${s.button}`}
            >
              Learn More <ChevronRight className={s.icon} />
            </Link>
          )}
        </div>
        {sponsor.headline && (
          <p className={`text-muted-foreground italic leading-relaxed ${s.tagline}`}>
            {sponsor.headline}
          </p>
        )}
      </div>
    )
  }

  // Unsponsored placeholder — same visual treatment, different content.
  // Lead capture is wired through ClaimSpotButton: clicking the CTA opens
  // the inquiry modal pre-filled with the vertical (section_sponsor +
  // verticalSlug context) so the editor gets an email with the right spot.
  const pitchHref = verticalSlug ? `/advertise/${verticalSlug}` : '/advertise'
  const verticalLabel = verticalSlug
    ? `Section sponsor — ${verticalSlug}`
    : 'Section sponsor'
  return (
    <div className={`inline-flex flex-col items-center rounded-2xl bg-card border border-border/60 shadow-sm ${s.container}`}>
      <div className={`flex flex-col sm:flex-row items-center ${s.inner}`}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {sponsorLabel}
          </span>
          <span className={`font-black text-primary whitespace-nowrap ${s.name}`}>
            {placeholderName}
          </span>
        </div>
        <ClaimSpotButton
          as="a"
          href={pitchHref}
          placementType="section_sponsor"
          placementLabel={verticalLabel}
          className={`inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors whitespace-nowrap ${s.button}`}
        >
          {placeholderCtaLabel} <ChevronRight className={s.icon} />
        </ClaimSpotButton>
      </div>
      <p className={`text-muted-foreground italic leading-relaxed ${s.tagline}`}>
        {placeholderTagline}
      </p>
    </div>
  )
}
