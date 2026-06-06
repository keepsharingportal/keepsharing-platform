// POST /api/admin/ads/toggle  body: { id, is_active }
// POST /api/admin/ads/delete  body: { id }
//
// Service-role mutations so the /admin/ads pause/delete buttons work
// regardless of RLS on related tables.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  await requireAdmin()
  const { id, is_active } = await req.json().catch(() => ({})) as { id?: string; is_active?: boolean }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('ad_placements')
    .update({ is_active: !!is_active })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
