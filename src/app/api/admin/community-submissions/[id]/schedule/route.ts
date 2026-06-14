// POST /api/admin/community-submissions/[id]/schedule
// Body: { month: 'YYYY-MM' | null }
//
// Assigns a scheduled month + advances phase to 'scheduled'. Pass
// month: null to move back to the unscheduled pool (phase = 'in-pool').

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface RouteCtx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  await requireAdmin()
  const { id } = await ctx.params
  const body = await req.json().catch(() => null) as { month?: string | null } | null
  if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 })

  // Validate the month format when provided
  if (body.month !== null && body.month !== undefined) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month)) {
      return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 })
    }
  }

  const sb = createAdminClient()
  const updates: Record<string, unknown> = {
    scheduled_for_month: body.month ?? null,
    phase:               body.month ? 'scheduled' : 'in-pool',
  }
  const { error } = await sb
    .from('community_submissions')
    .update(updates)
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, phase: updates.phase, scheduled_for_month: updates.scheduled_for_month })
}
