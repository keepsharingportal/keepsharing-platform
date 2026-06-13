// POST /api/admin/circulation/recompute-tiers  body { market?, issue_month? }
//
// For every circulation_stop with advertiser_account_id set:
//   - Sum up the advertiser's active placements (print + digital) for this month
//   - Convert each to a comparable size on the 0..1 scale (see ad-tier-rules.ts)
//   - Take the largest single placement
//   - Map to tier (top / middle / bottom)
//   - Write to circulation_stops.ad_level
// Stops whose advertiser has NO active placement get ad_level=NULL — but
// since is_advertiser=true is auto-set on link, they'll still render as
// bottom tier on the public map.
//
// Future: a Vercel cron triggers this at 00:05 on the 1st of every
// month. For now editorial triggers it via the ad-match page button.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { digitalPlacementSize, tierForSize } from '@/lib/circulation/ad-tier-rules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthStart(month: string): string {
  return `${month}-01T00:00:00Z`
}
function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const next = new Date(y, m, 1) // m is 1-based, this becomes next month's first
  return next.toISOString()
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({})) as { market?: string; issue_month?: string }
  const market = body.market?.trim() || 'rrp'
  const month  = body.issue_month?.trim() || currentMonth()
  const mStart = monthStart(month)
  const mEnd   = monthEnd(month)

  const sb = createAdminClient()

  // Every stop in this market that's linked to an advertiser
  const { data: stopsRaw, error: stopsErr } = await sb
    .from('circulation_stops')
    .select('id, ad_level, advertiser_account_id')
    .eq('market', market)
    .not('advertiser_account_id', 'is', null)
  if (stopsErr) return NextResponse.json({ error: stopsErr.message }, { status: 500 })
  const stops = (stopsRaw ?? []) as Array<{ id: string; ad_level: string | null; advertiser_account_id: string }>

  if (stops.length === 0) {
    return NextResponse.json({ ok: true, scanned: 0, updated: 0, message: 'No linked stops in this market — link advertisers first via /admin/circulation/ad-match.' })
  }

  // ── Print + digital placements for these advertisers ─────────────────
  const advertiserIds = Array.from(new Set(stops.map(s => s.advertiser_account_id)))

  // Print: by issue_month
  const { data: printPlacements } = await sb
    .from('print_ad_placements')
    .select('advertiser_account_id, size')
    .eq('issue_month', month)
    .in('advertiser_account_id', advertiserIds)

  // Digital: active ad_placements that overlap the month window. ad_placements
  // uses starts_at / ends_at (nullable). Any placement whose [starts_at, ends_at]
  // window overlaps the issue month and is_active=true counts.
  let digitalPlacements: Array<{ advertiser_account_id: string; placement_type: string }> = []
  try {
    const { data: digital } = await sb
      .from('ad_placements')
      .select('advertiser_account_id, placement_type, starts_at, ends_at, is_active')
      .in('advertiser_account_id', advertiserIds)
      .eq('is_active', true)
    const all = (digital ?? []) as Array<{ advertiser_account_id: string; placement_type: string; starts_at: string | null; ends_at: string | null; is_active: boolean }>
    // Overlap check: placement.starts <= monthEnd AND (placement.ends_at >= monthStart OR null)
    digitalPlacements = all
      .filter(p => {
        if (p.starts_at && p.starts_at > mEnd) return false
        if (p.ends_at   && p.ends_at   < mStart) return false
        return true
      })
      .map(p => ({ advertiser_account_id: p.advertiser_account_id, placement_type: p.placement_type }))
  } catch { /* table missing or different schema — skip digital */ }

  // ── Largest size per advertiser across both sources ──────────────────
  const sizeByAdv = new Map<string, number>()
  function consider(advId: string, size: number) {
    const cur = sizeByAdv.get(advId) ?? 0
    if (size > cur) sizeByAdv.set(advId, size)
  }
  for (const p of (printPlacements ?? []) as Array<{ advertiser_account_id: string; size: number }>) {
    consider(p.advertiser_account_id, p.size)
  }
  for (const p of digitalPlacements) {
    consider(p.advertiser_account_id, digitalPlacementSize(p.placement_type))
  }

  // Group stops by desired tier
  const toTop:    string[] = []
  const toMiddle: string[] = []
  const toBottom: string[] = []
  const toNull:   string[] = []

  for (const s of stops) {
    const size = sizeByAdv.get(s.advertiser_account_id)
    const tier = size != null && size > 0 ? tierForSize(size) : null
    if (tier === s.ad_level || (tier === null && s.ad_level == null)) continue
    if (tier === 'top')    toTop.push(s.id)
    else if (tier === 'middle') toMiddle.push(s.id)
    else if (tier === 'bottom') toBottom.push(s.id)
    else toNull.push(s.id)
  }

  let updated = 0
  for (const [tier, ids] of [
    ['top',    toTop],
    ['middle', toMiddle],
    ['bottom', toBottom],
  ] as const) {
    if (ids.length === 0) continue
    const { error } = await sb.from('circulation_stops').update({ ad_level: tier }).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    updated += ids.length
  }
  if (toNull.length > 0) {
    const { error } = await sb.from('circulation_stops').update({ ad_level: null }).in('id', toNull)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    updated += toNull.length
  }

  return NextResponse.json({
    ok:       true,
    market,
    month,
    scanned:  stops.length,
    updated,
    sources: {
      print_placements:   (printPlacements ?? []).length,
      digital_placements: digitalPlacements.length,
    },
    summary: {
      to_top:    toTop.length,
      to_middle: toMiddle.length,
      to_bottom: toBottom.length,
      cleared:   toNull.length,
    },
  })
}
