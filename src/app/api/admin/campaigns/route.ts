// POST /api/admin/campaigns — create new themed campaign
// Body: { brand_slug, slug, theme_title, month, hero_tagline?, brief?,
//         target_keywords?, generate_brief? }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCampaign, updateCampaign } from '@/lib/campaigns'
import { generateCampaignBrief } from '@/lib/campaigns/generate-brief'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 })

  if (!body.brand_slug || !body.theme_title || !body.month || !body.slug) {
    return NextResponse.json({ error: 'brand_slug, slug, theme_title, month required' }, { status: 400 })
  }

  const sb = createAdminClient()
  try {
    const campaign = await createCampaign(sb, {
      brandSlug:       body.brand_slug as string,
      slug:            body.slug as string,
      themeTitle:      body.theme_title as string,
      month:           body.month as string,
      brief:           body.brief as string | undefined,
      heroTagline:     body.hero_tagline as string | undefined,
      targetKeywords:  Array.isArray(body.target_keywords) ? body.target_keywords as string[] : [],
      createdBy:       ctx.email ?? undefined,
    })

    if (body.generate_brief) {
      try {
        const ai = await generateCampaignBrief(sb, campaign)
        await updateCampaign(sb, campaign.id, { aiBrief: ai })
      } catch (e) {
        // Don't fail the create — editor can regenerate later.
        console.error('[campaigns] auto-brief failed:', e instanceof Error ? e.message : e)
      }
    }

    return NextResponse.json({ ok: true, id: campaign.id })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'create failed' }, { status: 500 })
  }
}
