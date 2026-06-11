// Legacy endpoint. New code should POST to /api/track/ad-event with
// event_type='impression'. Kept here so older bundles + external pings
// continue working; forwards to record_ad_event under the hood.
//
// Rate-limited because impressions feed the advertiser report (CPM,
// reach). A flood would inflate the denominator and tank CTR numbers
// we cite to advertisers.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // Impressions are higher-volume than clicks — a reader can rack up
  // many in one session as ads rotate. 240/min per IP per scope is
  // enough headroom for legitimate traffic on long browsing sessions
  // while still blocking scripted floods.
  const allowed = await checkRateLimit({ scope: 'ads.impression', req, max: 240 })
  if (!allowed) return new NextResponse(null, { status: 204 })

  const body  = await req.json().catch(() => ({})) as Record<string, unknown>
  const ad_id = (body.ad_id ?? body.ad_placement_id) as string | undefined
  if (!ad_id) return NextResponse.json({ error: 'ad_id required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  await supabase.rpc('record_ad_event', {
    p_ad_placement_id: ad_id,
    p_event_type:      'impression',
    p_session_id:      (body.session_id as string) ?? null,
    p_source_page:     null,
    p_referrer_host:   null,
    p_utm_source:      null,
    p_utm_medium:      null,
    p_utm_campaign:    null,
  })
  return NextResponse.json({ ok: true })
}
