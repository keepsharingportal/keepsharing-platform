// ── /admin/analytics/landings ───────────────────────────────────────────────
// "Where do readers FIRST land?" — the entry pages that pull people in
// from search, social, and links. Distinct from Content (which is
// article-level) — this is about landing surfaces: guide hubs, section
// indexes, the homepage, calendar, school zone, etc.
//
// We filter out articles (Content covers them), listings (they don't
// belong in editorial reports — see trending-bar filter rationale), and
// admin/api/auth paths. Result: just the curated landing surfaces.

import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseRange } from '@/lib/admin/date-range'
import { rangeToTs, withPriorPeriod, computeChange, formatPctChange } from '@/lib/admin/period-compare'
import { AdminDateRangeBar } from '@/components/admin/AdminDateRangeBar'
import { StatWithChange } from '@/components/admin/StatWithChange'

export const metadata: Metadata = { title: 'Landings — Analytics' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ since?: string; until?: string }>
}

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.riverregionparents.com'

// Same defense-in-depth rules as the trending bar: kill listings + article
// URL shapes + admin + index pages too vague to be promotable.
function isLandingPage(path: string): boolean {
  if (!path) return false
  // Exclusions
  if (path === '/thank-you') return false
  if (path.startsWith('/admin') || path.startsWith('/api') || path.startsWith('/auth')) return false
  if (path.startsWith('/_next') || path.startsWith('/login') || path.startsWith('/signout')) return false
  if (path.startsWith('/maintenance')) return false
  if (path.startsWith('/submit')) return false
  // Listings
  if (path.startsWith('/guide/')) return false
  if (path.includes('/listings/'))  return false
  // Article URL shapes — Content tab owns these
  if (path.startsWith('/columns/'))  return false
  if (path.startsWith('/articles/')) return false
  return true
}

export default async function LandingsPage({ searchParams }: PageProps) {
  const current = parseRange(await searchParams)
  const ranges  = withPriorPeriod(current)
  const supabase = createAdminClient()

  const probe = await supabase.from('page_views').select('id').limit(1)
  if (probe.error) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
          <p className="text-sm font-bold text-portal-amber">Apply migration 118_page_views.sql first.</p>
        </div>
      </div>
    )
  }

  // Pull current + prior in parallel.
  const [curRes, priRes] = await Promise.all([
    supabase.from('page_views').select('path, session_hash')
      .gte('viewed_at', rangeToTs(ranges.current).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.current).untilTs)
      .limit(100_000),
    supabase.from('page_views').select('path, session_hash')
      .gte('viewed_at', rangeToTs(ranges.prior).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.prior).untilTs)
      .limit(100_000),
  ])

  type Row = { path: string; session_hash: string }
  const curRows = ((curRes.data ?? []) as Row[]).filter(r => isLandingPage(r.path))
  const priRows = ((priRes.data ?? []) as Row[]).filter(r => isLandingPage(r.path))

  // Defense in depth — exclude advertiser slugs as final segments.
  const { data: advRows } = await supabase
    .from('advertiser_accounts')
    .select('slug')
    .not('slug', 'is', null)
  const advSlugs = new Set<string>()
  for (const row of (advRows ?? []) as Array<{ slug: string | null }>) {
    if (row.slug) advSlugs.add(row.slug.toLowerCase())
  }
  function notAdvertiser(path: string): boolean {
    const lastSeg = path.replace(/\/$/, '').split('/').pop() ?? ''
    return !advSlugs.has(lastSeg.toLowerCase())
  }
  const curClean = curRows.filter(r => notAdvertiser(r.path))
  const priClean = priRows.filter(r => notAdvertiser(r.path))

  // Roll up per-path uniques + views.
  type Stat = { path: string; uniques: number; views: number }
  function rollup(rows: Row[]): Map<string, { uniques: Set<string>; views: number }> {
    const m = new Map<string, { uniques: Set<string>; views: number }>()
    for (const r of rows) {
      let s = m.get(r.path)
      if (!s) { s = { uniques: new Set(), views: 0 }; m.set(r.path, s) }
      s.uniques.add(r.session_hash)
      s.views++
    }
    return m
  }
  const curMap = rollup(curClean)
  const priMap = rollup(priClean)

  const rows: Array<Stat & { prior: number }> = Array.from(curMap.entries())
    .map(([path, s]) => ({
      path, uniques: s.uniques.size, views: s.views,
      prior: (priMap.get(path)?.uniques.size) ?? 0,
    }))
    .sort((a, b) => b.uniques - a.uniques)
    .slice(0, 100)

  const totalUnique = new Set(curClean.map(r => r.session_hash)).size
  const totalViews  = curClean.length
  const priorTotalUnique = new Set(priClean.map(r => r.session_hash)).size

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <AdminDateRangeBar since={ranges.current.since} until={ranges.current.until} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatWithChange
          label="Landing visitors"
          value={totalUnique}
          change={computeChange(totalUnique, priorTotalUnique)}
          sublabel="Hit at least one landing surface"
        />
        <StatWithChange
          label="Landing page views"
          value={totalViews}
          hideChange
        />
        <StatWithChange
          label="Distinct landings"
          value={curMap.size}
          hideChange
        />
      </div>

      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2.5rem_1fr_6rem_5rem_6rem] gap-x-4 items-center px-4 py-2 border-b border-portal-border bg-portal-bg text-[11px] font-semibold text-portal-muted uppercase tracking-wider">
          <div>#</div>
          <div>Path</div>
          <div className="text-right">Current</div>
          <div className="text-right">Prior</div>
          <div className="text-right">Change</div>
        </div>
        <div className="divide-y divide-portal-border">
          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-portal-muted">No landing-page visits in this period.</div>
          ) : rows.map((r, i) => {
            const ch = computeChange(r.uniques, r.prior)
            const f  = formatPctChange(ch)
            return (
              <div key={r.path} className="grid grid-cols-[2.5rem_1fr_6rem_5rem_6rem] gap-x-4 items-center px-4 py-2.5 hover:bg-portal-bg/60">
                <div className="text-sm font-bold text-portal-muted tabular-nums">{i + 1}</div>
                <div className="min-w-0">
                  <a
                    href={`${SITE_BASE}${r.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-portal-text hover:text-portal-blue truncate block"
                    title={r.path}
                  >
                    {r.path}
                  </a>
                </div>
                <div className="text-right text-sm tabular-nums font-semibold text-portal-blue">{r.uniques.toLocaleString()}</div>
                <div className="text-right text-sm tabular-nums text-portal-muted">{r.prior.toLocaleString()}</div>
                <div className={`text-right text-xs font-semibold ${f.tone === 'up' ? 'text-portal-green' : f.tone === 'down' ? 'text-portal-red' : f.tone === 'new' ? 'text-portal-blue' : 'text-portal-muted'}`}>
                  {f.text}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-[11px] text-portal-muted leading-relaxed">
        <strong>What this excludes.</strong> Articles (see <a href="/admin/analytics/content" className="text-portal-blue hover:underline">Content</a>), advertiser listings (their own report, plus they shouldn&apos;t inflate editorial signals), and admin/api/auth paths. What remains: guide hubs, section indexes, the homepage, calendar, school zone, and other landing surfaces.
      </p>
    </div>
  )
}
