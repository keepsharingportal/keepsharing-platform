// POST /api/admin/ads/toggle  body: { id, is_active }
// POST /api/admin/ads/delete  body: { id }
//
// Service-role mutations so the /admin/ads pause/delete buttons work
// regardless of RLS on related tables.

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
  const { id, is_active } = await req.json().catch(() => ({})) as { id?: string; is_active?: boolean }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('ad_placements')
    .update({ is_active: !!is_active })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await recordAuditEvent({
    ctx, req,
    action:        is_active ? 'ad_placement.activated' : 'ad_placement.paused',
    target_table:  'ad_placements',
    target_id:     id,
    after:         { is_active: !!is_active },
  })
  return NextResponse.json({ ok: true })
}
