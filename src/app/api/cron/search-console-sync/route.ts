// Daily Google Search Console sync.
//
// Runs nightly via Vercel cron. Pulls the trailing 3 days of query +
// page metrics for every connected property (re-pulling catches Google's
// data-delay wobble). 90-day retention sweep is included in the sync.
//
// Auth: x-vercel-cron header (real cron) OR ?secret=$CRON_SECRET (manual
// trigger / smoke test).

import { NextRequest, NextResponse } from 'next/server'
import { syncSearchConsole } from '@/lib/integrations/search-console/sync'

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
  const result = await syncSearchConsole('cron')
  return NextResponse.json(result, { status: result.status === 'error' ? 500 : 200 })
}
