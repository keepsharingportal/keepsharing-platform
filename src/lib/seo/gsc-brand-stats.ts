// ── Per-brand GSC roll-ups for the SEO dashboard ──────────────────────────
//
// Aggregates search_console_data for one brand across a window and
// returns:
//   - daily totals (impressions, clicks, avgPos) for a sparkline-style chart
//   - top 30-day movers (queries with the biggest position improvement)
//   - top 30-day losers (queries that dropped)
//   - biggest opportunities (queries on page 2 with the most impressions)
//
// Computed off the same search_console_data table the weekly audit
// reads — one source of truth.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface DailyTotals {
  date:        string   // YYYY-MM-DD
  clicks:      number
  impressions: number
  avgPosition: number
}

export interface QueryMover {
  query:           string
  previousPos:     number
  currentPos:      number
  deltaPos:        number   // negative = improved (lower position number = better)
  impressionsNow:  number
  clicksNow:       number
  topPagePath?:    string
  topArticleId?:   string
}

export interface BrandStatsResult {
  brandSlug:       string
  windowDays:      number
  comparedAgainst: number   // size of the comparison window for movers
  totals: {
    impressions:   number
    clicks:        number
    avgPosition:   number
    ctr:           number   // clicks / impressions
  }
  totalsPrev: {
    impressions:   number
    clicks:        number
    avgPosition:   number
    ctr:           number
  }
  daily:           DailyTotals[]
  movers:          QueryMover[]
  losers:          QueryMover[]
  opportunities:   QueryMover[]
}

const MOVERS_LIMIT     = 15
const OPPS_LIMIT       = 15
const MIN_QUERY_IMPRESSIONS_NOW = 50   // ignore noise

export async function buildBrandGscStats(
  sb:         SupabaseClient,
  brandSlug:  string,
  windowDays: number = 28,
): Promise<BrandStatsResult> {
  const now      = Date.now()
  const startCur = isoDate(now - windowDays      * 86400000)
  const endCur   = isoDate(now)
  const startPrv = isoDate(now - 2 * windowDays * 86400000)
  const endPrv   = isoDate(now - windowDays      * 86400000)

  const { data: curRows } = await sb
    .from('search_console_data')
    .select('date, query, page_url, clicks, impressions, position')
    .eq('brand_slug', brandSlug)
    .gte('date', startCur)
    .lte('date', endCur)
    .limit(25000)
  const { data: prvRows } = await sb
    .from('search_console_data')
    .select('query, clicks, impressions, position')
    .eq('brand_slug', brandSlug)
    .gte('date', startPrv)
    .lt ('date', startCur)
    .limit(25000)

  const cur = (curRows ?? []) as Array<{
    date: string; query: string; page_url: string;
    clicks: number; impressions: number; position: number
  }>
  const prv = (prvRows ?? []) as Array<{
    query: string; clicks: number; impressions: number; position: number
  }>

  // Roll up the current window per-day for the chart, and per-query
  // for the movers list.
  const byDay = new Map<string, { c: number; i: number; pSum: number; pW: number }>()
  type QAgg = { clicks: number; impressions: number; pSum: number; pW: number; topUrl?: string; topImp?: number }
  const byQuery = new Map<string, QAgg>()
  const byQueryPage = new Map<string, { url: string; imp: number }>()

  for (const r of cur) {
    const d = byDay.get(r.date) ?? { c: 0, i: 0, pSum: 0, pW: 0 }
    d.c += r.clicks
    d.i += r.impressions
    d.pSum += r.position * r.impressions
    d.pW   += r.impressions
    byDay.set(r.date, d)

    const q = byQuery.get(r.query) ?? { clicks: 0, impressions: 0, pSum: 0, pW: 0 }
    q.clicks      += r.clicks
    q.impressions += r.impressions
    q.pSum        += r.position * r.impressions
    q.pW          += r.impressions
    byQuery.set(r.query, q)

    // Track which page owns the most impressions for this query.
    const k = `${r.query}::${r.page_url}`
    const slot = byQueryPage.get(k) ?? { url: r.page_url, imp: 0 }
    slot.imp += r.impressions
    byQueryPage.set(k, slot)
  }
  // Resolve top page per query.
  const topPagePerQuery = new Map<string, string>()
  for (const [k, v] of byQueryPage) {
    const [query] = k.split('::')
    const cur = topPagePerQuery.get(query)
    if (!cur) { topPagePerQuery.set(query, v.url); continue }
    const curImp = byQueryPage.get(`${query}::${cur}`)?.imp ?? 0
    if (v.imp > curImp) topPagePerQuery.set(query, v.url)
  }

  const daily: DailyTotals[] = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      clicks:      v.c,
      impressions: v.i,
      avgPosition: v.pW > 0 ? v.pSum / v.pW : 0,
    }))

  // Build prev-window per-query.
  const byQueryPrev = new Map<string, QAgg>()
  for (const r of prv) {
    const q = byQueryPrev.get(r.query) ?? { clicks: 0, impressions: 0, pSum: 0, pW: 0 }
    q.clicks      += r.clicks
    q.impressions += r.impressions
    q.pSum        += r.position * r.impressions
    q.pW          += r.impressions
    byQueryPrev.set(r.query, q)
  }

  // Compose movers — queries where avgPos improved by ≥3 positions and
  // current impressions clear the noise floor.
  const moverRows: QueryMover[] = []
  for (const [query, qNow] of byQuery) {
    if (qNow.impressions < MIN_QUERY_IMPRESSIONS_NOW) continue
    const qPrev = byQueryPrev.get(query)
    if (!qPrev || qPrev.pW === 0) continue
    const posNow  = qNow.pSum  / qNow.pW
    const posPrev = qPrev.pSum / qPrev.pW
    const delta   = posNow - posPrev
    moverRows.push({
      query,
      previousPos:    posPrev,
      currentPos:     posNow,
      deltaPos:       delta,
      impressionsNow: qNow.impressions,
      clicksNow:      qNow.clicks,
      topPagePath:    topPagePerQuery.get(query),
    })
  }

  // Opportunities — queries on page 2 (pos 11-20) with the most
  // impressions in the current window.
  const opps: QueryMover[] = []
  for (const [query, q] of byQuery) {
    if (q.impressions < MIN_QUERY_IMPRESSIONS_NOW) continue
    if (q.pW === 0) continue
    const pos = q.pSum / q.pW
    if (pos >= 11 && pos <= 20) {
      opps.push({
        query,
        previousPos:    0,
        currentPos:     pos,
        deltaPos:       0,
        impressionsNow: q.impressions,
        clicksNow:      q.clicks,
        topPagePath:    topPagePerQuery.get(query),
      })
    }
  }

  // Resolve article IDs for top pages (for both movers + opportunities)
  const allPaths = new Set<string>()
  for (const m of moverRows) if (m.topPagePath) allPaths.add(toPath(m.topPagePath))
  for (const m of opps)      if (m.topPagePath) allPaths.add(toPath(m.topPagePath))
  const articleByPath = await resolveArticleIds(sb, Array.from(allPaths))
  for (const m of moverRows) if (m.topPagePath) {
    m.topPagePath  = toPath(m.topPagePath)
    m.topArticleId = articleByPath.get(m.topPagePath)
  }
  for (const m of opps) if (m.topPagePath) {
    m.topPagePath  = toPath(m.topPagePath)
    m.topArticleId = articleByPath.get(m.topPagePath)
  }

  const winners = [...moverRows].filter(m => m.deltaPos <= -3).sort((a, b) => a.deltaPos - b.deltaPos).slice(0, MOVERS_LIMIT)
  const losers  = [...moverRows].filter(m => m.deltaPos >=  3).sort((a, b) => b.deltaPos - a.deltaPos).slice(0, MOVERS_LIMIT)
  const oppsTop = opps.sort((a, b) => b.impressionsNow - a.impressionsNow).slice(0, OPPS_LIMIT)

  // Totals (current + prev).
  const totalsCur = aggregateTotals(cur)
  const totalsPrv = aggregateTotals(prv.map(r => ({ ...r, date: '', page_url: '' }) as unknown as typeof cur[number]))

  return {
    brandSlug,
    windowDays,
    comparedAgainst: windowDays,
    totals:        totalsCur,
    totalsPrev:    totalsPrv,
    daily,
    movers:        winners,
    losers,
    opportunities: oppsTop,
  }
}

