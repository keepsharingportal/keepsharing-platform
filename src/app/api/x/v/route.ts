// POST /api/x/v
//
// First-party pageview tracking. The path is deliberately non-obvious —
// the prior endpoint `/api/analytics/track` matched common ad-blocker
// patterns (EasyPrivacy default block list catches "/analytics/" and
// "/track"). Empirical data showed that endpoint dropping ~75% of
// reader visits, which corrupted every downstream report.
//
// `/api/x/v` (think "tracking pixel" without saying so) is a lot less
// triggerable. Plausible recommends the same posture.
//
// Privacy posture is identical to the prior implementation:
//   - We hash (ip + day-bucket + user-agent) and store only the truncated
//     digest. The hash rolls over daily so cross-day tracking is
//     impossible by design.
//   - No cookies set. No PII stored.
//   - 30-min dedup window per (session, path).

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

interface TrackBody {
  path?:        string
  article_id?:  string | null
  utm_source?:  string | null
  utm_medium?:  string | null
  utm_campaign?: string | null
}

const EXCLUDED_PREFIXES = ['/admin', '/api', '/auth', '/_next', '/login', '/signout', '/maintenance']

function sessionHash(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
  const ua = req.headers.get('user-agent') ?? 'unknown'
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${ip}|${day}|${ua}`).digest('hex').slice(0, 32)
}

function getReferrerHost(req: NextRequest): string | null {
  const ref = req.headers.get('referer')
  if (!ref) return null
  try {
    return new URL(ref).hostname
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const allowed = await checkRateLimit({ scope: 'x.v', req, max: 120 })
  if (!allowed) return new NextResponse(null, { status: 204 })

  let body: TrackBody
  try {
    body = await req.json()
  } catch {
    // Beacon sometimes sends as text — try once more.
    try {
      body = JSON.parse(await req.text())
    } catch {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
  }

  const path = (body.path ?? '').trim()
  if (!path || !path.startsWith('/')) return NextResponse.json({ ok: false }, { status: 400 })
  if (EXCLUDED_PREFIXES.some(p => path.startsWith(p))) return NextResponse.json({ ok: true, skipped: 'excluded' })

  const cleanPath = path.split('?')[0].split('#')[0]
  const hash = sessionHash(req)
  const supabase = createAdminClient()

  // Dedup window — same (session, path) within 30 minutes counts once.
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

  // Pull referrer + UTM out of the inbound request — the page tracker
  // doesn't send these explicitly, but they're carried by the request
  // headers (referer) and the page URL's query string.
  const referrerHost = getReferrerHost(req)

  const { error } = await supabase.from('page_views').insert({
    path:           cleanPath,
    article_id:     body.article_id ?? null,
    session_hash:   hash,
    referrer_host:  referrerHost,
    utm_source:     body.utm_source   || null,
    utm_medium:     body.utm_medium   || null,
    utm_campaign:   body.utm_campaign || null,
  })

  if (error) {
    console.warn('[x.v] page_views insert failed:', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
