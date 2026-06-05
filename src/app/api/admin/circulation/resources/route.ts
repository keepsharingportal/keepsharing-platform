// CRUD for circulation_resources.

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

const FIELDS = ['name', 'category', 'description', 'address', 'city', 'phone', 'website', 'email', 'lat', 'lng', 'logo_url', 'photo_url', 'active', 'sort_order'] as const

export async function GET(req: NextRequest) {
  await requireAdmin()
  const market = new URL(req.url).searchParams.get('market')?.trim() || 'rrp'
  const { data, error } = await sb().from('circulation_resources').select('*').eq('market', market).order('sort_order').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ resources: data ?? [] })
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { market?: string; name?: string } & Partial<Record<typeof FIELDS[number], unknown>> | null
  if (!body?.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const row: Record<string, unknown> = { market: body.market?.trim() || 'rrp', name: body.name.trim() }
  for (const f of FIELDS) if (body[f] !== undefined) row[f] = body[f]
  const { data, error } = await sb().from('circulation_resources').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ resource: data })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as ({ id?: string } & Partial<Record<typeof FIELDS[number], unknown>>) | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updates: Record<string, unknown> = {}
  for (const f of FIELDS) if (body[f] !== undefined) updates[f] = body[f]
  const { error } = await sb().from('circulation_resources').update(updates).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  await requireAdmin()
  const id = new URL(req.url).searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await sb().from('circulation_resources').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
