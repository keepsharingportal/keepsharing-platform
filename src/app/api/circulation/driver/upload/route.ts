// POST /api/circulation/driver/upload
//
// Uploads a driver-side image (proof-of-delivery photo, gas receipt) to
// Supabase Storage bucket `pod-photos`. Accepts multipart/form-data with:
//
//   file:  the image blob
//   kind:  'stop-photo' | 'gas-receipt'  (routes into subfolder)
//   ref:   { deliveryStopId } for stop-photo, { deliveryId } for gas-receipt
//
// Returns: { url: string, path: string }
//
// Only signed-in drivers can upload. Ownership is verified server-side —
// a driver can only upload against a delivery_stop or delivery they own.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const sb = admin()

  // Verify driver
  const { data: driver } = await sb
    .from('circulation_drivers')
    .select('user_id, market')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!driver) return NextResponse.json({ error: 'Not a driver' }, { status: 403 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Bad form data' }, { status: 400 })
  }

  const file = form.get('file')
  const kind = String(form.get('kind') ?? '')
  const refRaw = String(form.get('ref') ?? '')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (kind !== 'stop-photo' && kind !== 'gas-receipt') {
    return NextResponse.json({ error: 'kind must be stop-photo or gas-receipt' }, { status: 400 })
  }
  let ref: { deliveryStopId?: string; deliveryId?: string }
  try { ref = JSON.parse(refRaw) } catch { return NextResponse.json({ error: 'ref must be JSON' }, { status: 400 }) }

  // Reject anything > 10 MB — camera photos should compress client-side.
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (10 MB max)' }, { status: 400 })
  }

  // Compute path + verify ownership.
  let objectPath: string
  if (kind === 'stop-photo') {
    if (!ref.deliveryStopId) return NextResponse.json({ error: 'ref.deliveryStopId required' }, { status: 400 })
    const { data: ds } = await sb
      .from('circulation_delivery_stops')
      .select('id, delivery_id, circulation_deliveries(driver_id)')
      .eq('id', ref.deliveryStopId)
      .maybeSingle()
    type J = { delivery_id: string; circulation_deliveries?: { driver_id?: string } | null }
    const parent = (ds as J | null)?.circulation_deliveries
    if (!ds || parent?.driver_id !== driver.user_id) {
      return NextResponse.json({ error: 'Not your delivery' }, { status: 403 })
    }
    objectPath = `stops/${ref.deliveryStopId}/${crypto.randomUUID()}.jpg`
  } else {
    if (!ref.deliveryId) return NextResponse.json({ error: 'ref.deliveryId required' }, { status: 400 })
    const { data: d } = await sb
      .from('circulation_deliveries')
      .select('id, driver_id')
      .eq('id', ref.deliveryId)
      .maybeSingle()
    if (!d || (d as { driver_id: string }).driver_id !== driver.user_id) {
      return NextResponse.json({ error: 'Not your delivery' }, { status: 403 })
    }
    objectPath = `gas-receipts/${ref.deliveryId}.jpg`
  }

  const buf = new Uint8Array(await file.arrayBuffer())
  const { error: upErr } = await sb.storage.from('pod-photos').upload(objectPath, buf, {
    contentType: file.type || 'image/jpeg',
    upsert: kind === 'gas-receipt',  // gas receipt overwrites; stop photos are append-only
  })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: pub } = sb.storage.from('pod-photos').getPublicUrl(objectPath)
  const url = pub.publicUrl

  // Append to photo_urls for stop-photo. Set gas_receipt_url for gas-receipt.
  if (kind === 'stop-photo') {
    const { data: existing } = await sb
      .from('circulation_delivery_stops')
      .select('photo_urls')
      .eq('id', ref.deliveryStopId!)
      .maybeSingle()
    const current = ((existing as { photo_urls?: string[] } | null)?.photo_urls ?? []) as string[]
    await sb
      .from('circulation_delivery_stops')
      .update({ photo_urls: [...current, url] })
      .eq('id', ref.deliveryStopId!)
  } else {
    await sb
      .from('circulation_deliveries')
      .update({ gas_receipt_url: url })
      .eq('id', ref.deliveryId!)
  }

  return NextResponse.json({ url, path: objectPath })
}

// DELETE /api/circulation/driver/upload
// Body: { url, kind, ref } — removes the URL from the record.
export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => null) as { url?: string; kind?: string; ref?: { deliveryStopId?: string; deliveryId?: string } } | null
  if (!body?.url || !body?.kind || !body?.ref) return NextResponse.json({ error: 'url, kind, ref required' }, { status: 400 })

  const sb = admin()
  const { data: driver } = await sb.from('circulation_drivers').select('user_id').eq('user_id', user.id).eq('active', true).maybeSingle()
  if (!driver) return NextResponse.json({ error: 'Not a driver' }, { status: 403 })

  if (body.kind === 'stop-photo' && body.ref.deliveryStopId) {
    const { data: ds } = await sb
      .from('circulation_delivery_stops')
      .select('id, photo_urls, circulation_deliveries(driver_id)')
      .eq('id', body.ref.deliveryStopId)
      .maybeSingle()
    type J = { photo_urls: string[]; circulation_deliveries?: { driver_id?: string } | null }
    const parent = (ds as J | null)?.circulation_deliveries
    if (!ds || parent?.driver_id !== driver.user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const next = ((ds as J).photo_urls ?? []).filter(u => u !== body.url)
    await sb.from('circulation_delivery_stops').update({ photo_urls: next }).eq('id', body.ref.deliveryStopId)
  } else if (body.kind === 'gas-receipt' && body.ref.deliveryId) {
    const { data: d } = await sb.from('circulation_deliveries').select('id, driver_id').eq('id', body.ref.deliveryId).maybeSingle()
    if (!d || (d as { driver_id: string }).driver_id !== driver.user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    await sb.from('circulation_deliveries').update({ gas_receipt_url: null }).eq('id', body.ref.deliveryId)
  }

  return NextResponse.json({ ok: true })
}
