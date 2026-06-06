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

export async function GET() {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ad_placements')
    .select(`
      id, placement_type, context_type, context_slug,
      ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link, ad_image_url,
      is_active, impression_count, click_count,
      starts_at, ends_at,
      rotation_group, rotation_weight,
      price_monthly, price_quarterly, price_annual,
      advertiser:advertiser_account_id ( business_name )
    `)
    .order('is_active',        { ascending: false })
    .order('display_priority', { ascending: false })

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
