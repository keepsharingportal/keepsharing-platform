// ── /admin/analytics/pages ──────────────────────────────────────────────────
// Site-wide top pages report. Aggregates page_views by path within the
// selected date range, sorted by unique visitors (session_hash distinct).

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, BarChart3, ExternalLink } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseRange, rangeToTimestamps } from '@/lib/admin/date-range'
import { AdminDateRangeBar } from '@/components/admin/AdminDateRangeBar'

export const metadata: Metadata = { title: 'Top Pages — Analytics' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ since?: string; until?: string }>
}

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.riverregionparents.com'

export default async function TopPagesReport({ searchParams }: PageProps) {
  const range = parseRange(await searchParams)
  const { sinceTs, untilTs } = rangeToTimestamps(range)

  const supabase = createAdminClient()

  // Probe — graceful if migration 118 hasn't run.
  const probe = await supabase.from('page_views').select('id').limit(1)
  if (probe.error) {
    return (
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="bg-white border-b border-portal-border px-6 py-4">
          <Link href="/admin/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-portal-sub hover:text-portal-text mb-2">
            <ArrowLeft size={12} /> Analytics
          </Link>
          <h1 className="portal-page-title">Top pages</h1>
        </div>
        <div className="p-6 max-w-3xl">
          <div className="rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
            <p className="text-sm font-bold text-portal-amber mb-1">Migration needed</p>
            <p className="text-sm text-portal-amber leading-relaxed">
              Apply <code className="bg-portal-amber-lt px-1 rounded">supabase/migrations/118_page_views.sql</code> in the Supabase SQL editor.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Pull raw page_views rows in the range — Supabase doesn't expose
  // GROUP BY directly via the typed client, so we aggregate in JS. The
  // recent index makes the time-bounded scan cheap, and at 50k visits/
  // month the in-memory bucket map is fine. Page through with a limit so
  // pathological ranges don't OOM.
  const { data: rows } = await supabase
    .from('page_views')
    .select('path, session_hash')
    .gte('viewed_at', sinceTs)
    .lte('viewed_at', untilTs)
    .limit(100_000)

  interface Stat { path: string; views: number; uniqueVisitors: Set<string> }
  const byPath = new Map<string, Stat>()
  for (const r of (rows ?? []) as Array<{ path: string; session_hash: string }>) {
    let stat = byPath.get(r.path)
    if (!stat) { stat = { path: r.path, views: 0, uniqueVisitors: new Set() }; byPath.set(r.path, stat) }
    stat.views++
    stat.uniqueVisitors.add(r.session_hash)
  }
  const ranked = Array.from(byPath.values())
    .sort((a, b) => b.uniqueVisitors.size - a.uniqueVisitors.size || b.views - a.views)
    .slice(0, 100)

  const totalViews   = (rows ?? []).length
  const totalUnique  = new Set((rows ?? []).map(r => r.session_hash)).size
  const distinctPaths = byPath.size

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-portal-sub hover:text-portal-text mb-2">
          <ArrowLeft size={12} /> Analytics
        </Link>
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-portal-blue" />
          <h1 className="portal-page-title">Top pages</h1>
        </div>
        <p className="portal-page-subtitle">
          Most-visited pages site-wide. Unique visitors are deduped by daily-rolling session hash.
        </p>
      </div>

      <div className="p-6 max-w-5xl space-y-5">
        <AdminDateRangeBar since={range.since} until={range.until} />

        {/* Totals strip */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Unique visitors"  value={totalUnique.toLocaleString()} />
          <Stat label="Page views"       value={totalViews.toLocaleString()} />
          <Stat label="Distinct pages"   value={distinctPaths.toLocaleString()} />
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg border border-portal-border overflow-hidden">
          <div className="grid grid-cols-[2.5rem_1fr_7rem_5.5rem] gap-x-4 items-center px-4 py-2 border-b border-portal-border bg-portal-bg text-[11px] font-semibold text-portal-muted uppercase tracking-wider">
            <div>#</div>
            <div>Path</div>
            <div className="text-right">Unique</div>
            <div className="text-right">Views</div>
          </div>
          <div className="divide-y divide-portal-border">
            {ranked.map((s, i) => (
              <div key={s.path} className="grid grid-cols-[2.5rem_1fr_7rem_5.5rem] gap-x-4 items-center px-4 py-2.5 hover:bg-portal-bg/60">
                <div className="text-sm font-bold text-portal-muted tabular-nums">{i + 1}</div>
                <div className="min-w-0 flex items-center gap-2">
                  <a
                    href={`${SITE_BASE}${s.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-portal-text hover:text-portal-blue truncate font-mono"
                    title={s.path}
                  >
                    {s.path}
                  </a>
                  <ExternalLink size={10} className="text-portal-muted shrink-0" />
                </div>
                <div className="text-right text-sm tabular-nums text-portal-blue font-semibold">{s.uniqueVisitors.size.toLocaleString()}</div>
                <div className="text-right text-sm tabular-nums text-portal-sub">{s.views.toLocaleString()}</div>
              </div>
            ))}
            {ranked.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-portal-muted">No page views in this range.</div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-portal-muted leading-relaxed">
          Dedup window is 30 minutes — same session viewing the same page twice within 30 minutes counts once.
          Admin / API / auth paths are excluded at the tracker.
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-portal-border rounded-lg px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted">{label}</p>
      <p className="text-2xl font-bold text-portal-text mt-1 tabular-nums">{value}</p>
    </div>
  )
}
