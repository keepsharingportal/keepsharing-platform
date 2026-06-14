// POST /api/admin/community-submissions/[id]/request-changes
// Body: { note: string }
//
// Editor flags a submission as "needs changes before approval." Sets
// needs_changes_note (visible on the queue card) and clears any prior
// channel approvals so the submission re-enters the pre-approval state.
// Same behavior the old Approval Desk server action had — moved into
// the consolidated detail flow.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface RouteCtx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  await requireAdmin()
  const { id } = await ctx.params
  const body = await req.json().catch(() => null) as { note?: string } | null
  const note = body?.note?.trim()
  if (!note) return NextResponse.json({ error: 'note required' }, { status: 400 })

  const sb = createAdminClient()
  const { error } = await sb
    .from('community_submissions')
    .update({
      needs_changes_note:  note,
      approved_web:        false,
      approved_newsletter: false,
      approved_social:     false,
    })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
