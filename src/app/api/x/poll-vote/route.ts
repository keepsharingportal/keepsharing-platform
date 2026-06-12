// Public weekly-poll endpoints.
//
//   GET  /api/x/poll-vote?poll_id=…&device_token=…
//     → { counts: number[], total: number, closed: boolean, votedIndex: number|null }
//     Used by the widget on mount to sync server-side state without flashing
//     the unengaged view.
//
//   POST /api/x/poll-vote   body: { poll_id, option_index, device_token }
//     → { counts, total, closed, votedIndex }
//     Records a vote (or replaces an existing one — see record_poll_vote
//     RPC in migration 170). Rate-limited per IP at 30/min so a script
//     can't manufacture votes.
//
// We sit under /api/x/ for the same reason the analytics endpoint does —
// ad blockers don't filter the path.

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

function ipFrom(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
}
// Salted SHA-256 of the IP. Salt is server-only — never log raw IPs.
const IP_SALT = process.env.POLL_IP_SALT ?? 'kp-poll-salt-default'
function ipHash(req: NextRequest): string {
  return createHash('sha256').update(IP_SALT + ipFrom(req)).digest('hex').slice(0, 32)
}

type PollRow = {
  id:          string
  options:     string[]
  vote_counts: number[] | null
  total_votes: number
  closes_at:   string | null
  is_active:   boolean
  opens_at:    string
}

function publicShape(poll: PollRow, votedIndex: number | null) {
  const counts = poll.vote_counts ?? []
  // Pad counts to match options length so the widget can map cleanly.
  while (counts.length < poll.options.length) counts.push(0)
  const closed = !!(poll.closes_at && new Date(poll.closes_at) <= new Date())
  return { counts, total: poll.total_votes ?? 0, closed, votedIndex }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const pollId = url.searchParams.get('poll_id')
  const token  = url.searchParams.get('device_token') ?? ''
  if (!pollId) return NextResponse.json({ error: 'poll_id required' }, { status: 400 })

  const sb = createAdminClient()
  const { data: poll, error } = await sb
    .from('weekly_polls')
    .select('id, options, vote_counts, total_votes, closes_at, is_active, opens_at')
    .eq('id', pollId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!poll)  return NextResponse.json({ error: 'poll not found' }, { status: 404 })

  let votedIndex: number | null = null
  if (token) {
    const { data: row } = await sb
      .from('weekly_poll_responses')
      .select('option_index')
      .eq('poll_id', pollId)
      .eq('device_token', token)
      .maybeSingle()
    if (row) votedIndex = row.option_index as number
  }

  return NextResponse.json(publicShape(poll as PollRow, votedIndex))
}

export async function POST(req: NextRequest) {
  // 30 votes per IP per minute is enough headroom for legitimate readers
  // sharing a household NAT, and tight enough to choke a vote-manufacture
  // script. Over-limit silently 204s — we never echo "rate limited" to
  // probes.
  const allowed = await checkRateLimit({ scope: 'poll.vote', req, max: 30 })
  if (!allowed) return new NextResponse(null, { status: 204 })

  let body: { poll_id?: string; option_index?: number; device_token?: string; email?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'invalid body' }, { status: 400 }) }

  const { poll_id, option_index, device_token, email } = body
  if (!poll_id || typeof option_index !== 'number' || !device_token) {
    return NextResponse.json({ error: 'poll_id, option_index, device_token required' }, { status: 400 })
  }
  // device_token sanity: base64url-ish, 8-128 chars. Reject obvious garbage
  // before round-tripping to the DB.
  if (!/^[A-Za-z0-9_\-]{8,128}$/.test(device_token)) {
    return NextResponse.json({ error: 'invalid device_token' }, { status: 400 })
  }

  const sb = createAdminClient()
  const { data: poll, error } = await sb.rpc('record_poll_vote', {
    p_poll_id:      poll_id,
    p_device_token: device_token,
    p_option_index: option_index,
    p_ip_hash:      ipHash(req),
    p_email:        email ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!poll)  return NextResponse.json({ error: 'no poll returned' }, { status: 500 })

  return NextResponse.json(publicShape(poll as PollRow, option_index))
}
