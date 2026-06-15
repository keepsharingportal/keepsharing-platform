// ── Daily movers digest ──────────────────────────────────────────────────
//
// Compares the LAST FULL DAY of GSC data to the 7-day average that
// preceded it. Surfaces:
//   - clickJumps  : articles whose daily click delta vs avg is biggest
//   - clickDrops  : articles whose clicks tanked
//   - posJumps    : articles where weighted avg position improved most
//   - posDrops    : articles whose weighted avg position dropped most
//
// One-glance "what happened yesterday" digest for the editor, distinct
// from the strategic weekly Claude audit.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface DailyMover {
  pagePath:        string
  articleId?:      string
  title?:          string
  clicksToday:     number
  clicksAvg7d:     number
  clicksDelta:     number    // absolute
  positionToday:   number
  positionAvg7d:   number
  positionDelta:   number    // negative = improved
  impressionsToday: number
}

export interface DailyMoversResult {
  brandSlug:    string | null
  asOfDate:     string | null  // YYYY-MM-DD of the comparison day
  rowsAnalyzed: number
  clickJumps:   DailyMover[]
  clickDrops:   DailyMover[]
  posJumps:     DailyMover[]
  posDrops:     DailyMover[]
}

const MIN_BASELINE_IMP = 30   // ignore noise — article needs a meaningful baseline

export async function buildDailyMovers(
  sb:        SupabaseClient,
  brandSlug: string | null = null,
): Promise<DailyMoversResult> {
  // Determine the most recent date with any rows for this brand —
  // GSC has a 2-3 day reporting lag so "today" is the wrong window.
  let q = sb
    .from('search_console_data')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
  if (brandSlug) q = q.eq('brand_slug', brandSlug)
  const { data: latestRow } = await q
  const asOfDate = (latestRow ?? [])[0]?.date as string | undefined
  if (!asOfDate) {
    return { brandSlug, asOfDate: null, rowsAnalyzed: 0, clickJumps: [], clickDrops: [], posJumps: [], posDrops: [] }
  }

  // Pull the comparison window: 8 days ending at asOfDate. Day 1-7 =
  // baseline, day 8 = comparison.
  const start = new Date(`${asOfDate}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - 7)
  const startDate = start.toISOString().slice(0, 10)

  let pullQ = sb
    .from('search_console_data')
    .select('date, page_url, clicks, impressions, position')
    .gte('date', startDate)
    .lte('date', asOfDate)
    .limit(25000)
  if (brandSlug) pullQ = pullQ.eq('brand_slug', brandSlug)
  const { data: rows } = await pullQ
  const allRows = (rows ?? []) as Array<{ date: string; page_url: string; clicks: number; impressions: number; position: number }>

  type Agg = { clicks: number; impressions: number; pSum: number; pW: number }
  const todayByPage = new Map<string, Agg>()
  const baseByPage  = new Map<string, Agg>()

  for (const r of allRows) {
    const path = toPath(r.page_url)
    if (r.date === asOfDate) {
      const a = todayByPage.get(path) ?? { clicks: 0, impressions: 0, pSum: 0, pW: 0 }
      a.clicks      += r.clicks
      a.impressions += r.impressions
      a.pSum        += r.position * r.impressions
      a.pW          += r.impressions
      todayByPage.set(path, a)
    } else {
      const a = baseByPage.get(path) ?? { clicks: 0, impressions: 0, pSum: 0, pW: 0 }
      a.clicks      += r.clicks
      a.impressions += r.impressions
      a.pSum        += r.position * r.impressions
      a.pW          += r.impressions
      baseByPage.set(path, a)
    }
  }

  const movers: DailyMover[] = []
  // Walk the union of paths so we catch new pages that appeared today
  // and pages that disappeared.
  const allPaths = new Set<string>([...todayByPage.keys(), ...baseByPage.keys()])
  for (const path of allPaths) {
    const today = todayByPage.get(path)
    const base  = baseByPage.get(path)
    const baseImp = base?.impressions ?? 0
    if (baseImp < MIN_BASELINE_IMP && (today?.impressions ?? 0) < MIN_BASELINE_IMP) continue

    const clicksToday = today?.clicks ?? 0
    const clicksAvg   = baseImp > 0 ? (base!.clicks / 7) : 0
    const posToday    = today && today.pW > 0 ? today.pSum / today.pW : 0
    const posAvg      = base  && base.pW  > 0 ? base.pSum  / base.pW  : 0

    movers.push({
      pagePath:         path,
      clicksToday,
      clicksAvg7d:      clicksAvg,
      clicksDelta:      clicksToday - clicksAvg,
      positionToday:    posToday,
      positionAvg7d:    posAvg,
      positionDelta:    posToday - posAvg,
      impressionsToday: today?.impressions ?? 0,
    })
  }

  // Enrich with article titles + IDs for paths we recognize.
  const articleByPath = await loadArticleMeta(sb, Array.from(allPaths))
  for (const m of movers) {
    const a = articleByPath.get(m.pagePath)
    if (a) { m.articleId = a.id; m.title = a.title }
  }

  const clickJumps = [...movers].filter(m => m.clicksDelta > 0).sort((a, b) => b.clicksDelta - a.clicksDelta).slice(0, 10)
  const clickDrops = [...movers].filter(m => m.clicksDelta < 0).sort((a, b) => a.clicksDelta - b.clicksDelta).slice(0, 10)
  const posJumps   = [...movers].filter(m => m.positionDelta <= -2 && m.positionAvg7d > 0)
                                .sort((a, b) => a.positionDelta - b.positionDelta).slice(0, 10)
  const posDrops   = [...movers].filter(m => m.positionDelta >=  2 && m.positionAvg7d > 0)
                                .sort((a, b) => b.positionDelta - a.positionDelta).slice(0, 10)

  return {
    brandSlug,
    asOfDate,
    rowsAnalyzed: allRows.length,
    clickJumps,
    clickDrops,
    posJumps,
    posDrops,
  }
}

function toPath(pageUrl: string): string {
  try { return new URL(pageUrl).pathname.replace(/\/$/, '') } catch { return pageUrl.replace(/\/$/, '') }
}

async function loadArticleMeta(
  sb:    SupabaseClient,
  paths: string[],
): Promise<Map<string, { id: string; title: string }>> {
  const map = new Map<string, { id: string; title: string }>()
  const articleLike = paths.filter(p => /^\/columns\/[^/]+\/[^/]+$/.test(p))
  if (articleLike.length === 0) return map
  const slugs = Array.from(new Set(articleLike.map(p => {
    const m = p.match(/^\/columns\/[^/]+\/([^/]+)$/)
    return m?.[1] ?? ''
  }).filter(Boolean)))
  const { data } = await sb
    .from('guide_articles')
    .select('id, title, slug, column_slug')
    .eq('published', true)
    .in('slug', slugs)
  const rowByKey = new Map<string, { id: string; title: string }>()
  for (const r of (data ?? []) as Array<{ id: string; title: string; slug: string; column_slug: string | null }>) {
    rowByKey.set(`${r.column_slug ?? ''}::${r.slug}`, { id: r.id, title: r.title })
  }
  for (const p of articleLike) {
    const m = p.match(/^\/columns\/([^/]+)\/([^/]+)$/)
    if (!m) continue
    const meta = rowByKey.get(`${m[1]}::${m[2]}`)
    if (meta) map.set(p, meta)
  }
  return map
}
