// /admin/circulation — Distribution Routes overview.
//
// Top-level dashboard for the physical magazine distribution system. Surfaces
// the totals that matter at a glance: how many routes, how many stops, how
// many drivers, how many copies per publication. Drills down into Routes,
// Drivers, Map, and (eventually) Deliveries and Email Center.

import Link from 'next/link'
import { Navigation, MapPin, Users, Truck, ArrowRight, Upload, Map as MapIcon, Receipt, AlertTriangle, Package, Mail, GitPullRequest } from 'lucide-react'
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

  // Pending counts + low performers (from the new deliveries flow)
  let pendingChanges  = 0
  let pendingRequests = 0
  let pendingInvoices = 0
  interface LowPerf { stop_id: string; stop_name: string; route_name: string; leftovers: number; month: string }
  let lowPerformers: LowPerf[] = []

  try {
    const [rRes, sRes, dRes, cReqRes, lReqRes, invRes, lpRes] = await Promise.all([
      sb.from('circulation_routes').select('id, name, active').eq('market', dbKey),
      sb.from('circulation_stops').select('route_id, quantities, lat, lng, active').eq('market', dbKey),
      sb.from('circulation_drivers').select('user_id, full_name, active').eq('market', dbKey),
      sb.from('circulation_change_requests').select('id', { count: 'exact', head: true }).eq('market', dbKey).eq('status', 'pending'),
      sb.from('circulation_location_requests').select('id', { count: 'exact', head: true }).eq('market', dbKey).eq('status', 'pending'),
      sb.from('circulation_deliveries').select('id', { count: 'exact', head: true }).eq('market', dbKey).eq('status', 'submitted'),
      sb.from('circulation_delivery_stops')
        .select('stop_id, leftovers, circulation_stops!inner(name, market, circulation_routes!inner(name)), circulation_deliveries!inner(month, market)')
        .gt('leftovers', 0)
        .order('leftovers', { ascending: false })
        .limit(10),
    ])
    if (rRes.error && /relation .* does not exist/i.test(rRes.error.message)) tableMissing = true
    routes  = (rRes.data ?? []) as RouteRow[]
    stops   = (sRes.data ?? []) as StopRow[]
    drivers = (dRes.data ?? []) as DriverRow[]
    pendingChanges  = cReqRes.count ?? 0
    pendingRequests = lReqRes.count ?? 0
    pendingInvoices = invRes.count  ?? 0

    type LpRow = {
      stop_id:   string
      leftovers: number
      circulation_stops?: { name?: string; market?: string; circulation_routes?: { name?: string } | null } | null
      circulation_deliveries?: { month?: string; market?: string } | null
    }
    lowPerformers = (lpRes.data as LpRow[] | null ?? [])
      .filter(r => r.circulation_stops?.market === dbKey)
      .map(r => ({
        stop_id:    r.stop_id,
        stop_name:  r.circulation_stops?.name ?? '(stop)',
        route_name: r.circulation_stops?.circulation_routes?.name ?? '(route)',
        leftovers:  r.leftovers ?? 0,
        month:      r.circulation_deliveries?.month ?? '',
      }))
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
            <Navigation size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-portal-text tracking-tight">Distribution Routes</h1>
          </div>
          <p className="text-sm text-portal-sub max-w-2xl">
            Manage physical magazine delivery — routes, stops, drivers, and the public pickup-location maps.
            Region: <span className="font-semibold text-portal-text">{region.name}</span>
            <span className="text-portal-muted"> · </span>
            <span className="font-semibold text-portal-text">{publicationLabelsForRegion(region)}</span>
          </p>
        </header>

        {tableMissing && (
          <div className="rounded-xl border border-amber-200 bg-portal-amber-lt p-4 text-sm text-amber-900">
            <p className="font-bold mb-1">Migration not applied yet</p>
            <p>Run <code className="px-1 bg-portal-amber-lt rounded">supabase/migrations/113_circulation.sql</code> in Supabase Studio before using this section.</p>
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
                <div key={p} className="rounded-xl border border-portal-border bg-white p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">{p}</div>
                  <div className="text-2xl font-bold text-portal-text mt-0.5">{totalsByPub[p].toLocaleString()}</div>
                  <div className="text-[11px] text-portal-sub mt-0.5">copies</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Pending actions strip ─────────────────────────────────────── */}
        {(pendingInvoices + pendingChanges + pendingRequests) > 0 && (
          <section>
            <AdminSectionHeader title="Needs your attention" description="Pending items across distribution" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {pendingInvoices > 0 && (
                <Link href="/admin/circulation/deliveries" className="rounded-xl border border-blue-200 bg-portal-blue-lt p-3 hover:border-portal-border-2 transition-colors flex items-center gap-3">
                  <Receipt size={18} className="text-portal-blue shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-blue-900">{pendingInvoices} invoice{pendingInvoices === 1 ? '' : 's'} to review</p>
                    <p className="text-[11px] text-portal-blue">Drivers submitted, awaiting payment</p>
                  </div>
                </Link>
              )}
              {pendingChanges > 0 && (
                <Link href="/admin/circulation/changes" className="rounded-xl border border-amber-200 bg-portal-amber-lt p-3 hover:border-amber-300 transition-colors flex items-center gap-3">
                  <GitPullRequest size={18} className="text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">{pendingChanges} change request{pendingChanges === 1 ? '' : 's'}</p>
                    <p className="text-[11px] text-portal-amber">Driver-submitted stop edits</p>
                  </div>
                </Link>
              )}
              {pendingRequests > 0 && (
                <Link href="/admin/circulation/requests" className="rounded-xl border border-purple-200 bg-purple-50 p-3 hover:border-purple-300 transition-colors flex items-center gap-3">
                  <Mail size={18} className="text-purple-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-purple-900">{pendingRequests} location request{pendingRequests === 1 ? '' : 's'}</p>
                    <p className="text-[11px] text-purple-700">Businesses asking to be added</p>
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* ── Low performers (high-leftover stops) ──────────────────────── */}
        {lowPerformers.length > 0 && (
          <section>
            <AdminSectionHeader
              title="Low performers"
              description="Stops with high leftover counts — candidates for reducing quantities or removing"
            />
            <div className="rounded-xl border border-portal-border bg-white divide-y divide-gray-100">
              {lowPerformers.map(lp => (
                <div key={`${lp.stop_id}-${lp.month}`} className="p-3 flex items-center gap-3">
                  <Package size={14} className="text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-portal-text truncate">{lp.stop_name}</p>
                    <p className="text-[11px] text-portal-sub truncate">{lp.route_name} · {lp.month}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-portal-amber">{lp.leftovers}</p>
                    <p className="text-[10px] text-portal-muted uppercase tracking-wider">leftover</p>
                  </div>
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
            <div className="rounded-xl border border-dashed border-portal-border p-8 text-center bg-white">
              <p className="text-sm text-portal-sub">No routes yet.</p>
              <p className="text-xs text-portal-muted mt-1">Import existing stops below, or add routes manually.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {routes.map(r => (
                <Link
                  key={r.id}
                  href={`/admin/circulation/routes/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-portal-border bg-white p-3 hover:border-portal-border-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-portal-text truncate">{r.name}</p>
                    <p className="text-xs text-portal-sub mt-0.5">{stopsByRoute.get(r.id) ?? 0} active stops</p>
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
        <section className="rounded-xl border border-portal-border bg-portal-bg p-4">
          <p className="text-xs font-bold text-portal-sub mb-2 flex items-center gap-1.5">
            <Upload size={12} /> Coming next
          </p>
          <ul className="text-xs text-portal-sub space-y-1 list-disc list-inside">
            <li>Email Center — 8 templates with editable subject/body, per-route schedules, queue + manual sends</li>
            <li>Live delivery progress monitor (real-time view of every active route)</li>
            <li>Full Run combined view for drivers with multiple routes</li>
            <li>Route reorder UI (drag-drop + driver suggestion approval + snapshots)</li>
            <li>OpenStreetMap geocoding UI for stops missing lat/lng</li>
            <li>Settings + publications admin pages</li>
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
    <Link href={href} className="rounded-xl border border-portal-border bg-white p-4 hover:border-portal-border-2 transition-colors block">
      <div className="flex items-center justify-between mb-1.5">
        <Icon size={14} className="text-gray-300" />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>
      <div className="text-2xl font-bold text-portal-text">{value}</div>
    </Link>
  )
}
