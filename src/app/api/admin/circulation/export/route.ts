// CSV / JSON export of stops for the active region.
//
// GET /api/admin/circulation/export?market=rrp&format=csv|json
//
// CSV columns mirror the PHP import.php export format so a round-trip
// works (export here, re-import elsewhere, or back into the PHP portal).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

const CSV_COLS = [
  'route', 'name', 'address', 'city', 'zip', 'sort_order', 'notes',
  'contact_name', 'contact_phone', 'contact_email',
  'website', 'instagram', 'facebook', 'tiktok',
  'ad_level', 'is_advertiser', 'not_delivering', 'not_delivering_note',
  'active', 'lat', 'lng',
] as const

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const url    = new URL(req.url)
  const market = url.searchParams.get('market')?.trim() || 'rrp'
  const format = url.searchParams.get('format')?.trim().toLowerCase() || 'csv'
  // Optional per-route filter — mirrors the PHP source's `?route=X`
  // single-route export. Accept either `route_id` (canonical) or `route`
  // (PHP-style) for compat with any code that copies links from the
  // legacy portal.
  const routeId = url.searchParams.get('route_id')?.trim() || url.searchParams.get('route')?.trim() || null

  const client = sb()
  const stopsQuery = client.from('circulation_stops')
    .select('*')
    .eq('market', market)
    .order('route_id')
    .order('sort_order')
  if (routeId) stopsQuery.eq('route_id', routeId)
  const [routesRes, stopsRes] = await Promise.all([
    client.from('circulation_routes').select('id, name').eq('market', market),
    stopsQuery,
  ])
  const routeName = new Map<string, string>()
  for (const r of (routesRes.data ?? [])) routeName.set(r.id as string, r.name as string)
  type Stop = Record<string, unknown> & { route_id: string; quantities: Record<string, number> | null }
  const stops = (stopsRes.data ?? []) as Stop[]

  if (format === 'json') {
    const data = stops.map(s => {
      const out: Record<string, unknown> = { route: routeName.get(s.route_id) ?? '' }
      for (const k of CSV_COLS) if (k !== 'route') out[k] = s[k] ?? null
      Object.assign(out, s.quantities ?? {})
      return out
    })
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${market}_stops_${new Date().toISOString().slice(0,10)}.json"`,
      },
    })
  }

  // CSV: dynamic columns for any quantity keys we encountered.
  const qtyKeys = Array.from(new Set(stops.flatMap(s => Object.keys(s.quantities ?? {})))).sort()
  const header = [...CSV_COLS, ...qtyKeys]
  const lines = [header.join(',')]
  for (const s of stops) {
    const row = header.map(col => {
      if (col === 'route') return csvEscape(routeName.get(s.route_id) ?? '')
      if (qtyKeys.includes(col)) return csvEscape(s.quantities?.[col] ?? 0)
      return csvEscape(s[col])
    })
    lines.push(row.join(','))
  }
  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${market}_stops_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
