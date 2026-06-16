// POST /api/admin/campaigns/[id]/enqueue-social
// Pushes the campaign landing page into the social rotation queue.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadCampaign } from '@/lib/campaigns'
import { enqueueForSource } from '@/lib/social/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(_req: Request, ctx: Ctx) {
  await requireAdmin()
  const { id } = await ctx.params
  const sb = createAdminClient()

  const campaign = await loadCampaign(sb, id)
  if (!campaign) return NextResponse.json({ error: 'campaign not found' }, { status: 404 })
  if (!campaign.publicLandingActive) {
    return NextResponse.json({ error: 'public landing must be active before enqueueing' }, { status: 400 })
  }

  try {
    const result = await enqueueForSource(sb, 'campaign', campaign.id, campaign.brandSlug)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'enqueue failed' }, { status: 500 })
  }
}
