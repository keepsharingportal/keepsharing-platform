// /api/reader/favorites
//
//   GET  ?device_token=… → list this device's favorites
//   POST                  → toggle a favorite { device_token, brand_slug,
//                            target_kind, target_id, target_title, target_slug, target_url }
//
// Anonymous-first. Each device has a localStorage-stored token; no auth
// required. Rate-limited to keep scripted abuse off the public surface.

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

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('device_token')
  if (!token) return NextResponse.json({ favorites: [] })
  const db = adminDb()
  try {
    const { data } = await db
      .from('reader_favorites')
      .select('id, brand_slug, target_kind, target_id, target_title, target_slug, target_url, favorited_at')
      .eq('device_token', token)
      .order('favorited_at', { ascending: false })
      .limit(200)
    return NextResponse.json({ favorites: data ?? [] })
  } catch {
    return NextResponse.json({ favorites: [] })
  }
}

export async function POST(req: NextRequest) {
  // Generous limit — a reader might favorite a category in one session.
  const allowed = await checkRateLimit({ scope: 'reader.favorites', req, max: 60 })
  if (!allowed) return NextResponse.json({ ok: false, error: 'too_many_requests' }, { status: 429 })

  const body = await req.json().catch(() => ({})) as {
    device_token?: string; brand_slug?: string;
    target_kind?: string; target_id?: string;
    target_title?: string; target_slug?: string; target_url?: string;
    /** When true, remove instead of add (idempotent toggle). */
    remove?: boolean;
  }
  if (!body.device_token || !body.target_kind || !body.target_id) {
    return NextResponse.json({ ok: false, error: 'missing_required' }, { status: 400 })
  }
  if (!['article', 'directory_listing'].includes(body.target_kind)) {
    return NextResponse.json({ ok: false, error: 'bad_target_kind' }, { status: 400 })
  }
  const brandSlug = body.brand_slug && ALL_MARKET_SLUGS.includes(body.brand_slug) ? body.brand_slug : 'rrp'

  const db = adminDb()
  try {
    if (body.remove) {
      await db.from('reader_favorites').delete()
        .eq('device_token', body.device_token)
        .eq('target_kind',  body.target_kind)
        .eq('target_id',    body.target_id)
      return NextResponse.json({ ok: true, favorited: false })
    }
    await db.from('reader_favorites').upsert({
      brand_slug:   brandSlug,
      device_token: body.device_token,
      target_kind:  body.target_kind,
      target_id:    body.target_id,
      target_title: body.target_title ?? null,
      target_slug:  body.target_slug  ?? null,
      target_url:   body.target_url   ?? null,
    }, { onConflict: 'device_token,target_kind,target_id' })
    return NextResponse.json({ ok: true, favorited: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/relation .* does not exist/i.test(msg)) {
      return NextResponse.json({ ok: false, error: 'migration_pending' }, { status: 503 })
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
