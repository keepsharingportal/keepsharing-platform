// /api/admin/lead-magnets/[id]
//
// GET / PATCH / DELETE keyed by row id (UUID). PATCH whitelists the
// editable columns; DELETE is hard delete — the editor can toggle
// is_active to hide a magnet without losing the row.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = [
  'vertical', 'title', 'description', 'source',
  'file_url', 'preview_url',
  'email_subject', 'email_body', 'from_name',
  'ghl_tags', 'ghl_workflow_id',
  'is_active',
]

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { id } = await params
  const sb = createAdminClient()
  const { data, error } = await sb.from('lead_magnets').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Lead magnet not found.' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const update: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) update[k] = body[k]
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const sb = createAdminClient()
  const { data, error } = await sb
    .from('lead_magnets')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { id } = await params
  const sb = createAdminClient()
  const { error } = await sb.from('lead_magnets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
