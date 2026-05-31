// /api/admin/column-branding
//
// GET    — list all column branding rows
// POST   — upsert a row (column_slug + logo_url + tagline)
// DELETE — clear a row (?slug=...)
//
// File upload happens through the existing /api/admin/upload route in
// the admin page; this endpoint just persists the resulting URL + tagline.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function GET() {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('column_branding')
    .select('*')
    .order('column_slug', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ branding: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { column_slug, logo_url, tagline } = body
    if (!column_slug || typeof column_slug !== 'string') {
      return NextResponse.json({ error: 'column_slug required' }, { status: 400 })
    }
    const supabase = supabaseAdmin()
    const { error } = await supabase
      .from('column_branding')
      .upsert({
        column_slug,
        logo_url: logo_url || null,
        tagline:  tagline?.trim() || null,
      }, { onConflict: 'column_slug' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
  const supabase = supabaseAdmin()
  const { error } = await supabase.from('column_branding').delete().eq('column_slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
