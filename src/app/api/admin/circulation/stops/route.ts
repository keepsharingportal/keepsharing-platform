// CRUD for circulation_stops.
// GET    /api/admin/circulation/stops?route_id=...        — list stops in a route
// GET    /api/admin/circulation/stops?market=rrp&all=1    — list every stop in a market
// POST   /api/admin/circulation/stops                     — create a stop
// PATCH  /api/admin/circulation/stops                     — update fields by id
// PUT    /api/admin/circulation/stops                     — bulk reorder: { route_id, ids: [...] }
// DELETE /api/admin/circulation/stops?id=...              — remove

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'
import { renderTemplate, getSettings } from '@/lib/circulation/email'
import { enqueue } from '@/lib/circulation/emailQueue'
import { regionForMarket } from '@/lib/circulation/regions'

export const runtime = 'nodejs'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

const FIELDS = [
  'name','address','city','zip','notes',
  'contact_name','contact_phone','contact_email',
  'is_pickup','is_advertiser','is_featured','ad_level',
  'website','instagram','facebook','tiktok',
  'lat','lng','active','not_delivering','not_delivering_note','quantities',
  'sort_order','route_id',
] as const

type StopUpdate = Partial<Record<typeof FIELDS[number], unknown>>

export async function GET(req: NextRequest) {
  await requireAdmin()
  const url      = new URL(req.url)
  const routeId  = url.searchParams.get('route_id')?.trim()
  const market   = url.searchParams.get('market')?.trim() || 'rrp'
  const wantAll  = url.searchParams.get('all') === '1'

  let q = sb().from('circulation_stops').select('*').order('sort_order', { ascending: true })
  if (routeId)    q = q.eq('route_id', routeId)
  else if (wantAll) q = q.eq('market', market)
  else return NextResponse.json({ error: 'route_id or market+all=1 required' }, { status: 400 })

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stops: data ?? [] })
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { market?: string; route_id?: string } & StopUpdate | null
  if (!body?.route_id) return NextResponse.json({ error: 'route_id required' }, { status: 400 })
  if (!body.name)      return NextResponse.json({ error: 'name required' },     { status: 400 })

  const row: Record<string, unknown> = {
    market: (body.market as string | undefined) ?? 'rrp',
    route_id: body.route_id,
  }
  for (const f of FIELDS) if (body[f] !== undefined) row[f] = body[f]

  const client = sb()
  const { data, error } = await client.from('circulation_stops').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire stop_welcome to the new stop's contact, if it has an email.
  try {
    type S = { id?: string; market?: string; name?: string; contact_name?: string | null; contact_email?: string | null }
    const s = data as S
    if (s.contact_email && s.market) {
      const region = regionForMarket(s.market)
      const settings = await getSettings(s.market)
      const rendered = await renderTemplate({
        market: s.market,
        key:    'stop_welcome',
        context: {
          contact_first: (s.contact_name ?? '').split(' ')[0] ?? '',
          stop_name:     s.name ?? '',
          pub_name:      region.publications.map(p => p.toUpperCase()).join(' & '),
        },
        brandName:  region.name + ' Distribution',
        brandColor: '#1A5FA8',
      })
      if (rendered) {
        await enqueue({
          market:          s.market,
          template_key:    'stop_welcome',
          to_email:        s.contact_email,
          to_name:         s.contact_name ?? null,
          subject:         rendered.subject,
          body_html:       rendered.html,
          reply_to:        settings.ops_email || null,
          related_stop_id: s.id ?? null,
        })
      }
    }
  } catch { /* don't block stop creation */ }

  return NextResponse.json({ stop: data })
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as ({ id?: string } & StopUpdate) | null
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updates: Record<string, unknown> = {}
  for (const f of FIELDS) if (body[f] !== undefined) updates[f] = body[f]
  const { error } = await sb().from('circulation_stops').update(updates).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Bulk reorder: PUT with { route_id, ids: ["..."] } — writes sort_order
// matching the array index for each id in the same route.
export async function PUT(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as { route_id?: string; ids?: string[] } | null
  if (!body?.route_id || !Array.isArray(body.ids)) {
    return NextResponse.json({ error: 'route_id and ids[] required' }, { status: 400 })
  }
  const client = sb()
  for (let i = 0; i < body.ids.length; i++) {
    const { error } = await client.from('circulation_stops')
      .update({ sort_order: i })
      .eq('id', body.ids[i])
      .eq('route_id', body.route_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, reordered: body.ids.length })
}

export async function DELETE(req: NextRequest) {
  await requireAdmin()
  const id = new URL(req.url).searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await sb().from('circulation_stops').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
