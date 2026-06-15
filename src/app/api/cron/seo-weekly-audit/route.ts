// GET /api/cron/seo-weekly-audit
//
// Runs the weekly Claude audit for EVERY active brand and inserts a
// row into seo_audit_runs per brand. Vercel cron triggers Sun 02:00
// UTC. Each brand's audit takes ~30-60 seconds; with 6 brands the
// total runtime is well within the 300s maxDuration.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runWeeklyAudit } from '@/lib/seo/weekly-audit'
import { MARKETS } from '@/lib/markets'

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
  const results: Array<{ brand: string; ok: boolean; tokens?: number; error?: string }> = []

  for (const market of MARKETS) {
    try {
      const audit = await runWeeklyAudit(sb, market.slug)
      await sb.from('seo_audit_runs').insert({
        brand_slug:       market.slug,
        run_by:           'weekly-cron',
        articles_checked: audit.articlesChecked,
        issues_found:     audit.actionItems.length,
        report_markdown:  audit.reportMarkdown,
        action_items:     audit.actionItems,
        tokens_used:      audit.tokensUsed,
        model_used:       audit.modelUsed,
      })
      results.push({ brand: market.slug, ok: true, tokens: audit.tokensUsed })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      results.push({ brand: market.slug, ok: false, error: msg })
    }
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), results })
}
