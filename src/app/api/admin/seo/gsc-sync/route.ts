// POST /api/admin/seo/gsc-sync
//
// Admin-triggered Search Console sync — same lib call as the daily cron
// but: (a) authenticated as an admin instead of the CRON_SECRET, and
// (b) lets the editor choose the lookback window so the first activation
// run can backfill 28 days in one click.
//
// Returns the structured ImportResult so the UI can show rows imported,
// per-site errors, and any "not configured" warning verbatim.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { importGscDaily, isGscConfigured } from '@/lib/seo/gsc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({}))
  const daysBack = clampLookback(body?.daysBack)

  if (!isGscConfigured()) {
    return NextResponse.json({
      ok:      false,
      warning: 'GSC_SERVICE_ACCOUNT_JSON or GSC_SITE_URLS env var not set. See /admin/seo for activation steps.',
      rowsImported:   0,
      sitesProcessed: 0,
      errors:         [],
    })
  }

  const sb = createAdminClient()
  const result = await importGscDaily(sb, daysBack)
  return NextResponse.json({ ok: true, daysBack, ...result })
}

function clampLookback(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return 3
  return Math.min(90, Math.max(1, Math.round(n)))
}
