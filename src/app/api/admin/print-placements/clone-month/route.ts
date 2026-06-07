// POST /api/admin/print-placements/clone-month
//
// Carry every print ad placement from one issue month forward to the
// next. Editor's monthly workflow: open the new month, hit Clone From
// <prev>, then trim out the ones who didn't commit + add new sells.
//
// Body: { from_month: 'YYYY-MM', to_month: 'YYYY-MM' }
//
// Behavior:
//   - Reads every placement on from_month.
//   - For each, checks expires_month: if the placement expires before
//     to_month, it's silently skipped (the commitment is over).
//   - Idempotent: if a row already exists for the same advertiser +
//     to_month combination, that one is skipped too — so re-running
//     the clone doesn't duplicate. Useful when the editor adds a
//     placement to to_month manually, then later decides to clone the
//     rest.
//   - Returns counts: created + skipped (with reasons).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface Body { from_month?: string; to_month?: string }

const YYYYMM = /^[0-9]{4}-[0-9]{2}$/

function compareMonth(a: string, b: string): number {
  // YYYY-MM strings compare lexicographically correctly.
  return a < b ? -1 : a > b ? 1 : 0
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const from = body.from_month?.trim() ?? ''
  const to   = body.to_month?.trim()   ?? ''
  if (!YYYYMM.test(from)) return NextResponse.json({ error: 'from_month must be YYYY-MM' }, { status: 400 })
  if (!YYYYMM.test(to))   return NextResponse.json({ error: 'to_month must be YYYY-MM'   }, { status: 400 })
  if (from === to)        return NextResponse.json({ error: 'from_month and to_month must differ' }, { status: 400 })

  const supabase = createAdminClient()

  // 1. Pull everything booked for the source month.
  const sourceRes = await supabase
    .from('print_ad_placements')
    .select('advertiser_account_id, design, directory, size, layout, price, social_budget, layout_notes, specific_months, expires_month, notes')
    .eq('issue_month', from)
  if (sourceRes.error) {
    return NextResponse.json({ error: sourceRes.error.message }, { status: 500 })
  }
  const source = sourceRes.data ?? []
  if (source.length === 0) {
    return NextResponse.json({ ok: true, created: 0, skippedExpired: 0, skippedDuplicate: 0, errors: [] })
  }

  // 2. Pre-fetch destination month's existing rows so we can dedup
  // before insert (one round trip instead of one per row).
  const advIds = source.map(r => r.advertiser_account_id as string)
  const existingRes = await supabase
    .from('print_ad_placements')
    .select('advertiser_account_id')
    .eq('issue_month', to)
    .in('advertiser_account_id', advIds)
  const alreadyOnTarget = new Set(((existingRes.data ?? []) as Array<{ advertiser_account_id: string }>)
    .map(r => r.advertiser_account_id))

  // 3. Build the insert payload, skipping expired + duplicate rows.
  let skippedExpired = 0
  let skippedDuplicate = 0
  const rowsToInsert: Array<Record<string, unknown>> = []
  for (const r of source) {
    const advId = r.advertiser_account_id as string
    const exp   = (r.expires_month ?? null) as string | null
    if (exp && compareMonth(exp, to) < 0) { skippedExpired++; continue }
    if (alreadyOnTarget.has(advId))       { skippedDuplicate++; continue }
    rowsToInsert.push({
      advertiser_account_id: advId,
      issue_month:           to,
      design:                'pickup',          // cloning forward = pickup by default
      directory:             r.directory,
      size:                  r.size,
      layout:                r.layout,
      price:                 r.price,
      social_budget:         r.social_budget,
      layout_notes:          r.layout_notes,
      specific_months:       r.specific_months ?? [],
      expires_month:         r.expires_month,
      notes:                 r.notes,
    })
  }

  // 4. Bulk insert; surface DB errors individually if any.
  if (rowsToInsert.length === 0) {
    return NextResponse.json({ ok: true, created: 0, skippedExpired, skippedDuplicate, errors: [] })
  }
  const { error: insertErr } = await supabase
    .from('print_ad_placements')
    .insert(rowsToInsert)
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message, created: 0, skippedExpired, skippedDuplicate }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    created:          rowsToInsert.length,
    skippedExpired,
    skippedDuplicate,
    errors:           [],
  })
}
