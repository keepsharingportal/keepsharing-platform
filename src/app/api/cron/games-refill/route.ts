// Daily cron — keeps every (game, difficulty) cell at the target days
// of supply. Logic lives in src/lib/games/refill.ts so the admin "Refill
// now" button can reuse it.
//
// Auth: x-vercel-cron header (real cron) OR ?secret=$CRON_SECRET (manual
// trigger or smoke test).
//
// Tunable env vars:
//   GAMES_TARGET_DAYS_OF_SUPPLY  default 10
//   GAMES_REFILL_DAILY_BUDGET    default 20  (USD, soft cap)
//   GAMES_REFILL_AUTO_APPROVE    default false (true = skip review queue)

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { runRefill } from '@/lib/games/refill'

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
  try {
    const dryRun = new URL(req.url).searchParams.get('dryRun') === '1'
    const summary = await runRefill({ dryRun })
    revalidatePath('/admin/games')
    if (summary.auto_approved) revalidatePath('/games')
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
