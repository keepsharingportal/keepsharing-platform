'use client'

// DriverPortal — verbatim port of v3 driver/index.php.
//
// This is the mobile-first per-route checklist a driver hits when they
// log in. Design contract with the PHP source (indexed line refs are the
// v3 file):
//   - Dark navy top bar (#0F2640) with route name / driver / month
//   - Top-right chrome: map toggle 🗺, print 🖨, dashboard 🏠, sign out
//   - Progress bar + N-of-M-stops-Z%
//   - Route tabs when multiple routes are assigned
//   - Stop cards: 64px tap area with 38px check circle, name + address +
//     pubs pills + notes + NEW badge, note/flag icons on the right
//   - Bottom bar: earnings this run + Submit invoice button
//   - Three bottom-sheet modals: note / flag (4-button grid) / invoice
//   - All colors, fonts (DM Sans + DM Mono), spacings match v3 verbatim
//
// Everything is inline styled — the v3 design is a self-contained mobile
// portal with its own vocabulary; forcing it through the reader/portal
// design tokens would drift it. If we ever port to Tailwind tokens, keep
// the numeric values the same.

import { useEffect, useMemo, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────
interface Route      { id: string; name: string; city: string | null }
interface Stop       {
  id:             string
  route_id:       string
  name:           string
  address:        string | null
  city:           string | null
  zip:            string | null
  sort_order:     number
  quantities:     Record<string, number> | null
  not_delivering: boolean
  is_pickup?:     boolean
  is_advertiser?: boolean
  notes?:         string | null      // preset notes on the stop itself
  lat?:           number | null
  lng?:           number | null
  created_at?:    string | null
}
interface Delivery      {
  id: string
  route_id: string
  status?: string
  gas_amount?: number | null
  gas_receipt_url?: string | null
  pickup_load_json?: Record<string, number>
}
interface DeliveryStop  {
  id:             string
  delivery_id:    string
  stop_id:        string
  checked:        boolean
  checked_at:     string | null
  notes:          string | null
  driver_note:    string | null
  leftovers:      number
  leftovers_json: Record<string, number> | null
  flag:           string | null
  flag_note:      string | null
  photo_urls:     string[]
}
interface ApiResponse {
  driver:        { user_id: string; market: string; full_name: string; rate_per_stop?: number }
  month:         string
  bundle_size?:  number
  routes:        Route[]
  stops:         Stop[]
  deliveries:    Delivery[]
  deliveryStops: DeliveryStop[]
}

// Bundle math for the load display. Round UP (Math.ceil) because a
// route needing 51 mags with a bundle size of 25 needs THREE bundles.
function bundlesFor(mags: number, bundleSize: number): number {
  if (bundleSize <= 0) return 0
  return Math.ceil(mags / bundleSize)
}

// Compute { pubKey → mag total } across the deliverable stops for a
// given set of stops. Skips pickup + not_delivering rows since those
// don't get magazines.
function sumMagsByPub(stops: Stop[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const s of stops) {
    if (s.is_pickup || s.not_delivering) continue
    for (const [pub, qty] of Object.entries(s.quantities ?? {})) {
      out[pub] = (out[pub] ?? 0) + qty
    }
  }
  return out
}

// Category vocabulary — the quick on-run reporter. For form-driven
// pre-filled edits with proposed_changes, drivers use the Stops browser
// page (📋 Stops on the dashboard). This checklist flag stays a quick
// tap-and-note mechanism so mid-delivery reports don't require a form.
const FLAGS: Array<{ key: string; label: string }> = [
  { key: 'closed',        label: 'Location closed' },
  { key: 'wrong_address', label: 'Address change' },
  { key: 'wrong_qty',     label: 'Change mag totals' },
  { key: 'new_contact',   label: 'New contact' },
  { key: 'new_stop',      label: 'New stop nearby' },
  { key: 'other',         label: 'Other' },
]

// Publication pill colors — v3 uses RRP blue-tint + Boom amber-tint.
// Unknown pub keys fall back to a neutral gray so nothing breaks when a
// new publication is added later.
const PUB_COLORS: Record<string, { bg: string; fg: string }> = {
  RRP:  { bg: '#DBEAFE', fg: '#1A5FA8' },
  BOOM: { bg: '#FEF3C7', fg: '#B45309' },
}
function pubColor(key: string): { bg: string; fg: string } {
  return PUB_COLORS[key.toUpperCase()] ?? { bg: '#F1F5F9', fg: '#64748B' }
}

const CURRENT_YM = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})()

