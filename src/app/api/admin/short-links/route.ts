// POST /api/admin/short-links — create a new shortcode.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

interface Body {
  shortcode?:             string
  destination?:           string
  content_type?:          string
  content_data?:          Record<string, unknown>
  label?:                 string | null
  utm_source?:            string
  utm_medium?:            string
  utm_campaign?:          string | null
  utm_content?:           string | null
  advertiser_account_id?: string | null
  qr_primary_color?:      string | null
  // Migration 127 fields. Both optional so a fresh DB (no migration)
  // or an older client (no purpose/channel in body) still inserts cleanly.
  purpose?:               string
  channel?:               string | null
}

const VALID_PURPOSES = ['qr', 'ad', 'campaign'] as const

export async function POST(req: NextRequest) {
  try { await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const shortcode   = body.shortcode?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  const destination = body.destination?.trim()
  if (!shortcode)   return NextResponse.json({ error: 'shortcode is required' }, { status: 400 })
  if (!destination) return NextResponse.json({ error: 'destination is required' }, { status: 400 })

  const supabase = supabaseAdmin()

  // Conflict check
  const existing = await supabase
    .from('short_links')
    .select('id')
    .ilike('shortcode', shortcode)
    .eq('is_active', true)
    .maybeSingle()
  if (existing.data) {
    return NextResponse.json({ error: `Shortcode "${shortcode}" already exists` }, { status: 409 })
  }

  // Normalize purpose — anything outside the allowlist falls back to 'qr'
  // (the column default). Channel passes through as-is; the UI controls
  // the curated list.
  const purpose = body.purpose && (VALID_PURPOSES as readonly string[]).includes(body.purpose)
    ? body.purpose
    : 'qr'

  // Build the insert object. Try with the migration-127 columns first;
  // fall back to the older shape if the DB hasn't been migrated yet.
  const baseInsert = {
    shortcode,
    destination,
    content_type:          body.content_type   || 'url',
    content_data:          body.content_data    || {},
    label:                 body.label           ?? null,
    utm_source:            body.utm_source      || 'magazine',
    utm_medium:            body.utm_medium      || 'qr',
    utm_campaign:          body.utm_campaign    || null,
    utm_content:           body.utm_content     || null,
    advertiser_account_id: body.advertiser_account_id || null,
    qr_primary_color:      body.qr_primary_color || '#ef6442',
  }
  let res = await supabase
    .from('short_links')
    .insert({ ...baseInsert, purpose, channel: body.channel ?? null })
    .select('*')
    .single()
  if (res.error && /column .* does not exist/i.test(res.error.message)) {
    res = await supabase
      .from('short_links')
      .insert(baseInsert)
      .select('*')
      .single()
  }
  const { data, error } = res

  if (error) {
    console.error('[admin/short-links POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/admin/content/short-links')
  return NextResponse.json({ success: true, link: data })
}
