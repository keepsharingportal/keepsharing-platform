// POST /api/school-bits/track   (PUBLIC, fire-and-forget)
//
// Body: { id: string, event: 'view' | 'click' }
//
//   view  = card scrolled into view in the public feed (impression)
//   click = lightbox opened (high-intent — the reader chose to read)
//
// Increments the matching counter on school_bits. The endpoint is
// rate-permissive on purpose — client dedupes per-session via sessionStorage
// so a scroll-up-scroll-down doesn't double-count, and we don't want a
// slow tracking call to block a page render, so the caller uses
// navigator.sendBeacon (fire-and-forget) and we always return 204.
//
// Why not a write-through table?
//   For v1, a counter column is enough to surface "which schools are
//   exciting our readers." When we need per-day trends or referer
//   attribution we'll add school_bit_events; that's a separate piece.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

const ALLOWED_EVENTS = new Set(['view', 'click'])

export async function POST(req: NextRequest) {
  // Per-IP rate limit. 60 events/min covers any legit reader (a person
  // can't actually view 60 bits/min); soft-drops bots silently.
  const allowed = await checkRateLimit({ scope: 'school_bits.track', req, max: 60 })
  if (!allowed) return new NextResponse(null, { status: 204 })

  // sendBeacon sends as text/plain by default; accept either JSON or text.
  let body: { id?: string; event?: string } | null = null
  try {
    const raw = await req.text()
    body = raw ? JSON.parse(raw) : null
  } catch {
    body = null
  }
  if (!body?.id || !body?.event || !ALLOWED_EVENTS.has(body.event)) {
    // Always 204 to keep tracking call quiet in dev consoles. Real validation
    // failures are silent — this is engagement data, not user-facing.
    return new NextResponse(null, { status: 204 })
  }

  const column = body.event === 'click' ? 'click_count' : 'view_count'
  const supabase = supabaseAdmin()
  // Atomic increment via RPC if available, otherwise read-modify-write
  // (small race window is acceptable for counters of this kind).
  const { data } = await supabase
    .from('school_bits')
    .select(column)
    .eq('id', body.id)
    .maybeSingle()
  if (data) {
    const current = (data as Record<string, number>)[column] ?? 0
    await supabase
      .from('school_bits')
      .update({ [column]: current + 1 })
      .eq('id', body.id)
  }

  return new NextResponse(null, { status: 204 })
}
