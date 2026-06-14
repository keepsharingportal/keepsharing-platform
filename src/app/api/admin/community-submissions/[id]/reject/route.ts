// POST /api/admin/community-submissions/[id]/reject
// Body: { reason: string }
//
// Editorial reject: editor decided NOT to feature this nomination.
// Different from /set-phase → archived (workflow closeout). A rejected
// row keeps its data, lives in a dedicated queue filter, captures
// WHY (rejection_reason), and can be brought back via /reconsider.
//
// Only allowed from the early phases (nominated, nomination-accepted,
// outreach-sent) — past that we've invested too much to "reject" and
// the editor should /set-phase → archived instead.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin/auth'
import { createAdminClient }         from '@/lib/supabase/admin'
import { PHASES, type Phase }        from '@/lib/submissions/phases'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteCtx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const adminCtx = await requireAdmin()
  const { id }   = await ctx.params
  const body     = await req.json().catch(() => null) as { reason?: string } | null

  const reason = body?.reason?.trim() ?? ''
  if (!reason) {
    return NextResponse.json({ error: 'A rejection reason is required so the team can revisit later.' }, { status: 400 })
  }
  if (reason.length > 1000) {
    return NextResponse.json({ error: 'Keep the reason under 1000 characters.' }, { status: 400 })
  }

  const sb = createAdminClient()
  const { data: current } = await sb
    .from('community_submissions')
    .select('phase')
    .eq('id', id)
    .maybeSingle()
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const currentPhase = (current.phase as Phase) ?? 'nominated'
  const allowed = PHASES[currentPhase]?.allowedNext ?? []
  if (!allowed.includes('rejected')) {
    return NextResponse.json({
      error: `Can't reject from "${currentPhase}". Reject is only available before drafting begins — use Archive instead.`,
    }, { status: 400 })
  }

  const { error } = await sb
    .from('community_submissions')
    .update({
      phase:            'rejected',
      rejection_reason: reason,
      rejected_at:      new Date().toISOString(),
      rejected_by:      adminCtx.userId,
      // Also update the legacy status column so the existing queue
      // filter sees this row in its rejected bucket without a
      // join — kept for backward compat with /admin queries that
      // haven't been migrated to read `phase` yet.
      status:           'rejected',
    })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, phase: 'rejected' })
}
