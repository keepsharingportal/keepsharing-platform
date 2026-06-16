// PATCH /api/admin/campaigns/[id]
// Body: any of brief, hero_tagline, cover_image_url, target_keywords,
//        status, public_landing_active

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateCampaign } from '@/lib/campaigns'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin()
  const { id } = await ctx.params
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'body required' }, { status: 400 })

  const sb = createAdminClient()
  try {
    await updateCampaign(sb, id, {
      brief:               body.brief                 as string | null | undefined,
      heroTagline:         body.hero_tagline          as string | null | undefined,
      coverImageUrl:       body.cover_image_url       as string | null | undefined,
      targetKeywords:      Array.isArray(body.target_keywords) ? body.target_keywords as string[] : undefined,
      status:              body.status                as 'planning' | 'active' | 'published' | 'archived' | undefined,
      publicLandingActive: body.public_landing_active as boolean | undefined,
      editedBy:            admin.email ?? undefined,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'update failed' }, { status: 500 })
  }
}
