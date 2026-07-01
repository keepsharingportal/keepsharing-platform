// GET /api/circulation/driver/stop-history?stop_id=<uuid>
//
// Returns the current driver's history at a specific stop — the last
// 6 months of delivery_stops rows they logged. Powers the "tap stop
// name → see history" sheet on the driver checklist so the driver
// remembers what happened at this location on previous runs.
//
// Only rows belonging to the CALLING DRIVER are returned. Admin-side
// stop history is a separate page.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const sb = admin()
  const { data: driver } = await sb
    .from('circulation_drivers')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!driver) return NextResponse.json({ error: 'Not a driver' }, { status: 403 })

  const stopId = new URL(req.url).searchParams.get('stop_id')?.trim()
  if (!stopId) return NextResponse.json({ error: 'stop_id required' }, { status: 400 })

  // Pull the driver's delivery_stops for this stop, joined to deliveries
  // for the month + status.
  const { data: rows } = await sb
    .from('circulation_delivery_stops')
    .select('id, checked, checked_at, driver_note, leftovers, leftovers_json, photo_urls, circulation_deliveries!inner(month, status, driver_id)')
    .eq('stop_id', stopId)
    .order('id', { ascending: false })
    .limit(20)

  type Joined = {
    id: string; checked: boolean; checked_at: string | null;
    driver_note: string | null; leftovers: number;
    leftovers_json: Record<string, number> | null;
    photo_urls: string[] | null;
    circulation_deliveries?: { month: string; status: string; driver_id: string } | { month: string; status: string; driver_id: string }[] | null;
  }
  const filtered = ((rows ?? []) as Joined[])
    .map(r => {
      const del = Array.isArray(r.circulation_deliveries) ? r.circulation_deliveries[0] : r.circulation_deliveries
      return { r, del }
    })
    .filter(({ del }) => del?.driver_id === driver.user_id)
    .map(({ r, del }) => ({
      month:          del?.month ?? '',
      status:         del?.status ?? 'draft',
      checked:        r.checked,
      checked_at:     r.checked_at,
      driver_note:    r.driver_note,
      leftovers:      r.leftovers ?? 0,
      leftovers_json: r.leftovers_json,
      photo_urls:     r.photo_urls ?? [],
    }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 6)

  return NextResponse.json({ history: filtered })
}
