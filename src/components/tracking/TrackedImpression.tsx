'use client'

// Wraps an ad/sponsor element and fires a single impression beacon when
// at least 50% of it is on screen for 1 second. Idempotency is enforced
// by the DB (30-min dedup per session per placement).
//
//   <TrackedImpression adPlacementId={x}>
//     <SponsorCard ... />
//   </TrackedImpression>

import { ReactNode, useEffect, useRef, useState } from 'react'
import { getSessionId, getStoredAttribution, refererHost } from '@/lib/analytics/session'

interface Props {
  adPlacementId: string
  children:      ReactNode
  /** Override CSS — by default we render an inline-block wrapper. */
  className?:    string
  /** Minimum visible fraction (0-1). Default 0.5. */
  threshold?:    number
  /** How long must be visible before firing (ms). Default 1000. */
  minVisibleMs?: number
}

export function TrackedImpression({
  adPlacementId,
  children,
  className,
  threshold    = 0.5,
  minVisibleMs = 1000,
}: Props) {
  const ref       = useRef<HTMLDivElement | null>(null)
  const [fired, setFired] = useState(false)

  useEffect(() => {
    if (fired || !ref.current || typeof IntersectionObserver === 'undefined') return
    const el      = ref.current
    let timer:    ReturnType<typeof setTimeout> | null = null

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          if (timer) continue
          timer = setTimeout(() => {
            fire()
            observer.disconnect()
            timer = null
          }, minVisibleMs)
        } else if (timer) {
          clearTimeout(timer)
          timer = null
        }
      }
    }, { threshold: [0, threshold, 1] })

    observer.observe(el)
    return () => { if (timer) clearTimeout(timer); observer.disconnect() }

    function fire() {
      if (fired) return
      setFired(true)
      const session_id  = getSessionId()
      const attribution = getStoredAttribution()
      const body = JSON.stringify({
        ad_placement_id: adPlacementId,
        event_type:      'impression',
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
  }, [adPlacementId, fired, threshold, minVisibleMs])

  return (
    <div ref={ref} className={className} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
