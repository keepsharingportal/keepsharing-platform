// POST /api/track/ad-event — record an ad impression or click
//
// Replaces the two older single-purpose endpoints (/api/ads/impression,
// /api/ads/click) by accepting an `event_type` field. The legacy routes
// still exist and forward to this one for backwards compatibility.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  const allowed = await checkRateLimit({ scope: 'ad.event', req, max: 120 })
  if (!allowed) return NextResponse.json({ ok: true })

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    const ad_placement_id = typeof body.ad_placement_id === 'string' ? body.ad_placement_id
                          : typeof body.ad_id           === 'string' ? body.ad_id
                          : null
    const event_type      = typeof body.event_type      === 'string' ? body.event_type : null

    if (!ad_placement_id || !event_type) return NextResponse.json({ ok: false })
    if (event_type !== 'impression' && event_type !== 'click') return NextResponse.json({ ok: false })

    const supabase = admin()
    await supabase.rpc('record_ad_event', {
      p_ad_placement_id: ad_placement_id,
      p_event_type:      event_type,
      p_session_id:      (body.session_id    as string) ?? null,
      p_source_page:     (body.source_page   as string) ?? null,
      p_referrer_host:   (body.referrer_host as string) ?? null,
      p_utm_source:      (body.utm_source    as string) ?? null,
      p_utm_medium:      (body.utm_medium    as string) ?? null,
      p_utm_campaign:    (body.utm_campaign  as string) ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
