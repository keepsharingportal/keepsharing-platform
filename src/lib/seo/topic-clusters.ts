// ── Topic cluster engine ────────────────────────────────────────────────
//
// Groups every published article under the brand's pillars by matching
// the pillar's target_keyword + supporting_keywords against article
// title + focus_keyword + body. Reports per-pillar:
//   - cluster size
//   - aggregate GSC impressions / clicks / avg position
//   - average article SEO score
//   - internal links INTO the cluster (a proxy for cluster authority)
//   - top contributing articles
//
// Reports orphans (articles that match no pillar) so the editor can
// reassign or add a new pillar to capture them.
//
// Topical authority is Google's strongest E-E-A-T signal — they reward
// the site that demonstrably OWNS a topic, not the one that mentions it.

import type { SupabaseClient } from '@supabase/supabase-js'
import { loadBrandProfile, type Pillar } from '@/lib/seo/brand-profile'

export interface ClusterArticle {
  id:           string
  title:        string
  slug:         string
  columnSlug:   string | null
  pagePath:     string
  seoScore:     number | null
  publishedAt:  string | null
  impressions:  number
  clicks:       number
  avgPosition:  number
  /** Strength of match — sum of distinct keyword hits weighted by source
   *  (focus keyword = strongest, title = medium, body = weak). */
  matchStrength: number
}

export interface ClusterReport {
  pillar:           Pillar
  articleCount:     number
  totalImpressions: number
  totalClicks:      number
  avgPosition:      number      // impression-weighted
  avgSeoScore:      number
  internalLinksIn:  number      // links FROM other published articles INTO cluster articles
  topArticles:      ClusterArticle[]
  /** Status grading — drives the dashboard color. */
  healthGrade:      'strong' | 'developing' | 'weak'
  /** One-line recommendation for the editor. */
  recommendation:   string
}

export interface TopicClusterResult {
  brandSlug:     string
  pillars:       ClusterReport[]
  orphans:       ClusterArticle[]
  totalArticles: number
}

const TITLE_WEIGHT          = 3
const FOCUS_KEYWORD_WEIGHT  = 5
const BODY_HIT_WEIGHT       = 1
const MIN_MATCH_TO_INCLUDE  = 2

