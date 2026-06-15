// ── Article-level GSC roll-up ────────────────────────────────────────────
//
// Reads last 28 days of search_console_data for ONE article URL +
// returns the top queries driving impressions, with position + CTR.
// Lets the article SEO editor show "what's actually working" so
// editors prioritize from data, not gut.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ArticleQueryRow {
  query:       string
  clicks:      number
  impressions: number
  avgPosition: number
  ctr:         number
}

export interface ArticleGscSummary {
  pagePath:    string
  windowDays:  number
  totals: {
    clicks:      number
    impressions: number
    avgPosition: number
    ctr:         number
  }
  topQueries:  ArticleQueryRow[]
  /** Queries where this article ranks page-2 — the highest-leverage
   *  edits start here. */
  pageTwoQueries: ArticleQueryRow[]
}

/** Build the per-article GSC summary keyed by /columns/<col>/<slug>
 *  pathname match against search_console_data.page_url. */
export async function loadArticleGsc(
  sb:        SupabaseClient,
  pagePath:  string,
  windowDays: number = 28,
): Promise<ArticleGscSummary> {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10)

  // We can't filter by pathname in SQL without a generated column, so
  // we pull a window of rows from the brand-wide window and post-
  // filter. Brand-keyed scan would be better but brand_slug isn't on
  // the article here.
  const { data } = await sb
    .from('search_console_data')
    .select('query, page_url, clicks, impressions, position')
    .gte('date', since)
    .limit(25000)

  const wantPath = pagePath.replace(/\/$/, '')
  const rows = ((data ?? []) as Array<{
    query: string; page_url: string; clicks: number; impressions: number; position: number
  }>).filter(r => {
    try { return new URL(r.page_url).pathname.replace(/\/$/, '') === wantPath } catch { return r.page_url === pagePath }
  })

  type Agg = { clicks: number; impressions: number; pSum: number; pW: number }
  const byQuery = new Map<string, Agg>()
  let totalClicks = 0, totalImpressions = 0, totalPosSum = 0, totalPosW = 0
  for (const r of rows) {
    const a = byQuery.get(r.query) ?? { clicks: 0, impressions: 0, pSum: 0, pW: 0 }
    a.clicks      += r.clicks
    a.impressions += r.impressions
    a.pSum        += r.position * r.impressions
    a.pW          += r.impressions
    byQuery.set(r.query, a)
    totalClicks      += r.clicks
    totalImpressions += r.impressions
    totalPosSum      += r.position * r.impressions
    totalPosW        += r.impressions
  }

  const queries: ArticleQueryRow[] = Array.from(byQuery.entries())
    .map(([query, a]) => ({
      query,
      clicks:      a.clicks,
      impressions: a.impressions,
      avgPosition: a.pW > 0 ? a.pSum / a.pW : 0,
      ctr:         a.impressions > 0 ? a.clicks / a.impressions : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions)

  return {
    pagePath:    wantPath,
    windowDays,
    totals: {
      clicks:      totalClicks,
      impressions: totalImpressions,
      avgPosition: totalPosW > 0 ? totalPosSum / totalPosW : 0,
      ctr:         totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    },
    topQueries:     queries.slice(0, 20),
    pageTwoQueries: queries.filter(q => q.avgPosition >= 11 && q.avgPosition <= 20).slice(0, 10),
  }
}
