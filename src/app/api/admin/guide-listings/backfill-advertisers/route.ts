// POST /api/admin/guide-listings/backfill-advertisers
//
// One-shot remediation for guide_listings rows imported before the
// importer was updated to find-or-create an advertiser_accounts row
// for every CSV row. Scans listings with NULL advertiser_account_id,
// creates (or finds) the matching account by business_name (case-
// insensitive), copies inline identity columns, then links the
// listing to the account.
//
// Idempotent — safe to re-run. Optional `guide_type_slug` query param
// scopes the sweep; otherwise every guide is processed.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'
import { slugifyForUrl } from '@/lib/articles/slug'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

interface InlineRow {
  id:             string
  business_name:  string | null
  office_phone:   string | null
  contact_email:  string | null
  website_url:    string | null
  address:        string | null
  city_state_zip: string | null
  neighborhood:   string | null
  hero_photo_url: string | null
  card_hook:      string | null
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const guide = req.nextUrl.searchParams.get('guide_type_slug')
  const sb    = supabaseAdmin()

  let q = sb
    .from('guide_listings')
    .select('id, business_name, office_phone, contact_email, website_url, address, city_state_zip, neighborhood, hero_photo_url, card_hook')
    .is('advertiser_account_id', null)
    .not('business_name', 'is', null)
    .limit(5000)
  if (guide) q = q.eq('guide_type_slug', guide)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as InlineRow[]
  if (rows.length === 0) {
    return NextResponse.json({ scanned: 0, linked: 0, created: 0, skipped: 0, report: [] })
  }

  // Pre-load every existing account name for the lookup map.
  const { data: existing } = await sb.from('advertiser_accounts').select('id, business_name').limit(10000)
  const byName = new Map<string, string>()
  for (const a of (existing ?? []) as Array<{ id: string; business_name: string }>) {
    byName.set(a.business_name.trim().toLowerCase(), a.id)
  }

  async function uniqueSlug(name: string): Promise<string | null> {
    const base = slugifyForUrl(name)
    if (!base) return null
    let candidate = base
    for (let i = 1; i <= 50; i++) {
      if (i > 1) candidate = `${base}-${i}`
      const { data: hit } = await sb.from('advertiser_accounts').select('id').eq('slug', candidate).maybeSingle()
      if (!hit) return candidate
    }
    return null
  }

  let linked = 0, created = 0, skipped = 0
  const report: Array<{ name: string; action: 'linked' | 'created' | 'skipped'; reason?: string }> = []

  for (const r of rows) {
    const name = (r.business_name ?? '').trim()
    if (!name) { skipped++; report.push({ name: '(no name)', action: 'skipped', reason: 'Missing business_name' }); continue }

    let acctId = byName.get(name.toLowerCase()) ?? null
    if (!acctId) {
      const slug = await uniqueSlug(name)
      if (!slug) { skipped++; report.push({ name, action: 'skipped', reason: 'Could not generate unique slug' }); continue }
      const insert: Record<string, unknown> = {
        business_name: name,
        slug,
        is_active:     true,
      }
      if (r.office_phone)   insert.office_phone   = r.office_phone
      if (r.contact_email)  insert.contact_email  = r.contact_email
      if (r.website_url)    insert.website_url    = r.website_url
      if (r.address)        insert.address        = r.address
      if (r.city_state_zip) insert.city_state_zip = r.city_state_zip
      if (r.neighborhood)   insert.neighborhood   = r.neighborhood
      if (r.hero_photo_url) insert.hero_photo_url = r.hero_photo_url
      if (r.card_hook)      insert.card_hook      = r.card_hook
      const { data: createdRow, error: insertErr } = await sb
        .from('advertiser_accounts')
        .insert(insert)
        .select('id')
        .single()
      if (insertErr || !createdRow) { skipped++; report.push({ name, action: 'skipped', reason: insertErr?.message ?? 'insert failed' }); continue }
      const newId = createdRow.id
      acctId = newId
      byName.set(name.toLowerCase(), newId)
      created++
      report.push({ name, action: 'created' })
    } else {
      linked++
      report.push({ name, action: 'linked' })
    }

    await sb.from('guide_listings').update({ advertiser_account_id: acctId }).eq('id', r.id)
  }

  return NextResponse.json({
    scanned: rows.length,
    linked,
    created,
    skipped,
    report,
  })
}
