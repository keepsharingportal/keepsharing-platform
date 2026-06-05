// POST /api/analytics/track
//
// First-party pageview tracking. The <ViewTracker /> client component
// fires this once per pathname change. Dedup is done here (not in DB) so
// we can use a simple "did this session view this path in the last 30
// min?" probe — no clever expression indexes that Postgres won't allow.
//
// Privacy: we hash (ip + day-bucket + user-agent) and store only the
// truncated digest. The hash rolls over daily so we can't track anyone
// across days even if we wanted to. No cookies set. No PII stored.

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface TrackBody {
  path?:       string
  article_id?: string | null
}

// Routes we never count — admin/api/auth/etc would pollute the auto-
// trending bar and don't represent real reader interest.
const EXCLUDED_PREFIXES = ['/admin', '/api', '/auth', '/_next', '/login', '/signout', '/maintenance']

function sessionHash(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
  const ua = req.headers.get('user-agent') ?? 'unknown'
  // Day-bucket so the hash naturally rolls over at midnight UTC; we
  // can't track anyone across days even if we wanted to.
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${ip}|${day}|${ua}`).digest('hex').slice(0, 32)
}

export async function POST(req: NextRequest) {
  let body: TrackBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const path = (body.path ?? '').trim()
  if (!path || !path.startsWith('/')) return NextResponse.json({ ok: false }, { status: 400 })
  if (EXCLUDED_PREFIXES.some(p => path.startsWith(p))) return NextResponse.json({ ok: true, skipped: 'excluded' })

  // Strip query strings & hash fragments — `?utm=...` and `#section`
  // shouldn't fragment the trending count for what is the same page.
  const cleanPath = path.split('?')[0].split('#')[0]

  const hash = sessionHash(req)
  const supabase = createAdminClient()

  // 30-min dedup window. Index idx_page_views_session_path makes this
  // a single-row index lookup.
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from('page_views')
    .select('id')
    .eq('session_hash', hash)
    .eq('path', cleanPath)
    .gte('viewed_at', cutoff)
    .limit(1)
    .maybeSingle()

  if (existing) return NextResponse.json({ ok: true, deduped: true })

  const { error } = await supabase.from('page_views').insert({
    path:         cleanPath,
    article_id:   body.article_id ?? null,
    session_hash: hash,
  })

  if (error) {
    // Don't blow up the page — pageview tracking is best-effort. Log so
    // a Vercel observer can grep for it if the table is missing or RLS
    // is misconfigured.
    console.warn('[analytics] page_views insert failed:', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
