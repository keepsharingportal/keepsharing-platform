// CRUD for publications.

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

const FIELDS = ['name', 'abbrev', 'color_hex', 'logo_url', 'print_total', 'holdback', 'active', 'sort_order', 'website', 'issuu_url'] as const

export async function GET() {
  await requireAdmin()
  const { data, error } = await sb().from('circulation_publications').select('*').order('sort_order').order('short_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ publications: data ?? [] })
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { short_name?: string; name?: string; abbrev?: string } & Partial<Record<typeof FIELDS[number], unknown>> | null
  if (!body?.short_name?.trim() || !body.name?.trim() || !body.abbrev?.trim()) {
    return NextResponse.json({ error: 'short_name, name, abbrev required' }, { status: 400 })
  }
  const row: Record<string, unknown> = { short_name: body.short_name.trim().toLowerCase(), name: body.name.trim(), abbrev: body.abbrev.trim() }
  for (const f of FIELDS) if (body[f] !== undefined) row[f] = body[f]
  const { data, error } = await sb().from('circulation_publications').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ publication: data })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as ({ id?: string } & Partial<Record<typeof FIELDS[number], unknown>>) | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updates: Record<string, unknown> = {}
  for (const f of FIELDS) if (body[f] !== undefined) updates[f] = body[f]
  const { error } = await sb().from('circulation_publications').update(updates).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
