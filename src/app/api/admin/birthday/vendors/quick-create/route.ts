// POST /api/admin/birthday/vendors/quick-create
// Body: { business_name, website_url?, contact_phone?, neighborhood?, card_hook? }
//
// One-tap "add a vendor from the buzz form" endpoint. Creates an
// advertiser_accounts row with auto-generated slug. Editor fills the
// full birthday_profile later via /admin/birthday/sponsors.
//
// Returns { id, slug, business_name } so the caller can immediately
// select the new vendor in the dropdown.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugifyForUrl } from '@/lib/articles/slug'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  business_name?:  string
  website_url?:    string
  contact_phone?:  string
  neighborhood?:   string
  card_hook?:      string
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({})) as Body

  const name = (body.business_name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'business_name required' }, { status: 400 })

  const sb = createAdminClient()

  // Generate a slug, then ensure uniqueness with a numeric suffix if needed.
  let slug = slugifyForUrl(name)
  if (!slug) return NextResponse.json({ error: 'Business name produced an empty slug.' }, { status: 400 })
  let suffix = 1
  while (true) {
    const test = suffix === 1 ? slug : `${slug}-${suffix}`
    const { data: existing } = await sb.from('advertiser_accounts').select('id').eq('slug', test).maybeSingle()
    if (!existing) { slug = test; break }
    suffix++
    if (suffix > 50) return NextResponse.json({ error: 'Could not generate a unique slug.' }, { status: 500 })
  }

  const insert: Record<string, unknown> = {
    business_name: name,
    slug,
  }
  if (body.website_url?.trim())   insert.website_url   = body.website_url.trim()
  if (body.contact_phone?.trim()) insert.contact_phone = body.contact_phone.trim()
  if (body.neighborhood?.trim())  insert.neighborhood  = body.neighborhood.trim()
  if (body.card_hook?.trim())     insert.card_hook     = body.card_hook.trim()

  const { data, error } = await sb
    .from('advertiser_accounts')
    .insert(insert)
    .select('id, slug, business_name')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
