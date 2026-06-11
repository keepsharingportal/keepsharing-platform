// POST /api/reader/engagement — bump a reader's engagement counters.
//
// Called from the public article + directory pages when the reader spends
// enough time on a page to count it. Powers the engagement nudge
// component which surfaces the newsletter-signup prompt after a reader
// hits a threshold of 7-day activity.
//
// The bump is atomic via the bump_reader_engagement RPC so bursty
// traffic doesn't trigger a read-modify-write race. Rate-limited to
// keep the public endpoint from being abused as a counter accelerator.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'
import { ALL_MARKET_SLUGS } from '@/lib/markets'

export const runtime = 'nodejs'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const allowed = await checkRateLimit({ scope: 'reader.engagement', req, max: 60 })
  if (!allowed) return NextResponse.json({ ok: false }, { status: 204 })

  const body = await req.json().catch(() => ({})) as {
    device_token?: string; brand_slug?: string; kind?: string;
  }
  if (!body.device_token || !body.kind) {
    return NextResponse.json({ ok: false, error: 'missing_required' }, { status: 400 })
  }
  if (!['article', 'directory'].includes(body.kind)) {
    return NextResponse.json({ ok: false, error: 'bad_kind' }, { status: 400 })
  }
  const brandSlug = body.brand_slug && ALL_MARKET_SLUGS.includes(body.brand_slug) ? body.brand_slug : 'rrp'

  const db = adminDb()
  try {
    const { data, error } = await db.rpc('bump_reader_engagement', {
      p_device_token: body.device_token,
      p_brand_slug:   brandSlug,
      p_kind:         body.kind,
    })
    if (error) {
      if (/function .* does not exist/i.test(error.message)) {
        return NextResponse.json({ ok: false, error: 'migration_pending' }, { status: 503 })
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, engagement: data })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
