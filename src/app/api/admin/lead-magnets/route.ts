// /api/admin/lead-magnets
//
// GET  → list all magnets for ?brand=rrp (optionally ?vertical=birthday)
// POST → create a new magnet ({ vertical, slug, title, source, brand_slug? })
//        slug is unique within (brand, vertical); source is the value
//        the subscribe endpoint receives to fire this magnet.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const brand    = req.nextUrl.searchParams.get('brand')    ?? 'rrp'
  const vertical = req.nextUrl.searchParams.get('vertical') ?? null
  const sb = createAdminClient()
  let q = sb
    .from('lead_magnets')
    .select('*')
    .eq('brand_slug', brand)
    .order('vertical')
    .order('slug')
  if (vertical) q = q.eq('vertical', vertical)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({})) as {
    vertical?:   string
    title?:      string
    slug?:       string
    source?:     string
    brand_slug?: string
  }

  const brand_slug = (body.brand_slug ?? 'rrp').trim() || 'rrp'
  const vertical   = (body.vertical ?? '').trim()
  const title      = (body.title    ?? '').trim()
  const rawSlug    = (body.slug     ?? title).trim()
  const slug       = slugify(rawSlug)
  const source     = (body.source   ?? '').trim() || null

  if (!vertical) return NextResponse.json({ error: 'Vertical required.' }, { status: 400 })
  if (!title)    return NextResponse.json({ error: 'Title required.' },    { status: 400 })
  if (!slug)     return NextResponse.json({ error: 'Slug required.' },     { status: 400 })

  const sb = createAdminClient()
  const { data: existing } = await sb
    .from('lead_magnets')
    .select('id')
    .eq('brand_slug', brand_slug)
    .eq('vertical', vertical)
    .eq('slug', slug)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: `Slug '${slug}' already exists in this vertical.` }, { status: 409 })
  }

  // Source is brand-unique — surface a friendly error if it's taken.
  if (source) {
    const { data: srcDupe } = await sb
      .from('lead_magnets')
      .select('id, title, vertical')
      .eq('brand_slug', brand_slug)
      .eq('source', source)
      .maybeSingle()
    if (srcDupe) {
      return NextResponse.json({
        error: `Trigger source '${source}' is already used by '${srcDupe.title}' (${srcDupe.vertical}). Each source can only fire one magnet.`,
      }, { status: 409 })
    }
  }

  const { data, error } = await sb
    .from('lead_magnets')
    .insert({
      brand_slug,
      vertical,
      slug,
      title,
      source,
      email_subject: '',
      email_body:    '',
      ghl_tags:      [],
      is_active:     true,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
