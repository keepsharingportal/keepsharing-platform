// POST /api/circulation/driver/change-request
//
// Standalone change-request submission — decoupled from the checklist's
// per-delivery flag. Used from the Stops browse page so a driver can
// report a problem at any stop on their route, whether they've delivered
// yet this month or not.
//
// Insert a circulation_change_requests row + enqueue an ops-email
// notification. Reuses the same vocabulary as the checklist flag:
// closed / wrong_address / wrong_qty / new_stop / other.
//
// Auth: the driver must be assigned to the stop's route.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/circulation/email'
import { enqueue } from '@/lib/circulation/emailQueue'

export const runtime = 'nodejs'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

// Same flag → change_request.type mapping the checklist uses.
const FLAG_TO_TYPE: Record<string, string> = {
  closed:        'close',
  wrong_address: 'edit',
  wrong_qty:     'qty',
  new_stop:      'new',
  other:         'edit',
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const sb = admin()

  const { data: driver } = await sb
    .from('circulation_drivers')
    .select('user_id, market, full_name')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!driver) return NextResponse.json({ error: 'Not a driver' }, { status: 403 })

  const body = await req.json().catch(() => null) as {
    stop_id?:   string
    flag?:      string
    notes?:     string
    detail?:    string
  } | null
  if (!body?.stop_id || !body.flag) {
    return NextResponse.json({ error: 'stop_id + flag required' }, { status: 400 })
  }

  // Look up stop + verify driver is assigned to its route.
  const { data: stop } = await sb
    .from('circulation_stops')
    .select('id, name, market, route_id')
    .eq('id', body.stop_id)
    .maybeSingle()
  if (!stop) return NextResponse.json({ error: 'Stop not found' }, { status: 404 })

  const { data: assign } = await sb
    .from('circulation_driver_routes')
    .select('route_id')
    .eq('driver_id', driver.user_id)
    .eq('route_id', (stop as { route_id: string }).route_id)
    .maybeSingle()
  if (!assign) return NextResponse.json({ error: 'Not assigned to this route' }, { status: 403 })

  const reqType   = FLAG_TO_TYPE[body.flag] ?? 'edit'
  const fieldName = body.flag === 'wrong_address' ? 'address'
                  : body.flag === 'wrong_qty'    ? 'quantity'
                  :                                null
  const combined  = [body.detail, body.notes].filter(Boolean).join(' — ')

  const { error: insErr } = await sb.from('circulation_change_requests').insert({
    market:     (stop as { market: string }).market,
    stop_id:    (stop as { id: string }).id,
    route_id:   (stop as { route_id: string }).route_id,
    driver_id:  driver.user_id,
    type:       reqType,
    field_name: fieldName,
    notes:      combined || null,
  })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // Notify ops via the queued-email flow so it's audited alongside
  // welcome / reminder / on-our-way sends.
  try {
    const settings = await getSettings((stop as { market: string }).market)
    const opsEmail = settings.ops_email
    if (opsEmail) {
      const flagLabel = ({ closed: 'Closed', wrong_address: 'Wrong address', wrong_qty: 'Wrong quantity', new_stop: 'New stop nearby', other: 'Other' } as Record<string, string>)[body.flag] ?? body.flag
      const stopName  = (stop as { name: string }).name
      const notePart  = combined ? `<p><strong>Driver note:</strong> ${escapeHtml(combined)}</p>` : ''
      await enqueue({
        market:          (stop as { market: string }).market,
        template_key:    'driver_change_request',
        to_email:        opsEmail,
        to_name:         null,
        subject:         `Driver change request — ${flagLabel}: ${stopName}`,
        body_html:       `<p><strong>${escapeHtml(driver.full_name)}</strong> flagged <strong>${escapeHtml(stopName)}</strong> as <strong>${flagLabel}</strong>.</p>${notePart}<p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/admin/circulation/changes">Review in admin</a></p>`,
        reply_to:        null,
        related_stop_id: (stop as { id: string }).id,
      })
    }
  } catch { /* don't fail the driver's submission on email issues */ }

  return NextResponse.json({ ok: true })
}
