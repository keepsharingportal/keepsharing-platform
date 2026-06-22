// PATCH /api/public/onboarding/[token]
//
// Public save endpoint for the token-authenticated onboarding wizard.
// Same payload shape as the admin endpoint (target='advertiser' or
// 'guide_data', plus patch), but the auth boundary is the token: the
// endpoint resolves the advertiser by onboarding_token and refuses
// any request whose token doesn't match an active row.
//
// We re-verify the token on every write — no session cookie, no
// trust in the URL alone after the initial page load.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

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

interface RouteParams { params: Promise<{ token: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { token } = await params
  if (!/^[0-9a-f-]{30,40}$/i.test(token)) {
    return NextResponse.json({ error: 'Invalid token format.' }, { status: 400 })
  }

  const supabase = sb()
  const { data: acct } = await supabase
    .from('advertiser_accounts')
    .select('id, onboarding_token_expires_at')
    .eq('onboarding_token', token)
    .maybeSingle()

  if (!acct) return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 403 })

  if (acct.onboarding_token_expires_at) {
    const expires = new Date(acct.onboarding_token_expires_at as string)
    if (expires.getTime() < Date.now()) {
      return NextResponse.json({ error: 'This link has expired.' }, { status: 403 })
    }
  }

  const body  = await req.json().catch(() => ({})) as Body
  const patch = body.patch ?? {}

  if (body.target === 'advertiser') {
    const filtered: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(patch)) {
      if (ADVERTISER_FIELDS.has(k)) filtered[k] = v
    }
    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: 'No editable fields in patch.' }, { status: 400 })
    }
    const { error } = await supabase
      .from('advertiser_accounts')
      .update(filtered)
      .eq('id', acct.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.target === 'guide_data') {
    const guideSlug = body.guide_slug
    if (!guideSlug) return NextResponse.json({ error: 'guide_slug required.' }, { status: 400 })

    const { data: existing } = await supabase
      .from('guide_listings')
      .select('id, guide_data')
      .eq('advertiser_account_id', acct.id)
      .eq('guide_type_slug', guideSlug)
      .maybeSingle()

    if (existing) {
      const merged = { ...((existing.guide_data ?? {}) as Record<string, unknown>), ...patch }
      const { error } = await supabase
        .from('guide_listings')
        .update({ guide_data: merged })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, listing_id: existing.id })
    }

    const { data: created, error } = await supabase
      .from('guide_listings')
      .insert({
        advertiser_account_id: acct.id,
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
