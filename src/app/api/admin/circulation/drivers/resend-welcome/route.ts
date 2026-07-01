// POST /api/admin/circulation/drivers/resend-welcome
//
// Re-sends the driver_welcome email to an existing driver. Generates a
// fresh Supabase magic link (1-hour TTL), enqueues the templated email,
// then drains the queue synchronously so the email lands in the driver's
// inbox during the request — no waiting for the daily cron.
//
// Body: { user_id: string }

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { circulationServiceClient, sendDriverWelcome } from '@/lib/circulation/driverWelcome'
import { drainQueue } from '@/lib/circulation/emailQueue'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { user_id?: string } | null
  if (!body?.user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const client = circulationServiceClient()

  const { data: driver, error } = await client
    .from('circulation_drivers')
    .select('user_id, market, full_name, email')
    .eq('user_id', body.user_id)
    .maybeSingle()
  if (error || !driver) {
    return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
  }
  const d = driver as { user_id: string; market: string; full_name: string; email: string }

  // Route assignments — surfaced in the email body.
  const { data: routeLinks } = await client
    .from('circulation_driver_routes')
    .select('route_id')
    .eq('driver_id', d.user_id)
  const routeIds = (routeLinks ?? []).map(r => (r as { route_id: string }).route_id)

  const { queued, magicLink } = await sendDriverWelcome(client, {
    market:   d.market,
    userId:   d.user_id,
    email:    d.email,
    fullName: d.full_name,
    routeIds,
  })

  // Drain immediately — a single row through Resend, no cron wait.
  // If RESEND_API_KEY isn't set, drainQueue returns skipped:true and
  // we surface that to the UI so the admin knows why.
  const drain = await drainQueue(d.market, 5)

  return NextResponse.json({
    ok:        queued,
    queued,
    magicLink,
    delivered: drain.sent > 0,
    skipped:   drain.skipped,
    reason:    drain.skipped ? 'RESEND_API_KEY not configured — email queued but not sent.' : null,
  })
}
