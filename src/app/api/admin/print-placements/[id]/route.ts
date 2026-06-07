// PATCH  /api/admin/print-placements/[id] — edit fields on one placement.
// DELETE /api/admin/print-placements/[id] — drop the placement.
//
// PATCH body accepts any subset of the editable fields. Empty strings
// on text fields are normalized to NULL so they don't accidentally
// persist as ''. Numeric fields pass through unchanged so 0 is a valid
// value (means free placement / unpriced).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const EDITABLE = new Set([
  'issue_month', 'design', 'directory', 'size', 'layout',
  'price', 'social_budget', 'layout_notes', 'specific_months',
  'expires_month', 'notes',
])

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE.has(k)) continue
    updates[k] = v
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  // Normalize empty strings to NULL on optional text fields.
  for (const k of ['layout_notes', 'notes', 'expires_month', 'layout'] as const) {
    if (k in updates) {
      const v = updates[k]
      if (typeof v === 'string') updates[k] = v.trim() || null
    }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('print_ad_placements')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    console.error('[print-placements PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ placement: data })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('print_ad_placements')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('[print-placements DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
