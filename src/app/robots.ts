// ── robots.txt — Next.js conventional metadata route ────────────────────────
//
// Lets every well-behaved crawler index the public site; blocks the admin,
// API, and auth flows. Sitemap URL pointer included so Google finds the
// sitemap without us having to submit it manually.

import type { MetadataRoute } from 'next'
import { loadBrandContext } from '@/lib/brand-context'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const ctx = await loadBrandContext()
  return {
    rules: [
      {
        userAgent: '*',
        allow:     '/',
        disallow:  [
          '/admin',
          '/admin/',
          '/api',
          '/api/',
          '/auth',
          '/login',
          '/onboard',
          '/proposal',
          '/renew',
          '/update',
          '/r/',         // share-redirect tokens
        ],
      },
    ],
    sitemap: [
      `${ctx.publicOrigin}/sitemap.xml`,
      `${ctx.publicOrigin}/news-sitemap.xml`,
    ],
  }
}
