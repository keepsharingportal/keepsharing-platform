// POST /api/admin/seo/assist
// Body: { articleId: string }
//
// Loads the article + its brand context, calls Claude via the
// existing runAI() wrapper to generate SEO title / description /
// focus keyword / secondary keywords. Returns the suggestions WITHOUT
// writing — editor reviews + accepts in the UI before save.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSeoSuggestions } from '@/lib/seo/ai-seo-assist'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { articleId?: string } | null
  if (!body?.articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 })

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('guide_articles')
    .select('id, title, body, column_slug, brand_slug, seo_title, seo_description, seo_focus_keyword')
    .eq('id', body.articleId)
    .maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'article not found' }, { status: 404 })

  try {
    const suggestions = await generateSeoSuggestions({
      articleTitle:           data.title as string,
      articleBody:            (data.body as string) ?? '',
      articleColumn:          (data.column_slug as string | null) ?? undefined,
      brandSlug:              (data.brand_slug as string) ?? 'rrp',
      existingSeoTitle:       data.seo_title as string | null,
      existingSeoDescription: data.seo_description as string | null,
      existingFocusKeyword:   data.seo_focus_keyword as string | null,
    })
    return NextResponse.json({ ok: true, ...suggestions })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
