// POST /api/admin/guide-listings/bulk-delete
//
// Body: { ids: string[] }
// Hard-deletes guide listing rows. Used by the per-guide browse view
// to drop bad imports / stale entries / merged duplicates. Does NOT
// touch advertiser_accounts — listings are content; advertisers are
// CRM. Cleanup of an orphaned advertiser (if a listing was the only
// thing linking it) lives in the advertiser bulk-delete flow.

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
  const { error } = await supabase
    .from('guide_listings')
    .delete()
    .in('id', ids)
  if (error) {
    console.error('[guide-listings bulk-delete]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deleted: ids.length })
}
