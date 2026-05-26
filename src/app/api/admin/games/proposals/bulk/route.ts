// POST /api/admin/games/proposals/bulk
// Body: { action: 'approve' | 'reject', ids: string[] }
//      OR { action: 'approve' | 'reject', filter: { game_type?, difficulty? } }
//
// Bulk approve: copies every pending proposal into game_content in one batch
// insert, then marks all proposals approved. Bulk reject: marks them rejected.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export const runtime  = 'nodejs'
export const maxDuration = 60

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface Body {
  action?: string
  ids?:    string[]
  filter?: { game_type?: string; difficulty?: string }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null
  const action = body?.action
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  // Resolve target proposals — either explicit IDs or filter criteria
  let q = supabase
    .from('game_content_proposals')
    .select('id, game_type, difficulty, payload, status')
    .eq('status', 'pending')

  if (Array.isArray(body?.ids) && body!.ids!.length > 0) {
    q = q.in('id', body!.ids!)
  } else if (body?.filter) {
    if (body.filter.game_type)  q = q.eq('game_type',  body.filter.game_type)
    if (body.filter.difficulty) q = q.eq('difficulty', body.filter.difficulty)
  } else {
    return NextResponse.json({ error: 'must provide either ids or filter' }, { status: 400 })
  }

  const { data: pendingData, error: loadErr } = await q
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 })
  const pending = (pendingData ?? []) as { id: string; game_type: string; difficulty: string; payload: Record<string, unknown>; status: string }[]

  if (pending.length === 0) {
    return NextResponse.json({ success: true, processed: 0, action })
  }

  const reviewedAt = new Date().toISOString()

  if (action === 'reject') {
    const { error } = await supabase
      .from('game_content_proposals')
      .update({ status: 'rejected', reviewed_at: reviewedAt })
      .in('id', pending.map(p => p.id))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidatePath('/admin/games/queue')
    revalidatePath('/admin/games')
    return NextResponse.json({ success: true, processed: pending.length, action: 'rejected' })
  }

  // Approve: batch insert into game_content, then mark approved with content IDs
  const rows = pending.map(p => ({
    game_type:  p.game_type,
    difficulty: p.difficulty,
    payload:    p.payload,
    weight:     1,
  }))
  const { data: insertedData, error: insertErr } = await supabase
    .from('game_content')
    .insert(rows)
    .select('id')
  if (insertErr || !insertedData) {
    return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  // The .insert(...).select('id') call returns inserted IDs in the same order
  // as the input rows, so we can zip them back to the proposal IDs.
  const inserted = insertedData as { id: string }[]
  if (inserted.length !== pending.length) {
    return NextResponse.json({
      error: `Inserted ${inserted.length} content rows but had ${pending.length} proposals — refusing to mark approved.`,
    }, { status: 500 })
  }

  // Update each proposal individually so each gets the right approved_content_id.
  // Could be batched with a CASE statement but keep it simple — N is at most ~100.
  for (let i = 0; i < pending.length; i++) {
    await supabase
      .from('game_content_proposals')
      .update({
        status:              'approved',
        reviewed_at:         reviewedAt,
        approved_content_id: inserted[i].id,
      })
      .eq('id', pending[i].id)
  }

  revalidatePath('/admin/games/queue')
  revalidatePath('/admin/games')
  return NextResponse.json({ success: true, processed: pending.length, action: 'approved' })
}
