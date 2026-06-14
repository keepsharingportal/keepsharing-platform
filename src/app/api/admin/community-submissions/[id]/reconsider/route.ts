// POST /api/admin/community-submissions/[id]/reconsider
// No body.
//
// Undo a /reject: clears rejection_reason + sets phase back to
// 'nominated' so the submission re-enters the active queue. Keeps
// rejected_at/rejected_by as historical audit trail (not cleared)
// so we can see "this was rejected on X, brought back on Y".

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin/auth'
import { createAdminClient }         from '@/lib/supabase/admin'
import { type Phase }                from '@/lib/submissions/phases'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteCtx { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  await requireAdmin()
  const { id } = await ctx.params

  const sb = createAdminClient()
  const { data: current } = await sb
    .from('community_submissions')
    .select('phase')
    .eq('id', id)
    .maybeSingle()
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if ((current.phase as Phase) !== 'rejected') {
    return NextResponse.json({ error: `Only rejected submissions can be reconsidered. Current phase: ${current.phase}` }, { status: 400 })
  }

  const { error } = await sb
    .from('community_submissions')
    .update({
      phase:            'nominated',
      rejection_reason: null,
      // Reset legacy status too so the queue sees the row as 'new'
      // again. Keep rejected_at/rejected_by as audit history.
      status:           'new',
    })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, phase: 'nominated' })
}