function aggregateTotals(rows: Array<{ clicks: number; impressions: number; position: number }>) {
  let c = 0, i = 0, pSum = 0, pW = 0
  for (const r of rows) {
    c += r.clicks
    i += r.impressions
    pSum += r.position * r.impressions
    pW   += r.impressions
  }
  return {
    impressions: i,
    clicks:      c,
    avgPosition: pW > 0 ? pSum / pW : 0,
    ctr:         i > 0 ? c / i : 0,
  }
}

async function resolveArticleIds(sb: SupabaseClient, paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const articleLike = paths.filter(p => /^\/columns\/[^/]+\/[^/]+$/.test(p))
  if (articleLike.length === 0) return map
  const slugs = Array.from(new Set(articleLike.map(p => {
    const m = p.match(/^\/columns\/[^/]+\/([^/]+)$/)
    return m?.[1] ?? ''
  }).filter(Boolean)))
  const { data } = await sb
    .from('guide_articles')
    .select('id, slug, column_slug')
    .eq('published', true)
    .in('slug', slugs)
  const rowByKey = new Map<string, string>()
  for (const r of (data ?? []) as Array<{ id: string; slug: string; column_slug: string | null }>) {
    rowByKey.set(`${r.column_slug ?? ''}::${r.slug}`, r.id)
  }
  for (const p of articleLike) {
    const m = p.match(/^\/columns\/([^/]+)\/([^/]+)$/)
    if (!m) continue
    const id = rowByKey.get(`${m[1]}::${m[2]}`)
    if (id) map.set(p, id)
  }
  return map
}

function toPath(pageUrl: string): string {
  try { return new URL(pageUrl).pathname.replace(/\/$/, '') } catch { return pageUrl.replace(/\/$/, '') }
}
function isoDate(ts: number): string { return new Date(ts).toISOString().slice(0, 10) }
