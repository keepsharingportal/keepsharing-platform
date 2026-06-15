// POST /api/admin/seo/save
// Body: { articleId, seoTitle?, seoDescription?, seoFocusKeyword?,
//         seoSecondaryKeywords?, seoCanonicalOverride?, seoNoIndex? }
//
// Saves the editor-tuned SEO overrides, then re-runs the content
// analyzer so the score reflects the new values immediately. Returns
// the updated analyzer result so the editor UI re-renders without
// a second fetch.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyzeArticle } from '@/lib/seo/content-analyzer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  articleId:              string
  seoTitle?:              string | null
  seoDescription?:        string | null
  seoFocusKeyword?:       string | null
  seoSecondaryKeywords?:  string[] | null
  seoCanonicalOverride?:  string | null
  seoNoIndex?:            boolean
}

export async function POST(req: NextRequest) {
  const adminCtx = await requireAdmin()
  const body = await req.json().catch(() => null) as Body | null
  if (!body?.articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 })

  const sb = createAdminClient()

  // Build the update set — only include fields actually passed in so
  // partial saves don't clobber unrelated values.
  const update: Record<string, unknown> = {}
  if ('seoTitle'              in body) update.seo_title              = body.seoTitle              || null
  if ('seoDescription'        in body) update.seo_description        = body.seoDescription        || null
  if ('seoFocusKeyword'       in body) update.seo_focus_keyword      = body.seoFocusKeyword       || null
  if ('seoSecondaryKeywords'  in body) update.seo_secondary_keywords = body.seoSecondaryKeywords  || null
  if ('seoCanonicalOverride'  in body) update.seo_canonical_override = body.seoCanonicalOverride  || null
  if ('seoNoIndex'            in body) update.seo_no_index           = !!body.seoNoIndex

  const { error: updErr } = await sb.from('guide_articles').update(update).eq('id', body.articleId)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Re-fetch + re-analyze in one trip so the editor sees the new score
  // without a second roundtrip.
  const { data } = await sb
    .from('guide_articles')
    .select('id, title, slug, excerpt, body, hero_image_url, seo_title, seo_description, seo_focus_keyword, seo_secondary_keywords')
    .eq('id', body.articleId)
    .maybeSingle()
  if (!data) return NextResponse.json({ error: 'article gone after save' }, { status: 500 })

  const internalLinks = (data.body as string ?? '').match(/href="(\/[^"]*|https?:\/\/(?:www\.)?riverregionparents\.com[^"]*)"/gi)?.length ?? 0
  const externalLinks = ((data.body as string ?? '').match(/href="https?:\/\/[^"]*"/gi)?.length ?? 0) - internalLinks
  const result = analyzeArticle({
    title:             data.title as string,
    seoTitle:          data.seo_title as string | null,
    excerpt:           data.excerpt as string | null,
    seoDescription:    data.seo_description as string | null,
    focusKeyword:      data.seo_focus_keyword as string | null,
    secondaryKeywords: (data.seo_secondary_keywords as string[] | null) ?? undefined,
    bodyHtml:          (data.body as string) ?? '',
    slug:              (data.slug as string) ?? '',
    heroImageUrl:      data.hero_image_url as string | null,
    internalLinkCount: internalLinks,
    externalLinkCount: Math.max(0, externalLinks),
  })

  await sb.from('guide_articles').update({
    seo_score:           result.score,
    seo_score_breakdown: result.breakdown,
    seo_last_audited_at: new Date().toISOString(),
    seo_audited_by:      adminCtx.userId ?? null,
  }).eq('id', body.articleId)

  return NextResponse.json({ ok: true, ...result })
}
