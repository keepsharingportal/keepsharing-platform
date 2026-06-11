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

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
  return NextResponse.json({ ok: true, token, url: `${base}/renew/${token}` })
}
