// Full-bleed photo hero for The Big Birthday Bash.
//
// Hero image is editor-managed: pulled from the 'birthday-bash' row in
// the verticals table (same pattern as FRG / Mom Knows Best). Editor
// uploads via /admin/verticals/birthday-bash/edit. When no custom
// image is set we render the packed-balloons stock hero instead of
// a plain gradient — the portal is birthday-themed, the fallback
// should be too.
//
// A HeroSponsorCard renders at the bottom of the hero, matching the
// FRG / Games / etc. top-section-sponsor pattern. Placeholder card
// with a Claim CTA renders when no sponsor is booked so the sale is
// visible every month regardless.

import Image from 'next/image'
import { HeroSponsorCard, type HeroSponsor } from '@/components/verticals/HeroSponsorCard'

const DEFAULT_HERO_IMAGE = '/images/heroes/birthday-party-hero.jpg'

interface Props {
  heroImageUrl?: string | null
  title?:        string | null
  subtitle?:     string | null
  /** Active section sponsor for this vertical. Null renders the
   *  placeholder Claim This Spot card. */
  sponsor?:      HeroSponsor | null
}

export function BigBirthdayBashHero({ heroImageUrl, title, subtitle, sponsor }: Props) {
  const displayTitle    = title    ?? 'The Big Birthday Bash'
  const displaySubtitle = subtitle ?? 'Plan Your Child\'s Next Birthday Celebration'
  // Split the last word out so we can highlight it (e.g. "Bash")
  const titleParts = displayTitle.match(/^(.*)\s+(\S+)$/)
  const titleHead  = titleParts ? titleParts[1] : displayTitle
  const titleTail  = titleParts ? titleParts[2] : ''
  return (
    <div className="relative overflow-hidden border-b border-black/5">
      <div className="absolute inset-0">
        <Image
          src={heroImageUrl || DEFAULT_HERO_IMAGE}
          alt={displayTitle}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/65" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 text-white">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.05] tracking-tight">
            {titleHead}{titleTail && <> <span className="text-[#ff7a59]">{titleTail}</span></>}
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 mt-4 max-w-2xl mx-auto leading-relaxed">
            {displaySubtitle}
          </p>
        </div>

        {/* Sponsor card — matches the FRG / Games hero-embedded pattern
            so the section sponsor lives in the top of the page and is
            visible on first paint. */}
        <div className="mt-10">
          <HeroSponsorCard
            sponsor={sponsor ?? null}
            sponsorLabel="This Birthday Bash Is Sponsored By"
            verticalSlug="birthday-bash"
            placeholderName="Your Business Here"
            placeholderTagline="Own the Birthday Bash — your business anchors every River Region birthday plan for the whole month."
          />
        </div>
      </div>
    </div>
  )
}
