// CRUD for circulation_routes.
// GET    /api/admin/circulation/routes?market=rrp        — list routes
// POST   /api/admin/circulation/routes                   — create
// PATCH  /api/admin/circulation/routes                   — update by id
// DELETE /api/admin/circulation/routes?id=...            — remove (cascades to stops)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const market = new URL(req.url).searchParams.get('market')?.trim() || 'rrp'
  const { data, error } = await sb()
    .from('circulation_routes')
    .select('*')
    .eq('market', market)
    .order('sort_order', { ascending: true })
    .order('name',       { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ routes: data ?? [] })
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as {
    market?: string; name?: string; city?: string | null; sort_order?: number; notes?: string | null
  } | null
  if (!body?.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const { data, error } = await sb()
    .from('circulation_routes')
    .insert({
      market:     body.market?.trim() || 'rrp',
      name:       body.name.trim(),
      city:       body.city ?? null,
      sort_order: body.sort_order ?? 0,
      notes:      body.notes ?? null,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ route: data })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as {
    id?: string; name?: string; city?: string | null; sort_order?: number; active?: boolean; notes?: string | null
  } | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updates: Record<string, unknown> = {}
  if (body.name       !== undefined) updates.name       = body.name
  if (body.city       !== undefined) updates.city       = body.city
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order
  if (body.active     !== undefined) updates.active     = body.active
  if (body.notes      !== undefined) updates.notes      = body.notes
  const { error } = await sb().from('circulation_routes').update(updates).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  await requireAdmin()
  const id = new URL(req.url).searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await sb().from('circulation_routes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
