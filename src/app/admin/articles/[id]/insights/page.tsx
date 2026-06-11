// ── /admin/articles/[id]/insights ───────────────────────────────────────────
// Per-article search intelligence. Shows the Google Search Console queries
// that land readers on this article, plus a 30-day trend of clicks +
// impressions. Direct input for headline rewrites + follow-up commissions.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Search, Eye } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Article Insights — Admin' }
export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function ArticleInsightsPage({ params }: Props) {
  const { id } = await params
  const sb = createAdminClient()

  const { data: artData } = await sb
    .from('guide_articles')
    .select('id, title, slug, status, view_count, published_at')
    .eq('id', id)
    .maybeSingle()
  const article = artData as {
    id: string; title: string; slug: string; status: string;
    view_count: number | null; published_at: string | null
  } | null

  if (!article) {
    return (
      <div className="p-6 max-w-3xl">
        <p className="text-sm text-portal-muted">Article not found.</p>
      </div>
    )
  }

  // Migration-tolerant probe.
  let gscMigrated = true
  try {
    const probe = await sb.from('search_console_queries').select('id').limit(1)
    if (probe.error && /relation .* does not exist/i.test(probe.error.message)) gscMigrated = false
  } catch { gscMigrated = false }

  if (!gscMigrated) {
    return (
      <Shell article={article}>
        <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
          <strong>Search Console integration not enabled.</strong> Apply migration 149 + connect at <Link href="/admin/integrations/search-console" className="text-portal-blue hover:underline">/admin/integrations/search-console</Link> to see per-article search queries.
        </div>
      </Shell>
    )
  }

  // 30-day window — wide enough for trend, narrow enough for actionable signal.
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 30)
  const sinceDay = since.toISOString().slice(0, 10)

  const { data: qData } = await sb
    .from('search_console_queries')
    .select('query, clicks, impressions, position, day')
    .eq('article_id', id)
    .gte('day', sinceDay)
    .limit(10000)
  const rows = (qData ?? []) as Array<{ query: string; clicks: number; impressions: number; position: number; day: string }>

  const { data: pData } = await sb
    .from('search_console_pages_daily')
    .select('day, clicks, impressions, position, ctr')
    .eq('article_id', id)
    .gte('day', sinceDay)
    .order('day', { ascending: true })
  const dailyRows = (pData ?? []) as Array<{ day: string; clicks: number; impressions: number; position: number; ctr: number }>

  // Roll up queries
  interface RollupRow { query: string; clicks: number; impressions: number; positionSum: number; positionN: number }
  const queryMap = new Map<string, RollupRow>()
  for (const r of rows) {
    const v = queryMap.get(r.query) ?? { query: r.query, clicks: 0, impressions: 0, positionSum: 0, positionN: 0 }
    v.clicks      += r.clicks
    v.impressions += r.impressions
    v.positionSum += r.position
    v.positionN   += 1
    queryMap.set(r.query, v)
  }
  const topQueries = Array.from(queryMap.values()).sort((a, b) => b.clicks - a.clicks).slice(0, 30)

  const totalClicks      = dailyRows.reduce((s, r) => s + r.clicks,      0)
  const totalImpressions = dailyRows.reduce((s, r) => s + r.impressions, 0)
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0
  const avgPosition = dailyRows.length > 0 ? dailyRows.reduce((s, r) => s + r.position, 0) / dailyRows.length : 0

  const maxDayClicks = Math.max(1, ...dailyRows.map(r => r.clicks))

  return (
    <Shell article={article}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Search clicks (30d)" value={totalClicks.toLocaleString()} sub="from Google" />
        <SummaryCard label="Impressions (30d)" value={totalImpressions.toLocaleString()} sub="appearances in SERP" />
        <SummaryCard label="Avg CTR" value={(avgCtr * 100).toFixed(2) + '%'} sub="clicks per impression" />
        <SummaryCard label="Avg position" value={avgPosition.toFixed(1)} sub="ranking across queries" />
      </div>

      {dailyRows.length > 0 && (
        <section className="bg-white border border-portal-border rounded-lg p-5">
          <h3 className="text-sm font-bold text-portal-text mb-3">Daily clicks, last 30 days</h3>
          <div className="flex items-end gap-1 h-24">
            {dailyRows.map(r => (
              <div
                key={r.day}
                className="flex-1 bg-portal-blue min-w-0 hover:bg-portal-blue-dk transition-colors"
                style={{ height: `${(r.clicks / maxDayClicks) * 100}%` }}
                title={`${r.day}: ${r.clicks} clicks · ${r.impressions} impr · pos ${r.position.toFixed(1)}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-portal-muted">
            <span>{dailyRows[0]?.day}</span>
            <span>{dailyRows[dailyRows.length - 1]?.day}</span>
          </div>
        </section>
      )}

      <section className="bg-white border border-portal-border rounded-lg p-5">
        <h3 className="text-sm font-bold text-portal-text mb-3">Queries that land on this article (30d)</h3>
        {topQueries.length === 0 ? (
          <p className="text-xs text-portal-muted">
            No GSC data attributed to this article yet. Either the article hasn&apos;t indexed, or the sync hasn&apos;t run since the article URL was last finalized.
          </p>
        ) : (
          <>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-portal-muted text-left">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Query</th>
                  <th className="pb-2 text-right">Clicks</th>
                  <th className="pb-2 text-right">Impressions</th>
                  <th className="pb-2 text-right">Avg pos.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-portal-border">
                {topQueries.map((q, i) => {
                  const avgPos = q.positionN > 0 ? q.positionSum / q.positionN : 0
                  const ctr = q.impressions > 0 ? q.clicks / q.impressions : 0
                  return (
                    <tr key={q.query}>
                      <td className="py-1.5 text-portal-muted tabular-nums">{i + 1}</td>
                      <td className="py-1.5 text-portal-text">{q.query}</td>
                      <td className="py-1.5 text-right text-portal-blue font-bold tabular-nums">{q.clicks.toLocaleString()}</td>
                      <td className="py-1.5 text-right text-portal-sub tabular-nums">{q.impressions.toLocaleString()}</td>
                      <td className="py-1.5 text-right text-portal-sub tabular-nums" title={`CTR ${(ctr * 100).toFixed(2)}%`}>{avgPos.toFixed(1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="mt-4 text-[11px] text-portal-sub leading-relaxed border-t border-portal-border pt-3">
              <strong>Editorial use.</strong> High impressions + low clicks on a query = consider rewriting the title/meta to better match what searchers want. Queries with strong clicks at position 8+ are quick wins for follow-up articles. Brand-new queries you didn&apos;t expect tell you what topics to commission next.
            </div>
          </>
        )}
      </section>
    </Shell>
  )
}

function Shell({ article, children }: { article: { id: string; title: string; slug: string; status: string; view_count: number | null }; children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href={`/admin/articles/${article.id}/edit`} className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:text-portal-blue-dk mb-1">
          <ArrowLeft size={11} /> Back to editor
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Search size={16} className="text-portal-blue" />
          <h1 className="portal-page-title">Search Insights</h1>
        </div>
        <p className="portal-page-subtitle">{article.title}</p>
      </div>
      <div className="p-6 max-w-5xl space-y-4">
        {children}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">{label}</div>
      <div className="text-2xl font-bold text-portal-text mt-1">{value}</div>
      <div className="text-[11px] text-portal-muted mt-0.5">{sub}</div>
    </div>
  )
}
