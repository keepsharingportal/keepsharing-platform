// POST /api/admin/social/plan/approve
// Body: { plan_id }
//
// Pushes every slot in the plan to GHL Social Planner. Records the
// returned ghl_post_id on each slot row. Flips plan.status to 'pushed'
// when at least one slot lands; leaves slots that failed in 'failed'
// with their error message recorded for editor follow-up.

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { listSocialAccounts, createSocialPost } from '@/lib/ghl-social'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  await requireSettingsAccess()
  const body = await req.json().catch(() => ({})) as { plan_id?: string }
  if (!body.plan_id) return NextResponse.json({ error: 'plan_id required' }, { status: 400 })

  const sb = createAdminClient()
  const { data: plan } = await sb
    .from('social_plan')
    .select('*')
    .eq('id', body.plan_id)
    .maybeSingle()
  if (!plan) return NextResponse.json({ error: 'plan not found' }, { status: 404 })
  const planRow = plan as { id: string; brand_slug: string; status: string }
  if (planRow.status === 'pushed' || planRow.status === 'completed') {
    return NextResponse.json({ error: 'plan already pushed' }, { status: 400 })
  }

  // Resolve GHL accounts for this brand's connected platforms.
  const { ok, accounts, error: accErr } = await listSocialAccounts(planRow.brand_slug)
  if (!ok) return NextResponse.json({ error: `GHL: ${accErr ?? 'no accounts'}` }, { status: 502 })
  const fbAccount = accounts.find(a => a.platform === 'facebook')
  const igAccount = accounts.find(a => a.platform === 'instagram')
  if (!fbAccount && !igAccount) {
    return NextResponse.json({ error: 'No Facebook or Instagram account connected in GHL for this brand' }, { status: 400 })
  }

  const { data: slots } = await sb
    .from('social_plan_slot')
    .select('*')
    .eq('plan_id', planRow.id)
    .in('status', ['pending', 'approved'])
  const rows = (slots ?? []) as Array<{
    id: string; scheduled_for: string; platforms: string[]
    fb_caption: string | null; ig_caption: string | null
    image_url: string | null; custom_caption: string | null
  }>

  let pushed = 0
  let failed = 0
  for (const s of rows) {
    // FB
    if (s.platforms.includes('facebook') && fbAccount) {
      const caption = s.fb_caption ?? s.custom_caption ?? ''
      if (caption.trim()) {
        const r = await createSocialPost({
          brandSlug:    planRow.brand_slug,
          accountIds:   [fbAccount.id],
          caption,
          imageUrl:     s.image_url,
          scheduleDate: s.scheduled_for,
        })
        if (r.ok) {
          await sb.from('social_plan_slot')
            .update({ status: 'dispatched', ghl_post_id: r.postId ?? null })
            .eq('id', s.id)
          pushed++
        } else {
          await sb.from('social_plan_slot')
            .update({ status: 'failed', ghl_error: `FB: ${r.error}` })
            .eq('id', s.id)
          failed++
        }
      }
    }
    // IG
    if (s.platforms.includes('instagram') && igAccount) {
      const caption = s.ig_caption ?? s.custom_caption ?? ''
      if (caption.trim() && s.image_url) {
        const r = await createSocialPost({
          brandSlug:    planRow.brand_slug,
          accountIds:   [igAccount.id],
          caption,
          imageUrl:     s.image_url,
          scheduleDate: s.scheduled_for,
        })
        if (r.ok) {
          // Status already 'dispatched' if FB went too; both posts share
          // the slot row. Just record the second post id under a comment-
          // style annotation in ghl_post_id if FB wasn't set.
          if (!await slotAlreadyDispatched(sb, s.id)) {
            await sb.from('social_plan_slot')
              .update({ status: 'dispatched', ghl_post_id: r.postId ?? null })
              .eq('id', s.id)
          }
          pushed++
        } else {
          await sb.from('social_plan_slot')
            .update({ ghl_error: `IG: ${r.error}` })
            .eq('id', s.id)
          failed++
        }
      }
    }
  }

  await sb.from('social_plan')
    .update({
      status:       pushed > 0 ? 'pushed' : planRow.status,
      approved_at:  new Date().toISOString(),
      pushed_at:    pushed > 0 ? new Date().toISOString() : null,
    })
    .eq('id', planRow.id)

  return NextResponse.json({ ok: true, pushed, failed, total: rows.length })
}

async function slotAlreadyDispatched(sb: ReturnType<typeof createAdminClient>, slotId: string): Promise<boolean> {
  const { data } = await sb.from('social_plan_slot').select('status').eq('id', slotId).maybeSingle()
  return (data as { status?: string } | null)?.status === 'dispatched'
}
