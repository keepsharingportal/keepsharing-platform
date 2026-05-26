// POST /api/admin/games/save-winner
// Body: { month_iso: "YYYY-MM", score_id: "uuid" }
// Persists the chosen winner so the public hub can display it.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { month_iso?: string; score_id?: string } | null
  const monthIso = (body?.month_iso ?? '').trim()
  const scoreId  = (body?.score_id  ?? '').trim()
  if (!/^\d{4}-\d{2}$/.test(monthIso)) {
    return NextResponse.json({ error: 'month_iso must be YYYY-MM' }, { status: 400 })
  }
  if (!scoreId) return NextResponse.json({ error: 'score_id is required' }, { status: 400 })

  const supabase = supabaseAdmin()
  const { data: score, error: e1 } = await supabase
    .from('game_scores')
    .select('first_name, last_name, email')
    .eq('id', scoreId)
    .maybeSingle()
  if (e1 || !score) {
    return NextResponse.json({ error: e1?.message ?? 'Score not found' }, { status: 404 })
  }
  const s = score as { first_name: string; last_name: string; email: string }

  const row = {
    month_iso:    monthIso,
    market:       'rrp',
    score_id:     scoreId,
    first_name:   s.first_name,
    last_initial: (s.last_name?.[0] ?? '').toUpperCase() || null,
    email:        s.email,
  }

  // Upsert: one winner per month per market. Re-draw overwrites.
  const { error } = await supabase
    .from('game_winners')
    .upsert(row, { onConflict: 'market,month_iso' })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/games')
  revalidatePath('/admin/games')
  return NextResponse.json({ success: true })
}
