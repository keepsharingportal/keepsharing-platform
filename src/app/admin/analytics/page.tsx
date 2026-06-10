// ── /admin/analytics ────────────────────────────────────────────────────────
// Overview — the morning dashboard. Every number compares the current
// period against the prior period of equal length, so you see momentum
// not just snapshots.

import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseRange } from '@/lib/admin/date-range'
import { rangeToTs, withPriorPeriod, computeChange } from '@/lib/admin/period-compare'
import { AdminDateRangeBar } from '@/components/admin/AdminDateRangeBar'
import { StatWithChange } from '@/components/admin/StatWithChange'
import { TopMovers } from './_components/TopMovers'

export const metadata: Metadata = { title: 'Analytics Overview — Admin' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ since?: string; until?: string }>
}

export default async function AnalyticsOverview({ searchParams }: PageProps) {
  const current = parseRange(await searchParams)
  const ranges  = withPriorPeriod(current)
  const supabase = createAdminClient()

  const probe = await supabase.from('page_views').select('id').limit(1)
  if (probe.error) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
          <p className="text-sm font-bold text-portal-amber mb-1">Migrations needed</p>
          <p className="text-sm text-portal-amber leading-relaxed">
            Apply <code className="bg-portal-amber-lt px-1 rounded">118_page_views.sql</code> and <code className="bg-portal-amber-lt px-1 rounded">146_page_views_attribution.sql</code> to enable analytics.
          </p>
        </div>
      </div>
    )
  }

  // Pull current + prior windows in parallel. Each pulls just the columns
  // we need for the aggregations — keeps the wire weight tight.
  const [curRes, priRes, curArticleRes, priArticleRes, curTapsRes, priTapsRes, curMsgRes, priMsgRes] = await Promise.all([
    supabase.from('page_views').select('session_hash, path, article_id', { count: 'exact' })
      .gte('viewed_at', rangeToTs(ranges.current).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.current).untilTs)
      .limit(100_000),
    supabase.from('page_views').select('session_hash, path', { count: 'exact' })
      .gte('viewed_at', rangeToTs(ranges.prior).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.prior).untilTs)
      .limit(100_000),
    supabase.from('article_views').select('article_id, session_id', { count: 'exact' })
      .gte('viewed_at', rangeToTs(ranges.current).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.current).untilTs)
      .limit(100_000),
    supabase.from('article_views').select('article_id', { count: 'exact' })
      .gte('viewed_at', rangeToTs(ranges.prior).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.prior).untilTs)
      .limit(100_000),
    supabase.from('listing_contact_events').select('id', { count: 'exact', head: true })
      .gte('occurred_at', rangeToTs(ranges.current).sinceTs)
      .lte('occurred_at', rangeToTs(ranges.current).untilTs),
    supabase.from('listing_contact_events').select('id', { count: 'exact', head: true })
      .gte('occurred_at', rangeToTs(ranges.prior).sinceTs)
      .lte('occurred_at', rangeToTs(ranges.prior).untilTs),
    supabase.from('listing_messages').select('id', { count: 'exact', head: true })
      .gte('created_at', rangeToTs(ranges.current).sinceTs)
      .lte('created_at', rangeToTs(ranges.current).untilTs),
    supabase.from('listing_messages').select('id', { count: 'exact', head: true })
      .gte('created_at', rangeToTs(ranges.prior).sinceTs)
      .lte('created_at', rangeToTs(ranges.prior).untilTs),
  ])

  // Roll up unique visitors per window.
  const curRows = (curRes.data ?? []) as Array<{ session_hash: string; path: string; article_id: string | null }>
  const priRows = (priRes.data ?? []) as Array<{ session_hash: string; path: string }>
  const curArtRows = (curArticleRes.data ?? []) as Array<{ article_id: string; session_id: string }>

  const curUnique  = new Set(curRows.map(r => r.session_hash)).size
  const priUnique  = new Set(priRows.map(r => r.session_hash)).size
  const curViews   = curRes.count ?? 0
  const priViews   = priRes.count ?? 0
  const curArticle = curArticleRes.count ?? 0
  const priArticle = priArticleRes.count ?? 0
  const curArticleReaders = new Set(curArtRows.map(r => r.session_id)).size
  const curTaps    = curTapsRes.count   ?? 0
  const priTaps    = priTapsRes.count   ?? 0
  const curMsgs    = curMsgRes.count    ?? 0
  const priMsgs    = priMsgRes.count    ?? 0

  // Conversion rates — taps + messages relative to article readers (the
  // population that engaged with content). Article readers is a better
  // denominator than total visitors because bouncers couldn't convert.
  const curConvRate = curArticleReaders > 0 ? ((curTaps + curMsgs) / curArticleReaders) * 100 : 0

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <AdminDateRangeBar since={ranges.current.since} until={ranges.current.until} />

      <p className="text-[11px] text-portal-muted">
        Comparing <strong className="text-portal-text">{ranges.current.since} → {ranges.current.until}</strong>
        {' '}against the prior <strong className="text-portal-text">{ranges.prior.since} → {ranges.prior.until}</strong> ({ranges.current.days} days).
      </p>

      {/* Hero row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatWithChange
          label="Unique visitors"
          value={curUnique}
          change={computeChange(curUnique, priUnique)}
          sublabel="Distinct daily sessions"
        />
        <StatWithChange
          label="Page views"
          value={curViews}
          change={computeChange(curViews, priViews)}
          sublabel="Total site-wide"
        />
        <StatWithChange
          label="Article reads"
          value={curArticle}
          change={computeChange(curArticle, priArticle)}
          sublabel="Editorial engagement"
        />
        <StatWithChange
          label="Reader conversions"
          value={`${curConvRate.toFixed(1)}%`}
          change={computeChange(curTaps + curMsgs, priTaps + priMsgs)}
          sublabel={`${(curTaps + curMsgs).toLocaleString()} taps + inquiries`}
        />
      </div>

      {/* Top movers — articles that gained or lost the most week-over-week.
          Computed client-side from the same rows we already loaded above
          so we don't pay for an extra round-trip. */}
      <TopMovers
        currentRows={curArtRows}
        priorWindowStart={rangeToTs(ranges.prior).sinceTs}
        priorWindowEnd={rangeToTs(ranges.prior).untilTs}
      />

      <p className="text-[11px] text-portal-muted leading-relaxed">
        <strong>Methodology.</strong> Visitors are deduped by daily-rolling session hash from page_views — a returning reader on day 2 counts as new on that day. Article reads come from a separate tracker with 30-day-stable localStorage session IDs, so article counts will look higher per reader than page counts.{' '}
        <strong>About prior data:</strong> if the platform launched recently or this is your first month, prior-period numbers may be small and percent changes may show as <em>NEW</em> until the next full cycle.
      </p>
    </div>
  )
}
