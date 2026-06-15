// POST /api/admin/seo/score
// Body: { articleId: string }
//
// Loads the article, runs the content analyzer, writes seo_score +
// seo_score_breakdown + seo_last_audited_at back to the row, and
// returns the result. Called from the SEO editor on every save +
// from the weekly audit cron.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyzeArticle } from '@/lib/seo/content-analyzer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const adminCtx = await requireAdmin()
  const body = await req.json().catch(() => null) as { articleId?: string } | null
  if (!body?.articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 })

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('guide_articles')
    .select('id, title, slug, excerpt, body, hero_image_url, seo_title, seo_description, seo_focus_keyword, seo_secondary_keywords')
    .eq('id', body.articleId)
    .maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'article not found' }, { status: 404 })

  // Count internal vs external links in the body. Internal = href to /
  // path (or our own domain); external = anything else.
  const internalLinks = (data.body as string ?? '').match(/href="(\/[^"]*|https?:\/\/(?:www\.)?riverregionparents\.com[^"]*)"/gi)?.length ?? 0
  const externalLinks = ((data.body as string ?? '').match(/href="https?:\/\/[^"]*"/gi)?.length ?? 0) - internalLinks

  const result = analyzeArticle({
    title:              data.title as string,
    seoTitle:           data.seo_title as string | null,
    excerpt:            data.excerpt as string | null,
    seoDescription:     data.seo_description as string | null,
    focusKeyword:       data.seo_focus_keyword as string | null,
    secondaryKeywords:  (data.seo_secondary_keywords as string[] | null) ?? undefined,
    bodyHtml:           (data.body as string) ?? '',
    slug:               (data.slug as string) ?? '',
    heroImageUrl:       data.hero_image_url as string | null,
    heroImageHasAlt:    undefined,
    internalLinkCount:  internalLinks,
    externalLinkCount:  Math.max(0, externalLinks),
  })

  await sb.from('guide_articles').update({
    seo_score:           result.score,
    seo_score_breakdown: result.breakdown,
    seo_last_audited_at: new Date().toISOString(),
    seo_audited_by:      adminCtx.userId ?? null,
  }).eq('id', body.articleId)

  return NextResponse.json({ ok: true, ...result })
}
