// PATCH /api/admin/advertisers/[id]/onboarding
//
// Partial-save endpoint for the onboarding wizard. Accepts either:
//   { target: 'advertiser', patch: {...} }
//     → merges patch into advertiser_accounts row
//   { target: 'guide_data', guide_slug, patch: {...} }
//     → merges patch into guide_listings.guide_data JSONB for the
//       (advertiser, guide_slug) row. Creates the row if it doesn't
//       exist yet (first time the wizard touches a new guide).
//
// Whitelists every editable column so the wizard can't accidentally
// flip listing_tier / billing fields / etc.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADVERTISER_FIELDS = new Set([
  'business_name', 'address', 'city_state_zip', 'neighborhood',
  'office_phone', 'mobile_phone', 'contact_phone', 'contact_email',
  'website_url', 'card_hook', 'detail_lead', 'hero_photo_url',
  'gallery_image_urls',
])

interface Body {
  target?:     'advertiser' | 'guide_data'
  guide_slug?: string
  patch?:      Record<string, unknown>
}

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json().catch(() => ({})) as Body
  const patch = body.patch ?? {}

  const sb = createAdminClient()

  if (body.target === 'advertiser') {
    const filtered: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(patch)) {
      if (ADVERTISER_FIELDS.has(k)) filtered[k] = v
    }
    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: 'No editable fields in patch.' }, { status: 400 })
    }
    const { error } = await sb
      .from('advertiser_accounts')
      .update(filtered)
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.target === 'guide_data') {
    const guideSlug = body.guide_slug
    if (!guideSlug) return NextResponse.json({ error: 'guide_slug required.' }, { status: 400 })

    // Find or create the guide_listings row for this (advertiser, guide).
    const { data: existing } = await sb
      .from('guide_listings')
      .select('id, guide_data')
      .eq('advertiser_account_id', id)
      .eq('guide_type_slug', guideSlug)
      .maybeSingle()

    if (existing) {
      const merged = { ...((existing.guide_data ?? {}) as Record<string, unknown>), ...patch }
      const { error } = await sb
        .from('guide_listings')
        .update({ guide_data: merged })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, listing_id: existing.id })
    }

    // First-touch — create the row. Default to community tier;
    // the editor / sales workflow promotes to featured separately.
    const { data: created, error } = await sb
      .from('guide_listings')
      .insert({
        advertiser_account_id: id,
        guide_type_slug:       guideSlug,
        listing_tier:          'community',
        is_published:          true,
        display_order:         9999,
        guide_data:            patch,
      })
      .select('id')
      .single()
    if (error || !created) return NextResponse.json({ error: error?.message ?? 'create failed' }, { status: 500 })
    return NextResponse.json({ ok: true, listing_id: created.id })
  }

  return NextResponse.json({ error: 'Unknown target.' }, { status: 400 })
}
