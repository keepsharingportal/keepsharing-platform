'use client'

// ViewTracker — fires a single POST to /api/x/v on each pathname change so
// the homepage trending bar + admin analytics surface know what's getting
// traffic. Mounted once in the root layout.
//
// The endpoint URL is deliberately non-obvious (`/api/x/v` rather than
// `/api/analytics/track`) because EasyPrivacy's default block list catches
// the latter — the old endpoint was getting blocked for ~75% of visits,
// silently corrupting every downstream report. The new path slips past
// pattern matchers.
//
// We track on pathname change (not push/replaceState) and we exclude
// admin/api/auth routes server-side, so this stays out of the trending
// signal even when staff are clicking around.
//
// `sendBeacon` is preferred so the request survives navigation away —
// fetch with keepalive is the fallback for older browsers.

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

interface Props {
  /** When the visitor is reading a specific article, pass its id so we
   *  can build per-article popularity views later. Optional. */
  articleId?: string | null
}

const EXCLUDED_PREFIXES = ['/admin', '/api', '/auth', '/_next', '/login', '/signout', '/maintenance']

// Non-obvious endpoint URL — dodges EasyPrivacy & most default ad-blocker
// lists. Old URL stays alive temporarily as a forwarder (see
// /api/analytics/track) so anything cached out there still works.
const ENDPOINT = '/api/x/v'

export function ViewTracker({ articleId = null }: Props) {
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    if (EXCLUDED_PREFIXES.some(p => pathname.startsWith(p))) return

    // Pull UTM params off the current URL so we can credit acquisition.
    // The server also reads the Referer header to capture organic
    // referrer host — those two together cover the entire "where did
    // this reader come from" picture.
    const utm = {
      utm_source:   searchParams?.get('utm_source')   ?? null,
      utm_medium:   searchParams?.get('utm_medium')   ?? null,
      utm_campaign: searchParams?.get('utm_campaign') ?? null,
    }
    const body = JSON.stringify({
      path:       pathname,
      article_id: articleId,
      ...utm,
    })

    try {
      const blob = new Blob([body], { type: 'application/json' })
      if (typeof navigator !== 'undefined' && navigator.sendBeacon?.(ENDPOINT, blob)) {
        return
      }
    } catch {
      // sendBeacon may throw under restrictive policies — fall through.
    }

    // Fallback: keepalive fetch. Swallow errors; tracking is best-effort.
    fetch(ENDPOINT, {
      method:    'POST',
      headers:   { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  }, [pathname, searchParams, articleId])

  return null
}
