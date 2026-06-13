// POST /api/admin/circulation/recompute-tiers  body { market?, issue_month? }
//
// Reads every circulation_stop in `market` that has advertiser_account_id
// set, joins to print_ad_placements for `issue_month` (default current),
// computes the advertiser's largest active ad size, and writes the
// derived tier ('top' | 'middle' | 'bottom') back to circulation_stops.
// ad_level. Stops whose advertiser has no active placement get ad_level
// = NULL (drop back to Standard).
//
// Future: a Vercel cron triggers this at 00:05 on the 1st of every
// month. For now editorial triggers it via the ad-match page button.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function tierForSize(size: number): 'top' | 'middle' | 'bottom' {
  if (size >= 0.66) return 'top'
  if (size >= 0.33) return 'middle'
  return 'bottom'
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => ({})) as { market?: string; issue_month?: string }
  const market = body.market?.trim() || 'rrp'
  const month  = body.issue_month?.trim() || currentMonth()

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

  // For each unique advertiser, find their largest size this month
  const advertiserIds = Array.from(new Set(stops.map(s => s.advertiser_account_id)))
  const { data: placements } = await sb
    .from('print_ad_placements')
    .select('advertiser_account_id, size')
    .eq('issue_month', month)
    .in('advertiser_account_id', advertiserIds)

  const sizeByAdv = new Map<string, number>()
  for (const p of (placements ?? []) as Array<{ advertiser_account_id: string; size: number }>) {
    const cur = sizeByAdv.get(p.advertiser_account_id) ?? 0
    if (p.size > cur) sizeByAdv.set(p.advertiser_account_id, p.size)
  }

  // Group stops by desired tier so we can do a small number of bulk UPDATEs.
  const toTop:    string[] = []
  const toMiddle: string[] = []
  const toBottom: string[] = []
  const toNull:   string[] = []

  for (const s of stops) {
    const size = sizeByAdv.get(s.advertiser_account_id)
    const tier = size != null ? tierForSize(size) : null
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
    summary: {
      to_top:    toTop.length,
      to_middle: toMiddle.length,
      to_bottom: toBottom.length,
      cleared:   toNull.length,
    },
  })
}
