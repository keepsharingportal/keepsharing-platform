'use client'

// ViewTracker — fires a single POST to /api/analytics/track on each
// pathname change so the homepage trending bar can surface what's
// actually getting traffic. Mounted once in the root layout.
//
// We track on pathname change (not push/replaceState) and we exclude
// admin/api/auth routes server-side, so this stays out of the trending
// signal even when staff are clicking around.
//
// `sendBeacon` is preferred so the request survives navigation away —
// fetch with keepalive is the fallback for older browsers.

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface Props {
  /** When the visitor is reading a specific article, pass its id so we
   *  can build per-article popularity views later. Optional. */
  articleId?: string | null
}

const EXCLUDED_PREFIXES = ['/admin', '/api', '/auth', '/_next', '/login', '/signout', '/maintenance']

export function ViewTracker({ articleId = null }: Props) {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    if (EXCLUDED_PREFIXES.some(p => pathname.startsWith(p))) return

    const body = JSON.stringify({ path: pathname, article_id: articleId })

    try {
      const blob = new Blob([body], { type: 'application/json' })
      if (typeof navigator !== 'undefined' && navigator.sendBeacon?.('/api/analytics/track', blob)) {
        return
      }
    } catch {
      // sendBeacon may throw under restrictive policies — fall through.
    }

    // Fallback: keepalive fetch. Swallow errors; tracking is best-effort.
    fetch('/api/analytics/track', {
      method:    'POST',
      headers:   { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  }, [pathname, articleId])

  return null
}
