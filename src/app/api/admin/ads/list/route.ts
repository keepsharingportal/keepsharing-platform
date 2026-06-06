// GET /api/admin/ads/list
//
// Service-role read of every ad_placements row so the /admin/ads page
// can render the YMCA dummy + every other booking without falling foul
// of advertiser_accounts RLS. The client component was reading via the
// anon client; if the joined advertiser_accounts row is RLS-hidden, the
// nested select silently fails the embed and (depending on PostgREST
// version) can return an empty array. Service role bypasses RLS so we
// see every row no matter who owns it.
//
// Auth: admin session required.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

// Try the full select first; if a migration adding rotation_group /
// pricing / etc. hasn't been applied yet, Postgres throws "column does
// not exist" and we degrade to the minimal column set. Keeps the admin
// usable for anyone whose Supabase is behind on migrations.
const FULL_SELECT = `
  id, placement_type, context_type, context_slug,
  ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link, ad_image_url,
  is_active, impression_count, click_count,
  starts_at, ends_at,
  rotation_group, rotation_weight,
  price_monthly, price_quarterly, price_annual,
  advertiser:advertiser_account_id ( business_name )
`

const MIN_SELECT = `
  id, placement_type, context_type, context_slug,
  ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link, ad_image_url,
  is_active, impression_count, click_count,
  starts_at, ends_at,
  advertiser:advertiser_account_id ( business_name )
`

export async function GET() {
  await requireAdmin()
  const supabase = createAdminClient()

  let data, error
  ({ data, error } = await supabase
    .from('ad_placements')
    .select(FULL_SELECT)
    .order('is_active',        { ascending: false })
    .order('display_priority', { ascending: false }))

  // Migration 093 not applied yet → fall back to the pre-093 column set.
  // Surface a hint so the editor knows what to apply (Vercel logs).
  if (error && /column .* does not exist/i.test(error.message)) {
    console.warn('[admin/ads/list] degrading to MIN_SELECT — apply migrations 093/117 to enable rotation + pricing columns. Original error:', error.message)
    ;({ data, error } = await supabase
      .from('ad_placements')
      .select(MIN_SELECT)
      .order('is_active',        { ascending: false })
      .order('display_priority', { ascending: false }))
  }

  if (error) {
    return NextResponse.json({ error: error.message, ads: [] }, { status: 500 })
  }

  // Also fetch ad_slot_settings so the admin page can render the
  // 3-state slot status (ON / EMPTY / HIDDEN). Pre-117 deploys may not
  // have the table — degrade silently to "no hidden slots."
  const { data: slotSettings } = await supabase
    .from('ad_slot_settings')
    .select('placement_type, context_slug, disabled')
    .eq('disabled', true)

  // Flatten the advertiser shape so the client doesn't have to deal with
  // the nested object that PostgREST returns from the FK embed.
  const ads = (data ?? []).map(row => {
    const r = row as Record<string, unknown>
    const adv = r.advertiser as { business_name: string } | null
    return {
      ...r,
      advertiser_accounts: adv ? { business_name: adv.business_name } : null,
    }
  })

  // Hidden slot list — site-wide disables. Keyed by placement_type so
  // the admin page can show a HIDE badge per slot without having to
  // group by context.
  const hiddenSlots = ((slotSettings ?? []) as Array<{ placement_type: string; context_slug: string | null; disabled: boolean }>)
    .filter(s => s.context_slug === null)
    .map(s => s.placement_type)

  // Merge column_sponsors as virtual rows so the editor sees ALL ad
  // inventory in one list. Each column_sponsor synthesizes a "row" with
  // placement_type='section_sponsor', context_slug=the column slug, and
  // a synthetic id prefixed `cs:` so we can route Edit/Delete back to
  // the right table. is_section_sponsor=true marks the row visually.
  type ColumnSponsorRow = {
    id: string; column_slug: string; sponsor_name: string;
    sponsor_message: string | null; cta_url: string | null;
    is_active: boolean; start_date: string; end_date: string;
    advertiser_id: string | null
  }
  const { data: columnSponsorRows } = await supabase
    .from('column_sponsors')
    .select('id, column_slug, sponsor_name, sponsor_message, cta_url, is_active, start_date, end_date, advertiser_id')

  const today = new Date().toISOString().slice(0, 10)
  const sponsorRows = ((columnSponsorRows ?? []) as ColumnSponsorRow[]).map(s => {
    // A column sponsor is "active" when is_active=true AND today is
    // within its date range. Otherwise it's paused/scheduled/expired.
    const inWindow = s.start_date <= today && s.end_date >= today
    return {
      id:                    `cs:${s.id}`,
      placement_type:        'section_sponsor',
      context_type:          'column',
      context_slug:          s.column_slug,
      ad_eyebrow:            'Section Sponsor',
      ad_headline:           s.sponsor_message ?? s.sponsor_name,
      ad_description:        null,
      ad_cta_label:          'Learn More',
      ad_link:               s.cta_url,
      ad_image_url:          null,
      is_active:             s.is_active && inWindow,
      impression_count:      0,
      click_count:           0,
      starts_at:             s.start_date,
      ends_at:               s.end_date,
      rotation_group:        null,
      rotation_weight:       null,
      advertiser_accounts:   s.sponsor_name ? { business_name: s.sponsor_name } : null,
      is_section_sponsor:    true,    // marker for the client to style + route Edit/Delete
    }
  })

  return NextResponse.json({ ads: [...ads, ...sponsorRows], hiddenSlots })
}
