'use client'

// FullRunPortal — verbatim port of v3 driver/run.php.
//
// Combined checklist across every assigned route for the driver in
// sort_order. Same design as DriverPortal (v3 driver/index.php) with the
// addition of dark blue route section headers between blocks and a
// per-route breakdown inside the Submit invoice sheet.
//
// Everything else (top bar, stop cards, note/flag sheets, live earnings,
// toast) is identical — the two views share the same visual vocabulary.

import { useEffect, useMemo, useRef, useState } from 'react'

interface Route      { id: string; name: string; city: string | null }
interface Stop       {
  id: string; route_id: string; name: string; address: string | null; city: string | null; zip: string | null;
  sort_order: number; quantities: Record<string, number> | null;
  not_delivering: boolean; is_pickup?: boolean; is_advertiser?: boolean;
  notes?: string | null; lat?: number | null; lng?: number | null; created_at?: string | null;
}
interface Delivery      {
  id: string; route_id: string; status?: string;
  gas_amount?: number | null; gas_receipt_url?: string | null;
  pickup_load_json?: Record<string, number>;
}
interface DeliveryStop  {
  id: string; delivery_id: string; stop_id: string; checked: boolean; checked_at: string | null;
  notes: string | null; driver_note: string | null;
  leftovers: number; leftovers_json: Record<string, number> | null;
  photo_urls: string[];
  flag: string | null; flag_note: string | null;
}
interface ApiResponse {
  driver:        { user_id: string; market: string; full_name: string; rate_per_stop?: number }
  month:         string
  routes:        Route[]
  stops:         Stop[]
  deliveries:    Delivery[]
  deliveryStops: DeliveryStop[]
}

const FLAGS: Array<{ key: string; label: string }> = [
  { key: 'closed',        label: 'Location closed' },
  { key: 'wrong_address', label: 'Wrong address' },
  { key: 'wrong_qty',     label: 'Wrong quantity' },
  { key: 'new_stop',      label: 'New stop nearby' },
]

const PUB_COLORS: Record<string, { bg: string; fg: string }> = {
  RRP:  { bg: '#DBEAFE', fg: '#1A5FA8' },
  BOOM: { bg: '#FEF3C7', fg: '#B45309' },
}
function pubColor(key: string) {
  return PUB_COLORS[key.toUpperCase()] ?? { bg: '#F1F5F9', fg: '#64748B' }
}

const CURRENT_YM = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})()

