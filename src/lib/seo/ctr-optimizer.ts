// ── CTR optimizer ───────────────────────────────────────────────────────
//
// Identifies articles that earn lots of impressions but few clicks.
// Symptom: the title or meta description isn't compelling enough — the
// article is RANKING fine, it's just not winning the click in the SERP.
//
// Method: pull last 28 days, aggregate per article, compare actual CTR
// to the position-expected CTR (rough curve from CTR studies). Flag
// articles where actual CTR is meaningfully BELOW expected for their
// position. Those are titles + meta descriptions ripe for a rewrite.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface CtrFinding {
  pagePath:        string
  articleId?:      string
  title?:          string
  brandSlug?:      string | null
  impressions:     number
  clicks:          number
  ctr:             number
  expectedCtr:     number
  ctrDeficit:      number    // positive number = how many points below expected
  avgPosition:     number
}

export interface CtrOptimizerResult {
  brandSlug:        string | null
  windowDays:       number
  totalArticles:    number
  worstPerformers:  CtrFinding[]
  bestPerformers:   CtrFinding[]
}

/** Rough industry-average CTR curve by position. Sourced from
 *  aggregated studies (Backlinko, Advanced Web Ranking). Articles
 *  below this curve are leaving clicks on the table. */
function expectedCtrFor(position: number): number {
  if (position <= 1)  return 0.275
  if (position <= 2)  return 0.155
  if (position <= 3)  return 0.110
  if (position <= 4)  return 0.080
  if (position <= 5)  return 0.060
  if (position <= 6)  return 0.045
  if (position <= 7)  return 0.035
  if (position <= 8)  return 0.030
  if (position <= 9)  return 0.025
  if (position <= 10) return 0.020
  if (position <= 15) return 0.015
  if (position <= 20) return 0.010
  if (position <= 30) return 0.007
  return 0.004
}

const MIN_IMPRESSIONS = 200    // noise floor — below this CTR is too jumpy

export async function findCtrUnderperformers(
  sb:         SupabaseClient,
  brandSlug:  string | null = null,
  windowDays: number = 28,
): Promise<CtrOptimizerResult> {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10)

  let q = sb
    .from('search_console_data')
    .select('page_url, clicks, impressions, position, brand_slug')
    .gte('date', since)
    .limit(25000)
  if (brandSlug) q = q.eq('brand_slug', brandSlug)

  const { data } = await q
  const rows = (data ?? []) as Array<{ page_url: string; clicks: number; impressions: number; position: number; brand_slug: string | null }>

  type Agg = { clicks: number; impressions: number; pSum: number; pW: number; brand: string | null }
  const byPath = new Map<string, Agg>()
  for (const r of rows) {
    const path = toPath(r.page_url)
    const a = byPath.get(path) ?? { clicks: 0, impressions: 0, pSum: 0, pW: 0, brand: r.brand_slug }
    a.clicks      += r.clicks
    a.impressions += r.impressions
    a.pSum        += r.position * r.impressions
    a.pW          += r.impressions
    byPath.set(path, a)
  }

  // Resolve article metadata for paths we recognize.
  const articleByPath = await loadArticleMeta(sb, Array.from(byPath.keys()))

  const findings: CtrFinding[] = []
  for (const [path, a] of byPath) {
    if (a.impressions < MIN_IMPRESSIONS) continue
    const ctr      = a.clicks / a.impressions
    const pos      = a.pW > 0 ? a.pSum / a.pW : 0
    if (pos <= 0) continue
    const expected = expectedCtrFor(pos)
    const deficit  = expected - ctr
    const meta     = articleByPath.get(path)
    findings.push({
      pagePath:    path,
      articleId:   meta?.id,
      title:       meta?.title,
      brandSlug:   a.brand,
      impressions: a.impressions,
      clicks:      a.clicks,
      ctr,
      expectedCtr: expected,
      ctrDeficit:  deficit,
      avgPosition: pos,
    })
  }

  // Worst = positive deficit (under-performing), highest deficit first.
  const worst = findings
    .filter(f => f.ctrDeficit > 0.005)   // need ≥0.5pt deficit to be actionable
    .sort((a, b) => {
      // Weight by impressions so a 5pt deficit on a 5000-imp article
      // beats a 10pt deficit on a 200-imp article.
      const aLeverage = a.ctrDeficit * a.impressions
      const bLeverage = b.ctrDeficit * b.impressions
      return bLeverage - aLeverage
    })
    .slice(0, 20)

  // Best = negative deficit (out-performing) — gives the editor a
  // reference for titles/descriptions worth modeling.
  const best  = findings
    .filter(f => f.ctrDeficit < -0.01)
    .sort((a, b) => a.ctrDeficit - b.ctrDeficit)
    .slice(0, 10)

  return {
    brandSlug,
    windowDays,
    totalArticles:   findings.length,
    worstPerformers: worst,
    bestPerformers:  best,
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
