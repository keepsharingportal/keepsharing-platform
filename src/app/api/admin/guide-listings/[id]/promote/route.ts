// POST /api/admin/guide-listings/[id]/promote
//
// The bridge event: a basic guide listing becomes a Featured listing
// AND links to a real advertiser_account. This is the only way a guide
// listing should populate the CRM Businesses view (per the design
// principle that guides ≠ CRM unless someone's actively paying).
//
// Body:
//   { mode: 'link', advertiser_account_id: string }
//     Existing advertiser already exists; just associate this listing
//     to them and flip listing_tier to 'featured'.
//
//   { mode: 'create', business_name: string }
//     No existing advertiser; create a new advertiser_account using
//     the listing's inline business identity as the seed, then link.
//     Slug auto-generated and de-collided.
//
// Returns: { listing, advertiser_account } so the editor's UI can
// jump straight to the new advertiser detail page after promotion.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface Body {
  mode?:                 'link' | 'create'
  advertiser_account_id?: string
  business_name?:        string
}

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'advertiser'
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const supabase = createAdminClient()

  // Load the listing to seed any new advertiser from its inline data.
  const { data: listing, error: loadErr } = await supabase
    .from('guide_listings')
    .select('id, business_name, office_phone, mobile_phone, website_url, contact_email, address, city_state_zip, neighborhood, hero_photo_url, card_hook')
    .eq('id', id)
    .maybeSingle()
  if (loadErr || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  let advertiserId: string

  if (body.mode === 'link') {
    if (!body.advertiser_account_id) {
      return NextResponse.json({ error: 'advertiser_account_id required for mode=link' }, { status: 400 })
    }
    advertiserId = body.advertiser_account_id
    // Sanity: confirm the advertiser exists.
    const { data: adv } = await supabase
      .from('advertiser_accounts')
      .select('id')
      .eq('id', advertiserId)
      .maybeSingle()
    if (!adv) return NextResponse.json({ error: 'advertiser_account_id not found' }, { status: 400 })

  } else if (body.mode === 'create') {
    const name = (body.business_name?.trim() || listing.business_name)?.trim()
    if (!name) {
      return NextResponse.json({ error: 'business_name required when listing has no inline name' }, { status: 400 })
    }

    // Pre-load existing slugs so we can disambiguate in one go.
    const { data: slugRows } = await supabase
      .from('advertiser_accounts')
      .select('slug')
      .limit(10000)
    const existingSlugs = new Set<string>(((slugRows ?? []) as Array<{ slug: string }>).map(r => r.slug))
    function uniqueSlug(base: string): string {
      if (!existingSlugs.has(base)) { existingSlugs.add(base); return base }
      let n = 2
      while (existingSlugs.has(`${base}-${n}`)) n++
      const out = `${base}-${n}`
      existingSlugs.add(out)
      return out
    }

    const slug = uniqueSlug(makeSlug(name))
    // Seed every field we can from the listing's inline identity so
    // the new CRM record doesn't start empty.
    const { data: created, error: createErr } = await supabase
      .from('advertiser_accounts')
      .insert({
        slug,
        business_name:   name,
        office_phone:    listing.office_phone,
        mobile_phone:    listing.mobile_phone,
        website_url:     listing.website_url,
        contact_email:   listing.contact_email,
        address:         listing.address,
        city_state_zip:  listing.city_state_zip,
        neighborhood:    listing.neighborhood,
        hero_photo_url:  listing.hero_photo_url,
        card_hook:       listing.card_hook,
        kind:            'advertiser',
        lifecycle_stage: 'active',
      })
      .select('id, slug, business_name')
      .single()
    if (createErr || !created) {
      return NextResponse.json({ error: createErr?.message ?? 'Failed to create advertiser' }, { status: 500 })
    }
    advertiserId = created.id

  } else {
    return NextResponse.json({ error: 'mode must be "link" or "create"' }, { status: 400 })
  }

  // Update the listing: link advertiser + flip tier to featured.
  const { data: updated, error: updateErr } = await supabase
    .from('guide_listings')
    .update({
      advertiser_account_id: advertiserId,
      listing_tier:          'featured',
    })
    .eq('id', id)
    .select('*')
    .single()
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Pull the (now-linked) advertiser for the response.
  const { data: adv } = await supabase
    .from('advertiser_accounts')
    .select('id, slug, business_name, kind')
    .eq('id', advertiserId)
    .maybeSingle()

  return NextResponse.json({ ok: true, listing: updated, advertiser: adv })
}
