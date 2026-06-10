// ── /admin/analytics/articles ───────────────────────────────────────────────
// Top published articles by views within the selected date range. Joins
// article_views to guide_articles so we display real titles instead of
// raw IDs.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Newspaper, ExternalLink } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseRange, rangeToTimestamps } from '@/lib/admin/date-range'
import { AdminDateRangeBar } from '@/components/admin/AdminDateRangeBar'

export const metadata: Metadata = { title: 'Top Articles — Analytics' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ since?: string; until?: string }>
}

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.riverregionparents.com'

export default async function TopArticlesReport({ searchParams }: PageProps) {
  const range = parseRange(await searchParams)
  const { sinceTs, untilTs } = rangeToTimestamps(range)

  const supabase = createAdminClient()

  // Probe — graceful if migration 071 hasn't run.
  const probe = await supabase.from('article_views').select('id').limit(1)
  if (probe.error) {
    return (
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="bg-white border-b border-portal-border px-6 py-4">
          <Link href="/admin/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-portal-sub hover:text-portal-text mb-2">
            <ArrowLeft size={12} /> Analytics
          </Link>
          <h1 className="portal-page-title">Top articles</h1>
        </div>
        <div className="p-6 max-w-3xl">
          <div className="rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
            <p className="text-sm font-bold text-portal-amber mb-1">Migration needed</p>
            <p className="text-sm text-portal-amber leading-relaxed">
              Apply <code className="bg-portal-amber-lt px-1 rounded">supabase/migrations/071_analytics_foundation.sql</code> in the Supabase SQL editor.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Pull raw rows in range and aggregate in JS — same pattern as Top Pages.
  // Limit guards against pathological date ranges; we surface the leaderboard's
  // top 100 anyway.
  const { data: viewsRows } = await supabase
    .from('article_views')
    .select('article_id, session_id')
    .gte('viewed_at', sinceTs)
    .lte('viewed_at', untilTs)
    .limit(100_000)

  interface Stat { article_id: string; views: number; uniqueVisitors: Set<string> }
  const byArticle = new Map<string, Stat>()
  for (const r of (viewsRows ?? []) as Array<{ article_id: string; session_id: string }>) {
    let stat = byArticle.get(r.article_id)
    if (!stat) { stat = { article_id: r.article_id, views: 0, uniqueVisitors: new Set() }; byArticle.set(r.article_id, stat) }
    stat.views++
    stat.uniqueVisitors.add(r.session_id)
  }
  const rankedIds = Array.from(byArticle.values())
    .sort((a, b) => b.uniqueVisitors.size - a.uniqueVisitors.size || b.views - a.views)
    .slice(0, 100)

  // Title lookup in a single batch.
  const titleMap = new Map<string, { title: string; slug: string; column_slug: string | null; guide_slug: string | null }>()
  if (rankedIds.length > 0) {
    const { data: artRows } = await supabase
      .from('guide_articles')
      .select('id, title, slug, column_slug, guide_slug')
      .in('id', rankedIds.map(s => s.article_id))
    for (const row of (artRows ?? []) as Array<{ id: string; title: string; slug: string; column_slug: string | null; guide_slug: string | null }>) {
      titleMap.set(row.id, { title: row.title, slug: row.slug, column_slug: row.column_slug, guide_slug: row.guide_slug })
    }
  }

  // Compose final rows. Drop rows we can't resolve to a title (article
  // was trashed since the view) — the leaderboard would just be noise.
  const ranked = rankedIds
    .map(s => ({ ...s, meta: titleMap.get(s.article_id) }))
    .filter(r => !!r.meta) as Array<Stat & { meta: { title: string; slug: string; column_slug: string | null; guide_slug: string | null } }>

  const totalViews   = (viewsRows ?? []).length
  const totalUnique  = new Set((viewsRows ?? []).map(r => r.session_id)).size
  const distinctArt  = byArticle.size

  function articleUrl(meta: { slug: string; column_slug: string | null; guide_slug: string | null }) {
    if (meta.column_slug) return `${SITE_BASE}/columns/${meta.column_slug}/${meta.slug}`
    if (meta.guide_slug)  return `${SITE_BASE}/${meta.guide_slug}/${meta.slug}`
    return `${SITE_BASE}/articles/${meta.slug}`
  }

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-portal-sub hover:text-portal-text mb-2">
          <ArrowLeft size={12} /> Analytics
        </Link>
        <div className="flex items-center gap-2">
          <Newspaper size={18} className="text-portal-blue" />
          <h1 className="portal-page-title">Top articles</h1>
        </div>
        <p className="portal-page-subtitle">
          Most-viewed published articles in the selected range. Use this to decide what to commission more of.
        </p>
      </div>

      <div className="p-6 max-w-5xl space-y-5">
        <AdminDateRangeBar since={range.since} until={range.until} />

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Unique readers"  value={totalUnique.toLocaleString()} />
          <Stat label="Total views"      value={totalViews.toLocaleString()} />
          <Stat label="Distinct articles" value={distinctArt.toLocaleString()} />
        </div>

        <div className="bg-white rounded-lg border border-portal-border overflow-hidden">
          <div className="grid grid-cols-[2.5rem_1fr_8rem_7rem_5.5rem] gap-x-4 items-center px-4 py-2 border-b border-portal-border bg-portal-bg text-[11px] font-semibold text-portal-muted uppercase tracking-wider">
            <div>#</div>
            <div>Article</div>
            <div>Column / Guide</div>
            <div className="text-right">Unique</div>
            <div className="text-right">Views</div>
          </div>
          <div className="divide-y divide-portal-border">
            {ranked.map((s, i) => (
              <div key={s.article_id} className="grid grid-cols-[2.5rem_1fr_8rem_7rem_5.5rem] gap-x-4 items-center px-4 py-2.5 hover:bg-portal-bg/60">
                <div className="text-sm font-bold text-portal-muted tabular-nums">{i + 1}</div>
                <div className="min-w-0 flex items-center gap-2">
                  <Link
                    href={`/admin/articles/${s.article_id}/edit`}
                    className="text-sm font-semibold text-portal-text hover:text-portal-blue truncate"
                    title={s.meta.title}
                  >
                    {s.meta.title}
                  </Link>
                  <a
                    href={articleUrl(s.meta)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-portal-muted hover:text-portal-blue shrink-0"
                    title="Open public article"
                  >
                    <ExternalLink size={10} />
                  </a>
                </div>
                <div className="text-xs text-portal-sub truncate">{s.meta.column_slug ?? s.meta.guide_slug ?? '—'}</div>
                <div className="text-right text-sm tabular-nums text-portal-blue font-semibold">{s.uniqueVisitors.size.toLocaleString()}</div>
                <div className="text-right text-sm tabular-nums text-portal-sub">{s.views.toLocaleString()}</div>
              </div>
            ))}
            {ranked.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-portal-muted">No article views in this range.</div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-portal-muted leading-relaxed">
          Dedup window is 30 minutes per (article, session). Trashed/unpublished articles are filtered out — they wouldn&apos;t link anywhere useful.
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
