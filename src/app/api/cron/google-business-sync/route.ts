// Daily Google Business Profile insights sync. Runs nightly at 09:00 UTC.

import { NextRequest, NextResponse } from 'next/server'
import { syncGoogleBusiness } from '@/lib/integrations/google-business/sync'

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
  const result = await syncGoogleBusiness('cron')
  return NextResponse.json(result, { status: result.status === 'error' ? 500 : 200 })
}
