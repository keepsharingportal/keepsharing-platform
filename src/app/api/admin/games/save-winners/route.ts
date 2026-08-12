// POST /api/admin/games/save-winners
// Body: { week_iso: "YYYY-Www", picks: [{ slot: 1|2|3, score_id: "uuid" }, ...] }
// Persists the 3 chosen winners for a given ISO week so the public hub
// can display "Last week's $10 winners: A, B, C."

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { GAMES_PRIZE } from '@/lib/games/prize'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface Pick { slot: number; score_id: string }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { week_iso?: string; picks?: Pick[] } | null
  const weekIso = (body?.week_iso ?? '').trim()
  const picks   = Array.isArray(body?.picks) ? body!.picks! : []

  if (!/^\d{4}-W\d{2}$/.test(weekIso)) {
    return NextResponse.json({ error: 'week_iso must be YYYY-Www (e.g., 2026-W21)' }, { status: 400 })
  }
  if (picks.length === 0 || picks.length > 3) {
    return NextResponse.json({ error: 'picks must be 1-3 entries' }, { status: 400 })
  }
  for (const p of picks) {
    if (![1, 2, 3].includes(p.slot)) {
      return NextResponse.json({ error: `slot must be 1, 2, or 3 (got ${p.slot})` }, { status: 400 })
    }
    if (!p.score_id) {
      return NextResponse.json({ error: 'score_id is required for every pick' }, { status: 400 })
    }
  }
  // Reject duplicate slots in the same payload
  const slotSet = new Set(picks.map(p => p.slot))
  if (slotSet.size !== picks.length) {
    return NextResponse.json({ error: 'duplicate slot in picks' }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  // Fetch all the score rows in one query
  const scoreIds = picks.map(p => p.score_id)
  const { data: scoreRows, error: e1 } = await supabase
    .from('game_scores')
    .select('id, first_name, last_name, email')
    .in('id', scoreIds)
  if (e1 || !scoreRows) {
    return NextResponse.json({ error: e1?.message ?? 'Failed to look up scores' }, { status: 500 })
  }
  const byId = new Map(scoreRows.map(r => {
    const s = r as { id: string; first_name: string; last_name: string; email: string }
    return [s.id, s]
  }))

  // Build the rows to upsert
  const rows = picks.map(p => {
    const s = byId.get(p.score_id)
    if (!s) throw new Error(`score ${p.score_id} not found`)
    return {
      week_iso:     weekIso,
      market:       'rrp',
      slot:         p.slot,
      score_id:     p.score_id,
      first_name:   s.first_name,
      last_initial: (s.last_name?.[0] ?? '').toUpperCase() || null,
      email:        s.email,
      // Was hardcoded 10.00 — reads from the prize config so the recorded
      // payout can't drift from what the site promised the player.
      prize_amount: GAMES_PRIZE.amountUsd,
    }
  })

  const { error } = await supabase
    .from('game_winners')
    .upsert(rows, { onConflict: 'market,week_iso,slot' })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/games')
  revalidatePath('/admin/games')
  return NextResponse.json({ success: true, saved: rows.length })
}
