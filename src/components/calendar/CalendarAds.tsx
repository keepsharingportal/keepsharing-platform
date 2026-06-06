// CalendarAds — ad surfaces on the public /calendar page.
//
// Each component has two render paths:
//   1. **Real ad**: when an ActiveAd from the ad_placements system is passed,
//      render the advertiser's actual creative (image, headline, CTA) wrapped
//      in TrackedImpression + TrackedLink for impression/click analytics.
//   2. **Placeholder**: when ad is null, render the "Your business here /
//      Media Kit" placeholder so the slot stays sized and the sales team can
//      point at it during pitches.
//
// Three distinct surfaces:
//   - CalendarAdCard    — shaped like an EventCard, drops into the grid at
//                         positions 4 and 9 without disrupting the layout.
//   - SponsorAdBanner   — full-width horizontal row above/below the grid.
//   - (SponsorTallSlot on the event-detail rail is inline in that page.)

import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, ArrowRight } from 'lucide-react'
import { TrackedImpression } from '@/components/tracking/TrackedImpression'
import { TrackedLink } from '@/components/tracking/TrackedLink'
import type { ActiveAd } from '@/lib/get-active-ads'

// ── 1. Inline ad card (lives in the event grid) ────────────────────────────

interface CalendarAdCardProps {
  placement: string
  ad?:       ActiveAd | null
}

export function CalendarAdCard({ placement, ad }: CalendarAdCardProps) {
  if (ad?.ad_link) {
    return (
      <TrackedImpression adPlacementId={ad.id}>
        <TrackedLink adPlacementId={ad.id} href={ad.ad_link}>
          <div
            data-ad-placement={placement}
            className="block bg-card rounded-2xl overflow-hidden ring-1 ring-border hover:ring-primary/30 hover:shadow-lg transition-all flex flex-col h-full cursor-pointer"
          >
            {ad.ad_image_url ? (
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <Image src={ad.ad_image_url} alt={ad.ad_headline ?? 'Sponsored'} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
                <span className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-full bg-white/95 backdrop-blur text-[10px] font-bold text-muted-foreground">
                  Sponsored
                </span>
              </div>
            ) : (
              <div className="relative aspect-[16/10] overflow-hidden bg-[var(--fg-terra-light)] flex items-center justify-center">
                <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-primary/60">Sponsored</span>
              </div>
            )}
            <div className="p-5 flex flex-col flex-1">
              {ad.ad_eyebrow && (
                <p className="text-[10px] uppercase tracking-wider font-bold text-primary/70 mb-1">{ad.ad_eyebrow}</p>
              )}
              <p className="text-base font-bold text-foreground mb-2 leading-snug">
                {ad.ad_headline ?? ad.advertiser_name ?? 'Sponsored'}
              </p>
              {ad.ad_description && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">{ad.ad_description}</p>
              )}
              <span className="mt-auto inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
                {ad.ad_cta_label ?? 'Learn More'} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </span>
            </div>
          </div>
        </TrackedLink>
      </TrackedImpression>
    )
  }

  // Placeholder (no real ad booked for this slot)
  return (
    <div
      data-ad-placement={placement}
      className="block bg-card rounded-2xl overflow-hidden ring-1 ring-dashed ring-primary/30 flex flex-col h-full"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--fg-terra-light)] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-primary/60 mb-1.5">
            Sponsored Slot
          </p>
          <Sparkles className="h-8 w-8 text-primary/40 mx-auto" strokeWidth={1.5} />
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <p className="inline-flex items-center gap-1.5 text-sm font-bold text-primary mb-2">
          Your Business, in Front of River Region Families
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          The calendar reaches thousands of local parents every week. Get the media kit and put your event, class, or service here.
        </p>
        <Link
          href="/get-media-kit"
          className="mt-auto inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          Get the Media Kit <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

// ── 2. Full-width sponsor banner ───────────────────────────────────────────

interface SponsorAdBannerProps {
  placement: string
  variant?:  'tan' | 'coral'
  ad?:       ActiveAd | null
}

export function SponsorAdBanner({ placement, variant = 'tan', ad }: SponsorAdBannerProps) {
  const bgClass = variant === 'tan'
    ? 'bg-[var(--fg-cream)] ring-amber-200'
    : 'bg-[var(--fg-terra-light)] ring-primary/15'

  // Image mode (migration 125) — full-bleed advertiser-supplied
  // creative, no platform text. The calendar banner becomes a single
  // clickable image at the slot's natural aspect ratio.
  if (ad?.ad_link && ad.creative_mode === 'image' && ad.ad_image_url) {
    return (
      <TrackedImpression adPlacementId={ad.id}>
        <TrackedLink adPlacementId={ad.id} href={ad.ad_link}>
          <div
            data-ad-placement={placement}
            className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <Image
              src={ad.ad_image_url}
              alt={ad.ad_headline ?? 'Sponsored'}
              width={1200}
              height={400}
              className="w-full h-auto object-cover"
              unoptimized
            />
          </div>
        </TrackedLink>
      </TrackedImpression>
    )
  }

  if (ad?.ad_link) {
    return (
      <TrackedImpression adPlacementId={ad.id}>
        <div
          data-ad-placement={placement}
          className={`rounded-2xl ring-1 ${bgClass} px-6 py-5 md:px-8 md:py-6 flex items-center gap-5 flex-wrap md:flex-nowrap`}
        >
          {ad.ad_image_url ? (
            <div className="shrink-0 hidden md:flex w-20 h-20 rounded-2xl overflow-hidden ring-1 ring-border">
              <Image src={ad.ad_image_url} alt="" width={80} height={80} className="w-full h-full object-cover" unoptimized />
            </div>
          ) : (
            <div className="shrink-0 hidden md:flex w-20 h-20 rounded-2xl bg-white/70 ring-1 ring-border items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary/50" strokeWidth={1.5} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-primary/70 mb-1">
              {ad.ad_eyebrow ?? 'Sponsored'}
            </p>
            <p className="text-base md:text-lg font-bold text-foreground leading-snug">
              {ad.ad_headline ?? ad.advertiser_name ?? 'Sponsored'}
            </p>
            {ad.ad_description && (
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mt-0.5">{ad.ad_description}</p>
            )}
          </div>
          <TrackedLink adPlacementId={ad.id} href={ad.ad_link}>
            <span className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
              {ad.ad_cta_label ?? 'Learn More'} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </TrackedLink>
        </div>
      </TrackedImpression>
    )
  }

  // Placeholder
  return (
    <div
      data-ad-placement={placement}
      className={`rounded-2xl ring-1 ring-dashed ${bgClass} px-6 py-5 md:px-8 md:py-6 flex items-center gap-5 flex-wrap md:flex-nowrap`}
    >
      <div className="shrink-0 hidden md:flex w-20 h-20 rounded-2xl bg-white/70 ring-1 ring-border items-center justify-center">
        <Sparkles className="h-7 w-7 text-primary/50" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-primary/70 mb-1">
          Sponsored Slot
        </p>
        <p className="text-base md:text-lg font-bold text-foreground leading-snug">
          Reach River Region Families Where They&apos;re Already Looking.
        </p>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mt-0.5">
          Calendar sponsorships put your business next to the events parents are actively planning around. Premium placement, brand-safe, hyperlocal.
        </p>
      </div>
      <Link
        href="/get-media-kit"
        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
      >
        Media Kit <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
