// GET /api/cron/seo-gsc-sync
//
// Daily cron — pulls the last 3 days of GSC data and upserts into
// search_console_data. No-op when GSC_SERVICE_ACCOUNT_JSON env var
// is unset. See src/lib/seo/gsc.ts for the activation checklist.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { importGscDaily } from '@/lib/seo/gsc'

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
  const result = await importGscDaily(sb, 3)
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...result })
}
