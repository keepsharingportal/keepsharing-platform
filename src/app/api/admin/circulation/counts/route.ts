// GET /api/admin/circulation/counts
//
// Tiny endpoint that returns the pending-action counts surfaced as red
// badges in the Distribution Portal sidebar. Three numbers, one round
// trip, called every 60 seconds from the sidebar.
//
// Scoped to the admin's active market. Super-admin viewing 'all' gets
// the rrp region by default (matches every other page in this section).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'
import { regionForMarket } from '@/lib/circulation/regions'

export const runtime = 'nodejs'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function GET() {
  let market = 'rrp'
  try {
    const ctx = await requireAdmin()
    market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  } catch {
    // Not signed in — return zeros so the sidebar stays quiet.
    return NextResponse.json({ pending_changes: 0, pending_requests: 0, pending_deliveries: 0 })
  }
  const dbKey = regionForMarket(market).slug

  try {
    const client = sb()
    // route_suggestions has no market column — filter via routeIds in market.
    const { data: routes } = await client
      .from('circulation_routes')
      .select('id')
      .eq('market', dbKey)
    const routeIds = ((routes ?? []) as Array<{ id: string }>).map(r => r.id)

    const [changes, requests, deliveries, suggestions] = await Promise.all([
      client.from('circulation_change_requests')
        .select('id', { count: 'exact', head: true })
        .eq('market', dbKey)
        .eq('status', 'pending'),
      client.from('circulation_location_requests')
        .select('id', { count: 'exact', head: true })
        .eq('market', dbKey)
        .eq('status', 'pending'),
      client.from('circulation_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('market', dbKey)
        .eq('status', 'submitted'),
      routeIds.length === 0
        ? Promise.resolve({ count: 0 } as { count: number })
        : client.from('circulation_route_suggestions')
            .select('id', { count: 'exact', head: true })
            .in('route_id', routeIds)
            .eq('status', 'pending'),
    ])
    return NextResponse.json({
      pending_changes:            changes.count     ?? 0,
      pending_requests:           requests.count    ?? 0,
      pending_deliveries:         deliveries.count  ?? 0,
      pending_route_suggestions:  suggestions.count ?? 0,
    })
  } catch {
    return NextResponse.json({
      pending_changes:           0,
      pending_requests:          0,
      pending_deliveries:        0,
      pending_route_suggestions: 0,
    })
  }
}
