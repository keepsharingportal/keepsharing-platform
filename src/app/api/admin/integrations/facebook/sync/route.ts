// POST /api/admin/integrations/facebook/sync
//
// "Sync now" — runs the full Facebook ingestion. Same code path as the
// daily cron, just triggered by a button. Returns a summary so the admin
// UI can show "Pulled N campaigns + M metric rows."

import { NextRequest, NextResponse } from 'next/server'
import { runFacebookSync } from '@/lib/integrations/facebook/sync'
import { revalidatePath } from 'next/cache'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let ctx
  try { ctx = await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const result = await runFacebookSync('manual')
  await recordAuditEvent({
    ctx, req,
    action:       'integration.sync_triggered',
    target_table: 'facebook_integrations',
    target_id:    'rrp',
    meta:         { result: { status: result.status, campaign_count: result.campaign_count, metric_count: result.metric_count } },
  })
  revalidatePath('/admin/integrations/facebook')
  return NextResponse.json(result, { status: result.status === 'error' ? 500 : 200 })
}
