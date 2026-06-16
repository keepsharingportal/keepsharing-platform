// PATCH /api/admin/birthday/real-parties/[id]  — moderate (approve/reject)
// DELETE /api/admin/birthday/real-parties/[id] — permanently remove

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { id } = await params
  const { status } = await req.json().catch(() => ({})) as { status?: string }
  if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }
  const sb = createAdminClient()
  const update: Record<string, unknown> = { status }
  if (status === 'approved') update.approved_at = new Date().toISOString()
  if (status !== 'approved') update.approved_at = null
  const { error } = await sb.from('birthday_real_parties').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { id } = await params
  const sb = createAdminClient()
  const { error } = await sb.from('birthday_real_parties').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
