// PATCH /api/admin/games/proposals/[id]
// Body: { action: 'approve' | 'reject', notes?: string }
//
// approve → inserts into game_content (weight=1), marks proposal 'approved'
// reject  → marks proposal 'rejected' (kept for audit, no insert)

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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => null) as { action?: string; notes?: string } | null
  const action = body?.action
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  // Load the proposal
  const { data: prop, error: loadErr } = await supabase
    .from('game_content_proposals')
    .select('id, game_type, difficulty, payload, status')
    .eq('id', id)
    .maybeSingle()
  if (loadErr || !prop) {
    return NextResponse.json({ error: loadErr?.message ?? 'Proposal not found' }, { status: 404 })
  }
  const p = prop as { id: string; game_type: string; difficulty: string; payload: Record<string, unknown>; status: string }

  if (p.status !== 'pending') {
    return NextResponse.json({ error: `Already ${p.status}` }, { status: 409 })
  }

  if (action === 'reject') {
    const { error } = await supabase
      .from('game_content_proposals')
      .update({ status: 'rejected', notes: body?.notes ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', p.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidatePath('/admin/games/queue')
    revalidatePath('/admin/games')
    return NextResponse.json({ success: true, action: 'rejected' })
  }

  // approve → insert into game_content
  const { data: contentRow, error: insertErr } = await supabase
    .from('game_content')
    .insert({
      game_type:  p.game_type,
      difficulty: p.difficulty,
      payload:    p.payload,
      weight:     1,
    })
    .select('id')
    .maybeSingle()
  if (insertErr || !contentRow) {
    return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  const newId = (contentRow as { id: string }).id
  await supabase
    .from('game_content_proposals')
    .update({
      status:              'approved',
      reviewed_at:         new Date().toISOString(),
      approved_content_id: newId,
    })
    .eq('id', p.id)

  revalidatePath('/admin/games/queue')
  revalidatePath('/admin/games')
  return NextResponse.json({ success: true, action: 'approved', content_id: newId })
}
