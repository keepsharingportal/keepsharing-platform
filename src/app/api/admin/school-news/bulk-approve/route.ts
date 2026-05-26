// POST /api/admin/school-news/bulk-approve
// Body: { ids: string[] }
//
// Marks every selected pending bit as approved and stamps published_at = now
// (preserving any backdated published_at the operator already set). Used by
// the action bar's "Approve N" button to clear a batch from the review queue.
//
// Distinct from /drip-schedule, which staggers publish times across days.
// Bulk-approve publishes them all immediately.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface Body {
  ids?: string[]
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null
  const ids  = Array.isArray(body?.ids) ? body!.ids.filter(s => typeof s === 'string' && s.length > 0) : []
  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }

  const supabase = supabaseAdmin()
  const nowIso   = new Date().toISOString()

  // Load existing rows so we can preserve any backdated published_at instead
  // of overwriting it with now. Same logic the single-row approve PATCH uses.
  const { data: existing, error: loadErr } = await supabase
    .from('school_bits')
    .select('id, published_at')
    .in('id', ids)
  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 })
  }

  type Row = { id: string; published_at: string | null }
  const rows = (existing ?? []) as Row[]

  // Split into two groups: rows that already have a published_at (keep theirs)
  // and rows that don't (stamp now). Two updates instead of N for efficiency.
  const keep  = rows.filter(r => r.published_at).map(r => r.id)
  const stamp = rows.filter(r => !r.published_at).map(r => r.id)

  let approved = 0
  if (keep.length > 0) {
    const { error } = await supabase
      .from('school_bits')
      .update({ status: 'approved', reviewed_at: nowIso })
      .in('id', keep)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    approved += keep.length
  }
  if (stamp.length > 0) {
    const { error } = await supabase
      .from('school_bits')
      .update({ status: 'approved', reviewed_at: nowIso, published_at: nowIso })
      .in('id', stamp)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    approved += stamp.length
  }

  revalidatePath('/admin/school-news')
  revalidatePath('/family-resource-guide')
  revalidatePath('/school-zone')
  revalidatePath('/school-bits')
  return NextResponse.json({ approved })
}
