'use client'

// Fires a single article-view beacon after the article has been on screen
// for ~3 seconds. Matches the dedup pattern of TrackedImpression — the DB
// RPC also dedupes per (session, article) within 30 minutes, so even if a
// reader bounces back and forth between articles we don't inflate counts.
//
// Reads the first-touch UTM cookie (set by the proxy on the very first
// visit with utm_* params) so we know "this reader originally arrived from
// the magazine via QR." That attribution carries through every page they
// read in this session.

import { useEffect, useRef } from 'react'
import { getSessionId, getStoredAttribution, refererHost } from '@/lib/analytics/session'

interface Props {
  articleId: string
  delayMs?: number
}

export function TrackArticleView({ articleId, delayMs = 3000 }: Props) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    const timer = setTimeout(() => {
      if (fired.current) return
      fired.current = true

      const attribution = getStoredAttribution()
      const body = JSON.stringify({
        article_id:    articleId,
        session_id:    getSessionId(),
        source_page:   typeof window !== 'undefined' ? window.location.pathname : null,
        referrer_host: refererHost(),
        utm_source:    attribution.utm_source   ?? null,
        utm_medium:    attribution.utm_medium   ?? null,
        utm_campaign:  attribution.utm_campaign ?? null,
      })

      try {
        const blob = new Blob([body], { type: 'application/json' })
        const sent = typeof navigator !== 'undefined' && navigator.sendBeacon
          ? navigator.sendBeacon('/api/track/article-view', blob)
          : false
        if (!sent) {
          fetch('/api/track/article-view', {
            method:    'POST',
            headers:   { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          }).catch(() => {})
        }
      } catch {
        // best-effort
      }
    }, delayMs)

    return () => clearTimeout(timer)
  }, [articleId, delayMs])

  return null
}
