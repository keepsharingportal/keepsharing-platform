// LEGACY — /api/analytics/track
//
// The old page-tracking endpoint. EasyPrivacy (the default block list for
// uBlock Origin, AdBlock Plus, Brave Shields, etc.) catches the
// "/analytics/" and "/track" substrings in the path. Empirical comparison
// against /api/track/article-view (which has a less-obvious path) showed
// the old endpoint dropping ~75% of visits.
//
// This file stays alive as a forwarder so anything that still hits the
// old URL keeps working — but new fires from ViewTracker go to /api/x/v.
// Once we're confident no legacy traffic is hitting this, the file can
// be deleted entirely.
//
// IMPORTANT for future engineers: do NOT add the obvious word "analytics"
// or "track" to any new public tracking endpoint URL. Use neutral paths
// like /api/x/v or /api/p/h. Same reason: client-side ad blockers.

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Forward the original body to the non-blocked endpoint. We construct
  // an absolute URL so this works on Vercel's edge correctly.
  const body = await req.text()
  const origin = req.nextUrl.origin
  try {
    const res = await fetch(`${origin}/api/x/v`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward original client headers we care about so the new
        // endpoint can still hash IP+UA and read Referer correctly.
        'x-forwarded-for': req.headers.get('x-forwarded-for') ?? '',
        'x-real-ip':       req.headers.get('x-real-ip') ?? '',
        'user-agent':      req.headers.get('user-agent') ?? '',
        'referer':         req.headers.get('referer') ?? '',
      },
      body,
    })
    return new NextResponse(null, { status: res.status })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
