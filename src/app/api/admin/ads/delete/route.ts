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
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  await requireAdmin()
  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
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
    return NextResponse.json({ ok: true, mode: 'hard-delete-fallback' })
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, mode: 'archived' })
}
