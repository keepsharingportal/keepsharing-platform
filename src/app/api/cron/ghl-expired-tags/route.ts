// GET/POST /api/cron/ghl-expired-tags
//
// Finds ad placements that ended in the last 7 days and tags their
// primary contact in GHL with rrp-expired-<mon><yy>. Existing GHL
// workflows (configured against that tag) fire automatically — that's
// the re-engagement loop the editor described:
//
//   ad expires → tag fires → GHL workflow → email/text the contact
//   asking them to renew, schedule a new placement, etc.
//
// Designed to be hit by Vercel Cron or any external scheduler hourly /
// daily. Idempotent: tags GHL drops duplicates, so re-running is safe.
//
// Optional auth: when CRON_SECRET is set, requests must include
// Authorization: Bearer <CRON_SECRET>. Without it, anyone hitting the
// route can run the sync; safe in dev but lock this down before prod.

import { NextRequest, NextResponse } from 'next/server'
import { syncExpiredAdTags } from '@/lib/ghl-sync'

export const runtime = 'nodejs'

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return true        // dev: no secret configured = open
  const got = req.headers.get('authorization') ?? ''
  return got === `Bearer ${expected}`
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const days = Number(new URL(req.url).searchParams.get('days') ?? 7)
  const result = await syncExpiredAdTags('rrp', isFinite(days) ? days : 7)
  return NextResponse.json(result, { status: result.ok ? 200 : 207 })
}

export async function GET(req: NextRequest)  { return handle(req) }
export async function POST(req: NextRequest) { return handle(req) }
