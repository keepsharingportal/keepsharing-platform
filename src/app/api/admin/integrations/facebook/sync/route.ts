// POST /api/admin/integrations/facebook/sync
//
// "Sync now" — runs the full Facebook ingestion. Same code path as the
// daily cron, just triggered by a button. Returns a summary so the admin
// UI can show "Pulled N campaigns + M metric rows."

import { NextResponse } from 'next/server'
import { runFacebookSync } from '@/lib/integrations/facebook/sync'
import { revalidatePath } from 'next/cache'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const result = await runFacebookSync('manual')
  revalidatePath('/admin/integrations/facebook')
  return NextResponse.json(result, { status: result.status === 'error' ? 500 : 200 })
}
