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

  return NextResponse.json({ ads })
}
