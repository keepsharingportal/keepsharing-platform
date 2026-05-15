// POST /api/track/article-view — record a single article view
//
// Idempotent at the database level via record_article_view's 30-minute
// session dedup window. Designed to be called from navigator.sendBeacon
// or fetch keepalive, so we accept a permissive POST body and never
// return an error the client would surface.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    const article_id  = typeof body.article_id  === 'string' ? body.article_id  : null
    const session_id  = typeof body.session_id  === 'string' ? body.session_id  : null
    if (!article_id || !session_id) return NextResponse.json({ ok: false })

    const supabase = admin()
    await supabase.rpc('record_article_view', {
      p_article_id:    article_id,
      p_session_id:    session_id,
      p_referrer_host: (body.referrer_host as string) ?? null,
      p_utm_source:    (body.utm_source    as string) ?? null,
      p_utm_medium:    (body.utm_medium    as string) ?? null,
      p_utm_campaign:  (body.utm_campaign  as string) ?? null,
      p_source_page:   (body.source_page   as string) ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
