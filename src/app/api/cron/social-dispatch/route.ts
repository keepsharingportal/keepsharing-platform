// GET /api/cron/social-dispatch
//
// ⚠️  DEPRECATED as of Sprint 10 (2026-06).
//
// Replaced by the AI Social Media Manager pipeline:
//   social_plan + social_plan_slot   — strategist generates the weekly plan
//   GHL Social Planner               — distributes to all 10 channels
//   /api/cron/social-strategist      — weekly Sunday cron
//   /api/cron/social-insights        — daily Insights pull
//
// This handler now NO-OPS to prevent double-posting when the Vercel cron
// still fires the old schedule. The social_queue table is preserved for
// historical reference / rollback; new posts no longer flow through it.
// Safe to delete the Vercel cron schedule + this file once the new
// pipeline has been stable for a month.
//
// The original implementation lives in git history (commit before this
// rewrite); restoring it is a `git revert` away if the new pipeline
// needs to be rolled back.

import { NextResponse } from 'next/server'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) return new NextResponse('Unauthorized', { status: 401 })
  }
  return NextResponse.json({
    deprecated: true,
    replacement: '/api/cron/social-strategist + /api/cron/social-insights',
    note: 'Remove this cron schedule from vercel.json once the new pipeline is stable.',
  })
}
