// /admin/circulation — Distribution Routes overview.
//
// Top-level dashboard for the physical magazine distribution system. Surfaces
// the totals that matter at a glance: how many routes, how many stops, how
// many drivers, how many copies per publication. Drills down into Routes,
// Drivers, Map, and (eventually) Deliveries and Email Center.

import Link from 'next/link'
import { Navigation, MapPin, Users, Truck, ArrowRight, Upload, Map as MapIcon } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { CirculationImporter } from './CirculationImporter'

export const metadata = { title: 'Distribution Routes — Admin' }
export const dynamic  = 'force-dynamic'

interface StopRow { route_id: string; quantities: Record<string, number> | null; lat: number | null; lng: number | null; active: boolean }
interface RouteRow { id: string; name: string; active: boolean }
interface DriverRow { user_id: string; full_name: string; active: boolean }

export default async function CirculationOverviewPage() {
  const ctx     = await requireAdmin()
  // Distribution is region-scoped, not pub-scoped. Resolve whichever pub
  // the admin is viewing to its region's primary slug.
  const market  = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region  = regionForMarket(market)
  const dbKey   = region.slug
  const sb      = createAdminClient()

  let routes:  RouteRow[]  = []
  let stops:   StopRow[]   = []
  let drivers: DriverRow[] = []
  let tableMissing = false

  try {
    const [rRes, sRes, dRes] = await Promise.all([
      sb.from('circulation_routes').select('id, name, active').eq('market', dbKey),
      sb.from('circulation_stops').select('route_id, quantities, lat, lng, active').eq('market', dbKey),
      sb.from('circulation_drivers').select('user_id, full_name, active').eq('market', dbKey),
    ])
    if (rRes.error && /relation .* does not exist/i.test(rRes.error.message)) tableMissing = true
    routes  = (rRes.data ?? []) as RouteRow[]
    stops   = (sRes.data ?? []) as StopRow[]
    drivers = (dRes.data ?? []) as DriverRow[]
  } catch { tableMissing = true }

  // ── Aggregations ─────────────────────────────────────────────────────────
  const activeStops    = stops.filter(s => s.active)
  const geocoded       = stops.filter(s => s.lat != null && s.lng != null).length
  const stopsByRoute   = new Map<string, number>()
  for (const s of activeStops) stopsByRoute.set(s.route_id, (stopsByRoute.get(s.route_id) ?? 0) + 1)
  const totalsByPub: Record<string, number> = {}
  for (const s of activeStops) {
    for (const [pub, qty] of Object.entries(s.quantities ?? {})) {
      totalsByPub[pub] = (totalsByPub[pub] ?? 0) + (typeof qty === 'number' ? qty : 0)
    }
  }
  const pubKeys = Object.keys(totalsByPub).sort()

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1100px] mx-auto space-y-6">

        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <Navigation size={18} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Distribution Routes</h1>
          </div>
          <p className="text-sm text-gray-500 max-w-2xl">
            Manage physical magazine delivery — routes, stops, drivers, and the public pickup-location maps.
            Region: <span className="font-semibold text-gray-700">{region.name}</span>
            <span className="text-gray-400"> · </span>
            <span className="font-semibold text-gray-700">{publicationLabelsForRegion(region)}</span>
          </p>
        </header>

        {tableMissing && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-bold mb-1">Migration not applied yet</p>
            <p>Run <code className="px-1 bg-amber-100 rounded">supabase/migrations/113_circulation.sql</code> in Supabase Studio before using this section.</p>
          </div>
        )}

        {/* ── Headline metrics ───────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Routes"     value={routes.length}  href="/admin/circulation/routes" color="#2563eb" icon={Truck} />
          <MetricCard label="Stops"      value={activeStops.length}  href="/admin/circulation/routes" color="#16a34a" icon={MapPin} />
          <MetricCard label="Drivers"    value={drivers.filter(d => d.active).length} href="/admin/circulation/drivers" color="#9333ea" icon={Users} />
          <MetricCard label="Geocoded"   value={`${geocoded}/${stops.length}`} href="/admin/circulation/map" color="#ea580c" icon={MapIcon} />
        </section>

        {/* ── Per-publication totals ─────────────────────────────────────── */}
        {pubKeys.length > 0 && (
          <section>
            <AdminSectionHeader title="Copies per publication" description="Sum of per-stop quantities for active stops" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {pubKeys.map(p => (
                <div key={p} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{p}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-0.5">{totalsByPub[p].toLocaleString()}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">copies</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Routes summary ─────────────────────────────────────────────── */}
        <section>
          <AdminSectionHeader
            title="Routes"
            count={routes.length}
            description="Stop count per route (active stops only)"
          />
          {routes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center bg-white">
              <p className="text-sm text-gray-500">No routes yet.</p>
              <p className="text-xs text-gray-400 mt-1">Import existing stops below, or add routes manually.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {routes.map(r => (
                <Link
                  key={r.id}
                  href={`/admin/circulation/routes/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-blue-300 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{stopsByRoute.get(r.id) ?? 0} active stops</p>
                  </div>
                  <ArrowRight size={14} className="text-gray-300 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── Data importer ──────────────────────────────────────────────── */}
        <section>
          <AdminSectionHeader
            title="Import from PHP portal"
            description="Wipes + reloads stops for this market from a JSON export of the standalone drivers.keepsharing.com portal."
          />
          <CirculationImporter market={dbKey} regionName={region.name} pubLabels={publicationLabelsForRegion(region)} />
        </section>

        {/* ── Deferred features note ─────────────────────────────────────── */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
            <Upload size={12} /> Coming in follow-up sessions
          </p>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li>Monthly deliveries cycle (driver submits → admin reviews → bookkeeper pays)</li>
            <li>Email Center — 7 automated templates with editable subject/body</li>
            <li>Change requests admin (driver-submitted stop edits)</li>
            <li>Location requests inbox (public form submissions)</li>
            <li>OpenStreetMap geocoding UI for stops missing lat/lng</li>
            <li>Per-route schedule + settings page</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

function MetricCard({ label, value, href, color, icon: Icon }: {
  label: string; value: string | number; href: string; color: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <Link href={href} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 transition-colors block">
      <div className="flex items-center justify-between mb-1.5">
        <Icon size={14} className="text-gray-300" />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </Link>
  )
}
