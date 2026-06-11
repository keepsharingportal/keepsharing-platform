// POST /api/admin/ads/restore  body: { id }
//
// Clears archived_at on an ad_placements row — undoes a soft delete.
// The ad reappears in the active /admin/ads list with whatever
// is_active state it had before archiving.

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
  const { error } = await supabase
    .from('ad_placements')
    .update({ archived_at: null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await recordAuditEvent({
    ctx, req,
    action:        'ad_placement.restored',
    target_table:  'ad_placements',
    target_id:     id,
  })
  return NextResponse.json({ ok: true })
}
