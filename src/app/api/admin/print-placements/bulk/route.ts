// POST /api/admin/print-placements/bulk
//
// Apply one patch to many placements in a single round trip. Used by
// the layout sheet's bulk-edit modal: editor picks N rows, opens the
// modal, ticks which fields to change, sets the new values, applies
// to all of them at once.
//
// Body: { ids: string[], patch: { ... editable fields ... } }
//
// Returns: { ok, updated, errors }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const EDITABLE = new Set([
  'issue_month', 'design', 'directory', 'size', 'layout',
  'price', 'social_budget', 'layout_notes', 'specific_months',
  'expires_month', 'notes', 'is_ongoing', 'ad_label',
])

interface Body {
  ids?:   string[]
  patch?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const ids = (body.ids ?? []).map(s => s.trim()).filter(Boolean)
  if (ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })

  const raw = body.patch ?? {}
  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!EDITABLE.has(k)) continue
    updates[k] = v
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'patch must contain at least one editable field' }, { status: 400 })
  }
  // Normalize empty strings to NULL on the optional text fields so the
  // editor saying 'clear this field' actually clears it.
  for (const k of ['layout_notes', 'notes', 'expires_month', 'layout'] as const) {
    if (k in updates && typeof updates[k] === 'string') {
      updates[k] = (updates[k] as string).trim() || null
    }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('print_ad_placements')
    .update(updates)
    .in('id', ids)
    .select('id')
  if (error) {
    console.error('[print-placements bulk PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, updated: data?.length ?? 0 })
}