export async function buildTopicClusters(
  sb:        SupabaseClient,
  brandSlug: string,
): Promise<TopicClusterResult> {
  const profile = await loadBrandProfile(sb, brandSlug)
  if (!profile || profile.pillars.length === 0) {
    return { brandSlug, pillars: [], orphans: [], totalArticles: 0 }
  }

  // Pull the published-articles corpus for this brand.
  const { data: articles } = await sb
    .from('guide_articles')
    .select('id, title, slug, column_slug, body, seo_focus_keyword, seo_score, published_at, brand_slug')
    .eq('published', true)
    .eq('brand_slug', brandSlug)
    .order('published_at', { ascending: false })
    .limit(1000)
  const rows = (articles ?? []) as Array<{
    id: string; title: string; slug: string; column_slug: string | null;
    body: string | null; seo_focus_keyword: string | null; seo_score: number | null;
    published_at: string | null; brand_slug: string | null;
  }>

  // GSC roll-up per article path (last 28d).
  const gscByPath = await loadGscPerPath(sb, brandSlug)

  // Score each article against each pillar.
  type Hit = { pillar: Pillar; strength: number }
  const articleHits = new Map<string, Hit[]>()
  for (const a of rows) {
    const hits: Hit[] = []
    for (const p of profile.pillars) {
      const strength = scoreArticleAgainstPillar(a, p)
      if (strength >= MIN_MATCH_TO_INCLUDE) hits.push({ pillar: p, strength })
    }
    if (hits.length > 0) articleHits.set(a.id, hits)
  }

  // Internal-link map: source article id → set of target paths it links to.
  const internalLinksByPath = countInternalLinks(rows)

  // Assemble per-pillar reports — each article goes to the pillar with
  // the highest match strength.
  const byPillar = new Map<string, ClusterArticle[]>()
  const articleAssignment = new Map<string, string>() // articleId → pillarId
  for (const a of rows) {
    const hits = articleHits.get(a.id)
    if (!hits || hits.length === 0) continue
    hits.sort((x, y) => y.strength - x.strength)
    const winner = hits[0].pillar
    articleAssignment.set(a.id, winner.id)
    const path = `/columns/${a.column_slug}/${a.slug}`
    const gsc  = gscByPath.get(path) ?? { impressions: 0, clicks: 0, avgPosition: 0 }
    const list = byPillar.get(winner.id) ?? []
    list.push({
      id:            a.id,
      title:         a.title,
      slug:          a.slug,
      columnSlug:    a.column_slug,
      pagePath:      path,
      seoScore:      a.seo_score,
      publishedAt:   a.published_at,
      impressions:   gsc.impressions,
      clicks:        gsc.clicks,
      avgPosition:   gsc.avgPosition,
      matchStrength: hits[0].strength,
    })
    byPillar.set(winner.id, list)
  }

  const reports: ClusterReport[] = profile.pillars.map(p => {
    const articles = (byPillar.get(p.id) ?? []).sort((a, b) =>
      (b.impressions - a.impressions) || (b.matchStrength - a.matchStrength)
    )
    const totalImp     = articles.reduce((s, a) => s + a.impressions, 0)
    const totalClicks  = articles.reduce((s, a) => s + a.clicks, 0)
    const posWeight    = articles.reduce((s, a) => s + a.impressions, 0)
    const posSum       = articles.reduce((s, a) => s + a.avgPosition * a.impressions, 0)
    const avgPosition  = posWeight > 0 ? posSum / posWeight : 0
    const scoredArts   = articles.filter(a => typeof a.seoScore === 'number') as Array<ClusterArticle & { seoScore: number }>
    const avgSeoScore  = scoredArts.length === 0 ? 0 : Math.round(scoredArts.reduce((s, a) => s + a.seoScore, 0) / scoredArts.length)

    // Internal links INTO this cluster's articles (from articles NOT in
    // this cluster — self-cluster links would double-count).
    const clusterArticlePaths = new Set(articles.map(a => a.pagePath))
    let internalLinksIn = 0
    for (const [sourceId, targetSet] of internalLinksByPath) {
      if (articleAssignment.get(sourceId) === p.id) continue
      for (const t of targetSet) if (clusterArticlePaths.has(t)) internalLinksIn++
    }

    const { healthGrade, recommendation } = gradeCluster(
      articles.length, totalImp, avgPosition, avgSeoScore, internalLinksIn, p,
    )

    return {
      pillar:           p,
      articleCount:     articles.length,
      totalImpressions: totalImp,
      totalClicks,
      avgPosition,
      avgSeoScore,
      internalLinksIn,
      topArticles:      articles.slice(0, 5),
      healthGrade,
      recommendation,
    }
  })

  // Orphans — articles that matched no pillar at all.
  const orphans: ClusterArticle[] = rows
    .filter(a => !articleHits.has(a.id))
    .map(a => {
      const path = `/columns/${a.column_slug}/${a.slug}`
      const gsc  = gscByPath.get(path) ?? { impressions: 0, clicks: 0, avgPosition: 0 }
      return {
        id:            a.id,
        title:         a.title,
        slug:          a.slug,
        columnSlug:    a.column_slug,
        pagePath:      path,
        seoScore:      a.seo_score,
        publishedAt:   a.published_at,
        impressions:   gsc.impressions,
        clicks:        gsc.clicks,
        avgPosition:   gsc.avgPosition,
        matchStrength: 0,
      }
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 50)

  return {
    brandSlug,
    pillars:       reports,
    orphans,
    totalArticles: rows.length,
  }
}

/** Match strength = focusKw hit × 5 + title hit × 3 + body hit × 1.
 *  Multiple keywords (target + supporting) sum independently. */
function scoreArticleAgainstPillar(
  a: { title: string; body: string | null; seo_focus_keyword: string | null },
  p: Pillar,
): number {
  const title = (a.title ?? '').toLowerCase()
  const body  = (a.body  ?? '').toLowerCase()
  const focus = (a.seo_focus_keyword ?? '').toLowerCase().trim()
  const keywords = [p.target_keyword, ...p.supporting_keywords].map(k => k.toLowerCase().trim()).filter(Boolean)

  let strength = 0
  for (const kw of keywords) {
    if (!kw) continue
    if (focus === kw)         strength += FOCUS_KEYWORD_WEIGHT
    if (title.includes(kw))   strength += TITLE_WEIGHT
    // Body match — count once per keyword, not per occurrence (avoid
    // long articles dominating).
    if (body.includes(kw))    strength += BODY_HIT_WEIGHT
  }
  return strength
}

/** Build articleId → Set<targetPath> map of internal links by scanning
 *  the body for <a href="/columns/..."> patterns. */
function countInternalLinks(
  rows: Array<{ id: string; body: string | null }>,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  const re  = /href="(\/columns\/[^"]+)"/gi
  for (const r of rows) {
    if (!r.body) continue
    const targets = new Set<string>()
    let m: RegExpExecArray | null
    while ((m = re.exec(r.body)) !== null) {
      targets.add(m[1].replace(/\/$/, ''))
    }
    if (targets.size > 0) map.set(r.id, targets)
  }
  return map
}

