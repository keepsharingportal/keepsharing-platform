// /api/admin/todos
//
//   GET   → list every todo (parents + children), grouped client-side
//   PATCH body { id, status?, priority?, notes?, title? } → mutate row
//   POST  body { title, category?, priority?, parent_id?, notes? } → new
//   DELETE body { id } → soft impossibility; permanent delete cascades children
//
// Service role + super-admin gate. The list lives under /admin/today so
// only people who can see that page can mutate.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admin_todos')
    .select('id, parent_id, title, category, priority, status, notes, display_order, completed_at, created_at')
    .order('display_order', { ascending: true })
    .order('created_at',    { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ todos: data ?? [] })
}

const ALLOWED_PATCH = new Set(['status', 'priority', 'notes', 'title', 'category', 'display_order'])
const STATUSES = new Set(['open', 'in-progress', 'done'])

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({})) as Record<string, unknown> & { id?: string }
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rest)) {
    if (ALLOWED_PATCH.has(k)) updates[k] = v
  }
  if (typeof updates.status === 'string' && !STATUSES.has(updates.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }
  // Stamp completed_at when flipping to done; clear when re-opened.
  if (updates.status === 'done') updates.completed_at = new Date().toISOString()
  if (updates.status && updates.status !== 'done') updates.completed_at = null

  const supabase = createAdminClient()
  const { error } = await supabase.from('admin_todos').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({})) as {
    title?: string; category?: string; priority?: string; parent_id?: string; notes?: string
  }
  const title = (body.title ?? '').trim()
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('admin_todos').insert({
    title,
    category:  body.category ?? 'general',
    priority:  body.priority ?? 'medium',
    parent_id: body.parent_id ?? null,
    notes:     body.notes ?? null,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data?.id })
}

export async function DELETE(req: NextRequest) {
  await requireAdmin()
  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('admin_todos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
