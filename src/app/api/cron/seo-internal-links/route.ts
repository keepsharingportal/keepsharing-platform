// GET /api/cron/seo-internal-links
//
// Vercel cron trigger. Runs in two phases:
//   1. Scan the corpus + emit internal-link suggestions (the v2 GSC-aware
//      engine).
//   2. Auto-apply every PENDING suggestion with match_score ≥ threshold
//      (default 90 — focus_keyword match + page-2 GSC boost). Editors
//      still review everything below the threshold via the manual queue.
//
// The auto-apply step is THE leverage for high-content-velocity publishers
// — without it the queue piles up faster than editors can review.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { runInternalLinkPass } from '@/lib/seo/internal-link-engine'
import {
  autoApplyHighConfidenceLinks,
  DEFAULT_AUTO_APPLY_THRESHOLD,
} from '@/lib/seo/auto-apply-links'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) return new NextResponse('Unauthorized', { status: 401 })
  }

  const sb = createAdminClient()

  // Phase 1: scan + emit suggestions.
  const passResult = await runInternalLinkPass(sb)

  // Phase 2: auto-apply high-confidence suggestions.
  const applyResult = await autoApplyHighConfidenceLinks(sb, DEFAULT_AUTO_APPLY_THRESHOLD)

  // Revalidate every source whose body was rewritten so the new link
  // is visible immediately, not on next ISR expiry.
  for (const articleId of applyResult.touchedArticleIds) {
    const { data: a } = await sb
      .from('guide_articles')
      .select('slug, column_slug')
      .eq('id', articleId)
      .maybeSingle()
    if (a?.slug && a?.column_slug) {
      try { revalidatePath(`/columns/${a.column_slug}/${a.slug}`) } catch { /* best-effort */ }
    }
  }

  return NextResponse.json({
    ok:                 true,
    at:                 new Date().toISOString(),
    articlesScanned:    passResult.articlesScanned,
    suggestionsCreated: passResult.suggestionsCreated,
    autoApplied:        applyResult.applied,
    autoSkipped:        applyResult.skipped,
    autoThreshold:      applyResult.threshold,
  })
}
