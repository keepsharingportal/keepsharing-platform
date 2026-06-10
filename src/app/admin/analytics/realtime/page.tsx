// ── /admin/analytics/realtime ───────────────────────────────────────────────
// Last 60 minutes + last 24 hours. Lets you notice when something is
// going viral, what your social post just shipped is doing right now,
// or whether overnight readers picked up a story.

import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { Zap } from 'lucide-react'

export const metadata: Metadata = { title: 'Real-time — Analytics' }
export const dynamic = 'force-dynamic'
// Lock auto-refresh — server component, re-render on every visit. Page
// fetches fresh data every load. Users wanting live can refresh manually
// or add a meta-refresh below.

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.riverregionparents.com'

export default async function RealtimePage() {
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

  const now = Date.now()
  const since60m = new Date(now - 60   * 60_000).toISOString()
  const since24h = new Date(now - 24 * 60 * 60_000).toISOString()

  const [last60mRes, last24hRes] = await Promise.all([
    supabase.from('page_views').select('path, session_hash, viewed_at')
      .gte('viewed_at', since60m)
      .limit(10_000),
    supabase.from('page_views').select('path, session_hash, viewed_at')
      .gte('viewed_at', since24h)
      .limit(50_000),
  ])

  type Row = { path: string; session_hash: string; viewed_at: string }
  const rows60 = (last60mRes.data ?? []) as Row[]
  const rows24 = (last24hRes.data ?? []) as Row[]

  function topPaths(rows: Row[], n: number) {
    const m = new Map<string, Set<string>>()
    for (const r of rows) {
      let set = m.get(r.path)
      if (!set) { set = new Set(); m.set(r.path, set) }
      set.add(r.session_hash)
    }
    return Array.from(m.entries())
      .map(([path, set]) => ({ path, unique: set.size }))
      .sort((a, b) => b.unique - a.unique)
      .slice(0, n)
  }

  const top60 = topPaths(rows60, 15)
  const top24 = topPaths(rows24, 25)

  const unique60 = new Set(rows60.map(r => r.session_hash)).size
  const unique24 = new Set(rows24.map(r => r.session_hash)).size

  // Per-minute distribution for the last 60 minutes — a tiny live pulse
  // graph so a spike is visible at a glance.
  const minuteBuckets = new Map<number, number>()
  for (const r of rows60) {
    const minute = Math.floor((new Date(r.viewed_at).getTime() - (now - 60 * 60_000)) / 60_000)
    if (minute >= 0 && minute < 60) {
      minuteBuckets.set(minute, (minuteBuckets.get(minute) ?? 0) + 1)
    }
  }
  const buckets = Array.from({ length: 60 }, (_, i) => minuteBuckets.get(i) ?? 0)
  const maxBucket = Math.max(1, ...buckets)

  return (
    <div className="p-6 max-w-6xl space-y-5">
      {/* Auto-refresh banner */}
      <div className="bg-portal-blue-lt border border-portal-blue/30 rounded-lg px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-portal-blue">
          <Zap size={14} className="text-portal-blue" />
          <span><strong>Live snapshot.</strong> Refresh the page to update.</span>
        </div>
        <span className="text-[11px] text-portal-blue/80">
          As of {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* 60-minute pulse */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub">Last 60 minutes</h2>
          <span className="text-sm font-bold text-portal-text tabular-nums">{rows60.length.toLocaleString()} views · {unique60.toLocaleString()} unique</span>
        </div>
        <div className="bg-white border border-portal-border rounded-lg p-5">
          <div className="flex items-end justify-between gap-[2px] h-16">
            {buckets.map((n, i) => (
              <div
                key={i}
                title={`${60 - i} min ago — ${n} views`}
                className="flex-1 bg-portal-blue rounded-t-sm"
                style={{ height: `${(n / maxBucket) * 100}%`, minHeight: n > 0 ? '3px' : '1px', opacity: n > 0 ? 1 : 0.2 }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-portal-muted">
            <span>60 min ago</span>
            <span className="font-semibold text-portal-text">Peak minute: {maxBucket} views</span>
            <span>now</span>
          </div>
        </div>
      </section>

      {/* Top paths in last 60 min */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-3">Most-viewed in last 60 min</h2>
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[2.5rem_1fr_5rem] gap-x-3 items-center px-4 py-2 border-b border-portal-border bg-portal-bg text-[11px] font-semibold text-portal-muted uppercase tracking-wider">
            <div>#</div>
            <div>Path</div>
            <div className="text-right">Unique</div>
          </div>
          <div className="divide-y divide-portal-border">
            {top60.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-portal-muted">Nothing in the last 60 minutes.</div>
            ) : top60.map((r, i) => (
              <div key={r.path} className="grid grid-cols-[2.5rem_1fr_5rem] gap-x-3 items-center px-4 py-2">
                <div className="text-sm font-bold text-portal-muted tabular-nums">{i + 1}</div>
                <div className="min-w-0">
                  <a href={`${SITE_BASE}${r.path}`} target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-portal-text hover:text-portal-blue truncate block">{r.path}</a>
                </div>
                <div className="text-right text-sm tabular-nums font-bold text-portal-blue">{r.unique}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 24-hour top paths */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub">Last 24 hours</h2>
          <span className="text-sm font-bold text-portal-text tabular-nums">{rows24.length.toLocaleString()} views · {unique24.toLocaleString()} unique</span>
        </div>
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[2.5rem_1fr_5rem] gap-x-3 items-center px-4 py-2 border-b border-portal-border bg-portal-bg text-[11px] font-semibold text-portal-muted uppercase tracking-wider">
            <div>#</div>
            <div>Path</div>
            <div className="text-right">Unique</div>
          </div>
          <div className="divide-y divide-portal-border">
            {top24.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-portal-muted">Nothing in the last 24 hours.</div>
            ) : top24.map((r, i) => (
              <div key={r.path} className="grid grid-cols-[2.5rem_1fr_5rem] gap-x-3 items-center px-4 py-2">
                <div className="text-sm font-bold text-portal-muted tabular-nums">{i + 1}</div>
                <div className="min-w-0">
                  <a href={`${SITE_BASE}${r.path}`} target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-portal-text hover:text-portal-blue truncate block">{r.path}</a>
                </div>
                <div className="text-right text-sm tabular-nums font-bold text-portal-blue">{r.unique}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
