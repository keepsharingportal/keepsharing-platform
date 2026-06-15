// POST /api/log/not-found
// Body: { path, referrer?, userAgent? }
//
// Upserts a not_found_log row. One row per unique path; subsequent
// hits increment count + bump last_seen_at. Resolved rows (admin
// clicked "Create redirect" + marked resolved) are excluded from the
// unique index so a fresh hit creates a new row instead of un-
// resolving an old one.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    path?:      string
    referrer?:  string | null
    userAgent?: string | null
  } | null
  if (!body?.path) return NextResponse.json({ ok: false }, { status: 400 })

  const path      = body.path.slice(0, 500)  // sane cap
  const referrer  = body.referrer?.slice(0, 500)  ?? null
  const userAgent = body.userAgent?.slice(0, 500) ?? null
  const brandSlug = req.headers.get('x-brand-slug') ?? null

  const db  = sb()
  const now = new Date().toISOString()

  // Try to find an existing UNRESOLVED row for this (path, brand). If
  // it exists, increment count + bump timestamps. If not, insert.
  const { data: existing } = await db
    .from('not_found_log')
    .select('id, count')
    .ilike('path', path)
    .eq('brand_slug', brandSlug ?? '')   // matches empty when null; we store '' for null brand to keep the unique index happy
    .is('resolved_at', null)
    .limit(1)
    .maybeSingle()

  if (existing) {
    await db.from('not_found_log').update({
      count:           ((existing.count as number) ?? 0) + 1,
      last_seen_at:    now,
      last_referrer:   referrer,
      last_user_agent: userAgent,
    }).eq('id', existing.id as string)
  } else {
    await db.from('not_found_log').insert({
      path,
      brand_slug:      brandSlug,
      count:           1,
      last_referrer:   referrer,
      last_user_agent: userAgent,
      first_seen_at:   now,
      last_seen_at:    now,
    })
  }

  return NextResponse.json({ ok: true })
}
