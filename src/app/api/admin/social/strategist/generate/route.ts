// POST /api/admin/social/strategist/generate
// Body: { brand, week_start?, slots_per_day? }
//
// Runs the weekly plan generator on-demand. Editor uses this from the
// hub UI to regenerate a draft plan, swap a single brand's plan, or
// preview next week ahead of the Sunday cron.

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateWeeklyPlan, nextMonday } from '@/lib/social-strategist/planner'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  await requireSettingsAccess()
  const body = await req.json().catch(() => ({})) as {
    brand?:         string
    week_start?:    string
    slots_per_day?: number
  }
  if (!body.brand) return NextResponse.json({ error: 'brand required' }, { status: 400 })

  const sb = createAdminClient()
  try {
    const result = await generateWeeklyPlan(sb, {
      brandSlug:   body.brand,
      weekStart:   body.week_start ?? nextMonday(new Date()),
      slotsPerDay: body.slots_per_day ?? 4,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'generate failed' }, { status: 500 })
  }
}
