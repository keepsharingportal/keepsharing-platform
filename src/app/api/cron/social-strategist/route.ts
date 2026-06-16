// GET /api/cron/social-strategist
//
// Runs every Sunday at 18:00 UTC (configure via vercel.json crons).
// For each active brand, generates next week's social_plan draft.
// Editor approves it Monday morning in /admin/social/plan.
//
// Auth: Bearer ${CRON_SECRET} (env-gated; no-op when unset for dev).

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MARKETS } from '@/lib/markets'
import { generateWeeklyPlan, nextMonday } from '@/lib/social-strategist/planner'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) return new NextResponse('Unauthorized', { status: 401 })
  }

  const sb = createAdminClient()
  const weekStart = nextMonday(new Date())

  const results: Array<{ brand: string; ok: boolean; slotCount?: number; error?: string; warnings?: string[] }> = []

  for (const m of MARKETS) {
    try {
      const r = await generateWeeklyPlan(sb, {
        brandSlug:   m.slug,
        weekStart,
        slotsPerDay: 4,
      })
      results.push({ brand: m.slug, ok: true, slotCount: r.slotCount, warnings: r.warnings })
    } catch (e) {
      results.push({ brand: m.slug, ok: false, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return NextResponse.json({ weekStart, results })
}
