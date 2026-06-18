// /api/admin/birthday/lead-magnets
//
// GET  → list all magnets for ?brand=rrp
// POST → create a new magnet ({ slug, title, source, brand_slug? })
//        slug is the URL/identity key (kebab); source is the request
//        body value /api/birthday/subscribe receives (e.g. 'goody-bag-block').

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
  const brand = req.nextUrl.searchParams.get('brand') ?? 'rrp'
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('birthday_lead_magnets')
    .select('*')
    .eq('brand_slug', brand)
    .order('slug')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({})) as {
    title?:      string
    slug?:       string
    source?:     string
    brand_slug?: string
  }

  const brand_slug = (body.brand_slug ?? 'rrp').trim() || 'rrp'
  const title      = (body.title  ?? '').trim()
  const rawSlug    = (body.slug   ?? title).trim()
  const slug       = slugify(rawSlug)
  const source     = (body.source ?? '').trim() || null

  if (!title) return NextResponse.json({ error: 'Title required.' }, { status: 400 })
  if (!slug)  return NextResponse.json({ error: 'Slug required (e.g. goody-bag-list).' }, { status: 400 })

  const sb = createAdminClient()
  const { data: existing } = await sb
    .from('birthday_lead_magnets')
    .select('id')
    .eq('brand_slug', brand_slug)
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: `Slug '${slug}' already exists for this brand.` }, { status: 409 })

  const { data, error } = await sb
    .from('birthday_lead_magnets')
    .insert({
      brand_slug,
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
