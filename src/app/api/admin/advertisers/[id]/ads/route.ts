// GET /api/admin/advertisers/[id]/ads
//
// Every ad_placement that belongs to this advertiser. Used by the ad
// edit form's Customer section to show "what else is this customer
// running" — surfaces opportunity (a buyer who already trusts us with
// one slot is the obvious upsell candidate for adjacent ones) and
// avoids the "I had no idea they were also on the calendar" moment.
//
// Service-role + admin-auth. Ordered by ends_at descending so the
// upcoming-renewal ads bubble to the top.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  // Include archived ads — the customer's full history (active + paused
  // + archived) is what makes the "Other ads from this customer" panel
  // useful. Caller renders archived rows muted.
  const { data, error } = await supabase
    .from('ad_placements')
    .select('id, placement_type, context_slug, ad_headline, is_active, starts_at, ends_at, archived_at, impression_count, click_count')
    .eq('advertiser_account_id', id)
    .order('archived_at', { ascending: false, nullsFirst: true })
    .order('is_active',   { ascending: false })
    .order('ends_at',     { ascending: true, nullsFirst: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message, ads: [] }, { status: 500 })
  return NextResponse.json({ ads: data ?? [] })
}
