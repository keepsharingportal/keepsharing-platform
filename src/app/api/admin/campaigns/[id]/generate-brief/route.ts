// POST /api/admin/campaigns/[id]/generate-brief
// Runs Claude over the current campaign + brand profile + corpus and
// writes the resulting ai_brief JSONB back.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadCampaign, updateCampaign } from '@/lib/campaigns'
import { generateCampaignBrief } from '@/lib/campaigns/generate-brief'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 300

interface Ctx { params: Promise<{ id: string }> }

export async function POST(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin()
  const { id } = await ctx.params
  const sb = createAdminClient()

  const campaign = await loadCampaign(sb, id)
  if (!campaign) return NextResponse.json({ error: 'campaign not found' }, { status: 404 })

  try {
    const ai = await generateCampaignBrief(sb, campaign)
    await updateCampaign(sb, id, { aiBrief: ai, editedBy: admin.email ?? undefined })
    return NextResponse.json({ ok: true, aiBrief: ai })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'generation failed' }, { status: 500 })
  }
}
