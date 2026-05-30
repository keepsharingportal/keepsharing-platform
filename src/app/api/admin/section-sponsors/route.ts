// /api/admin/section-sponsors
//
// CRUD for the column_sponsors table. Used by the admin /admin/section-sponsors
// page to assign an advertiser to a community spotlight column for a date range.
//
// GET    — list all sponsors (current + past + future), newest first
// POST   — create a new sponsor row
// PATCH  — update by id  (?id=...)
// DELETE — remove by id  (?id=...)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_FIELDS = [
  'column_slug', 'advertiser_id', 'sponsor_label', 'sponsor_name',
  'sponsor_message', 'logo_url', 'cta_label', 'cta_url', 'accent_color',
  'start_date', 'end_date', 'is_active',
]

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function GET() {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('column_sponsors')
    .select('*')
    .order('start_date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sponsors: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const payload: Record<string, unknown> = {}
    for (const k of ALLOWED_FIELDS) if (k in body) payload[k] = body[k]
    // Required fields
    if (!payload.column_slug || !payload.sponsor_name || !payload.start_date || !payload.end_date) {
      return NextResponse.json({ error: 'column_slug, sponsor_name, start_date, end_date are required' }, { status: 400 })
    }
    const supabase = supabaseAdmin()
    const { data, error } = await supabase
      .from('column_sponsors')
      .insert(payload)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ sponsor: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const body = await req.json()
    const payload: Record<string, unknown> = {}
    for (const k of ALLOWED_FIELDS) if (k in body) payload[k] = body[k]
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
    const supabase = supabaseAdmin()
    const { error } = await supabase.from('column_sponsors').update(payload).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const supabase = supabaseAdmin()
  const { error } = await supabase.from('column_sponsors').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
