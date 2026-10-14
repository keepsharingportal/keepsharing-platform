// POST /api/admin/ads/renewal-token  body: { id }
// Generates or rotates the renewal token for an ad placement so the
// publisher can email it to the advertiser. The token is 256-bit
// base64url (32 random bytes). Rotating the token immediately invalidates
// any prior link — used when an advertiser asks for a fresh URL or the
// publisher suspects a leak.

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { requireAdmin } from '@/lib/admin/auth'
import { requireAal2 } from '@/lib/admin/mfa-gate'
import { recordAuditEvent } from '@/lib/admin/audit'
import { createAdminClient } from '@/lib/supabase/admin'
import { publicOriginForBrand } from '@/lib/markets'

export const runtime = 'nodejs'

function mint(): string {
  return randomBytes(32).toString('base64url')
}

export async function POST(req: NextRequest) {
  const ctx  = await requireAdmin()
  const gate = await requireAal2()
  if (!gate.ok) return gate.response

  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sr = createAdminClient()

  // Which brand's advertiser is this? The renewal link below was built from
  // NEXT_PUBLIC_SITE_URL with a hardcoded River Region fallback, so a Greater
  // Pensacola advertiser was emailed a River Region URL — and the token is
  // scoped to the placement, so the link also landed on a site that may not
  // recognise it. The placement carries its own market (migration 232).
  // select('*') rather than naming the column: this must not fail on a
  // database where 232 has not run.
  const { data: placement } = await sr
    .from('ad_placements').select('*').eq('id', id).maybeSingle()
  const placementMarket = (placement as { market?: string | null } | null)?.market ?? null

  const token = mint()
  const { error } = await sr.from('ad_placements').update({
    renewal_token:            token,
    renewal_token_created_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent({
    ctx, req,
    action:       'ad_placement.renewal_token_generated',
    target_table: 'ad_placements',
    target_id:    id,
  })

  // The advertiser's own brand, then the admin's active brand, then whatever
  // the deployment is configured as. Never another brand's host.
  const base = publicOriginForBrand(placementMarket ?? ctx.activeMarket)
    || process.env.NEXT_PUBLIC_SITE_URL
    || ''
  return NextResponse.json({
    ok: true, token,
    url:    `${base}/renew/${token}`,
    market: placementMarket ?? ctx.activeMarket,
  })
}
