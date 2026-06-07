// POST /api/admin/print-placements/bulk-delete
//
// Body: { ids: string[] }
// Removes every placement in the list in one round trip. Used by the
// layout sheet's bulk-delete action after the editor clones a month
// forward and trims expired / non-renewing sponsors.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { ids?: string[] } | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  const ids = (body.ids ?? []).map(s => s.trim()).filter(Boolean)
  if (ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('print_ad_placements')
    .delete()
    .in('id', ids)
    .select('id')
  if (error) {
    console.error('[print-placements bulk-delete]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deleted: data?.length ?? 0 })
}
