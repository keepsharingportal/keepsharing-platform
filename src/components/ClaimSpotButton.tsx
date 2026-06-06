'use client'

// ClaimSpotButton — drop-in wrapper that turns any "Reach families /
// Claim this spot" CTA into a tracked inquiry. Renders its children as
// the trigger; opens SlotInquiryModal pre-filled with the placement
// context so the email to the editor knows which slot was being pitched.
//
// Phase 1: lead capture + email follow-up.
// Phase 2: replace the modal action with a Stripe checkout.
//
// Use anywhere an existing <Link href="/advertise"> placeholder lives:
//   <ClaimSpotButton placementType="homepage_sidebar_ad" placementLabel="…">
//     <span>…existing CTA markup…</span>
//   </ClaimSpotButton>

import { useState, type ReactNode } from 'react'
import { SlotInquiryModal } from './SlotInquiryModal'

interface Props {
  placementType?:  string
  placementLabel?: string
  children:        ReactNode
  className?:      string
  /** Render as a `<button>` (default) or `<a>` if you need a real link
   *  for SEO. The 'a' variant still opens the modal via onClick + e.preventDefault. */
  as?:             'button' | 'a'
  /** Fallback href when JS is disabled (only used when as='a'). */
  href?:           string
}

export function ClaimSpotButton({
  placementType,
  placementLabel,
  children,
  className,
  as = 'button',
  href = '/advertise',
}: Props) {
  const [open, setOpen] = useState(false)
  const onClick = () => setOpen(true)

  return (
    <>
      {as === 'a' ? (
        <a
          href={href}
          onClick={e => { e.preventDefault(); onClick() }}
          className={className}
        >
          {children}
        </a>
      ) : (
        <button type="button" onClick={onClick} className={className}>
          {children}
        </button>
      )}
      <SlotInquiryModal
        open={open}
        onClose={() => setOpen(false)}
        placementType={placementType}
        placementLabel={placementLabel}
      />
    </>
  )
}
