// POST /api/admin/ads/delete  body: { id }
//
// Soft archive — sets archived_at = NOW() on the row. The ad disappears
// from the public site and from the default /admin/ads list, but the
// row stays in the database so the customer's history is intact (impressions,
// clicks, renewal log, tracked short_link associations all preserved).
//
// For genuine deletes (a typo, never went live), see /api/admin/ads/delete-forever.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { requireAal2 } from '@/lib/admin/mfa-gate'
import { recordAuditEvent } from '@/lib/admin/audit'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  const gate = await requireAal2()
  if (!gate.ok) return gate.response
  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()

  // Snapshot before for the audit trail.
  const { data: before } = await supabase
    .from('ad_placements')
    .select('id, placement_type, ad_headline, advertiser_account_id, is_active, archived_at')
    .eq('id', id)
    .maybeSingle()

  // Also force is_active = false so any public ad query that ONLY filters
  // on is_active (and hasn't been updated to also filter archived_at) still
  // excludes archived ads. Belt-and-suspenders.
  const { error } = await supabase
    .from('ad_placements')
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .eq('id', id)

  // Migration-tolerant: pre-124 deploys still hard-delete so the action
  // doesn't 500. Once 124 lands, soft archive takes over.
  if (error && /column .* does not exist/i.test(error.message)) {
    const { error: delErr } = await supabase.from('ad_placements').delete().eq('id', id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
    await recordAuditEvent({
      ctx, req,
      action:        'ad_placement.deleted',
      target_table:  'ad_placements',
      target_id:     id,
      before:        (before as Record<string, unknown> | null) ?? null,
      meta:          { mode: 'hard-delete-fallback' },
    })
    return NextResponse.json({ ok: true, mode: 'hard-delete-fallback' })
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await recordAuditEvent({
    ctx, req,
    action:        'ad_placement.archived',
    target_table:  'ad_placements',
    target_id:     id,
    before:        (before as Record<string, unknown> | null) ?? null,
    after:         { archived_at: new Date().toISOString(), is_active: false },
  })
  return NextResponse.json({ ok: true, mode: 'archived' })
}