export function FullRunPortal({ market, driverName }: { market: string; driverName: string }) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [err,  setErr]  = useState<string | null>(null)
  const [sessionDead, setSessionDead] = useState(false)

  const [detailsSheet, setDetailsSheet] = useState<null | { dsId: string; stopId: string; stopName: string; text: string; leftovers: Record<string, number>; pubKeys: string[] }>(null)
  const [flagSheet, setFlagSheet] = useState<null | { stopId: string; deliveryStopId: string; stopName: string; type: string; detail: string; notes: string }>(null)
  const [pickupSheet, setPickupSheet] = useState<null | { stopName: string; deliveryId: string; load: Record<string, number>; pubKeys: string[] }>(null)
  const [invoiceSheet, setInvoiceSheet] = useState<null | { notes: string; gasAmount: string; targetDeliveryId: string; submitting: boolean }>(null)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function flashToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    fetch('/api/circulation/driver')
      .then(async r => {
        if (r.status === 401 || r.status === 403) { setSessionDead(true); throw new Error('session') }
        if (!r.ok) throw new Error('Failed to load')
        return r.json()
      })
      .then((j: ApiResponse) => setData(j))
      .catch(e => { if (e?.message !== 'session') setErr(typeof e === 'string' ? e : 'Could not load') })
  }, [])

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const r = await fetch('/api/circulation/driver?ping=1', { cache: 'no-store' })
        if (r.status === 401 || r.status === 403) setSessionDead(true)
      } catch { /* offline */ }
    }, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  const view = useMemo(() => {
    if (!data) return null
    // Group by route in sort order. Each section has route + delivery +
    // stops + counts. Submitted routes show ✓ Submitted in the header.
    const sections = data.routes.map(route => {
      const delivery = data.deliveries.find(d => d.route_id === route.id)
      if (!delivery) return null
      const stops = data.stops
        .filter(s => s.route_id === route.id)
        .sort((a, b) => {
          const ap = a.is_pickup ? 1 : 0
          const bp = b.is_pickup ? 1 : 0
          if (ap !== bp) return bp - ap
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
          return a.name.localeCompare(b.name)
        })
      const byStop = new Map<string, DeliveryStop>()
      for (const ds of data.deliveryStops.filter(ds => ds.delivery_id === delivery.id)) byStop.set(ds.stop_id, ds)
      const eligible = stops.filter(s => !s.not_delivering && !s.is_pickup)
      const done = eligible.filter(s => byStop.get(s.id)?.checked).length
      const total = eligible.length
      const submitted = (delivery.status ?? 'draft') !== 'draft'
      return { route, delivery, stops, byStop, done, total, submitted }
    }).filter(Boolean) as Array<{ route: Route; delivery: Delivery; stops: Stop[]; byStop: Map<string, DeliveryStop>; done: number; total: number; submitted: boolean }>

    const totalDone = sections.reduce((sum, s) => sum + s.done, 0)
    const totalStops = sections.reduce((sum, s) => sum + s.total, 0)
    const allSubmitted = sections.length > 0 && sections.every(s => s.submitted)
    const pct = totalStops > 0 ? Math.round((totalDone / totalStops) * 100) : 0
    return { sections, totalDone, totalStops, allSubmitted, pct }
  }, [data])

  const rate = data?.driver?.rate_per_stop ?? 0
  const monthLabel = data?.month ? new Date(data.month + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''
  const earnings = view ? view.totalDone * rate : 0

  function patchDeliveryStop(dsId: string, patch: Partial<DeliveryStop>) {
    setData(prev => prev ? ({
      ...prev,
      deliveryStops: prev.deliveryStops.map(ds => ds.id === dsId ? { ...ds, ...patch } : ds),
    }) : prev)
  }

  async function toggleCheck(ds: DeliveryStop, sectionSubmitted: boolean) {
    if (sectionSubmitted) return
    const next = !ds.checked
    patchDeliveryStop(ds.id, { checked: next, checked_at: next ? new Date().toISOString() : null })
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ delivery_stop_id: ds.id, checked: next }),
    }).catch(() => {})
  }

  async function saveDetails() {
    if (!detailsSheet) return
    const dsId = detailsSheet.dsId
    const text = detailsSheet.text.trim()
    const leftoversJson = Object.fromEntries(Object.entries(detailsSheet.leftovers).filter(([, v]) => v > 0))
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

  async function uploadStopPhoto(dsId: string, file: File): Promise<string | null> {
    const form = new FormData()
    form.append('file', file)
    form.append('kind', 'stop-photo')
    form.append('ref', JSON.stringify({ deliveryStopId: dsId }))
    const res = await fetch('/api/circulation/driver/upload', { method: 'POST', body: form })
    if (!res.ok) { flashToast('Photo upload failed'); return null }
    const j = await res.json() as { url: string }
    patchDeliveryStop(dsId, { photo_urls: [...(data?.deliveryStops.find(x => x.id === dsId)?.photo_urls ?? []), j.url] })
    return j.url
  }

  async function removeStopPhoto(dsId: string, url: string) {
    await fetch('/api/circulation/driver/upload', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url, kind: 'stop-photo', ref: { deliveryStopId: dsId } }),
    })
    patchDeliveryStop(dsId, { photo_urls: (data?.deliveryStops.find(x => x.id === dsId)?.photo_urls ?? []).filter(u => u !== url) })
  }

  async function savePickupLoad() {
    if (!pickupSheet) return
    const cleaned = Object.fromEntries(Object.entries(pickupSheet.load).filter(([, v]) => v > 0))
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'save-pickup-load', delivery_id: pickupSheet.deliveryId, pickup_load_json: cleaned }),
    })
    setData(prev => prev ? ({
      ...prev,
      deliveries: prev.deliveries.map(d => d.id === pickupSheet.deliveryId ? { ...d, pickup_load_json: cleaned } : d),
    }) : prev)
    setPickupSheet(null)
    flashToast('Load count saved')
  }

  async function uploadGasReceipt(deliveryId: string, file: File) {
    const form = new FormData()
    form.append('file', file)
    form.append('kind', 'gas-receipt')
    form.append('ref', JSON.stringify({ deliveryId }))
    const res = await fetch('/api/circulation/driver/upload', { method: 'POST', body: form })
    if (!res.ok) { flashToast('Receipt upload failed'); return }
    const j = await res.json() as { url: string }
    setData(prev => prev ? ({
      ...prev,
      deliveries: prev.deliveries.map(d => d.id === deliveryId ? { ...d, gas_receipt_url: j.url } : d),
    }) : prev)
    flashToast('Receipt uploaded')
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

  async function submitAll() {
    if (!invoiceSheet) return
    setInvoiceSheet({ ...invoiceSheet, submitting: true })
    try {
      // Persist the gas expense to the target delivery (single row —
      // driver picks which route the gas belongs to via the sheet).
      const gas = parseFloat(invoiceSheet.gasAmount)
      if (!Number.isNaN(gas) && gas >= 0 && invoiceSheet.targetDeliveryId) {
        await fetch('/api/circulation/driver', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'save-gas', delivery_id: invoiceSheet.targetDeliveryId, gas_amount: gas }),
        })
      }
      const res = await fetch('/api/circulation/driver', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'submit-all', driver_notes: invoiceSheet.notes }),
      })
      if (!res.ok) throw new Error('Submit failed')
      window.location.href = `/distribution/${market}/driver/dashboard`
    } catch {
      setInvoiceSheet(invoiceSheet ? { ...invoiceSheet, submitting: false } : null)
      flashToast('Submit failed — try again')
    }
  }

  async function signOut() {
    await fetch('/auth/signout', { method: 'POST' }).catch(() => {})
    window.location.href = '/distribution/login'
  }

  if (err) return <FullBleedMessage>{err}</FullBleedMessage>
  if (!data || !view) return <FullBleedMessage>Loading…</FullBleedMessage>
  if (view.sections.length <= 1) {
    // Only one route — redirect back to the checklist.
    if (typeof window !== 'undefined') {
      window.location.href = `/distribution/${market}/driver`
    }
    return <FullBleedMessage>Redirecting…</FullBleedMessage>
  }

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
      <div style={{ ...appStyle, maxWidth: 600 }}>

        <div style={topBarStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                Full Run — {view.sections.length} routes
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>
                {driverName} · {monthLabel}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 10 }}>
              <a
                href={`/distribution/${market}/driver/dashboard`}
                title="Dashboard" aria-label="Dashboard"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: 8,
                  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
                  color: 'white', textDecoration: 'none',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </a>
              <button
                onClick={signOut}
                style={{
                  color: 'rgba(255,255,255,.75)', fontSize: 13, fontWeight: 500,
                  background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >Sign out</button>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 3, height: 5, marginTop: 10 }}>
            <div style={{ height: 5, borderRadius: 3, background: '#4ADE80', width: `${view.pct}%`, transition: 'width .35s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
            <span>{view.totalDone} of {view.totalStops} stops</span>
            <span>{view.pct}%</span>
          </div>
        </div>

        {/* Stop list — grouped by route with dark section headers */}
        <div style={stopScrollStyle}>
          {view.sections.map(section => (
            <div key={section.route.id} style={{ display: 'contents' }}>
              {/* Route section header */}
              <div style={{ background: '#1E3A5F', color: 'white', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{section.route.name}</span>
                <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>
                  {section.done}/{section.total} done{section.submitted ? ' · ✓ Submitted' : ''}
                </span>
              </div>

              {/* Route's stops */}
              {section.stops.map(stop => {
                const ds = section.byStop.get(stop.id)
                if (!ds) return null
                const isPickup = !!stop.is_pickup
                const isPaused = !isPickup && !!stop.not_delivering
                const isDone   = !isPickup && !isPaused && !!ds.checked
                const isNew    = !isPickup && !isPaused && !!stop.created_at && stop.created_at.substring(0, 7) === CURRENT_YM
                const locked   = section.submitted
                const pubKeys  = stop.quantities ? Object.keys(stop.quantities).sort() : []
                const leftoversNow = (ds.leftovers_json ?? {}) as Record<string, number>
                const leftoversTotal = Object.values(leftoversNow).reduce((s, v) => s + v, 0)

                const borderCol = isDone ? '#86EFAC' : isPaused ? '#FDE68A' : isPickup ? '#BFDBFE' : isNew ? '#93C5FD' : '#E2E8F0'
                const cardStyle: React.CSSProperties = {
                  background:  isDone ? '#F0FDF4' : isPaused ? '#FFFBEB' : isPickup ? '#EFF6FF' : isNew ? '#EFF6FF' : 'white',
                  opacity: isPaused ? 0.7 : 1,
                  borderRadius: 14, display: 'flex', alignItems: 'stretch',
                  overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                  border: `1.5px solid ${borderCol}`,
                  flexShrink: 0,  // Prevent column flex from collapsing cards to lines.
                }

                return (
                  <div key={stop.id} id={`stop-card-${stop.id}`} style={cardStyle}>
                    <button
                      onClick={() => {
                        if (locked) return
                        if (isPickup) {
                          const load = section.stops.filter(s => !s.is_pickup && !s.not_delivering)
                            .reduce((acc, s) => {
                              for (const k of Object.keys(s.quantities ?? {})) {
                                acc[k] = (acc[k] ?? 0) + (s.quantities?.[k] ?? 0)
                              }
                              return acc
                            }, {} as Record<string, number>)
                          const loadKeys = Object.keys(load).sort()
                          const currentLoad = (section.delivery.pickup_load_json ?? {}) as Record<string, number>
                          setPickupSheet({ stopName: stop.name, deliveryId: section.delivery.id, load: { ...load, ...currentLoad }, pubKeys: loadKeys })
                          return
                        }
                        if (isPaused) return
                        toggleCheck(ds, section.submitted)
                      }}
                      disabled={isPaused || locked}
                      style={{ width: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0', background: 'transparent', border: 'none', cursor: (isPaused || locked) ? 'default' : 'pointer' }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        border: '2.5px solid ' + (isDone ? '#16A34A' : isPickup ? '#1A5FA8' : '#CBD5E1'),
                        background: isDone ? '#16A34A' : isPickup ? '#1A5FA8' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s',
                      }}>
                        {isPickup ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M8 2C5.8 2 4 3.8 4 6c0 3.3 4 8 4 8s4-4.7 4-8c0-2.2-1.8-4-4-4zm0 5.5c-.8 0-1.5-.7-1.5-1.5S7.2 4.5 8 4.5 9.5 5.2 9.5 6 8.8 7.5 8 7.5z" /></svg>
                        ) : isDone ? (
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="white"><path d="M7 12.4L3.6 9l-1.1 1.1L7 14.5l9-9-1.1-1.1z" /></svg>
                        ) : null}
                      </div>
                    </button>

                    <div style={{ flex: 1, padding: '13px 6px 13px 0', minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: isDone ? '#94A3B8' : '#1E293B', textDecoration: isDone ? 'line-through' : 'none' }}>
                        {stop.name}
                        {isNew && !isDone && (
                          <span style={{ fontSize: 9, fontWeight: 700, background: '#1A5FA8', color: 'white', padding: '1px 6px', borderRadius: 8, marginLeft: 6, verticalAlign: 'middle', letterSpacing: '.3px' }}>NEW</span>
                        )}
                        {stop.is_advertiser && !isPickup && (
                          <span title="Advertiser" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 800, marginLeft: 6, verticalAlign: 'middle' }}>★</span>
                        )}
                      </div>
                      {stop.address && (
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 1.4 }}>
                          {stop.address}{stop.city ? `, ${stop.city}` : ''}
                        </div>
                      )}
                      {ds.driver_note && (
                        <div style={{ fontSize: 11, color: '#1A5FA8', marginTop: 4, fontStyle: 'italic' }}>📝 {ds.driver_note}</div>
                      )}
                      {stop.notes && !isPickup && (
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontStyle: 'italic' }}>📌 {stop.notes}</div>
                      )}
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
                        {isPickup && (<span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: '#DBEAFE', color: '#1A5FA8', fontFamily: '"DM Mono", ui-monospace, monospace' }}>📦 Load here</span>)}
                        {isPaused && (<span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: '#FEF3C7', color: '#92400E', fontFamily: '"DM Mono", ui-monospace, monospace' }}>⏸ Not delivering</span>)}
                      </div>
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

                    {!isPickup && !isPaused && !locked && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 12px 10px 2px', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => setDetailsSheet({
                            dsId: ds.id, stopId: stop.id, stopName: stop.name,
                            text: ds.driver_note ?? '',
                            leftovers: leftoversNow,
                            pubKeys,
                          })}
                          style={actBtnStyle} title="Details, leftovers, photo"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setFlagSheet({ stopId: stop.id, deliveryStopId: ds.id, stopName: stop.name, type: 'closed', detail: '', notes: '' })}
                          style={actBtnStyle} title="Report issue"
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
          ))}
        </div>

        {/* Bottom bar */}
        <div style={bottomBarStyle}>
          {view.allSubmitted ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#16A34A', fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                All routes submitted
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{monthLabel}</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Earnings this run</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{view.totalDone} stops × ${rate.toFixed(2)}</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#16A34A', fontFamily: '"DM Mono", ui-monospace, monospace', letterSpacing: '-1px' }}>
                  ${earnings.toFixed(2)}
                </div>
              </div>
              <button
                onClick={() => {
                  const first = view.sections[0]?.delivery
                  setInvoiceSheet({
                    notes: '',
                    gasAmount: first?.gas_amount != null ? String(first.gas_amount) : '',
                    targetDeliveryId: first?.id ?? '',
                    submitting: false,
                  })
                }}
                disabled={view.totalDone === 0}
                style={{
                  width: '100%', padding: 16,
                  background: view.totalDone === 0 ? '#CBD5E1' : '#0F2640',
                  color: 'white', border: 'none', borderRadius: 12,
                  fontSize: 16, fontWeight: 700,
                  cursor: view.totalDone === 0 ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Submit all invoices
              </button>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: '#1E293B', color: 'white', padding: '10px 20px', borderRadius: 20, fontSize: 13, fontWeight: 500, zIndex: 200 }}>
          {toast}
        </div>
      )}

      {detailsSheet && (() => {
        const ds = data.deliveryStops.find(x => x.id === detailsSheet.dsId)
        const photos = ds?.photo_urls ?? []
        return (
          <Sheet onClose={() => setDetailsSheet(null)} title={detailsSheet.stopName}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B', marginBottom: 6 }}>Note for this stop</div>
            <textarea
              value={detailsSheet.text}
              onChange={e => setDetailsSheet({ ...detailsSheet, text: e.target.value })}
              placeholder="e.g. Left with manager, near entrance…"
              style={sheetTextareaStyle}
              autoFocus
            />
            {detailsSheet.pubKeys.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B', marginBottom: 6 }}>Leftovers per publication</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>How many copies came back unused?</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {detailsSheet.pubKeys.map(pub => (
                    <label key={pub} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1E293B' }}>
                      <span style={{ fontWeight: 700, fontFamily: '"DM Mono", ui-monospace, monospace' }}>{pub.toUpperCase()}</span>
                      <input
                        type="number" min={0} inputMode="numeric"
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
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B', marginBottom: 6 }}>Proof-of-delivery photos</div>
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
                    type="file" accept="image/*" capture="environment"
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

      {pickupSheet && (
        <Sheet onClose={() => setPickupSheet(null)} title={`Load at ${pickupSheet.stopName}`}>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10 }}>How many bundles did you pick up?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {pickupSheet.pubKeys.map(pub => (
              <label key={pub} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#1E293B' }}>
                <span style={{ fontWeight: 700, fontFamily: '"DM Mono", ui-monospace, monospace' }}>{pub.toUpperCase()}</span>
                <input
                  type="number" min={0} inputMode="numeric"
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
            placeholder="Notes for Jason…"
            style={{ ...sheetTextareaStyle, height: 70 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={sendFlag} style={sheetSaveStyle}>Send to Jason</button>
            <button onClick={() => setFlagSheet(null)} style={sheetCancelStyle}>Cancel</button>
          </div>
        </Sheet>
      )}

      {invoiceSheet && view && (() => {
        const targetDel = data.deliveries.find(d => d.id === invoiceSheet.targetDeliveryId)
        const gasNum = parseFloat(invoiceSheet.gasAmount)
        const gasVal = Number.isNaN(gasNum) ? 0 : gasNum
        const totalWithGas = earnings + gasVal
        return (
          <Sheet onClose={() => setInvoiceSheet(null)} title="Submit all invoices">
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 14, marginBottom: 14 }}>
              {view.sections.map(section => (
                <div key={section.route.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#64748B' }}>{section.route.name}</span>
                  <span>{section.done} stops — ${(section.done * rate).toFixed(2)}</span>
                </div>
              ))}
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
                    type="number" step="0.01" min={0} inputMode="decimal"
                    value={invoiceSheet.gasAmount}
                    onChange={e => setInvoiceSheet({ ...invoiceSheet, gasAmount: e.target.value })}
                    placeholder="0.00"
                    style={{ width: 120, padding: '10px 10px 10px 22px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 15, fontFamily: '"DM Mono", ui-monospace, monospace' }}
                  />
                </div>
                <label style={{ padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#1E293B', background: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {targetDel?.gas_receipt_url ? '📸 Replace receipt' : '📸 Add receipt photo'}
                  <input
                    type="file" accept="image/*" capture="environment"
                    style={{ display: 'none' }}
                    onChange={async e => {
                      const f = e.target.files?.[0]
                      if (f && invoiceSheet.targetDeliveryId) await uploadGasReceipt(invoiceSheet.targetDeliveryId, f)
                      e.target.value = ''
                    }}
                  />
                </label>
                {targetDel?.gas_receipt_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={targetDel.gas_receipt_url} alt="Receipt" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #E2E8F0' }} />
                )}
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, lineHeight: 1.4 }}>
                Attached to the first route&apos;s delivery for accounting.
              </p>
            </div>

            <textarea
              value={invoiceSheet.notes}
              onChange={e => setInvoiceSheet({ ...invoiceSheet, notes: e.target.value })}
              placeholder="Notes for Jason (optional)…"
              style={{ ...sheetTextareaStyle, height: 70 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={submitAll} disabled={invoiceSheet.submitting} style={sheetSaveStyle}>
                {invoiceSheet.submitting ? 'Submitting…' : 'Confirm & submit all'}
              </button>
              <button onClick={() => setInvoiceSheet(null)} style={sheetCancelStyle}>Cancel</button>
            </div>
          </Sheet>
        )
      })()}
    </div>
  )
}

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
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', width: '100%', maxWidth: 600 }}>
        <div style={{ width: 36, height: 4, background: '#E2E8F0', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, color: '#1E293B' }}>{title}</div>
        {children}
      </div>
    </div>
  )
}

function FullBleedMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...outerStyle, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 14, padding: 32, textAlign: 'center', maxWidth: 360 }}>
        {children}
      </div>
    </div>
  )
}

// Styles
const outerStyle: React.CSSProperties = {
  fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif',
  background: '#F1F5F9', color: '#1E293B', minHeight: '100vh', display: 'flex',
}
const appStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100vh', width: '100%',
  margin: '0 auto', background: '#F1F5F9',
}
const topBarStyle: React.CSSProperties = { background: '#0F2640', padding: '14px 16px 10px', flexShrink: 0 }
const stopScrollStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '10px 12px',
  display: 'flex', flexDirection: 'column', gap: 6,
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
const topBtnStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,.4)', fontSize: 11, background: 'none', border: 'none',
  cursor: 'pointer', fontFamily: 'inherit', padding: '2px 4px', textDecoration: 'none',
}
