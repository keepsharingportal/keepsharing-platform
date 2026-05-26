// POST /api/admin/school-news/drip-schedule
// Body: { ids: string[], over_days: number, start_at?: string, shuffle?: boolean }
//
// Bulk-schedules N pending bits to publish over a window of days. Sets each
// bit's status to 'approved' AND distributes their `published_at` evenly
// across the window so the public feed gets natural-looking activity
// instead of a 30-item dump on the same day.
//
// Behavior:
//   - Sorts/shuffles the IDs (shuffle: true for "natural" mix; default keeps
//     submission order so chronologically-related items stay grouped)
//   - For N items over D days, slot i is published at:
//       start_at + ((D / N) * i) days, with random ±2h jitter so they don't
//       all land at the same minute of the day
//   - Each bit also gets reviewed_at = now
//
// Editor uses this after bulk-pasting/backfilling — the bits sit in pending,
// then drip-schedule turns the whole batch into a 2-week stream.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export const runtime  = 'nodejs'
export const maxDuration = 60

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface Body {
  ids?:       string[]
  over_days?: number
  start_at?:  string
  shuffle?:   boolean
}

const MAX_BATCH = 100

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const ids       = Array.isArray(body.ids) ? body.ids.filter(x => typeof x === 'string') : []
  const overDays  = Math.max(1, Math.min(60, Number(body.over_days) || 14))
  const shuffle   = body.shuffle === true
  const startAt   = body.start_at ? new Date(body.start_at) : new Date()

  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json({ error: `Max ${MAX_BATCH} bits per call. Got ${ids.length}.` }, { status: 400 })
  }
  if (isNaN(startAt.getTime())) {
    return NextResponse.json({ error: 'start_at must be a valid date (YYYY-MM-DD or ISO)' }, { status: 400 })
  }

  // Order the IDs — shuffle for natural mix, otherwise preserve caller order
  const ordered = [...ids]
  if (shuffle) {
    for (let i = ordered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ordered[i], ordered[j]] = [ordered[j], ordered[i]]
    }
  }

  // Compute publish moments — evenly spaced across the window with small jitter
  // so they don't all hit at the exact same time of day.
  const N = ordered.length
  const windowMs   = overDays * 24 * 60 * 60 * 1000
  const stepMs     = N === 1 ? 0 : Math.floor(windowMs / N)
  const jitterMs   = 2 * 60 * 60 * 1000  // ±2h
  const startMs    = startAt.getTime()
  const reviewedAt = new Date().toISOString()

  const supabase = supabaseAdmin()

  // Update each bit individually so each gets the right published_at. Could be
  // a single CASE…WHEN statement, but N ≤ 100 — sequential UPDATEs are fast
  // enough and the code is dead simple to debug.
  const results: { id: string; published_at: string; ok: boolean; error?: string }[] = []
  for (let i = 0; i < ordered.length; i++) {
    const jitter   = Math.floor((Math.random() - 0.5) * 2 * jitterMs)
    const publishAt = new Date(startMs + (stepMs * i) + jitter).toISOString()

    const { error } = await supabase
      .from('school_bits')
      .update({
        status:       'approved',
        reviewed_at:  reviewedAt,
        published_at: publishAt,
      })
      .eq('id', ordered[i])

    results.push({
      id:           ordered[i],
      published_at: publishAt,
      ok:           !error,
      error:        error?.message,
    })
  }

  revalidatePath('/admin/school-news')
  revalidatePath('/school-zone/school-bits')

  const okCount = results.filter(r => r.ok).length
  return NextResponse.json({
    success:   okCount === results.length,
    scheduled: okCount,
    failed:    results.length - okCount,
    window:    { start: startAt.toISOString(), days: overDays },
    results,
  })
}