// ── DriverPortal ───────────────────────────────────────────────────────
export function DriverPortal({ market, driverName }: { market: string; driverName: string }) {
  const [data,        setData]        = useState<ApiResponse | null>(null)
  const [err,         setErr]         = useState<string | null>(null)
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null)
  const [showMap,     setShowMap]     = useState(false)
  const [sessionDead, setSessionDead] = useState(false)

  // ── Sheets state — the details sheet replaces the note sheet and
  // includes leftovers + photo POD alongside the note textarea. Pickup
  // stops open the pickup-load sheet instead. Invoice sheet gets gas
  // fields for the whole run.
  const [detailsSheet, setDetailsSheet] = useState<null | { dsId: string; stopId: string; stopName: string; text: string; leftovers: Record<string, number>; pubKeys: string[] }>(null)
  const [historySheet, setHistorySheet] = useState<null | { stopId: string; stopName: string; address: string; presetNotes: string | null; history: Array<{ month: string; status: string; checked: boolean; driver_note: string | null; leftovers: number; leftovers_json: Record<string, number> | null; photo_urls: string[] }> | null }>(null)
  async function openStopHistory(stopId: string, stopName: string, address: string, presetNotes: string | null) {
    setHistorySheet({ stopId, stopName, address, presetNotes, history: null })
    try {
      const res = await fetch(`/api/circulation/driver/stop-history?stop_id=${encodeURIComponent(stopId)}`)
      if (!res.ok) throw new Error('Load failed')
      const j = await res.json() as { history: Array<{ month: string; status: string; checked: boolean; driver_note: string | null; leftovers: number; leftovers_json: Record<string, number> | null; photo_urls: string[] }> }
      setHistorySheet(prev => prev ? { ...prev, history: j.history } : prev)
    } catch {
      setHistorySheet(prev => prev ? { ...prev, history: [] } : prev)
    }
  }
  const [flagSheet, setFlagSheet] = useState<null | { stopId: string; deliveryStopId: string; stopName: string; type: string; detail: string; notes: string }>(null)
  const [pickupSheet, setPickupSheet] = useState<null | { stopName: string; load: Record<string, number>; pubKeys: string[] }>(null)
  const [invoiceSheet, setInvoiceSheet] = useState<null | { notes: string; gasAmount: string; submitting: boolean }>(null)
  const [scrollToId, setScrollToId] = useState<string | null>(null)

  // ── Toast for "Issue reported" and similar micro-feedback
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function flashToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  // ── Initial load ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/circulation/driver')
      .then(async r => {
        if (r.status === 401 || r.status === 403) { setSessionDead(true); throw new Error('session') }
        if (!r.ok) throw new Error('Failed to load')
        return r.json()
      })
      .then((j: ApiResponse) => {
        setData(j)
        const urlRoute = new URLSearchParams(window.location.search).get('route')
        if (urlRoute && j.routes.some(r => r.id === urlRoute)) {
          setActiveRouteId(urlRoute)
        } else if (j.routes.length > 0) {
          setActiveRouteId(j.routes[0].id)
        }
      })
      .catch(e => { if (e?.message !== 'session') setErr(typeof e === 'string' ? e : 'Could not load') })
  }, [])

  // ── Session keepalive — poll every 5 min. If the server tells us
  //    we're no longer authenticated (403), show the reconnect banner.
  //    Matches v3 driver/index.php's ping-every-5-minutes behavior.
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const r = await fetch('/api/circulation/driver?ping=1', { cache: 'no-store' })
        if (r.status === 401 || r.status === 403) setSessionDead(true)
      } catch { /* offline — leave state alone */ }
    }, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  // ── Map-marker click scrolls the corresponding stop card into view.
  //    Uses smooth-scroll with 'center' block so the card ends up mid-
  //    screen with a brief pulse highlight the driver can spot.
  useEffect(() => {
    if (!scrollToId) return
    const el = document.getElementById(`stop-card-${scrollToId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.transition = 'box-shadow 0.4s ease'
      el.style.boxShadow = '0 0 0 4px #1A5FA8, 0 1px 4px rgba(0,0,0,.06)'
      const timer = setTimeout(() => {
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,.06)'
        setScrollToId(null)
      }, 900)
      return () => clearTimeout(timer)
    }
    setScrollToId(null)
  }, [scrollToId])

  // ── Derived view for the active route ────────────────────────────────
  const view = useMemo(() => {
    if (!data || !activeRouteId) return null
    const route    = data.routes.find(r => r.id === activeRouteId)
    if (!route) return null
    const stops    = data.stops
      .filter(s => s.route_id === activeRouteId)
      .sort((a, b) => {
        // v3: ORDER BY s.is_pickup DESC, s.sort_order, s.name
        const ap = a.is_pickup ? 1 : 0
        const bp = b.is_pickup ? 1 : 0
        if (ap !== bp) return bp - ap
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
        return a.name.localeCompare(b.name)
      })
    const delivery = data.deliveries.find(d => d.route_id === activeRouteId)
    if (!delivery) return null
    const byStop   = new Map<string, DeliveryStop>()
    for (const ds of data.deliveryStops.filter(ds => ds.delivery_id === delivery.id)) byStop.set(ds.stop_id, ds)
    const eligible = stops.filter(s => !s.not_delivering && !s.is_pickup)
    const total    = eligible.length
    const done     = eligible.filter(s => byStop.get(s.id)?.checked).length
    const submitted = (delivery.status ?? 'draft') !== 'draft'
    const pct      = total > 0 ? Math.round((done / total) * 100) : 0
    return { route, stops, byStop, total, done, pct, deliveryId: delivery.id, submitted }
  }, [data, activeRouteId])

  const rate = data?.driver?.rate_per_stop ?? 0
  const monthLabel = data?.month ? new Date(data.month + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''
  const bundleSize = data?.bundle_size ?? 25

  // Load counts. `activeRouteMags` is the current route's mag total per
  // pub (drives the per-route "Load for this route" strip).
  // `allRoutesMags` sums across every route this driver has this month
  // (drives the total shown when they have more than one route).
  const activeRouteMags = useMemo(
    () => view ? sumMagsByPub(view.stops) : {},
    [view],
  )
  const allRoutesMags = useMemo(
    () => data ? sumMagsByPub(data.stops) : {},
    [data],
  )

  // ── Optimistic local update helper ───────────────────────────────────
  function patchDeliveryStop(dsId: string, patch: Partial<DeliveryStop>) {
    setData(prev => prev ? ({
      ...prev,
      deliveryStops: prev.deliveryStops.map(ds => ds.id === dsId ? { ...ds, ...patch } : ds),
    }) : prev)
  }

  // ── Actions ──────────────────────────────────────────────────────────
  async function toggleCheck(ds: DeliveryStop) {
    if (view?.submitted) return
    const next = !ds.checked
    patchDeliveryStop(ds.id, { checked: next, checked_at: next ? new Date().toISOString() : null })
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ delivery_stop_id: ds.id, checked: next }),
    }).catch(() => {})
  }

  // Save the stop details sheet: note + per-pub leftovers. Photos upload
  // instantly on selection so we don't need to persist them here.
  async function saveDetails() {
    if (!detailsSheet) return
    const dsId = detailsSheet.dsId
    const text = detailsSheet.text.trim()
    const leftoversJson = Object.fromEntries(
      Object.entries(detailsSheet.leftovers).filter(([, v]) => v > 0),
    )
    const leftoversTotal = Object.values(leftoversJson).reduce((s, v) => s + v, 0)
    patchDeliveryStop(dsId, { driver_note: text || null, leftovers: leftoversTotal, leftovers_json: leftoversJson })
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        delivery_stop_id: dsId,
        driver_note:      text,
        leftovers:        leftoversTotal,
        leftovers_json:   leftoversJson,
      }),
    }).catch(() => {})
    setDetailsSheet(null)
  }

  // Upload a stop photo. Fires as soon as the file input changes.
  async function uploadStopPhoto(dsId: string, file: File): Promise<string | null> {
    const form = new FormData()
    form.append('file', file)
    form.append('kind', 'stop-photo')
    form.append('ref', JSON.stringify({ deliveryStopId: dsId }))
    const res = await fetch('/api/circulation/driver/upload', { method: 'POST', body: form })
    if (!res.ok) { flashToast('Photo upload failed'); return null }
    const j = await res.json() as { url: string }
    patchDeliveryStop(dsId, {
      photo_urls: [...(data?.deliveryStops.find(x => x.id === dsId)?.photo_urls ?? []), j.url],
    })
    return j.url
  }

  async function removeStopPhoto(dsId: string, url: string) {
    await fetch('/api/circulation/driver/upload', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url, kind: 'stop-photo', ref: { deliveryStopId: dsId } }),
    })
    patchDeliveryStop(dsId, {
      photo_urls: (data?.deliveryStops.find(x => x.id === dsId)?.photo_urls ?? []).filter(u => u !== url),
    })
  }

  async function savePickupLoad() {
    if (!pickupSheet || !view) return
    const cleaned = Object.fromEntries(Object.entries(pickupSheet.load).filter(([, v]) => v > 0))
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'save-pickup-load', delivery_id: view.deliveryId, pickup_load_json: cleaned }),
    })
    setData(prev => prev ? ({
      ...prev,
      deliveries: prev.deliveries.map(d => d.id === view.deliveryId ? { ...d, pickup_load_json: cleaned } : d),
    }) : prev)
    setPickupSheet(null)
    flashToast('Load count saved')
  }

  async function sendFlag() {
    if (!flagSheet) return
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        delivery_stop_id: flagSheet.deliveryStopId,
        flag:             flagSheet.type,
        flag_note:        [flagSheet.detail, flagSheet.notes].filter(Boolean).join(' — '),
      }),
    }).catch(() => {})
    setFlagSheet(null)
    flashToast('Issue reported — admin will review')
  }

  async function submitInvoice() {
    if (!invoiceSheet || !view) return
    setInvoiceSheet({ ...invoiceSheet, submitting: true })
    try {
      // Persist gas amount first if the driver typed one — the submit
      // step reads it off the delivery, so it needs to be saved before
      // we flip status to 'submitted' (which locks the row).
      const gas = parseFloat(invoiceSheet.gasAmount)
      if (!Number.isNaN(gas) && gas >= 0) {
        await fetch('/api/circulation/driver', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'save-gas', delivery_id: view.deliveryId, gas_amount: gas }),
        })
      }
      const res = await fetch('/api/circulation/driver', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:       'submit-delivery',
          delivery_id:  view.deliveryId,
          driver_notes: invoiceSheet.notes,
        }),
      })
      if (!res.ok) throw new Error('Submit failed')
      const refresh = await fetch('/api/circulation/driver').then(r => r.json() as Promise<ApiResponse>)
      setData(refresh)
      setInvoiceSheet(null)
      flashToast('Invoice submitted')
    } catch {
      setInvoiceSheet(invoiceSheet ? { ...invoiceSheet, submitting: false } : null)
      flashToast('Submit failed — try again')
    }
  }

  async function uploadGasReceipt(file: File) {
    if (!view) return
    const form = new FormData()
    form.append('file', file)
    form.append('kind', 'gas-receipt')
    form.append('ref', JSON.stringify({ deliveryId: view.deliveryId }))
    const res = await fetch('/api/circulation/driver/upload', { method: 'POST', body: form })
    if (!res.ok) { flashToast('Receipt upload failed'); return }
    const j = await res.json() as { url: string }
    setData(prev => prev ? ({
      ...prev,
      deliveries: prev.deliveries.map(d => d.id === view.deliveryId ? { ...d, gas_receipt_url: j.url } : d),
    }) : prev)
    flashToast('Receipt uploaded')
  }

  async function signOut() {
    // Server route that hard-clears the session cookie and redirects home.
    await fetch('/auth/signout', { method: 'POST' }).catch(() => {})
    window.location.href = '/distribution/login'
  }

  // ── Early states ─────────────────────────────────────────────────────
  if (err) return <FullBleedMessage>{err}</FullBleedMessage>
  if (!data || !view) {
    if (data && data.routes.length === 0) {
      return (
        <FullBleedMessage>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No route assigned</div>
          <div style={{ fontSize: 14, color: '#64748B' }}>Your distribution manager has not assigned your route yet.</div>
          <button onClick={signOut} style={{ marginTop: 20, background: 'none', border: 'none', color: '#1E3A5F', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>Sign out</button>
        </FullBleedMessage>
      )
    }
    return <FullBleedMessage>Loading…</FullBleedMessage>
  }

  const doneCount = view.done
  const totalCount = view.total
  const earnings = doneCount * rate

  return (
    <div style={outerStyle}>
      {sessionDead && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
          background: '#DC2626', color: 'white', padding: '12px 16px', textAlign: 'center',
          fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
        }}>
          Session expired.{' '}
          <a href="/distribution/login" style={{ color: 'white', textDecoration: 'underline', marginLeft: 4 }}>
            Sign in again
          </a>{' '}
          to keep working.
        </div>
      )}
      <div style={appStyle}>

        {/* ── Top bar ─────────────────────────────────────── */}
        <div style={topBarStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {view.route.name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>
                {driverName} · {monthLabel}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 10 }}>
              <IconButton onClick={() => setShowMap(v => !v)} active={showMap} label="Map">
                <MapIcon />
              </IconButton>
              <IconLink href={`/distribution/${market}/driver/print?route=${view.route.id}`} label="Print">
                <PrinterIcon />
              </IconLink>
              <IconLink href={`/distribution/${market}/driver/dashboard`} label="Dashboard">
                <HomeIcon />
              </IconLink>
              <button
                onClick={signOut}
                style={{
                  color: 'rgba(255,255,255,.75)', fontSize: 13, fontWeight: 500,
                  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
                  borderRadius: 8, padding: '6px 12px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >Sign out</button>
            </div>
          </div>
          {/* Progress */}
          <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 3, height: 5, marginTop: 10 }}>
            <div style={{ height: 5, borderRadius: 3, background: '#4ADE80', width: `${view.pct}%`, transition: 'width .35s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
            <span>{doneCount} of {totalCount} stops</span>
            <span>{view.pct}%</span>
          </div>
        </div>

        {/* ── Load strip — bundles to load for THIS route ─────
             Each pub gets a chip with its bundle count + raw mag total
             so the driver knows exactly what to grab out of the pickup
             stack. If they have multiple routes, they also see the
             all-routes total on the right so they can load the car in
             one trip. */}
        {view && Object.keys(activeRouteMags).filter(p => activeRouteMags[p] > 0).length > 0 && (
          <div style={{
            background:  '#F8FAFC',
            borderBottom:'1px solid #E2E8F0',
            padding:     '10px 16px',
            display:     'flex',
            gap:         8,
            flexWrap:    'wrap',
            alignItems:  'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.08em', marginRight: 4 }}>
              Load for {data && data.routes.length > 1 ? 'this route' : 'today'}
            </span>
            {Object.keys(activeRouteMags).filter(p => activeRouteMags[p] > 0).sort().map(pub => {
              const mags = activeRouteMags[pub]
              const b    = bundlesFor(mags, bundleSize)
              return (
                <span key={pub} style={{
                  display:      'inline-flex',
                  alignItems:   'center',
                  gap:          6,
                  background:   '#fff',
                  border:       '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding:      '4px 8px',
                  fontSize:     12,
                  color:        '#0F172A',
                }}>
                  <strong style={{ fontFamily: '"DM Mono", ui-monospace, monospace' }}>{pub.toUpperCase()}</strong>
                  <span style={{ fontWeight: 700 }}>{b} {b === 1 ? 'bundle' : 'bundles'}</span>
                  <span style={{ color: '#64748B', fontSize: 11 }}>({mags} mags)</span>
                </span>
              )
            })}
            {/* All-routes total — only when multi-route so the driver
                can pack the car once for the whole day. */}
            {data && data.routes.length > 1 && Object.keys(allRoutesMags).filter(p => allRoutesMags[p] > 0).length > 0 && (
              <details style={{ marginLeft: 'auto', fontSize: 11 }}>
                <summary style={{ cursor: 'pointer', color: '#1A5FA8', fontWeight: 700 }}>
                  All routes ({data.routes.length}) →
                </summary>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {Object.keys(allRoutesMags).filter(p => allRoutesMags[p] > 0).sort().map(pub => {
                    const mags = allRoutesMags[pub]
                    const b    = bundlesFor(mags, bundleSize)
                    return (
                      <span key={pub} style={{
                        display:      'inline-flex',
                        alignItems:   'center',
                        gap:          4,
                        background:   '#EFF6FF',
                        border:       '1px solid #BFDBFE',
                        borderRadius: 8,
                        padding:      '3px 7px',
                        fontSize:     11,
                        color:        '#1E3A8A',
                      }}>
                        <strong style={{ fontFamily: '"DM Mono", ui-monospace, monospace' }}>{pub.toUpperCase()}</strong>
                        <span style={{ fontWeight: 700 }}>{b}</span>
                      </span>
                    )
                  })}
                </div>
              </details>
            )}
          </div>
        )}

        {/* ── Mini map (lazy) ─────────────────────────────── */}
        {showMap && (
          <MiniMap
            stops={view.stops}
            byStop={view.byStop}
            onClose={() => setShowMap(false)}
            onStopClick={(id) => { setShowMap(false); setScrollToId(id) }}
          />
        )}

        {/* ── Route tabs (multi-route) ────────────────────── */}
        {data.routes.length > 1 && (
          <div style={routeTabsStyle}>
            {data.routes.map(r => (
              <button
                key={r.id}
                onClick={() => { setActiveRouteId(r.id); const u = new URL(window.location.href); u.searchParams.set('route', r.id); window.history.replaceState({}, '', u.toString()) }}
                style={routeTabBtn(r.id === activeRouteId)}
              >
                {r.name}
              </button>
            ))}
            <a
              href={`/distribution/${market}/driver/run`}
              style={{ ...routeTabBtn(false), background: '#EFF6FF', color: '#1A5FA8', borderColor: '#BFDBFE', textDecoration: 'none' }}
            >
              Full Run →
            </a>
          </div>
        )}

        {/* ── Submitted banner ────────────────────────────── */}
        {view.submitted && (
          <div style={{ background: '#DCFCE7', padding: '11px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#166534', flexShrink: 0 }}>
            ✓ Invoice submitted
          </div>
        )}

        {/* ── Stop list ───────────────────────────────────── */}
        <div style={stopScrollStyle}>
          {view.stops.map(stop => {
            const ds = view.byStop.get(stop.id)
            if (!ds) return null
            const isPickup = !!stop.is_pickup
            const isPaused = !isPickup && !!stop.not_delivering
            const isDone   = !isPickup && !isPaused && !!ds.checked
            const isNew    = !isPickup && !isPaused && !!stop.created_at && stop.created_at.substring(0, 7) === CURRENT_YM
            const locked   = view.submitted
            const pubKeys  = stop.quantities ? Object.keys(stop.quantities).sort() : []
            const leftoversNow = (ds.leftovers_json ?? {}) as Record<string, number>
            const leftoversTotal = Object.values(leftoversNow).reduce((s, v) => s + v, 0)

            const borderCol = isDone ? '#86EFAC' : isPaused ? '#FDE68A' : isPickup ? '#BFDBFE' : isNew ? '#93C5FD' : '#E2E8F0'
            const cardStyle: React.CSSProperties = {
              background:  isDone ? '#F0FDF4' : isPaused ? '#FFFBEB' : isPickup ? '#EFF6FF' : isNew ? '#EFF6FF' : 'white',
              opacity:     isPaused ? 0.7 : 1,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'stretch',
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,.06)',
              border: `1.5px solid ${borderCol}`,
              flexShrink: 0, // CRITICAL: without this, flex-direction:column parent
                             // shrinks every card to a horizontal line when the list
                             // overflows. Fixed 2026-06-27 after driver report.
            }

            return (
              <div key={stop.id} id={`stop-card-${stop.id}`} style={cardStyle}>
                {/* Check area — 64px wide tap target. On PICKUP stops the
                    tap opens the load-count sheet instead of toggling
                    a checkbox (there's nothing to check off). */}
                <button
                  onClick={() => {
                    if (locked) return
                    if (isPickup) {
                      const load = (view.stops.filter(s => !s.is_pickup && !s.not_delivering)
                        .reduce((acc, s) => {
                          for (const k of Object.keys(s.quantities ?? {})) {
                            acc[k] = (acc[k] ?? 0) + (s.quantities?.[k] ?? 0)
                          }
                          return acc
                        }, {} as Record<string, number>))
                      const loadKeys = Object.keys(load).sort()
                      const currentLoad = (data.deliveries.find(d => d.route_id === activeRouteId)?.pickup_load_json ?? {}) as Record<string, number>
                      setPickupSheet({ stopName: stop.name, load: { ...load, ...currentLoad }, pubKeys: loadKeys })
                      return
                    }
                    if (isPaused) return
                    toggleCheck(ds)
                  }}
                  disabled={isPaused || locked}
                  style={{
                    width: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '16px 0', background: 'transparent', border: 'none',
                    cursor: (isPaused || locked) ? 'default' : 'pointer',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    border: '2.5px solid ' + (isDone ? '#16A34A' : isPickup ? '#1A5FA8' : '#CBD5E1'),
                    background: isDone ? '#16A34A' : isPickup ? '#1A5FA8' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .18s',
                  }}>
                    {isPickup ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                        <path d="M8 2C5.8 2 4 3.8 4 6c0 3.3 4 8 4 8s4-4.7 4-8c0-2.2-1.8-4-4-4zm0 5.5c-.8 0-1.5-.7-1.5-1.5S7.2 4.5 8 4.5 9.5 5.2 9.5 6 8.8 7.5 8 7.5z" />
                      </svg>
                    ) : isDone ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
                        <path d="M7 12.4L3.6 9l-1.1 1.1L7 14.5l9-9-1.1-1.1z" />
                      </svg>
                    ) : null}
                  </div>
                </button>

                {/* Stop info */}
                <div style={{ flex: 1, padding: '13px 6px 13px 0', minWidth: 0 }}>
                  <button
                    onClick={() => !isPickup && !isPaused && openStopHistory(stop.id, stop.name, [stop.address, stop.city].filter(Boolean).join(', '), stop.notes ?? null)}
                    disabled={isPickup || isPaused}
                    style={{
                      display: 'inline-block', textAlign: 'left',
                      fontSize: 15, fontWeight: 600, lineHeight: 1.3,
                      color: isDone ? '#94A3B8' : '#1E293B',
                      textDecoration: isDone ? 'line-through' : 'none',
                      background: 'transparent', border: 'none', padding: 0,
                      cursor: (isPickup || isPaused) ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                    title={isPickup || isPaused ? undefined : 'Tap for stop details & history'}
                  >
                    {stop.name}
                    {isNew && !isDone && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: '#1A5FA8', color: 'white', padding: '1px 6px', borderRadius: 8, marginLeft: 6, verticalAlign: 'middle', letterSpacing: '.3px' }}>
                        NEW
                      </span>
                    )}
                    {stop.is_advertiser && !isPickup && (
                      <span title="Advertiser — give them a big smile!" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 800, marginLeft: 6, verticalAlign: 'middle' }}>★</span>
                    )}
                  </button>

                  {stop.address && (
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 1.4 }}>
                      {stop.address}{stop.city ? `, ${stop.city}` : ''}
                    </div>
                  )}

                  {ds.driver_note && (
                    <div style={{ fontSize: 11, color: '#1A5FA8', marginTop: 4, fontStyle: 'italic' }}>
                      📝 {ds.driver_note}
                    </div>
                  )}
                  {stop.notes && !isPickup && (
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontStyle: 'italic' }}>
                      📌 {stop.notes}
                    </div>
                  )}
                  {/* Leftover + photo indicators — inline, so the driver
                      knows what they logged without having to open the
                      details sheet again. */}
                  {(leftoversTotal > 0 || (ds.photo_urls?.length ?? 0) > 0) && !isPickup && !isPaused && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11, color: '#64748B', flexWrap: 'wrap' }}>
                      {leftoversTotal > 0 && (
                        <span>📦 {leftoversTotal} leftover ({Object.entries(leftoversNow).filter(([, v]) => v > 0).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ')})</span>
                      )}
                      {(ds.photo_urls?.length ?? 0) > 0 && (
                        <span>📸 {ds.photo_urls.length} photo{ds.photo_urls.length === 1 ? '' : 's'}</span>
                      )}
                    </div>
                  )}

                  {/* Publication pills + pickup/paused badges + Map — all
                      on one line at the same visual weight so the row reads
                      as one compact info strip. */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {stop.quantities && Object.entries(stop.quantities).map(([pub, qty]) => {
                      if (!qty || isPickup) return null
                      const col = pubColor(pub)
                      return (
                        <span key={pub} style={{ fontSize: 14, fontWeight: 800, padding: '3px 12px', borderRadius: 12, background: col.bg, color: col.fg, fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                          {pub.toUpperCase()} {qty}
                        </span>
                      )
                    })}
                    {isPickup && (
                      <span style={{ fontSize: 14, fontWeight: 800, padding: '3px 12px', borderRadius: 12, background: '#DBEAFE', color: '#1A5FA8', fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                        📦 Load here
                      </span>
                    )}
                    {isPaused && (
                      <span style={{ fontSize: 14, fontWeight: 800, padding: '3px 12px', borderRadius: 12, background: '#FEF3C7', color: '#92400E', fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                        ⏸ Not delivering
                      </span>
                    )}
                    {stop.address && !isPickup && !isPaused && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([stop.address, stop.city, stop.zip].filter(Boolean).join(', '))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 12px', borderRadius: 12, fontSize: 14, fontWeight: 800, background: '#1A5FA8', color: 'white', textDecoration: 'none', fontFamily: '"DM Mono", ui-monospace, monospace' }}
                      >
                        📍 MAP
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions (details + flag) — only for deliverable stops on unsubmitted routes.
                    The details icon now opens a combined sheet with note + leftovers + photos. */}
                {!isPickup && !isPaused && !locked && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 12px 10px 2px', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => setDetailsSheet({
                        dsId: ds.id,
                        stopId: stop.id,
                        stopName: stop.name,
                        text: ds.driver_note ?? '',
                        leftovers: leftoversNow,
                        pubKeys,
                      })}
                      style={actBtnStyle}
                      title="Details, leftovers, photo"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setFlagSheet({ stopId: stop.id, deliveryStopId: ds.id, stopName: stop.name, type: 'closed', detail: '', notes: '' })}
                      style={actBtnStyle}
                      title="Report issue"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                        <line x1="4" y1="22" x2="4" y2="15" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Bottom bar ──────────────────────────────────── */}
        <div style={bottomBarStyle}>
          {view.submitted ? (
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#16A34A', fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                Submitted for review
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
                {doneCount} stops · {monthLabel}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Earnings this run</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                    {doneCount} stops × ${rate.toFixed(2)}
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#16A34A', fontFamily: '"DM Mono", ui-monospace, monospace', letterSpacing: '-1px' }}>
                  ${earnings.toFixed(2)}
                </div>
              </div>
              <button
                onClick={() => {
                  const del = data.deliveries.find(d => d.id === view.deliveryId)
                  setInvoiceSheet({ notes: '', gasAmount: del?.gas_amount != null ? String(del.gas_amount) : '', submitting: false })
                }}
                disabled={doneCount === 0}
                style={{
                  width: '100%', padding: 16,
                  background: doneCount === 0 ? '#CBD5E1' : '#0F2640',
                  color: 'white', border: 'none', borderRadius: 12,
                  fontSize: 16, fontWeight: 700,
                  cursor: doneCount === 0 ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Submit invoice
              </button>
            </>
          )}
        </div>

      </div>

      {/* ── Toast ─────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: '#1E293B', color: 'white', padding: '10px 20px', borderRadius: 20,
          fontSize: 13, fontWeight: 500, zIndex: 200,
        }}>{toast}</div>
      )}

      {/* ── Sheets ────────────────────────────────────────── */}

      {detailsSheet && (() => {
        const ds = data.deliveryStops.find(x => x.id === detailsSheet.dsId)
        const photos = ds?.photo_urls ?? []
        return (
          <Sheet onClose={() => setDetailsSheet(null)} title={detailsSheet.stopName}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B', marginBottom: 6 }}>
              Note for this stop
            </div>
            <textarea
              value={detailsSheet.text}
              onChange={e => setDetailsSheet({ ...detailsSheet, text: e.target.value })}
              placeholder="e.g. Left with manager, near entrance…"
              style={sheetTextareaStyle}
              autoFocus
            />

            {/* Leftovers per publication */}
            {detailsSheet.pubKeys.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B', marginBottom: 6 }}>
                  Leftovers per publication
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>How many copies came back unused?</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {detailsSheet.pubKeys.map(pub => (
                    <label key={pub} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1E293B' }}>
                      <span style={{ fontWeight: 700, fontFamily: '"DM Mono", ui-monospace, monospace' }}>{pub.toUpperCase()}</span>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={detailsSheet.leftovers[pub] || ''}
                        onChange={e => setDetailsSheet({
                          ...detailsSheet,
                          leftovers: { ...detailsSheet.leftovers, [pub]: Math.max(0, parseInt(e.target.value || '0', 10)) },
                        })}
                        style={{ width: 60, padding: '6px 8px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Photo POD */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B', marginBottom: 6 }}>
                Proof-of-delivery photos
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>Snap a photo of where you left the copies.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {photos.map(url => (
                  <div key={url} style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="POD" style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 8, border: '1px solid #E2E8F0' }} />
                    <button
                      onClick={() => removeStopPhoto(detailsSheet.dsId, url)}
                      style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#DC2626', color: 'white', border: 'none', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      aria-label="Remove photo"
                    >×</button>
                  </div>
                ))}
                <label style={{ width: 68, height: 68, borderRadius: 8, border: '1.5px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#F8FAFC' }}>
                  <span style={{ fontSize: 24, color: '#64748B' }}>+</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={async e => {
                      const f = e.target.files?.[0]
                      if (f) await uploadStopPhoto(detailsSheet.dsId, f)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={saveDetails} style={sheetSaveStyle}>Save</button>
              <button onClick={() => setDetailsSheet(null)} style={sheetCancelStyle}>Cancel</button>
            </div>
          </Sheet>
        )
      })()}

      {/* Pickup load sheet — driver logs how many bundles per pub picked up */}
      {pickupSheet && (
        <Sheet onClose={() => setPickupSheet(null)} title={`Load at ${pickupSheet.stopName}`}>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>
            How many bundles did you pick up? (Route needs about the same as last month.)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {pickupSheet.pubKeys.map(pub => (
              <label key={pub} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#1E293B' }}>
                <span style={{ fontWeight: 700, fontFamily: '"DM Mono", ui-monospace, monospace' }}>{pub.toUpperCase()}</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={pickupSheet.load[pub] || ''}
                  onChange={e => setPickupSheet({
                    ...pickupSheet,
                    load: { ...pickupSheet.load, [pub]: Math.max(0, parseInt(e.target.value || '0', 10)) },
                  })}
                  style={{ width: 80, padding: '8px 10px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 15, fontFamily: 'inherit' }}
                />
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={savePickupLoad} style={sheetSaveStyle}>Save load count</button>
            <button onClick={() => setPickupSheet(null)} style={sheetCancelStyle}>Cancel</button>
          </div>
        </Sheet>
      )}

      {flagSheet && (
        <Sheet onClose={() => setFlagSheet(null)} title={flagSheet.stopName}>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>Report an issue</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {FLAGS.map(f => (
              <button
                key={f.key}
                onClick={() => setFlagSheet({ ...flagSheet, type: f.key })}
                style={{
                  padding: '11px 8px',
                  border: '1.5px solid ' + (flagSheet.type === f.key ? '#0F2640' : '#E2E8F0'),
                  borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: flagSheet.type === f.key ? '#EFF6FF' : 'white',
                  color: flagSheet.type === f.key ? '#0F2640' : '#64748B',
                  fontFamily: 'inherit', textAlign: 'center',
                }}
              >{f.label}</button>
            ))}
          </div>
          <input
            value={flagSheet.detail}
            onChange={e => setFlagSheet({ ...flagSheet, detail: e.target.value })}
            placeholder="Details…"
            style={sheetInputStyle}
          />
          <textarea
            value={flagSheet.notes}
            onChange={e => setFlagSheet({ ...flagSheet, notes: e.target.value })}
            placeholder="Notes for admin…"
            style={{ ...sheetTextareaStyle, height: 70 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={sendFlag} style={sheetSaveStyle}>Report issue</button>
            <button onClick={() => setFlagSheet(null)} style={sheetCancelStyle}>Cancel</button>
          </div>
        </Sheet>
      )}

      {invoiceSheet && (() => {
        const del = data.deliveries.find(d => d.id === view.deliveryId)
        const gasNum = parseFloat(invoiceSheet.gasAmount)
        const gasVal = Number.isNaN(gasNum) ? 0 : gasNum
        const totalWithGas = earnings + gasVal
        return (
          <Sheet onClose={() => setInvoiceSheet(null)} title="Submit invoice">
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: '#64748B' }}>Stops delivered</span>
                <span>{doneCount} × ${rate.toFixed(2)} = ${earnings.toFixed(2)}</span>
              </div>
              {gasVal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#64748B' }}>Gas expense</span>
                  <span>${gasVal.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: 8, marginTop: 4, fontWeight: 700, fontSize: 15 }}>
                <span>Total payout</span>
                <span style={{ color: '#16A34A', fontFamily: '"DM Mono", ui-monospace, monospace' }}>${totalWithGas.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B', marginBottom: 6 }}>
                Gas / fuel this run <span style={{ fontWeight: 400, color: '#94A3B8', textTransform: 'none' }}>(optional)</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '0 0 auto' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 15, fontFamily: '"DM Mono", ui-monospace, monospace' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    inputMode="decimal"
                    value={invoiceSheet.gasAmount}
                    onChange={e => setInvoiceSheet({ ...invoiceSheet, gasAmount: e.target.value })}
                    placeholder="0.00"
                    style={{ width: 120, padding: '10px 10px 10px 22px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 15, fontFamily: '"DM Mono", ui-monospace, monospace' }}
                  />
                </div>
                <label style={{
                  padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, color: '#1E293B', background: 'white',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  {del?.gas_receipt_url ? '📸 Replace receipt' : '📸 Add receipt photo'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={async e => {
                      const f = e.target.files?.[0]
                      if (f) await uploadGasReceipt(f)
                      e.target.value = ''
                    }}
                  />
                </label>
                {del?.gas_receipt_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={del.gas_receipt_url} alt="Receipt" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #E2E8F0' }} />
                )}
              </div>
            </div>

            <textarea
              value={invoiceSheet.notes}
              onChange={e => setInvoiceSheet({ ...invoiceSheet, notes: e.target.value })}
              placeholder="Notes for admin (optional)…"
              style={{ ...sheetTextareaStyle, height: 70 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={submitInvoice}
                disabled={invoiceSheet.submitting}
                style={sheetSaveStyle}
              >
                {invoiceSheet.submitting ? 'Submitting…' : 'Confirm & submit'}
              </button>
              <button onClick={() => setInvoiceSheet(null)} style={sheetCancelStyle}>Cancel</button>
            </div>
          </Sheet>
        )
      })()}

      {/* Stop history sheet — tap a stop name to see address + directions
          + your last 6 months of runs at this location. */}
      {historySheet && (
        <Sheet onClose={() => setHistorySheet(null)} title={historySheet.stopName}>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 6 }}>
            {historySheet.address || 'No address on file'}
          </div>
          {historySheet.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(historySheet.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: '#1A5FA8', color: 'white', textDecoration: 'none' }}
            >
              📍 Map
            </a>
          )}

          {historySheet.presetNotes && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1A5FA8', fontStyle: 'italic' }}>
              📌 {historySheet.presetNotes}
            </div>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B', marginTop: 16, marginBottom: 8 }}>
            Your last 6 months here
          </div>

          {historySheet.history === null ? (
            <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: 16 }}>Loading…</div>
          ) : historySheet.history.length === 0 ? (
            <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: 16 }}>
              First time here! No history to show yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {historySheet.history.map(h => {
                const monthLbl = h.month ? new Date(h.month + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'
                const leftoverStr = h.leftovers_json && Object.keys(h.leftovers_json).length > 0
                  ? Object.entries(h.leftovers_json).filter(([, v]) => v > 0).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ')
                  : (h.leftovers > 0 ? `${h.leftovers} copies` : '')
                return (
                  <div key={h.month + h.status} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{monthLbl}</div>
                      {h.checked ? (
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: 999 }}>Delivered</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#E2E8F0', color: '#64748B', padding: '2px 8px', borderRadius: 999 }}>Skipped</span>
                      )}
                    </div>
                    {leftoverStr && (
                      <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>📦 Leftover: {leftoverStr}</div>
                    )}
                    {h.driver_note && (
                      <div style={{ fontSize: 12, color: '#1A5FA8', marginTop: 2, fontStyle: 'italic' }}>📝 {h.driver_note}</div>
                    )}
                    {h.photo_urls.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {h.photo_urls.map(url => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="POD" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, border: '1px solid #E2E8F0' }} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => setHistorySheet(null)} style={{ ...sheetSaveStyle, background: '#F1F5F9', color: '#1E293B' }}>Close</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

// ── Mini map ───────────────────────────────────────────────────────────
// Google Maps embed via @vis.gl/react-google-maps — swaps out v3's Leaflet
// implementation because the rest of the portal already uses Google Maps.
function MiniMap({ stops, byStop, onClose, onStopClick }: {
  stops: Stop[]
  byStop: Map<string, DeliveryStop>
  onClose: () => void
  onStopClick: (stopId: string) => void
}) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setLoaded(true) }, [])
  return (
    <div style={{ height: 240, position: 'relative', flexShrink: 0, borderBottom: '2px solid rgba(255,255,255,.1)' }}>
      {loaded && <MapInline stops={stops} byStop={byStop} onStopClick={onStopClick} />}
      <button onClick={onClose} style={{ position: 'absolute', top: 8, right: 8, zIndex: 500, background: 'white', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,.15)' }}>
        ✕ Close map
      </button>
    </div>
  )
}

function MapInline({ stops, byStop, onStopClick }: { stops: Stop[]; byStop: Map<string, DeliveryStop>; onStopClick: (id: string) => void }) {
  const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const withCoords = stops.filter(s => s.lat != null && s.lng != null)

  if (!GOOGLE_MAPS_KEY) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FEF3C7', color: '#92400E', fontSize: 12, padding: 12, textAlign: 'center' }}>
      Google Maps key not configured
    </div>
  }
  if (withCoords.length === 0) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', color: '#64748B', fontSize: 12 }}>
      No geocoded stops on this route
    </div>
  }
  return <MiniMapDynamic stops={withCoords} byStop={byStop} apiKey={GOOGLE_MAPS_KEY} onStopClick={onStopClick} />
}

function MiniMapDynamic({ stops, byStop, apiKey, onStopClick }: {
  stops: Stop[]
  byStop: Map<string, DeliveryStop>
  apiKey: string
  onStopClick: (id: string) => void
}) {
  const [Pkg, setPkg] = useState<null | {
    APIProvider: React.ComponentType<{ apiKey: string; children: React.ReactNode }>
    Map: React.ComponentType<{ mapId?: string; defaultCenter: { lat: number; lng: number }; defaultZoom: number; style: React.CSSProperties; children: React.ReactNode }>
    AdvancedMarker: React.ComponentType<{ position: { lat: number; lng: number }; onClick?: () => void; children: React.ReactNode }>
  }>(null)

  useEffect(() => {
    import('@vis.gl/react-google-maps').then((m) => setPkg(m as unknown as typeof Pkg))
  }, [])

  if (!Pkg) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 12 }}>Loading map…</div>

  const center = { lat: stops.reduce((s, x) => s + (x.lat ?? 0), 0) / stops.length, lng: stops.reduce((s, x) => s + (x.lng ?? 0), 0) / stops.length }
  const { APIProvider, Map, AdvancedMarker } = Pkg

  return (
    <APIProvider apiKey={apiKey}>
      <Map mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID ?? 'DEMO_MAP_ID'} defaultCenter={center} defaultZoom={12} style={{ width: '100%', height: '100%' }}>
        {stops.map(s => {
          const ds = byStop.get(s.id)
          const isDone = !!ds?.checked
          const isPickup = !!s.is_pickup
          const color = isPickup ? '#1A5FA8' : isDone ? '#16A34A' : '#0F2640'
          return (
            <AdvancedMarker key={s.id} position={{ lat: s.lat!, lng: s.lng! }} onClick={() => onStopClick(s.id)}>
              <div title={s.name} style={{ width: 18, height: 18, borderRadius: '50%', background: color, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,.3)', cursor: 'pointer' }} />
            </AdvancedMarker>
          )
        })}
      </Map>
    </APIProvider>
  )
}

// ── Bottom sheet primitive ─────────────────────────────────────────────
function Sheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', width: '100%', maxWidth: 480 }}>
        <div style={{ width: 36, height: 4, background: '#E2E8F0', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, color: '#1E293B' }}>{title}</div>
        {children}
      </div>
    </div>
  )
}

// ── Full-bleed message screen ──────────────────────────────────────────
function FullBleedMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...outerStyle, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 14, padding: 32, textAlign: 'center', maxWidth: 360 }}>
        {children}
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────
const outerStyle: React.CSSProperties = {
  fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif',
  background: '#F1F5F9',
  color: '#1E293B',
  minHeight: '100vh',
  display: 'flex',
}
const appStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
  height: '100vh',
  width: '100%',
  maxWidth: 480,
  margin: '0 auto',
  background: '#F1F5F9',
}
const topBarStyle: React.CSSProperties = {
  background: '#0F2640', padding: '14px 16px 10px', flexShrink: 0,
}
const routeTabsStyle: React.CSSProperties = {
  display: 'flex', overflowX: 'auto', gap: 6, padding: '8px 12px', background: 'white', borderBottom: '1px solid #E2E8F0', flexShrink: 0,
}
const stopScrollStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
  WebkitOverflowScrolling: 'touch',
}
const bottomBarStyle: React.CSSProperties = {
  background: 'white', borderTop: '1.5px solid #E2E8F0', padding: '12px 16px 20px', flexShrink: 0,
  paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
}
const actBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', border: 'none', background: 'transparent', color: '#CBD5E1',
  transition: 'color .12s',
}
const sheetTextareaStyle: React.CSSProperties = {
  width: '100%', padding: 12, border: '1.5px solid #E2E8F0', borderRadius: 10,
  fontSize: 15, fontFamily: 'inherit', resize: 'none', height: 90, color: '#1E293B',
}
const sheetInputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', border: '1.5px solid #E2E8F0', borderRadius: 10,
  fontSize: 14, fontFamily: 'inherit', marginBottom: 10, color: '#1E293B',
}
const sheetSaveStyle: React.CSSProperties = {
  flex: 1, padding: 13, background: '#0F2640', color: 'white', border: 'none', borderRadius: 10,
  fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const sheetCancelStyle: React.CSSProperties = {
  padding: '13px 18px', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 10,
  fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
}
function topBtnStyle(active: boolean): React.CSSProperties {
  return {
    color: active ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.4)',
    fontSize: 11, background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', padding: '2px 4px', textDecoration: 'none',
  }
}

// ── Icon buttons for the top bar ───────────────────────────────────────
function iconButtonStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 8,
    background: active ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.08)',
    border: '1px solid rgba(255,255,255,.15)',
    color: 'white',
    cursor: 'pointer', fontFamily: 'inherit',
    padding: 0, textDecoration: 'none',
  }
}
function IconButton({ onClick, active, label, children }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode }) {
  return <button onClick={onClick} title={label} aria-label={label} style={iconButtonStyle(!!active)}>{children}</button>
}
function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return <a href={href} title={label} aria-label={label} style={iconButtonStyle(false)}>{children}</a>
}
function MapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  )
}
function PrinterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function routeTabBtn(active: boolean): React.CSSProperties {
  return {
    flexShrink: 0, padding: '6px 14px', borderRadius: 20,
    fontSize: 12, fontWeight: 500,
    border: '1.5px solid ' + (active ? '#0F2640' : '#E2E8F0'),
    background: active ? '#0F2640' : 'white',
    color: active ? 'white' : '#64748B',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}
