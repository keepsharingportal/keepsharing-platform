'use client'

// Drops a single "I saw this article" beacon when an article page mounts.
// Idempotency lives in the DB (30-min dedup window per session), so
// strict-mode double-mounts and prefetch races don't double-count.

import { useEffect } from 'react'
import { getSessionId, getStoredAttribution, refererHost } from '@/lib/analytics/session'

export function ArticleViewBeacon({ articleId }: { articleId: string }) {
  useEffect(() => {
    const session_id = getSessionId()
    if (!session_id) return

    const attribution = getStoredAttribution()
    const payload = JSON.stringify({
      article_id:    articleId,
      session_id,
      source_page:   typeof window !== 'undefined' ? window.location.pathname : null,
      referrer_host: refererHost(),
      utm_source:    attribution.utm_source   ?? null,
      utm_medium:    attribution.utm_medium   ?? null,
      utm_campaign:  attribution.utm_campaign ?? null,
    })

    // sendBeacon doesn't block navigation and survives unload. Fall back
    // to fetch keepalive for the rare browser that misbehaves.
    try {
      const blob = new Blob([payload], { type: 'application/json' })
      const sent = typeof navigator !== 'undefined' && navigator.sendBeacon
        ? navigator.sendBeacon('/api/track/article-view', blob)
        : false
      if (!sent) {
        fetch('/api/track/article-view', {
          method:    'POST',
          headers:   { 'Content-Type': 'application/json' },
          body:      payload,
          keepalive: true,
        }).catch(() => { /* tracking is best-effort */ })
      }
    } catch {
      // Beacon may throw in some private-mode contexts; ignore.
    }
  }, [articleId])

  return null
}
