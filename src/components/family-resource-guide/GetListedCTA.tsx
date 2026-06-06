// GetListedCTA — sales-focused block telling local businesses how to join
// the guide. Two variants: 'banner' (full-width section) and 'sidebar'
// (compact, sticky-friendly).

import Link from 'next/link'
import { Store, ArrowRight } from 'lucide-react'
import { ClaimSpotButton } from '@/components/ClaimSpotButton'

interface Props {
  variant?: 'banner' | 'sidebar'
}

function StoreIcon({ className }: { className?: string }) {
  return <Store className={className} />
}

export function GetListedCTA({ variant = 'banner' }: Props) {
  if (variant === 'sidebar') {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/8 to-secondary/8 border border-primary/25 p-5">
        <StoreIcon className="h-5 w-5 text-primary mb-2" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">For Local Businesses</p>
        <p className="text-sm font-bold text-foreground leading-snug mb-2">
          Get listed in the Family Resource Guide
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Reach River Region families who are actively looking. Free, enhanced, and featured listings available.
        </p>
        <ClaimSpotButton
          as="a"
          href="/advertise"
          placementType="guide_directory_inline_ad"
          placementLabel="Family Resource Guide — directory listing"
          className="inline-flex items-center gap-1.5 w-full justify-center px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-bold hover:bg-primary/90 transition-colors"
        >
          Get Listed <ArrowRight className="h-3.5 w-3.5" />
        </ClaimSpotButton>
      </div>
    )
  }

  return (
    <section className="rounded-3xl bg-gradient-to-br from-primary/12 via-primary/5 to-secondary/8 border border-primary/20 p-8 md:p-12">
      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <div className="inline-flex items-center gap-2 mb-3">
            <StoreIcon className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">For Local Businesses</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-3">
            Be on the list moms reach for first.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
            River Region families come to the Family Resource Guide when they need a pediatrician, a preschool, a counselor — and a hundred other things. Free, enhanced, and featured listings available.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <ClaimSpotButton
            as="a"
            href="/advertise"
            placementType="guide_directory_inline_ad"
            placementLabel="Family Resource Guide — directory listing"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
          >
            See Listing Tiers <ArrowRight className="h-4 w-4" />
          </ClaimSpotButton>
          <Link
            href="/get-media-kit"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-primary/40 text-primary rounded-full text-sm font-semibold hover:bg-primary/10 transition-colors whitespace-nowrap"
          >
            Download Media Kit
          </Link>
        </div>
      </div>
    </section>
  )
}
