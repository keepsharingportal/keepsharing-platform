// ── Image alt-text audit ─────────────────────────────────────────────────
//
// Scans guide_articles.body + hero_image_url + gallery_images for images
// without alt text. Missing alts hurt accessibility AND SEO — Google
// uses alt for image search ranking + uses surrounding context to
// understand what an image is about for the main article.
//
// Audit returns per-brand summary + per-article details so the editor
// can knock out the worst-offending pages first.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface AltAuditFinding {
  articleId:    string
  title:        string
  slug:         string
  columnSlug:   string | null
  brandSlug:    string | null
  publishedAt:  string | null
  imageCount:   number
  missingCount: number
  missing: Array<{
    where:  'hero' | 'body' | 'gallery'
    src:    string
  }>
}

export interface AltAuditSummary {
  brandSlug:       string | null
  articlesChecked: number
  totalImages:     number
  missingAlts:     number
  affectedArticles: number
  findings:        AltAuditFinding[]   // only articles with at least one miss
}

/** Run the audit for one brand (or null for all brands). Returns the
 *  summary + per-article findings (only articles with ≥1 missing alt). */
export async function runAltTextAudit(
  sb:        SupabaseClient,
  brandSlug: string | null = null,
  limit:     number = 500,
): Promise<AltAuditSummary> {
  let q = sb
    .from('guide_articles')
    .select('id, title, slug, column_slug, brand_slug, published_at, body, hero_image_url, gallery_images')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (brandSlug) q = q.eq('brand_slug', brandSlug)

  const { data } = await q
  const rows = (data ?? []) as Array<{
    id:              string
    title:           string
    slug:            string
    column_slug:     string | null
    brand_slug:      string | null
    published_at:    string | null
    body:            string | null
    hero_image_url:  string | null
    gallery_images:  Array<{ url: string; alt?: string }> | null
  }>

  let totalImages = 0
  let missingAlts = 0
  let affected    = 0
  const findings: AltAuditFinding[] = []

  for (const r of rows) {
    const miss: AltAuditFinding['missing'] = []
    let imgCount = 0

    // Hero: implicit alt = article title (handled in the renderer), so
    // we don't flag missing hero alts. Just count.
    if (r.hero_image_url) imgCount++

    // Body — scan inline <img> tags.
    if (r.body) {
      const imgTags = r.body.match(/<img\b[^>]*>/gi) ?? []
      for (const tag of imgTags) {
        imgCount++
        if (!hasAlt(tag)) {
          const src = extractAttr(tag, 'src') ?? '(no src)'
          miss.push({ where: 'body', src })
        }
      }
    }

    // Gallery — explicit alt field on each entry.
    if (Array.isArray(r.gallery_images)) {
      for (const g of r.gallery_images) {
        imgCount++
        if (!g.alt || !g.alt.trim()) {
          miss.push({ where: 'gallery', src: g.url })
        }
      }
    }

    totalImages += imgCount
    if (miss.length > 0) {
      missingAlts += miss.length
      affected++
      findings.push({
        articleId:    r.id,
        title:        r.title,
        slug:         r.slug,
        columnSlug:   r.column_slug,
        brandSlug:    r.brand_slug,
        publishedAt:  r.published_at,
        imageCount:   imgCount,
        missingCount: miss.length,
        missing:      miss,
      })
    }
  }

  // Worst offenders first.
  findings.sort((a, b) => b.missingCount - a.missingCount)

  return {
    brandSlug,
    articlesChecked:  rows.length,
    totalImages,
    missingAlts,
    affectedArticles: affected,
    findings,
  }
}

function hasAlt(tag: string): boolean {
  const m = tag.match(/\balt\s*=\s*(['"])(.*?)\1/i)
  if (!m) return false
  return m[2].trim().length > 0
}

function extractAttr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, 'i'))
  return m ? m[2] : null
}
