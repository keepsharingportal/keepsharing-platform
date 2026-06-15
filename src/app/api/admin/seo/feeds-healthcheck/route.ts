// GET /api/admin/seo/feeds-healthcheck
//
// Fetches THIS deployment's own sitemap.xml / news-sitemap.xml / feed.xml /
// image-sitemap.xml endpoints and reports on health. Catches regressions
// where a schema migration silently drops every published row (the exact
// failure mode we hit with the published-vs-status column rename).
//
// Each check returns:
//   { url, status, entryCount, ok, sample, error? }
//
// The UI shows green when status=200 + entryCount > 0; red otherwise.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { loadBrandContext } from '@/lib/brand-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface FeedCheck {
  feed:       'sitemap' | 'news-sitemap' | 'image-sitemap' | 'feed'
  url:        string
  status:     number
  entryCount: number
  ok:         boolean
  sample?:    string
  error?:     string
}

export async function GET() {
  await requireAdmin()
  const ctx = await loadBrandContext()
  const origin = ctx.publicOrigin

  const checks: Array<{ feed: FeedCheck['feed']; path: string; locTag: RegExp }> = [
    { feed: 'sitemap',       path: '/sitemap.xml',       locTag: /<loc>([^<]+)<\/loc>/g },
    { feed: 'news-sitemap',  path: '/news-sitemap.xml',  locTag: /<loc>([^<]+)<\/loc>/g },
    { feed: 'image-sitemap', path: '/image-sitemap.xml', locTag: /<image:loc>([^<]+)<\/image:loc>/g },
    { feed: 'feed',          path: '/feed.xml',          locTag: /<item>/g },
  ]

  const results: FeedCheck[] = await Promise.all(
    checks.map(async (c): Promise<FeedCheck> => {
      const url = `${origin}${c.path}`
      try {
        const res = await fetch(url, { cache: 'no-store' })
        const body = await res.text()
        const matches = body.match(c.locTag) ?? []
        const sample = (() => {
          const m = c.locTag.exec(body)
          if (!m) {
            // exec keeps state across .match; reset by re-running.
            const fresh = body.match(c.locTag)
            return fresh && fresh[0] ? fresh[0] : undefined
          }
          return m[1]
        })()
        return {
          feed:       c.feed,
          url,
          status:     res.status,
          entryCount: matches.length,
          ok:         res.status === 200 && matches.length > 0,
          sample:     sample ?? undefined,
        }
      } catch (e) {
        return {
          feed:       c.feed,
          url,
          status:     0,
          entryCount: 0,
          ok:         false,
          error:      e instanceof Error ? e.message : String(e),
        }
      }
    })
  )

  const allOk = results.every(r => r.ok)
  return NextResponse.json({ ok: allOk, ranAt: new Date().toISOString(), results })
}
