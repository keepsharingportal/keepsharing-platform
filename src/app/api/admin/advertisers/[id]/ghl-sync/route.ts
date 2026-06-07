// POST /api/admin/advertisers/[id]/ghl-sync
//
// Pushes every advertiser_contacts row on this advertiser to GHL via
// upsertContact, tagged with role + tier + lifecycle metadata. Returns
// per-contact result counts so the calling UI can render success
// or surface errors.
//
// Idempotent: re-running upserts in place and overwrites tags. Won't
// duplicate contacts.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { syncAdvertiser } from '@/lib/ghl-sync'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Publication is fixed for this site (single-publication tenant). When
  // we expand to more markets, accept ?pub= from the URL and forward it.
  const result = await syncAdvertiser(id, 'rrp')
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
