// FRGHero — full-bleed photo hero for the Family Resource Guide.
//
// Matches the Brain Games / School Zone treatment:
//   - Lighter dark gradient so the photo breathes through
//   - Centered composition (eyebrow → two-tone title → subtitle → metadata → sponsor card)
//   - Two-tone title via SplitColoredTitle ("Family Resource [Guide]")
//   - Single centered sponsor card via the shared HeroSponsorCard
//   - No competing CTAs in the hero — SelfSelectLanes below carries that load

import Image from 'next/image'
import { HeroSponsorCard, type HeroSponsor } from '@/components/verticals/HeroSponsorCard'
import { SplitColoredTitle } from '@/components/verticals/SplitColoredTitle'

interface Props {
  /** Editable from /admin/guides/family-resource-guide/edit */
  heroImageUrl?: string | null
  title:         string
  /** Sponsor data — shared HeroSponsorCard handles both states */
  sponsor:       HeroSponsor | null
  sponsorLabel?: string
}

export function FRGHero({
  heroImageUrl,
  title,
  sponsor,
  sponsorLabel = 'Proudly Presented By',
}: Props) {
  return (
    <div className="relative overflow-hidden border-b border-border/40">
      <div className="absolute inset-0">
        {heroImageUrl ? (
          <>
            <Image
              src={heroImageUrl}
              alt={title}
              fill
              sizes="100vw"
              style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
              priority
              unoptimized
            />
            {/* Lighter overlay (matches School Zone) — photo breathes through */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/35 to-black/20" />
          </>
        ) : (
          // No hero set yet — render the site's brand gradient instead of
          // a generic stock photo that doesn't match the theme.
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/85 to-secondary/80" />
        )}
      </div>

      <div className="relative container py-14 md:py-20 text-center">
        {/* Title — eyebrow / subtitle / stats pill all removed for a quieter hero */}
        <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] mb-4 drop-shadow-sm">
          <SplitColoredTitle title={title} />
        </h1>

        {/* Metadata line — the single descriptor under the title.
             Big bottom margin so the sponsor card floats clear of the text
             instead of crowding it. */}
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75 mb-14 md:mb-16">
          Best Of Lists · Popular Guides · Events · Schools and More
        </p>

        {/* Centered sponsor card — Brain-Games-style integrated into the hero.
             size="sm" shrinks the card ~25% for a tighter footprint. */}
        <HeroSponsorCard
          sponsor={sponsor}
          sponsorLabel={sponsorLabel}
          verticalSlug="family-resource-guide"
          placeholderName="Your Business Here"
          placeholderTagline="Own the Family Resource Guide for a year — your business anchors every page River Region moms use to find services."
          placeholderCtaLabel="Claim This Spot"
        />
      </div>
    </div>
  )
}
