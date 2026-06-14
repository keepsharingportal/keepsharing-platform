// POST /api/admin/community-submissions/[id]/approve-channel
// Body: { channel: 'web' | 'newsletter' | 'social' | 'all', approved: boolean }
//
// Channel-level approval gates for community_submissions. Moved off the
// (deleted) Approval Desk's server actions into a JSON endpoint so any
// page that surfaces an editorial panel can use it — currently the
// canonical /admin/community/[id] detail.
//
// Editorial integrity preserved: any channel approval also flips status
// to 'approved' and stamps editor_reviewed_at. Un-approving (approved:
// false) clears the flag but does NOT walk status backwards — once a
// submission has been touched by an editor, the audit trail of when it
// reached 'approved' is preserved.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type Channel = 'web' | 'newsletter' | 'social' | 'all'

interface RouteCtx { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  await requireAdmin()
  const { id } = await ctx.params
  const body = await req.json().catch(() => null) as { channel?: Channel; approved?: boolean } | null
  if (!body?.channel) return NextResponse.json({ error: 'channel required' }, { status: 400 })
  if (typeof body.approved !== 'boolean') return NextResponse.json({ error: 'approved required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.channel === 'web' || body.channel === 'all')        updates.approved_web        = body.approved
  if (body.channel === 'newsletter' || body.channel === 'all') updates.approved_newsletter = body.approved
  if (body.channel === 'social' || body.channel === 'all')     updates.approved_social     = body.approved

  if (body.approved) {
    updates.editor_reviewed_at = new Date().toISOString()
    updates.status             = 'approved'
    // If editor approves while there's an outstanding "needs changes"
    // note, the approval implicitly clears it. (Same behavior as the
    // legacy server action.)
    updates.needs_changes_note = null
  }

  const sb = createAdminClient()
  const { error } = await sb
    .from('community_submissions')
    .update(updates)
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
