// DELETE /api/admin/social/calendar/[id]
//
// Cancels a scheduled social post — deletes from GHL Social Planner
// AND removes the local social_plan_slot row. If the slot has no
// ghl_post_id (e.g. local-only draft) we just delete the row.

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteSocialPost } from '@/lib/ghl-social'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  await requireSettingsAccess()
  const { id } = await params
  const sb = createAdminClient()
  const { data: slot } = await sb
    .from('social_plan_slot')
    .select(`id, ghl_post_id, plan_id, source_id, source_kind,
             social_plan(brand_slug)`)
    .eq('id', id)
    .maybeSingle()
  const s = slot as null | {
    id: string; ghl_post_id: string | null; plan_id: string | null
    source_id: string | null; source_kind: string
    social_plan: { brand_slug: string } | { brand_slug: string }[] | null
  }
  if (!s) return NextResponse.json({ error: 'slot not found' }, { status: 404 })

  // Resolve brand. Plan-owned slots: from the joined plan. Direct slots:
  // from the source (article).
  let brand: string | null = null
  const plan = Array.isArray(s.social_plan) ? s.social_plan[0] : s.social_plan
  if (plan?.brand_slug) brand = plan.brand_slug
  else if (s.source_kind === 'article' && s.source_id) {
    const { data: art } = await sb.from('guide_articles').select('brand_slug').eq('id', s.source_id).maybeSingle()
    brand = (art as { brand_slug?: string } | null)?.brand_slug ?? 'rrp'
  }

  if (s.ghl_post_id && brand) {
    await deleteSocialPost(brand, s.ghl_post_id)
  }
  const { error } = await sb.from('social_plan_slot').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
