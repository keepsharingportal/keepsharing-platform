// /api/admin/ads/tracked-link
//
//   GET   ?id=<adId>     → return existing tracked short_link for the ad (if any)
//   POST  body { id }    → create a new tracked link for the ad (auto-shortcode)
//
// The tracked link is a short_links row scoped to one ad_placement.
// Clicks redirect through /go/<shortcode>, which increments click_count
// and appends UTM parameters before sending the reader to the ad's
// destination URL. Same pipeline as magazine QR codes — the editor
// gets one report across print + digital traffic.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Generate a 7-char lowercase alphanumeric shortcode. Avoids
// ambiguous-looking chars (0/o/l/1).
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
function randomShortcode(len = 7): string {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return s
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('short_links')
    .select('id, shortcode, destination, click_count, is_active, created_at')
    .eq('ad_placement_id', id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && !/column .* does not exist/i.test(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ link: data ?? null })
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()

  // Pull the ad + its advertiser so we can label the short_link with the
  // business name. That way /admin/content/short-links rows read
  // "YMCA — Homepage bottom banner" instead of just the ad headline,
  // and clicks roll up under the right customer in reports.
  const { data: ad, error: adErr } = await supabase
    .from('ad_placements')
    .select('id, ad_link, placement_type, context_slug, advertiser_account_id, ad_headline, advertiser:advertiser_account_id (id, business_name, slug)')
    .eq('id', id)
    .single()
  if (adErr || !ad) return NextResponse.json({ error: adErr?.message ?? 'ad not found' }, { status: 404 })

  if (!ad.ad_link) {
    return NextResponse.json({ error: 'Set a CTA link on the ad first — the tracked URL needs a destination to redirect to.' }, { status: 400 })
  }

  // Pull the advertiser business_name + slug for label + utm_content.
  const adv = (ad as Record<string, unknown>).advertiser as { id?: string; business_name?: string; slug?: string } | null
  const advertiserName = adv?.business_name ?? null
  const advertiserSlug = adv?.slug         ?? null

  // Friendly label: "[Advertiser] — [Slot]" or just the slot if no
  // advertiser is set yet. utm_content gets the slug so it slices
  // cleanly in analytics.
  const slotLabel  = ad.placement_type.replace(/_/g, ' ')
  const label      = advertiserName ? `${advertiserName} — ${slotLabel}` : (ad.ad_headline ?? slotLabel)
  const utmContent = advertiserSlug ?? ((ad.ad_headline ?? '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || null)

  // Mint a unique shortcode. Retry on collision (rare with 31^7 ≈ 27 billion).
  let shortcode = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomShortcode()
    const { data: existing } = await supabase
      .from('short_links')
      .select('id')
      .eq('shortcode', candidate)
      .eq('is_active', true)
      .maybeSingle()
    if (!existing) { shortcode = candidate; break }
  }
  if (!shortcode) return NextResponse.json({ error: 'shortcode collision — try again' }, { status: 500 })

  const { data: created, error: createErr } = await supabase
    .from('short_links')
    .insert({
      shortcode,
      destination:     ad.ad_link,
      utm_source:      'site',
      utm_medium:      'ad',
      utm_campaign:    ad.placement_type,
      utm_content:     utmContent,
      label,
      ad_placement_id: id,
      advertiser_account_id: ad.advertiser_account_id ?? null,
      market:          'rrp',
      is_active:       true,
    })
    .select('id, shortcode, destination, click_count, is_active, created_at')
    .single()

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
  return NextResponse.json({ link: created })
}