async function loadGscPerPath(
  sb:        SupabaseClient,
  brandSlug: string,
): Promise<Map<string, { impressions: number; clicks: number; avgPosition: number }>> {
  const since = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10)
  const { data } = await sb
    .from('search_console_data')
    .select('page_url, clicks, impressions, position')
    .eq('brand_slug', brandSlug)
    .gte('date', since)
    .limit(25000)
  type Agg = { clicks: number; impressions: number; pSum: number; pW: number }
  const agg = new Map<string, Agg>()
  for (const r of (data ?? []) as Array<{ page_url: string; clicks: number; impressions: number; position: number }>) {
    const path = toPath(r.page_url)
    const a = agg.get(path) ?? { clicks: 0, impressions: 0, pSum: 0, pW: 0 }
    a.clicks      += r.clicks
    a.impressions += r.impressions
    a.pSum        += r.position * r.impressions
    a.pW          += r.impressions
    agg.set(path, a)
  }
  const out = new Map<string, { impressions: number; clicks: number; avgPosition: number }>()
  for (const [path, v] of agg) {
    out.set(path, {
      impressions: v.impressions,
      clicks:      v.clicks,
      avgPosition: v.pW > 0 ? v.pSum / v.pW : 0,
    })
  }
  return out
}

function toPath(pageUrl: string): string {
  try { return new URL(pageUrl).pathname.replace(/\/$/, '') } catch { return pageUrl.replace(/\/$/, '') }
}

/** Grade the cluster + emit a one-line recommendation. Heuristic but
 *  catches the obvious "needs work" patterns. */
function gradeCluster(
  count:           number,
  totalImp:        number,
  avgPos:          number,
  avgSeoScore:     number,
  internalLinks:   number,
  pillar:          Pillar,
): { healthGrade: 'strong' | 'developing' | 'weak'; recommendation: string } {
  // Bare pillar — no articles at all.
  if (count === 0) {
    return {
      healthGrade:    'weak',
      recommendation: `Write a pillar page targeting "${pillar.target_keyword}" + 3-5 supporting articles. Cluster has zero coverage today.`,
    }
  }
  // Strong — meaningful corpus + page-1 avg + linked.
  if (count >= 8 && avgPos > 0 && avgPos <= 10 && internalLinks >= count) {
    return {
      healthGrade:    'strong',
      recommendation: `Keep publishing supporting content. Consider a "best of" pillar page if one doesn't exist.`,
    }
  }
  // Developing — has volume but ranking room.
  if (count >= 4 && (avgPos > 10 || internalLinks < count)) {
    const parts: string[] = []
    if (avgPos > 10)               parts.push(`avg position is ${avgPos.toFixed(1)} — needs more internal links pointing in`)
    if (internalLinks < count)     parts.push(`only ${internalLinks} internal links into a ${count}-article cluster — add 2-3 per article from sibling pieces`)
    if (avgSeoScore < 70)          parts.push(`avg article score ${avgSeoScore} — tune focus keyword + meta on the weakest pieces first`)
    return {
      healthGrade:    'developing',
      recommendation: parts.join('; ') + '.',
    }
  }
  // Weak — small or low-traffic.
  const parts: string[] = []
  if (count < 4)                   parts.push(`only ${count} article${count === 1 ? '' : 's'} — needs 4-8 more to demonstrate authority`)
  if (totalImp < 200)              parts.push(`thin GSC signal — verify the pillar's target_keyword actually matches search demand in your market`)
  return {
    healthGrade:    'weak',
    recommendation: parts.join('; ') + '.',
  }
}
