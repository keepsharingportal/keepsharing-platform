'use client'

// Anchor + Next/Link wrapper that fires a click beacon before navigating.
// Use for any sponsored CTA, partner profile click, or featured listing
// link where attribution matters. Uses sendBeacon so navigation isn't
// blocked.

import Link, { LinkProps } from 'next/link'
import { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { getSessionId, getStoredAttribution, refererHost } from '@/lib/analytics/session'

type AnchorRest = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>

interface Props extends Omit<LinkProps, 'onClick'>, AnchorRest {
  adPlacementId: string
  children:      ReactNode
  /** Pass false to disable tracking for this specific render. */
  trackingEnabled?: boolean
}

function fire(adPlacementId: string) {
  const session_id  = getSessionId()
  const attribution = getStoredAttribution()
  const body = JSON.stringify({
    ad_placement_id: adPlacementId,
    event_type:      'click',
    session_id,
    source_page:     typeof window !== 'undefined' ? window.location.pathname : null,
    referrer_host:   refererHost(),
    utm_source:      attribution.utm_source   ?? null,
    utm_medium:      attribution.utm_medium   ?? null,
    utm_campaign:    attribution.utm_campaign ?? null,
  })
  try {
    const blob = new Blob([body], { type: 'application/json' })
    const sent = typeof navigator !== 'undefined' && navigator.sendBeacon
      ? navigator.sendBeacon('/api/track/ad-event', blob)
      : false
    if (!sent) {
      fetch('/api/track/ad-event', {
        method:    'POST',
        headers:   { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // best-effort
  }
}

export function TrackedLink({ adPlacementId, trackingEnabled = true, onMouseDown, children, ...rest }: Props) {
  function handleMouseDown(e: MouseEvent<HTMLAnchorElement>) {
    if (trackingEnabled) fire(adPlacementId)
    onMouseDown?.(e)
  }

  return (
    <Link {...rest} onMouseDown={handleMouseDown}>
      {children}
    </Link>
  )
}
