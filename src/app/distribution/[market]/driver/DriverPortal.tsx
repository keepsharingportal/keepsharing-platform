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
interface Delivery      { id: string; route_id: string; status?: string }
interface DeliveryStop  {
  id:          string
  delivery_id: string
  stop_id:     string
  checked:     boolean
  checked_at:  string | null
  notes:       string | null
  driver_note: string | null
  flag:        string | null
  flag_note:   string | null
}
interface ApiResponse {
  driver:        { user_id: string; market: string; full_name: string; rate_per_stop?: number }
  month:         string
  routes:        Route[]
  stops:         Stop[]
  deliveries:    Delivery[]
  deliveryStops: DeliveryStop[]
}

// Flag vocabulary — matches v3 index.php's 4-button grid.
const FLAGS: Array<{ key: string; label: string }> = [
  { key: 'closed',        label: 'Location closed' },
  { key: 'wrong_address', label: 'Wrong address' },
  { key: 'wrong_qty',     label: 'Wrong quantity' },
  { key: 'new_stop',      label: 'New stop nearby' },
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

  // ── Sheets state — all three sheets share the same open/closed pattern
  const [noteSheet, setNoteSheet] = useState<null | { dsId: string; stopName: string; text: string }>(null)
  const [flagSheet, setFlagSheet] = useState<null | { stopId: string; deliveryStopId: string; stopName: string; type: string; detail: string; notes: string }>(null)
  const [invoiceSheet, setInvoiceSheet] = useState<null | { notes: string; submitting: boolean }>(null)

  // ── Toast for "Sent to Jason for review" and similar micro-feedback
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
      .then(r => r.ok ? r.json() : Promise.reject('Failed to load'))
      .then((j: ApiResponse) => {
        setData(j)
        // Prefer ?route=<id> from the URL (dashboard links pass it) then
        // fall back to the first route in the assignment list.
        const urlRoute = new URLSearchParams(window.location.search).get('route')
        if (urlRoute && j.routes.some(r => r.id === urlRoute)) {
          setActiveRouteId(urlRoute)
        } else if (j.routes.length > 0) {
          setActiveRouteId(j.routes[0].id)
        }
      })
      .catch(e => setErr(typeof e === 'string' ? e : 'Could not load'))
  }, [])

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

  async function saveNote() {
    if (!noteSheet) return
    const dsId = noteSheet.dsId
    const text = noteSheet.text.trim()
    patchDeliveryStop(dsId, { driver_note: text || null })
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ delivery_stop_id: dsId, driver_note: text }),
    }).catch(() => {})
    setNoteSheet(null)
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
    flashToast('Sent to Jason for review')
  }

  async function submitInvoice() {
    if (!invoiceSheet || !view) return
    setInvoiceSheet({ ...invoiceSheet, submitting: true })
    try {
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
      // Refresh — status will flip to 'submitted' and the UI will lock.
      const refresh = await fetch('/api/circulation/driver').then(r => r.json() as Promise<ApiResponse>)
      setData(refresh)
      setInvoiceSheet(null)
      flashToast('Invoice submitted')
    } catch {
      setInvoiceSheet(invoiceSheet ? { ...invoiceSheet, submitting: false } : null)
      flashToast('Submit failed — try again')
    }
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 10 }}>
              <button onClick={() => setShowMap(v => !v)} style={topBtnStyle(showMap)} title="Show map">🗺</button>
              <a href={`/distribution/${market}/driver/print?route=${view.route.id}`} style={topBtnStyle(false)} title="Print sheet">🖨</a>
              <a href={`/distribution/${market}/driver/dashboard`} style={topBtnStyle(false)} title="My routes">🏠</a>
              <button onClick={signOut} style={{ ...topBtnStyle(false), padding: '2px 4px' }}>Sign out</button>
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

        {/* ── Mini map (lazy) ─────────────────────────────── */}
        {showMap && <MiniMap stops={view.stops} byStop={view.byStop} onClose={() => setShowMap(false)} />}

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

            const cardStyle: React.CSSProperties = {
              background:  isDone ? '#F0FDF4' : isPaused ? '#FFFBEB' : isPickup ? '#EFF6FF' : isNew ? '#EFF6FF' : 'white',
              borderColor: isDone ? '#86EFAC' : isPaused ? '#FDE68A' : isPickup ? '#BFDBFE' : isNew ? '#93C5FD' : 'transparent',
              opacity:     isPaused ? 0.7 : 1,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'stretch',
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,.06)',
              border: '1.5px solid',
            }

            return (
              <div key={stop.id} style={cardStyle}>
                {/* Check area — 64px wide tap target */}
                <button
                  onClick={() => !isPickup && !isPaused && !locked && toggleCheck(ds)}
                  disabled={isPickup || isPaused || locked}
                  style={{
                    width: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '16px 0', background: 'transparent', border: 'none',
                    cursor: (isPickup || isPaused || locked) ? 'default' : 'pointer',
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
                  <div style={{
                    fontSize: 15, fontWeight: 600, lineHeight: 1.3,
                    color: isDone ? '#94A3B8' : '#1E293B',
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}>
                    {stop.name}
                    {isNew && !isDone && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: '#1A5FA8', color: 'white', padding: '1px 6px', borderRadius: 8, marginLeft: 6, verticalAlign: 'middle', letterSpacing: '.3px' }}>
                        NEW
                      </span>
                    )}
                    {stop.is_advertiser && !isPickup && (
                      <span title="Advertiser — give them a big smile!" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 800, marginLeft: 6, verticalAlign: 'middle' }}>★</span>
                    )}
                  </div>

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

                  {/* Publication pills + pickup/paused badges */}
                  <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                    {stop.quantities && Object.entries(stop.quantities).map(([pub, qty]) => {
                      if (!qty || isPickup) return null
                      const col = pubColor(pub)
                      return (
                        <span key={pub} style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: col.bg, color: col.fg, fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                          {pub.toUpperCase()} {qty}
                        </span>
                      )
                    })}
                    {isPickup && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: '#DBEAFE', color: '#1A5FA8', fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                        📦 Load here
                      </span>
                    )}
                    {isPaused && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: '#FEF3C7', color: '#92400E', fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                        ⏸ Not delivering
                      </span>
                    )}
                  </div>

                  {/* Get directions — this is a keeper from my earlier build; v3 didn't have it but drivers immediately asked for it */}
                  {stop.address && !isPickup && !isPaused && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([stop.address, stop.city, stop.zip].filter(Boolean).join(', '))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: '#1A5FA8', color: 'white', textDecoration: 'none' }}
                    >
                      🧭 Directions
                    </a>
                  )}
                </div>

                {/* Actions (note + flag) — only for deliverable stops on unsubmitted routes */}
                {!isPickup && !isPaused && !locked && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 12px 10px 2px', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => setNoteSheet({ dsId: ds.id, stopName: stop.name, text: ds.driver_note ?? '' })}
                      style={actBtnStyle}
                      title="Add note"
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
                onClick={() => setInvoiceSheet({ notes: '', submitting: false })}
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

      {noteSheet && (
        <Sheet onClose={() => setNoteSheet(null)} title={noteSheet.stopName}>
          <textarea
            value={noteSheet.text}
            onChange={e => setNoteSheet({ ...noteSheet, text: e.target.value })}
            placeholder="e.g. Left with manager, near entrance…"
            style={sheetTextareaStyle}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={saveNote} style={sheetSaveStyle}>Save</button>
            <button onClick={() => setNoteSheet(null)} style={sheetCancelStyle}>Cancel</button>
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
            placeholder="Notes for Jason…"
            style={{ ...sheetTextareaStyle, height: 70 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={sendFlag} style={sheetSaveStyle}>Send to Jason</button>
            <button onClick={() => setFlagSheet(null)} style={sheetCancelStyle}>Cancel</button>
          </div>
        </Sheet>
      )}

      {invoiceSheet && (
        <Sheet onClose={() => setInvoiceSheet(null)} title="Submit invoice">
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Stops</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{doneCount}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#64748B' }}>Payout</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#16A34A', fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                ${earnings.toFixed(2)}
              </div>
            </div>
          </div>
          <textarea
            value={invoiceSheet.notes}
            onChange={e => setInvoiceSheet({ ...invoiceSheet, notes: e.target.value })}
            placeholder="Notes for Jason (optional)…"
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
      )}
    </div>
  )
}

// ── Mini map ───────────────────────────────────────────────────────────
// Google Maps embed via @vis.gl/react-google-maps — swaps out v3's Leaflet
// implementation because the rest of the portal already uses Google Maps.
function MiniMap({ stops, byStop, onClose }: { stops: Stop[]; byStop: Map<string, DeliveryStop>; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setLoaded(true) }, [])
  return (
    <div style={{ height: 240, position: 'relative', flexShrink: 0, borderBottom: '2px solid rgba(255,255,255,.1)' }}>
      {loaded && <MapInline stops={stops} byStop={byStop} />}
      <button onClick={onClose} style={{ position: 'absolute', top: 8, right: 8, zIndex: 500, background: 'white', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,.15)' }}>
        ✕ Close map
      </button>
    </div>
  )
}

// Split out so the Google Maps package only bundles when the driver
// actually opens the map. Inlines the API key check.
function MapInline({ stops, byStop }: { stops: Stop[]; byStop: Map<string, DeliveryStop> }) {
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

  // Dynamic import so the map package doesn't bloat the initial checklist.
  // Handled by a wrapper component below.
  return <MiniMapDynamic stops={withCoords} byStop={byStop} apiKey={GOOGLE_MAPS_KEY} />
}

// Wrapper — imports the @vis.gl package lazily.
function MiniMapDynamic({ stops, byStop, apiKey }: { stops: Stop[]; byStop: Map<string, DeliveryStop>; apiKey: string }) {
  const [Pkg, setPkg] = useState<null | {
    APIProvider: React.ComponentType<{ apiKey: string; children: React.ReactNode }>
    Map: React.ComponentType<{ mapId?: string; defaultCenter: { lat: number; lng: number }; defaultZoom: number; style: React.CSSProperties; children: React.ReactNode }>
    AdvancedMarker: React.ComponentType<{ position: { lat: number; lng: number }; children: React.ReactNode }>
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
            <AdvancedMarker key={s.id} position={{ lat: s.lat!, lng: s.lng! }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: color, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
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
