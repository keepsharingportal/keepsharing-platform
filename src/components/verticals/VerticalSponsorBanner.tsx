import Link from 'next/link'
import { ArrowRight, Crown, Zap } from 'lucide-react'
import { TrackedImpression } from '@/components/tracking/TrackedImpression'
import { TrackedLink } from '@/components/tracking/TrackedLink'

interface SponsorInfo {
  businessName: string
  slug:         string | null
  headline:     string | null
  /** ad_placements.id — required for impression/click tracking. */
  placementId?: string | null
}

interface Props {
  verticalName:  string
  /** Slug used to build the /advertise/<slug> pitch link. */
  verticalSlug?: string
  sponsorLabel:  string
  sponsor:       SponsorInfo | null
}

export function VerticalSponsorBanner({ verticalName, verticalSlug, sponsorLabel, sponsor }: Props) {
  const pitchHref = verticalSlug ? `/advertise/${verticalSlug}` : '/advertise'

  if (sponsor) {
    const content = (
      <div className="relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/15 via-accent/8 to-primary/8">
        <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <div className="relative px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center mt-0.5">
              <Crown className="h-4.5 w-4.5 text-accent" style={{ width: '1.125rem', height: '1.125rem' }} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-0.5">
                {sponsorLabel}
              </p>
              <p className="font-bold text-foreground leading-snug text-base">
                {sponsor.businessName}
              </p>
              {sponsor.headline && (
                <p className="text-sm text-muted-foreground mt-1 max-w-lg leading-relaxed">
                  {sponsor.headline}
                </p>
              )}
            </div>
          </div>
          {sponsor.slug && (
            sponsor.placementId ? (
              <TrackedLink
                adPlacementId={sponsor.placementId}
                href={`/business/${sponsor.slug}`}
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-accent/30 text-foreground rounded-full text-sm font-bold hover:bg-accent/5 transition-colors whitespace-nowrap"
              >
                Visit Sponsor <ArrowRight className="h-4 w-4" />
              </TrackedLink>
            ) : (
              <Link
                href={`/business/${sponsor.slug}`}
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-accent/30 text-foreground rounded-full text-sm font-bold hover:bg-accent/5 transition-colors whitespace-nowrap"
              >
                Visit Sponsor <ArrowRight className="h-4 w-4" />
              </Link>
            )
          )}
        </div>
      </div>
    )

    return sponsor.placementId
      ? <TrackedImpression adPlacementId={sponsor.placementId}>{content}</TrackedImpression>
      : content
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/18 via-accent/8 to-primary/8">
      <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center mt-0.5">
            <Crown className="h-4.5 w-4.5 text-accent" style={{ width: '1.125rem', height: '1.125rem' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-black uppercase tracking-widest text-accent">
                Exclusive Sponsorship Available
              </p>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                <Zap className="h-2.5 w-2.5" /> 1 Spot
              </span>
            </div>
            <p className="font-bold text-foreground leading-snug text-base">
              Own {verticalName} — be the only sponsor, every visit
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg leading-relaxed">
              Your business anchors every page River Region families see in this vertical.
              One sponsor, year-round.
            </p>
          </div>
        </div>
        <Link
          href={pitchHref}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
        >
          Claim This Spot <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
