// Client wrapper around the compact ListingCard variant. Renders the
// first INITIAL_VISIBLE listings; remainder is gated behind a "Show
// all N" button. Mid-list "Get featured" upgrade CTA drops in after
// MID_CTA_AFTER rows so businesses scrolling their own listing see
// the upsell exactly where they're looking.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Star } from 'lucide-react'
import { ListingCard, type ListingData } from '@/components/theme/ListingCard'

const INITIAL_VISIBLE = 12     // cap before "Show all" reveals the rest
const MID_CTA_AFTER   = 5      // drop the upgrade CTA after row N

export function CompactListingList({ listings }: { listings: ListingData[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? listings : listings.slice(0, INITIAL_VISIBLE)
  const hiddenCount = listings.length - visible.length

  return (
    <div className="space-y-2">
      {visible.map((l, i) => (
        <div key={l.id}>
          <ListingCard
            listing={l}
            guideUrlSlug="birthday-party-guide"
            guideContext="birthday-party"
            variant="compact"
          />
          {i === MID_CTA_AFTER - 1 && (
            <UpgradeCTA />
          )}
        </div>
      ))}
      {hiddenCount > 0 && (
        <div className="pt-3 text-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-primary border-2 border-primary/30 rounded-full hover:bg-primary/5 transition-colors"
          >
            Show all {listings.length} listings <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

function UpgradeCTA() {
  return (
    <Link
      href="/birthday-party-guide/sponsor"
      className="group block my-3 bg-gradient-to-r from-[#ff7a59]/10 via-[#ff8b6e]/8 to-transparent border border-[#ff7a59]/30 rounded-xl px-4 py-3 hover:from-[#ff7a59]/15 hover:to-[#ff7a59]/5 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-[#ff7a59]/15 flex items-center justify-center shrink-0">
          <Star className="h-4 w-4 text-[#ff7a59] fill-[#ff7a59]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-[#ff7a59] mb-0.5">
            Is this your business?
          </div>
          <div className="text-sm font-bold text-foreground leading-snug">
            Get a featured profile — top placement, photo, and direct booking.
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-[#ff7a59] group-hover:translate-x-0.5 transition-transform shrink-0" />
      </div>
    </Link>
  )
}
