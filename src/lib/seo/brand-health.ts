// ── Per-brand SEO health score ──────────────────────────────────────────────
//
// One number per brand summarizing on-site SEO quality. Components:
//   - Average seo_score across published articles (0-100)         × 0.40
//   - % of articles with seo_focus_keyword set                     × 0.20
//   - % of articles with seo_description set                       × 0.15
//   - % of articles with hero_image_url set                        × 0.10
//   - Recency factor (% of last 30 days that published something)  × 0.15
//
// Surfaces alongside per-brand audit cards so the editor knows where
// each brand stands before opening the full audit.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface BrandHealth {
  brandSlug:                  string
  score:                      number   // 0-100
  grade:                      'excellent' | 'good' | 'needs-work' | 'poor'
  publishedArticles:          number
  avgArticleScore:            number
  withFocusKeywordPct:        number
  withDescriptionPct:         number
  withHeroImagePct:           number
  recencyPct:                 number
}

const W_AVG_SCORE   = 0.40
const W_FOCUS_KW    = 0.20
const W_DESC        = 0.15
const W_HERO        = 0.10
const W_RECENCY     = 0.15

export async function computeBrandHealth(
  sb: SupabaseClient,
  brandSlug: string,
): Promise<BrandHealth> {
  // Pull a representative window — last 200 published articles for
  // this brand. The brand_slug filter assumes guide_articles carries
  // it; if a brand has zero scoped articles we still emit a row with
  // sensible defaults.
  const { data: arts } = await sb
    .from('guide_articles')
    .select('seo_score, seo_focus_keyword, seo_description, hero_image_url, published_at')
    .eq('published', true)
    .eq('brand_slug', brandSlug)
    .order('published_at', { ascending: false })
    .limit(200)

  const rows = arts ?? []
  const n = rows.length

  if (n === 0) {
    return {
      brandSlug,
      score: 0, grade: 'poor',
      publishedArticles: 0,
      avgArticleScore:   0,
      withFocusKeywordPct: 0,
      withDescriptionPct:  0,
      withHeroImagePct:    0,
      recencyPct:          0,
    }
  }

  const scored      = rows.filter(r => typeof r.seo_score === 'number') as Array<{ seo_score: number }>
  const avgScore    = scored.length === 0 ? 0
                    : scored.reduce((s, r) => s + r.seo_score, 0) / scored.length

  const withFk      = rows.filter(r => (r.seo_focus_keyword as string | null)?.trim()).length / n * 100
  const withDesc    = rows.filter(r => (r.seo_description   as string | null)?.trim()).length / n * 100
  const withHero    = rows.filter(r => (r.hero_image_url    as string | null)?.trim()).length / n * 100

  // Recency factor — what % of the last 30 days saw at least one
  // publish. Caps freshness; doesn't punish a brand with great backlog.
  const now    = Date.now()
  const days   = new Set<string>()
  for (const r of rows) {
    if (!r.published_at) continue
    const t = new Date(r.published_at as string).getTime()
    if (now - t > 30 * 86400000) continue
    days.add((r.published_at as string).slice(0, 10))
  }
  const recencyPct = (days.size / 30) * 100

  const score =
    avgScore  * W_AVG_SCORE +
    withFk    * W_FOCUS_KW  +
    withDesc  * W_DESC      +
    withHero  * W_HERO      +
    recencyPct* W_RECENCY

  const finalScore = Math.round(score)

  const grade: BrandHealth['grade'] =
    finalScore >= 85 ? 'excellent' :
    finalScore >= 70 ? 'good'      :
    finalScore >= 50 ? 'needs-work':
                       'poor'

  return {
    brandSlug,
    score:               finalScore,
    grade,
    publishedArticles:   n,
    avgArticleScore:     Math.round(avgScore),
    withFocusKeywordPct: Math.round(withFk),
    withDescriptionPct:  Math.round(withDesc),
    withHeroImagePct:    Math.round(withHero),
    recencyPct:          Math.round(recencyPct),
  }
}
