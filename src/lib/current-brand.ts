// The active brand for the current public request, without the brand_voice
// DB hit that loadBrandContext() does.
//
// loadBrandContext() is the full object — market metadata, voice, canonical
// origin — and most pages want that. This is the one-line version for code
// that only needs "which brand is this request for?", notably the ad server,
// which runs on every public page and has no use for voice rules.
//
// Server-only: it reads the x-brand-slug header the proxy stamps. Calling it
// opts the caller into dynamic rendering, which is correct — a page whose
// content differs per brand must not be served from a path-keyed ISR cache
// shared across brands.

import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { MARKETS } from './markets'

const DEFAULT_BRAND = 'rrp'

/**
 * Brand slug for this request, or 'rrp' when the header is missing or
 * unrecognized (single-domain deploys, direct localhost hits).
 *
 * Returns null — rather than throwing — when called outside a request scope,
 * e.g. from a build-time render or a background job. Callers decide what an
 * unknown brand means; for ad serving it means "house ads only", which is the
 * safe answer: better to show no advertiser than the wrong market's.
 */
export const currentBrandSlug = cache(async (): Promise<string | null> => {
  try {
    const h = await headers()
    const stamped = h.get('x-brand-slug')
    if (stamped && MARKETS.some(m => m.slug === stamped)) return stamped
    return DEFAULT_BRAND
  } catch {
    // No request scope (build-time render, cron, script).
    return null
  }
})
