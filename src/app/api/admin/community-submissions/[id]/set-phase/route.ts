// POST /api/admin/community-submissions/[id]/set-phase
// Body: { phase: Phase }
//
// Advances a submission to a new phase. Validates the transition is
// allowed (forward-only on the canonical track, plus allowed branches
// per phase config). Used by every next-action button on the detail
// page.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PHASES, type Phase } from '@/lib/submissions/phases'

export const runtime = 'nodejs'

interface RouteCtx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  await requireAdmin()
  const { id } = await ctx.params
  const body = await req.json().catch(() => null) as { phase?: Phase } | null
  if (!body?.phase) return NextResponse.json({ error: 'phase required' }, { status: 400 })
  if (!PHASES[body.phase]) return NextResponse.json({ error: 'unknown phase' }, { status: 400 })

  const sb = createAdminClient()
  const { data: current } = await sb
    .from('community_submissions')
    .select('phase')
    .eq('id', id)
    .maybeSingle()
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const currentPhase = (current.phase as Phase) ?? 'nominated'
  const allowed = PHASES[currentPhase]?.allowedNext ?? []
  if (currentPhase !== body.phase && !allowed.includes(body.phase)) {
    return NextResponse.json({
      error: `Cannot transition from ${currentPhase} → ${body.phase}. Allowed: ${allowed.join(', ') || '(terminal)'}`,
    }, { status: 400 })
  }

  const { error } = await sb
    .from('community_submissions')
    .update({ phase: body.phase })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, phase: body.phase })
}
