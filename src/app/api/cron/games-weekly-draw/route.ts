// Weekly cron — draws the Family Brain Games winner for the week that just
// ended, emails the winner, and emails the owner a payout instruction.
//
// Logic lives in src/lib/games/draw.ts so the admin can reuse it for a manual
// re-trigger. See that file for why selection is crypto.randomInt rather than
// a model call.
//
// Auth: x-vercel-cron header (real cron) OR ?secret=$CRON_SECRET (manual
// trigger or smoke test) — same pattern as games-refill.
//
// Schedule: Mondays. The draw is idempotent per ISO week, so a retry, a
// double-fire, or a manual run on top of a completed draw all no-op safely
// rather than redrawing or double-emailing.
//
// Useful query params:
//   ?secret=...        manual trigger
//   &week=2026-W32     draw a specific week (backfill); still idempotent
//   &mode=preview      rehearse: real selection, writes nothing, emails only
//                      the owner. Ignores the armed flag on purpose — preview
//                      is what you run BEFORE arming.
//
// The live draw is gated on site_settings.games_draw_enabled. Until an admin
// arms it from /admin/games this route records nothing and returns
// {"status":"disabled"} — so the Monday cron being scheduled is not the same
// thing as the drawing having started.
//
// Optional env:
//   GAMES_DRAW_NOTIFY_EMAIL  where the payout instruction goes
//                            (falls back to SUBMISSIONS_EDITOR_EMAIL)

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { runWeeklyDraw } from '@/lib/games/draw'

export const runtime     = 'nodejs'
export const maxDuration = 60

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

  const params    = new URL(req.url).searchParams
  const weekParam = params.get('week') ?? undefined
  const mode      = params.get('mode') === 'preview' ? 'preview' as const : 'live' as const

  try {
    const result = await runWeeklyDraw({ weekIso: weekParam, mode })

    // Refresh the hub so the winners pill shows the new name immediately
    // instead of waiting for the next revalidate window.
    if (result.status === 'drawn') revalidatePath('/games')

    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[cron/games-weekly-draw] failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
