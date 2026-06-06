// POST /api/admin/games/refill — admin-triggered version of the daily
// refill cron. Same logic, different auth: requires an admin session
// instead of the Vercel cron header.
//
// Body (optional):
//   { dryRun?: boolean }   — preview the plan without spending tokens
//
// Use this from the /admin/games "Refill all low cells now" button when
// the editor wants an immediate top-up instead of waiting for tomorrow's
// cron tick. The cron and this share the same lib/games/refill engine.

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { runRefill, planRefill } from '@/lib/games/refill'

export const runtime     = 'nodejs'
export const maxDuration = 300

export async function GET() {
  await requireAdmin()
  try {
    // Plan-only — cheap. Lets the admin button preview what would happen
    // before committing to spend.
    const plan = await planRefill()
    return NextResponse.json({ ok: true, ...plan })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({})) as { dryRun?: boolean }
  try {
    const summary = await runRefill({ dryRun: body.dryRun === true })
    revalidatePath('/admin/games')
    if (summary.auto_approved) revalidatePath('/games')
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
