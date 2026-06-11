// GET /api/claim/[placementId]/status
// Public, unauthenticated. Returns whether the placement has been claimed.
// Used by the post-checkout success poller to detect when the webhook has
// landed and the placement is activated.
//
// Why this is safe to expose: the only data leaked is a boolean
// "is this open spot still open?" — same information any visitor would
// derive from /claim/[placementId] itself.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ placementId: string }> }) {
  const { placementId } = await ctx.params
  if (!placementId) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  const sb = adminDb()
  const { data } = await sb
    .from('ad_placements')
    .select('claimed_at, advertiser_account_id')
    .eq('id', placementId)
    .maybeSingle()
  const row = data as { claimed_at: string | null; advertiser_account_id: string | null } | null
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ claimed: !!(row.claimed_at || row.advertiser_account_id) })
}
