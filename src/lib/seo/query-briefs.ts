// ── GSC query → content brief suggestions ──────────────────────────────
//
// Reads the last 28 days of search_console_data and produces two
// flavors of editorial briefs:
//
//   "improve":  query is already ranked on an existing article but
//               at position 11-20. Concrete edit lever — strengthen
//               the H2, add the focus keyword to the first paragraph,
//               add internal links pointing to it.
//
//   "write":    query has impressions across the property but doesn't
//               map cleanly to any one article (no single page owns it).
//               That's a content gap — propose a new article angled at
//               this query.
//
// Both surface in /admin/seo/query-briefs so the editor can convert
// any brief into an editorial action.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface QueryBrief {
  kind:         'improve' | 'write'
  query:        string
  impressions:  number
  clicks:       number
  avgPosition:  number   // weighted by impressions
  topPageUrl?:  string   // only for 'improve'
  topPagePath?: string
  topArticleId?: string  // matched from path
  // For 'write' briefs we also list the candidate URLs that show up
  // but don't dominate — gives the editor sense of where it's bleeding.
  candidates?:  Array<{ pageUrl: string; impressions: number; position: number }>
}

export interface BriefsResult {
  brandSlug:        string | null
  windowDays:       number
  improveBriefs:    QueryBrief[]
  writeBriefs:      QueryBrief[]
  rowsAnalyzed:     number
  queriesAnalyzed:  number
}

/** Build briefs for one brand (or null = all brands). */
export async function buildQueryBriefs(
  sb:        SupabaseClient,
  brandSlug: string | null,
  windowDays: number = 28,
): Promise<BriefsResult> {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10)

  let q = sb
    .from('search_console_data')
    .select('query, page_url, clicks, impressions, position, brand_slug')
    .gte('date', since)
    .limit(25000)
  if (brandSlug) q = q.eq('brand_slug', brandSlug)

  const { data } = await q
  const rows = (data ?? []) as Array<{
    query:        string
    page_url:     string
    clicks:       number
    impressions:  number
    position:     number
    brand_slug:   string | null
  }>

  // Build per-(query, page) aggregates so we can reason about which
  // page owns the query and at what position.
  type PageAgg = { impressions: number; clicks: number; posSum: number; posWeight: number }
  const byQuery = new Map<string, Map<string, PageAgg>>()
  for (const r of rows) {
    const q  = (r.query ?? '').trim()
    if (!q) continue
    const u  = canonicalPath(r.page_url)
    let pages = byQuery.get(q)
    if (!pages) { pages = new Map(); byQuery.set(q, pages) }
    const a = pages.get(u) ?? { impressions: 0, clicks: 0, posSum: 0, posWeight: 0 }
    a.impressions += r.impressions
    a.clicks      += r.clicks
    a.posSum      += r.position * r.impressions
    a.posWeight   += r.impressions
    pages.set(u, a)
  }

  // Resolve top page per query → article. We need an article-path map
  // so we can link "improve" briefs straight to the editor.
  const allPaths = new Set<string>()
  for (const pages of byQuery.values()) for (const p of pages.keys()) allPaths.add(p)
  const articleByPath = await loadArticleIdsByPath(sb, Array.from(allPaths))

  const improveBriefs: QueryBrief[] = []
  const writeBriefs:   QueryBrief[] = []

  for (const [query, pages] of byQuery) {
    let totalImpressions = 0
    let totalClicks      = 0
    let posSumQ          = 0
    const ranked: Array<{ url: string; agg: PageAgg }> = []
    for (const [url, agg] of pages) {
      totalImpressions += agg.impressions
      totalClicks      += agg.clicks
      posSumQ          += agg.posSum
      ranked.push({ url, agg })
    }
    if (totalImpressions < 25) continue   // noise floor

    ranked.sort((a, b) => b.agg.impressions - a.agg.impressions)
    const top = ranked[0]
    const topPos = top.agg.posWeight > 0 ? top.agg.posSum / top.agg.posWeight : 0
    const avgPos = posSumQ / totalImpressions

    const topShare = top.agg.impressions / totalImpressions

    // Improve: top page owns ≥60% of the query's impressions AND sits
    // page-2 (11-20). That's the textbook "one well-placed edit can
    // lift it to page 1" lever.
    if (topShare >= 0.6 && topPos >= 11 && topPos <= 20) {
      improveBriefs.push({
        kind:        'improve',
        query,
        impressions: totalImpressions,
        clicks:      totalClicks,
        avgPosition: topPos,
        topPageUrl:  top.url,
        topPagePath: top.url,
        topArticleId: articleByPath.get(top.url) ?? undefined,
      })
      continue
    }

    // Write: no page owns the query (top share < 40%) but it's
    // bringing measurable impressions. The site is scattering attention
    // across the query — consolidating with a single targeted article
    // wins.
    if (topShare < 0.4 && totalImpressions >= 100) {
      writeBriefs.push({
        kind:        'write',
        query,
        impressions: totalImpressions,
        clicks:      totalClicks,
        avgPosition: avgPos,
        candidates:  ranked.slice(0, 4).map(r => ({
          pageUrl:     r.url,
          impressions: r.agg.impressions,
          position:    r.agg.posWeight > 0 ? r.agg.posSum / r.agg.posWeight : 0,
        })),
      })
    }
  }

  // Highest-impression, lowest-effort first.
  improveBriefs.sort((a, b) => b.impressions - a.impressions)
  writeBriefs.sort  ((a, b) => b.impressions - a.impressions)

  return {
    brandSlug,
    windowDays,
    improveBriefs: improveBriefs.slice(0, 40),
    writeBriefs:   writeBriefs.slice(0, 40),
    rowsAnalyzed:  rows.length,
    queriesAnalyzed: byQuery.size,
  }
}

function canonicalPath(pageUrl: string): string {
  try {
    return new URL(pageUrl).pathname.replace(/\/$/, '')
  } catch {
    return pageUrl.replace(/\/$/, '')
  }
}

/** Map /columns/<col>/<slug> path → guide_articles.id when the article
 *  exists. Other paths (static hubs, listings) return undefined. */
async function loadArticleIdsByPath(
  sb:    SupabaseClient,
  paths: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  // Only article-shaped paths can map to a row.
  const articleLike = paths.filter(p => /^\/columns\/[^/]+\/[^/]+$/.test(p))
  if (articleLike.length === 0) return map

  // Build a (column, slug) → path lookup so we can hit the DB once.
  const colSlugPairs = articleLike.map(p => {
    const m = p.match(/^\/columns\/([^/]+)\/([^/]+)$/)!
    return { col: m[1], slug: m[2], path: p }
  })
  const slugs = Array.from(new Set(colSlugPairs.map(c => c.slug)))
  const { data } = await sb
    .from('guide_articles')
    .select('id, slug, column_slug')
    .eq('published', true)
    .in('slug', slugs)
  const rowByKey = new Map<string, string>()
  for (const r of (data ?? []) as Array<{ id: string; slug: string; column_slug: string | null }>) {
    rowByKey.set(`${r.column_slug ?? ''}::${r.slug}`, r.id)
  }
  for (const p of colSlugPairs) {
    const id = rowByKey.get(`${p.col}::${p.slug}`)
    if (id) map.set(p.path, id)
  }
  return map
}
