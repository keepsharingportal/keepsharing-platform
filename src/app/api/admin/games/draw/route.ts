// POST /api/admin/games/draw
// Body: { week_iso?: "YYYY-Www", mode: "preview" | "live" }
//
// The single entry point for running a Family Brain Games draw by hand. Calls
// the same runWeeklyDraw() the Monday cron calls, so the rehearsal and the real
// thing exercise identical code — a preview that ran through a different code
// path would prove nothing.
//
// This replaced the old client-side draw (DrawWinnerButton picking with
// Math.random() and POSTing to save-winners). That path was biased, left no
// audit record of the pool it drew from, emailed nobody, and still recorded
// $10 when the prize had moved to $25.
//
// mode 'preview': real selection, writes nothing, both emails go to the owner.
// mode 'live':    records the winner, emails them, emails the owner a payout
//                 instruction — and refuses unless the draw has been armed.

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { requireAal2 } from '@/lib/admin/mfa-gate'
import { recordAuditEvent } from '@/lib/admin/audit'
import { runWeeklyDraw } from '@/lib/games/draw'

export const runtime     = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const ctx  = await requireAdmin()
  // A live draw hands a reader money and cannot be taken back, so it sits
  // behind the same second factor as deleting an advertiser's placement.
  const gate = await requireAal2()
  if (!gate.ok) return gate.response

  const body    = await req.json().catch(() => ({})) as { week_iso?: string; mode?: string }
  const weekIso = (body.week_iso ?? '').trim() || undefined
  const mode    = body.mode === 'live' ? 'live' as const : 'preview' as const

  if (weekIso && !/^\d{4}-W\d{2}$/.test(weekIso)) {
    return NextResponse.json({ error: 'week_iso must be YYYY-Www (e.g., 2026-W26)' }, { status: 400 })
  }

  try {
    // Rehearsal mail goes to whoever clicked Preview, not to the configured
    // owner address — otherwise the first rehearsal lands in an inbox the
    // operator isn't watching and reads as "no email arrived".
    const result = await runWeeklyDraw({ weekIso, mode, previewTo: ctx.email ?? undefined })

    // Previews are recorded too. "Who rehearsed which week, and who came up"
    // is exactly what you want in the log if a reader ever disputes a result.
    await recordAuditEvent({
      ctx, req,
      action:       mode === 'live' ? 'games.draw.run' : 'games.draw.preview',
      target_table: 'game_winners',
      target_id:    result.week_iso,
      after:        result.winners.length ? { winners: result.winners } : null,
      meta: {
        mode,
        status:        result.status,
        entry_count:   result.entry_count,
        player_count:  result.player_count,
        notified_to:   result.notified_to,
        // Whether Resend actually accepted each send. Without these the log can
        // say a draw ran but not whether anyone was told, which is the first
        // thing you need to know when someone reports no email arriving.
        notify_winner: result.notify_winner,
        notify_owner:  result.notify_owner,
      },
    })

    if (result.status === 'drawn') {
      revalidatePath('/games')
      revalidatePath('/admin/games')
    }

    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[admin/games/draw] failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
