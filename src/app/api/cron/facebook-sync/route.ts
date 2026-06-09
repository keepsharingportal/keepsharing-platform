// Daily Facebook Marketing data sync.
//
// Runs nightly via Vercel cron. Pulls the last 7 days of insights for
// every active campaign in the connected ad account (re-pulling recent
// days catches Meta's restated numbers — delayed conversions etc.).
//
// Auth: x-vercel-cron header (real cron) OR ?secret=$CRON_SECRET (manual
// trigger / smoke test).

import { NextRequest, NextResponse } from 'next/server'
import { runFacebookSync } from '@/lib/integrations/facebook/sync'

export const runtime     = 'nodejs'
export const maxDuration = 300

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron')) return true
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return new URL(req.url).searchParams.get('secret') === expected
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runFacebookSync('cron')
  return NextResponse.json(result, { status: result.status === 'error' ? 500 : 200 })
}
