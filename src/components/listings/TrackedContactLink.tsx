'use client'

// TrackedContactLink — drop-in replacement for an <a> on listing surfaces.
// Fires a fire-and-forget beacon to /api/listings/track-contact when the
// reader actually opens the link, then lets the browser handle the
// navigation as normal (tel:, mailto:, https://...).
//
// Why a single component for all three event types:
//   - Same telemetry shape; identical UI affordances; one place to update
//     if we ever want to add hover/touch heuristics or async retry.
//   - The advertiser report joins on event_type, so we centralize the
//     enum here in one TS union and the schema CHECK constraint mirrors it.

import { useCallback, type AnchorHTMLAttributes, type ReactNode } from 'react'

export type ContactEventType = 'tel' | 'mailto' | 'website'

interface Props extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'onClick'> {
  /** The advertiser whose contact info this is. Optional so callers can
   *  drop the tracked component in unconditionally — when the listing has
   *  no advertiser FK, it renders as a regular <a> and skips the beacon. */
  advertiserId?: string | null
  /** What kind of action is happening. */
  eventType:    ContactEventType
  /** When the link is rendered on a guide listing card / detail page, pass
   *  the listing id so we can attribute by source. Optional. */
  sourceListingId?: string
  /** Optional — usually the current page path. Falls back to window.location
   *  on the client so most callers can skip it. */
  sourcePath?: string
  children: ReactNode
}

function postBeacon(payload: object) {
  if (typeof window === 'undefined') return
  const body = JSON.stringify(payload)
  const url  = '/api/listings/track-contact'
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'text/plain' })
    if (navigator.sendBeacon(url, blob)) return
  }
  // Fallback — keepalive so navigation away (the whole point of these
  // links) doesn't kill the request mid-flight.
  fetch(url, { method: 'POST', body, keepalive: true }).catch(() => {})
}

export function TrackedContactLink({
  advertiserId, eventType, sourceListingId, sourcePath, href, children, ...rest
}: Props) {
  const handleClick = useCallback(() => {
    if (!advertiserId || !href) return
    postBeacon({
      advertiser_id:     advertiserId,
      event_type:        eventType,
      source_listing_id: sourceListingId,
      source_path:       sourcePath ?? (typeof window !== 'undefined' ? window.location.pathname : null),
    })
  }, [advertiserId, eventType, sourceListingId, sourcePath, href])

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
