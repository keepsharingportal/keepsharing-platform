// POST /api/admin/seo/bulk
// Body: { articleIds: string[], action, keyword?, findText?, replaceText? }
//
// Supported actions:
//   set-focus-keyword    — sets seo_focus_keyword to `keyword` on every selected row
//   find-replace-title   — replaces findText with replaceText inside seo_title (literal,
//                          case-insensitive). Rows without a current seo_title are skipped.
//   find-replace-desc    — same for seo_description
//   rescore              — no field change, just re-runs the analyzer + persists score

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyzeArticle } from '@/lib/seo/content-analyzer'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 120

type Action = 'set-focus-keyword' | 'find-replace-title' | 'find-replace-desc' | 'rescore'

export async function POST(req: NextRequest) {
  const adminCtx = await requireAdmin()
  const body = await req.json().catch(() => null) as {
    articleIds?:  string[]
    action?:      Action
    keyword?:     string
    findText?:    string
    replaceText?: string
  } | null
  if (!body?.articleIds?.length || !body?.action) {
    return NextResponse.json({ error: 'articleIds + action required' }, { status: 400 })
  }

  const sb = createAdminClient()
  const { data: rows, error } = await sb
    .from('guide_articles')
    .select('id, title, slug, excerpt, body, hero_image_url, seo_title, seo_description, seo_focus_keyword, seo_secondary_keywords')
    .in('id', body.articleIds)
  if (error || !rows) return NextResponse.json({ error: error?.message ?? 'load failed' }, { status: 500 })

  let updated = 0
  for (const r of rows) {
    const update: Record<string, unknown> = {}

    if (body.action === 'set-focus-keyword' && body.keyword) {
      update.seo_focus_keyword = body.keyword
    } else if (body.action === 'find-replace-title' && body.findText) {
      const current = (r.seo_title as string | null) ?? ''
      if (current) {
        const next = current.replace(new RegExp(escapeRe(body.findText), 'gi'), body.replaceText ?? '')
        if (next !== current) update.seo_title = next
      }
    } else if (body.action === 'find-replace-desc' && body.findText) {
      const current = (r.seo_description as string | null) ?? ''
      if (current) {
        const next = current.replace(new RegExp(escapeRe(body.findText), 'gi'), body.replaceText ?? '')
        if (next !== current) update.seo_description = next
      }
    }

    // Always re-run analyzer (whether or not we changed fields).
    const merged = { ...r, ...update }
    const internalLinks = (merged.body as string ?? '').match(/href="(\/[^"]*|https?:\/\/(?:www\.)?riverregionparents\.com[^"]*)"/gi)?.length ?? 0
    const externalLinks = ((merged.body as string ?? '').match(/href="https?:\/\/[^"]*"/gi)?.length ?? 0) - internalLinks
    const analysis = analyzeArticle({
      title:             merged.title as string,
      seoTitle:          merged.seo_title as string | null,
      excerpt:           merged.excerpt as string | null,
      seoDescription:    merged.seo_description as string | null,
      focusKeyword:      merged.seo_focus_keyword as string | null,
      secondaryKeywords: (merged.seo_secondary_keywords as string[] | null) ?? undefined,
      bodyHtml:          (merged.body as string) ?? '',
      slug:              (merged.slug as string) ?? '',
      heroImageUrl:      merged.hero_image_url as string | null,
      internalLinkCount: internalLinks,
      externalLinkCount: Math.max(0, externalLinks),
    })
    update.seo_score           = analysis.score
    update.seo_score_breakdown = analysis.breakdown
    update.seo_last_audited_at = new Date().toISOString()
    update.seo_audited_by      = adminCtx.userId ?? 'bulk-edit'

    const { error: updErr } = await sb.from('guide_articles').update(update).eq('id', r.id as string)
    if (!updErr) updated++
  }

  return NextResponse.json({ ok: true, updated })
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
