// POST /api/admin/print-placements/clone-month
//
// Carry print ad placements from one issue month forward to the next.
// Two modes, selected by whether `ids` is in the body:
//
//   - No ids: clone every row on from_month (the editor's monthly
//     'start the new issue from where we left off' workflow).
//   - With ids: clone only the listed source rows (the bulk-action
//     'Duplicate selected to <next>' button).
//
// Body: { from_month: 'YYYY-MM', to_month: 'YYYY-MM', ids?: string[] }
//
// Carry-forward rule: every source row carries unless an
// advertiser already has a row on the target month (idempotent — re-
// running the clone is safe). Expired commitments still carry forward,
// flagged red in the UI so the editor can renew (bump expires_month)
// or delete the row. Silently dropping them would hide re-up
// candidates from the editor.
//
// Returns: { created, skippedDuplicate }.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface Body {
  from_month?: string
  to_month?:   string
  /** Optional — restrict the clone to specific source row ids.
   *  Without it, every row on from_month is considered. */
  ids?:        string[]
}

const YYYYMM = /^[0-9]{4}-[0-9]{2}$/

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const from = body.from_month?.trim() ?? ''
  const to   = body.to_month?.trim()   ?? ''
  const ids  = (body.ids ?? []).map(s => s.trim()).filter(Boolean)
  if (!YYYYMM.test(from)) return NextResponse.json({ error: 'from_month must be YYYY-MM' }, { status: 400 })
  if (!YYYYMM.test(to))   return NextResponse.json({ error: 'to_month must be YYYY-MM'   }, { status: 400 })
  if (from === to)        return NextResponse.json({ error: 'from_month and to_month must differ' }, { status: 400 })

  const supabase = createAdminClient()

  // 1. Pull source rows. With ids[] restricted to that subset; otherwise
  // every row on from_month is considered.
  let sourceQuery = supabase
    .from('print_ad_placements')
    .select('id, advertiser_account_id, design, directory, size, layout, price, social_budget, layout_notes, specific_months, expires_month, notes, is_ongoing')
    .eq('issue_month', from)
  if (ids.length > 0) sourceQuery = sourceQuery.in('id', ids)
  const sourceRes = await sourceQuery
  if (sourceRes.error) {
    return NextResponse.json({ error: sourceRes.error.message }, { status: 500 })
  }
  const source = sourceRes.data ?? []
  if (source.length === 0) {
    return NextResponse.json({ ok: true, created: 0, skippedDuplicate: 0, errors: [] })
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

  // 3. Build the insert payload.
  let skippedDuplicate = 0
  const rowsToInsert: Array<Record<string, unknown>> = []
  for (const r of source) {
    const advId = r.advertiser_account_id as string
    if (alreadyOnTarget.has(advId)) { skippedDuplicate++; continue }
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
      is_ongoing:            r.is_ongoing ?? true,
    })
  }

  // 4. Bulk insert; surface DB errors individually if any.
  if (rowsToInsert.length === 0) {
    return NextResponse.json({ ok: true, created: 0, skippedDuplicate, errors: [] })
  }
  const { error: insertErr } = await supabase
    .from('print_ad_placements')
    .insert(rowsToInsert)
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message, created: 0, skippedDuplicate }, { status: 500 })
  }
  return NextResponse.json({
    ok:                true,
    created:           rowsToInsert.length,
    skippedDuplicate,
    errors:            [],
  })
}
