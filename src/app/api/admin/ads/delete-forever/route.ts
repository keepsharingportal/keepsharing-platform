// POST /api/admin/ads/delete-forever  body: { id }
//
// Permanent hard-delete of an ad_placements row. Reserved for genuine
// data mistakes — a typo'd booking that never went live, a test row,
// a duplicate. The normal Delete button uses soft archive instead;
// this endpoint backs a "Delete forever" option gated behind a typed
// confirmation in the UI.
//
// Cascades: any rows in ad_renewal_log tied to this ad are removed
// (ON DELETE CASCADE from migration 119), and short_links rows have
// their ad_placement_id nulled (ON DELETE SET NULL from migration 123).
// Customer's overall history is preserved at the advertiser_account
// level — only this specific ad row is removed.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  await requireAdmin()
  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('ad_placements').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
