// POST /api/listings/track-contact   (PUBLIC, fire-and-forget)
//
// Body: {
//   advertiser_id:     string       (required)
//   event_type:        'tel' | 'mailto' | 'website'
//   source_listing_id: string?      (when fired from a guide listing card)
//   source_path:       string?      (e.g. '/family-resource-guide/pediatrics/dentistry-for-children')
// }
//
// Captures the moment a reader takes one of the three high-intent
// actions on an advertiser's contact info. Per-session dedup is enforced
// (an attacker can't 10x the count by reloading) and per-IP rate limit
// runs first so a bot can't flood the table.
//
// Always responds 204 — never echoes errors so probes get no signal.

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_EVENT_TYPES = new Set(['tel', 'mailto', 'website'])
// 30-min same-session, same-advertiser, same-type dedup window so a
// reader tapping "Call" five times in a frustrated minute only counts once.
const DEDUP_WINDOW_MIN = 30

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

function sessionHash(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
  const ua = req.headers.get('user-agent') ?? 'unknown'
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${ip}|${day}|${ua}`).digest('hex').slice(0, 32)
}

interface TrackBody {
  advertiser_id?:     string
  event_type?:        string
  source_listing_id?: string
  source_path?:       string
}

export async function POST(req: NextRequest) {
  // Per-IP rate limit. 120/min is generous — a real reader can't tap
  // contact links anywhere near that rate.
  const allowed = await checkRateLimit({ scope: 'listing.contact', req, max: 120 })
  if (!allowed) return new NextResponse(null, { status: 204 })

  // Accept JSON or text/plain (sendBeacon default).
  let body: TrackBody | null = null
  try {
    const raw = await req.text()
    body = raw ? JSON.parse(raw) : null
  } catch { body = null }
  if (!body?.advertiser_id || !body?.event_type || !VALID_EVENT_TYPES.has(body.event_type)) {
    return new NextResponse(null, { status: 204 })
  }

  const supabase = supabaseAdmin()
  const session  = sessionHash(req)

  // Dedup: skip if the same session already fired this event for this
  // advertiser in the last 30 minutes. The composite index covers this
  // probe in O(1).
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MIN * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from('listing_contact_events')
    .select('id')
    .eq('session_hash',  session)
    .eq('advertiser_id', body.advertiser_id)
    .eq('event_type',    body.event_type)
    .gte('occurred_at',  cutoff)
    .limit(1)
    .maybeSingle()
  if (existing) return new NextResponse(null, { status: 204 })

  // Parse referrer/UTM out of the request headers (the client doesn't
  // send them; they're attached to the page that triggered the beacon).
  const refUrl = req.headers.get('referer')
  let referrerHost: string | null = null
  let utm: { source: string | null; medium: string | null; campaign: string | null } = {
    source: null, medium: null, campaign: null,
  }
  if (refUrl) {
    try {
      const u = new URL(refUrl)
      referrerHost = u.hostname
      utm = {
        source:   u.searchParams.get('utm_source'),
        medium:   u.searchParams.get('utm_medium'),
        campaign: u.searchParams.get('utm_campaign'),
      }
    } catch {/* malformed referrer — fine */}
  }

  await supabase.from('listing_contact_events').insert({
    advertiser_id:     body.advertiser_id,
    event_type:        body.event_type,
    source_listing_id: body.source_listing_id ?? null,
    source_path:       body.source_path ?? null,
    session_hash:      session,
    referrer_host:     referrerHost,
    user_agent:        req.headers.get('user-agent') ?? null,
    utm_source:        utm.source,
    utm_medium:        utm.medium,
    utm_campaign:      utm.campaign,
  })

  return new NextResponse(null, { status: 204 })
}
