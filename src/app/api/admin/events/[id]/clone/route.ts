// POST /api/admin/events/[id]/clone
//
// Duplicates an existing calendar_events row. Use case: an editor has
// an event set up the way they want (location, organizer, image,
// category, recurrence...) and wants to make a near-identical second
// one with one or two tweaks instead of re-entering everything.
//
// Behavior:
//   - Reads the source row (must exist + the editor must have access
//     to its market via requireAdmin).
//   - Inserts a fresh row carrying every editable field from the
//     source, with three exceptions:
//       title  → suffixed with " (Copy)" so the duplicate is
//                instantly distinguishable in the list view.
//       slug   → set to NULL so the next save / publish can
//                regenerate a fresh slug (avoids unique-constraint
//                collisions with the source).
//       status → forced back to 'pending' so the clone doesn't
//                accidentally publish before review.
//   - Lifetime metadata (id, created_at, reviewed_at, reviewed_by,
//     impression counters, etc.) are dropped so the clone starts
//     fresh in the queue.
//
// Returns: { event: <new row> }

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

// Columns we intentionally do NOT carry over to the clone.
const DROP_COLS = new Set([
  'id',
  'slug',
  'created_at',
  'updated_at',
  'reviewed_at',
  'reviewed_by',
  // Counters / lifecycle that should reset on a fresh row
  'impression_count',
  'click_count',
])

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  }

  const sb = supabaseAdmin()

  const { data: source, error: readErr } = await sb
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!source) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Market-scope check — non-super editors can only clone within their
  // allowed_markets. Mirrors what the regular create endpoint enforces.
  const sourceMarket = (source as Record<string, unknown>).market as string | null | undefined
  if (ctx.role !== 'super' && sourceMarket && !ctx.allowedMarkets.includes(sourceMarket)) {
    return NextResponse.json({ error: `No access to market "${sourceMarket}"` }, { status: 403 })
  }

  const clone: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(source as Record<string, unknown>)) {
    if (DROP_COLS.has(k)) continue
    clone[k] = v
  }

  // The three intentional rewrites.
  const sourceTitle = (source as { title?: string | null }).title ?? 'Untitled event'
  clone.title  = sourceTitle.endsWith('(Copy)') ? `${sourceTitle} (Copy)` : `${sourceTitle} (Copy)`
  clone.slug   = null
  clone.status = 'pending'

  const { data: inserted, error: insErr } = await sb
    .from('calendar_events')
    .insert(clone)
    .select('*')
    .single()
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ event: inserted })
}
