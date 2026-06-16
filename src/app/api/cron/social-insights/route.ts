// GET /api/cron/social-insights
//
// Daily cron — pulls FB Page Insights for dispatched plan slots posted
// in the last 7 days. Writes to social_performance. The strategist
// auto-biases next week's picks from this data.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refreshInsightsForRecentPosts } from '@/lib/social-strategist/insights'

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
  const r = await refreshInsightsForRecentPosts(sb)
  return NextResponse.json(r)
}
