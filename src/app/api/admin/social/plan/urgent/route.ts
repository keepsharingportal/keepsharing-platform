// POST /api/admin/social/plan/urgent
// Body: { brand, caption, image_url?, link?, platforms[], timing,
//         scheduled_for?, window_start?, window_end? }
//
// Pushes an out-of-plan urgent post to GHL. timing decides scheduled_for:
//   'now'      → immediate
//   'specific' → exact scheduled_for from body
//   'window'   → AI picks a time in [window_start, window_end] (v1: midpoint)
//   'ai-pick'  → AI picks the next-best gap (v1: +60 min, rounded to top of hour)

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { listSocialAccounts, createSocialPost } from '@/lib/ghl-social'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 120

interface UrgentBody {
  brand:         string
  caption:       string
  image_url?:    string | null
  link?:         string | null
  platforms:     string[]
  timing:        'now' | 'specific' | 'window' | 'ai-pick'
  scheduled_for?: string
  window_start?:  string
  window_end?:    string
}

function pickScheduledFor(body: UrgentBody): string | undefined {
  if (body.timing === 'now') return undefined
  if (body.timing === 'specific') return body.scheduled_for
  if (body.timing === 'window' && body.window_start && body.window_end) {
    const a = new Date(body.window_start).getTime()
    const b = new Date(body.window_end).getTime()
    return new Date((a + b) / 2).toISOString()
  }
  // ai-pick — next top-of-hour at least 60 min out
  const t = new Date(Date.now() + 60 * 60 * 1000)
  t.setMinutes(0, 0, 0)
  return t.toISOString()
}

export async function POST(req: NextRequest) {
  await requireSettingsAccess()
  const body = await req.json().catch(() => ({})) as UrgentBody
  if (!body.brand || !body.caption?.trim() || !body.platforms?.length) {
    return NextResponse.json({ error: 'brand, caption, platforms required' }, { status: 400 })
  }

  const { ok, accounts, error } = await listSocialAccounts(body.brand)
  if (!ok) return NextResponse.json({ error: `GHL: ${error}` }, { status: 502 })

  const scheduledFor = pickScheduledFor(body)
  const sb = createAdminClient()

  // Persist a slot row so the urgent post is visible in the plan grid.
  // No plan_id required — orphan slots are allowed for urgent posts;
  // but we attach to a `social_plan` row if one exists for this brand+week.
  const now = new Date()
  const monday = (() => {
    const d = new Date(now)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d.toISOString().slice(0, 10)
  })()
  const { data: existingPlan } = await sb
    .from('social_plan').select('id')
    .eq('brand_slug', body.brand).eq('week_start', monday).maybeSingle()
  let planId = (existingPlan as { id?: string } | null)?.id
  if (!planId) {
    const { data: created } = await sb
      .from('social_plan').insert({ brand_slug: body.brand, week_start: monday, status: 'draft' })
      .select('id').single()
    planId = (created as { id: string }).id
  }

  const accountIds = body.platforms
    .map(p => accounts.find(a => a.platform === p)?.id)
    .filter((x): x is string => !!x)
  if (accountIds.length === 0) {
    return NextResponse.json({ error: `No GHL account for platform(s): ${body.platforms.join(', ')}` }, { status: 400 })
  }

  // Single GHL post fanout — GHL accepts multiple accountIds and handles
  // the per-platform formatting. If you ever need different captions per
  // platform on urgent posts, split into two createSocialPost calls.
  const res = await createSocialPost({
    brandSlug:    body.brand,
    accountIds,
    caption:      body.caption,
    imageUrl:     body.image_url,
    link:         body.link,
    scheduleDate: scheduledFor,
  })

  await sb.from('social_plan_slot').insert({
    plan_id:       planId,
    day_of_week:   new Date(scheduledFor ?? now).getDay(),
    slot:          'midday',                 // best-effort label; not load-bearing for urgent
    scheduled_for: scheduledFor ?? now.toISOString(),
    source_kind:   'custom',
    source_id:     null,
    custom_caption: body.caption,
    custom_image:   body.image_url ?? null,
    platforms:     body.platforms,
    image_url:     body.image_url ?? null,
    status:        res.ok ? 'dispatched' : 'failed',
    ghl_post_id:   res.postId ?? null,
    ghl_error:     res.error ?? null,
    urgency:       'urgent',
  })

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 })
  return NextResponse.json({ ok: true, scheduledFor: scheduledFor ?? null, postId: res.postId })
}
