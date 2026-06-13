'use client'

// Client component for /admin/circulation/routes (Routes & Stops).
// Mirrors admin/routes.php from the v3_FINAL portal source — single-page
// sidebar-list + stops-table layout, with inline modals for: new route,
// rename route, add stop, edit stop.
//
// Mutations POST to existing /api/admin/circulation/{routes,stops}
// endpoints, then router.refresh() to re-fetch the server-rendered data.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpDown, MapPin, Upload, Plus } from 'lucide-react'

interface PubRow   { id: string; short_name: string; name: string; abbrev: string; sort_order: number }
interface RouteRow { id: string; name: string; city: string | null; active: boolean; sort_order: number }
interface StopRow  {
  id: string; route_id: string; sort_order: number; name: string;
  address: string | null; city: string | null; zip: string | null;
  notes: string | null; contact_name: string | null;
  contact_phone: string | null; contact_email: string | null;
  is_pickup: boolean; not_delivering: boolean; active: boolean;
  is_featured: boolean; quantities: Record<string, number> | null;
}

interface Props {
  market:            string
  pubs:              PubRow[]
  routes:            RouteRow[]
  currentRoute:      RouteRow | null
  stops:             StopRow[]
  activeStopsCount:  number
  pubTotals:         Record<string, number>
  pubBundles:        Record<string, number>
}

type ModalKind = null | 'new-route' | 'rename-route' | 'add-stop' | { kind: 'edit-stop'; stop: StopRow }

export function RoutesStopsClient({ market, pubs, routes, currentRoute, stops, activeStopsCount, pubTotals, pubBundles }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState<ModalKind>(null)

  // Open the edit-stop modal automatically when ?edit_stop=ID is in URL
  // (matches the source PHP behavior of "?id=X&edit_stop=Y" deep-linking
  // into the modal).
  useEffect(() => {
    const editId = searchParams.get('edit_stop')
    if (!editId) return
    const s = stops.find(x => x.id === editId)
    if (s) setModal({ kind: 'edit-stop', stop: s })
  }, [searchParams, stops])

  const filteredStops = useMemo(() => {
    if (!search.trim()) return stops
    const q = search.toLowerCase()
    return stops.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.address?.toLowerCase().includes(q) ?? false) ||
      (s.city?.toLowerCase().includes(q) ?? false)
    )
  }, [search, stops])

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Routes &amp; Stops</h1>
        </div>
        <div className="ph-actions">
          <Link href="/admin/circulation/route-order" className="btn btn-ghost btn-sm">
            <ArrowUpDown size={14} /> Reorder routes
          </Link>
          <Link href="/admin/circulation/geocode" className="btn btn-ghost btn-sm">
            <MapPin size={14} /> Geocode stops
          </Link>
          <Link href="/admin/circulation/import" className="btn btn-ghost btn-sm">
            <Upload size={14} /> Import
          </Link>
          <button type="button" onClick={() => setModal('new-route')} className="btn btn-primary btn-sm">
            <Plus size={14} /> New route
          </button>
        </div>
      </div>

      <div className="content-body overflow-y-auto">
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>

          {/* ── Route sidebar list ── */}
          <div className="card" style={{ padding: 10, height: 'fit-content' }}>
            <div className="text-muted text-xs mb-2" style={{ padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Routes
            </div>
            {routes.map(r => {
              const isActive = currentRoute?.id === r.id
              return (
                <Link
                  key={r.id}
                  href={`/admin/circulation/routes?id=${r.id}`}
                  style={{
                    display:      'block',
                    padding:      '9px 10px',
                    borderRadius: 6,
                    fontSize:     13,
                    fontWeight:   500,
                    marginBottom: 1,
                    textDecoration: 'none',
                    background:   isActive ? 'var(--color-portal-blue-lt)' : 'transparent',
                    color:        isActive ? 'var(--color-portal-blue)' : (r.active ? 'var(--color-portal-text)' : 'var(--color-portal-muted)'),
                  }}
                >
                  {r.name}
                  {!r.active && (
                    <span className="badge badge-gray" style={{ fontSize: 9, marginLeft: 4 }}>Inactive</span>
                  )}
                </Link>
              )
            })}
            {routes.length === 0 && (
              <p className="text-muted text-sm" style={{ padding: 8 }}>
                No routes yet. Click <strong>+ New route</strong> to add one.
              </p>
            )}
          </div>

          {/* ── Stops main pane ── */}
          <div>
            {currentRoute ? (
              <>
                <div className="card mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <strong style={{ fontSize: 16 }}>{currentRoute.name}</strong>
                      {currentRoute.city && (
                        <span className="text-sub text-sm ml-2">{currentRoute.city}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setModal('rename-route')} className="btn btn-ghost btn-sm">
                        Rename
                      </button>
                      <button type="button" onClick={() => setModal('add-stop')} className="btn btn-primary btn-sm">
                        + Add stop
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="badge badge-gray">{activeStopsCount} active stops</span>
                    {pubs.map(p => {
                      const t       = pubTotals[p.id]   ?? 0
                      const bundles = pubBundles[p.id]  ?? 0
                      const short   = p.short_name.toLowerCase()
                      const cls     = short === 'rrp' ? 'badge-rrp' : 'badge-boom'
                      return (
                        <span key={p.id} className={`badge ${cls}`}>
                          {p.abbrev} {t} · {bundles} bundles
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Stop search */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--color-portal-border)',
                    background: 'white',
                    borderTopLeftRadius:  8,
                    borderTopRightRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search stops by name, address, city…"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1.5px solid var(--color-portal-border-2)',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--color-portal-sub)', whiteSpace: 'nowrap' }}>
                    {search.trim()
                      ? `${filteredStops.length} of ${stops.length} stops`
                      : `${stops.length} stops`}
                  </span>
                </div>

                {/* Stops table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 30 }}>#</th>
                        <th>Location</th>
                        <th>Address</th>
                        {pubs.map(p => <th key={p.id} style={{ textAlign: 'center', width: 50 }}>{p.abbrev}</th>)}
                        <th>Notes</th>
                        <th style={{ width: 80 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStops.map(s => {
                        const inactiveCls = !s.active                          ? 'inactive' : ''
                        const pausedCls   = s.not_delivering && s.active       ? 'not-delivering' : ''
                        const pickupCls   = s.is_pickup                        ? 'pickup-row'   : ''
                        const rowCls      = [pickupCls, inactiveCls, pausedCls].filter(Boolean).join(' ')
                        return (
                          <tr key={s.id} className={`stop-row ${rowCls}`}>
                            <td className="mono text-muted" style={{ fontSize: 12 }}>
                              {s.is_pickup ? 'P' : s.sort_order}
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                {s.is_featured && <span style={{ color: '#B45309' }}>★</span>}
                                <strong style={{ fontSize: 13 }}>{s.name}</strong>
                                {s.not_delivering && (
                                  <span className="badge badge-amber" style={{ fontSize: 9 }}>Paused</span>
                                )}
                                {!s.active && (
                                  <span className="badge badge-gray" style={{ fontSize: 9 }}>Inactive</span>
                                )}
                              </div>
                            </td>
                            <td className="text-sub" style={{ fontSize: 12 }}>
                              {s.address ?? ''}{s.city ? `, ${s.city}` : ''}
                            </td>
                            {pubs.map(p => {
                              const q     = s.quantities?.[p.short_name] ?? 0
                              const short = p.short_name.toLowerCase()
                              return (
                                <td key={p.id} className={`qty-cell qty-${short}`}>
                                  {q > 0 ? q : '-'}
                                </td>
                              )
                            })}
                            <td className="text-sub" style={{
                              fontSize: 11, fontStyle: 'italic',
                              maxWidth: 140, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {s.notes ?? ''}
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => setModal({ kind: 'edit-stop', stop: s })}
                                className="btn btn-ghost btn-xs"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                      {filteredStops.length === 0 && (
                        <tr><td colSpan={5 + pubs.length} style={{ textAlign: 'center', padding: 24, color: 'var(--color-portal-sub)' }}>
                          {search.trim() ? 'No stops match your search.' : 'No stops yet — click + Add stop to add one.'}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="card">
                <p className="text-muted text-sm">Select a route on the left to see its stops, or click <strong>+ New route</strong>.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === 'new-route' && (
        <RouteModal
          title="New Route"
          market={market}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); router.refresh() }}
        />
      )}
      {modal === 'rename-route' && currentRoute && (
        <RouteModal
          title="Rename Route"
          market={market}
          existing={currentRoute}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); router.refresh() }}
        />
      )}
      {modal === 'add-stop' && currentRoute && (
        <StopModal
          title="Add Stop"
          routeId={currentRoute.id}
          market={market}
          pubs={pubs}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); router.refresh() }}
        />
      )}
      {modal && typeof modal === 'object' && modal.kind === 'edit-stop' && currentRoute && (
        <StopModal
          title="Edit Stop"
          routeId={currentRoute.id}
          market={market}
          pubs={pubs}
          existing={modal.stop}
          onClose={() => {
            setModal(null)
            // Clear ?edit_stop from URL so reopening the page doesn't reopen it.
            const sp = new URLSearchParams(searchParams.toString())
            sp.delete('edit_stop')
            router.replace(`/admin/circulation/routes?${sp.toString()}`)
          }}
          onSaved={() => { setModal(null); router.refresh() }}
        />
      )}
    </div>
  )
}

// ── Route modal (new + rename) ───────────────────────────────────────────
function RouteModal({ title, market, existing, onClose, onSaved }: {
  title: string; market: string; existing?: RouteRow;
  onClose: () => void; onSaved: () => void
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [city, setCity] = useState(existing?.city ?? 'Montgomery')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function submit() {
    if (!name.trim()) { setErr('Route name required.'); return }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/routes', {
        method:  existing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          id: existing?.id,
          market,
          name: name.trim(),
          city: city.trim() || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.error ?? 'Save failed.')
        return
      }
      onSaved()
    } finally { setBusy(false) }
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="fg">
        <label>Route name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vaughn Rd" autoFocus />
      </div>
      <div className="fg">
        <label>City</label>
        <input value={city} onChange={e => setCity(e.target.value)} />
      </div>
      {err && <p className="text-sm" style={{ color: 'var(--color-portal-red)' }}>{err}</p>}
      <div className="modal-footer flex gap-2">
        <button type="button" onClick={submit} disabled={busy} className="btn btn-primary">
          {busy ? 'Saving…' : existing ? 'Save' : 'Create route'}
        </button>
        <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
      </div>
    </ModalShell>
  )
}

// ── Stop modal (add + edit, key fields only — full social/logo edit
//    lives on the route detail page) ─────────────────────────────────────
function StopModal({ title, routeId, market, pubs, existing, onClose, onSaved }: {
  title: string; routeId: string; market: string; pubs: PubRow[]; existing?: StopRow;
  onClose: () => void; onSaved: () => void
}) {
  const [name,      setName]      = useState(existing?.name ?? '')
  const [address,   setAddress]   = useState(existing?.address ?? '')
  const [city,      setCity]      = useState(existing?.city ?? 'Montgomery')
  const [zip,       setZip]       = useState(existing?.zip ?? '')
  const [sortOrder, setSortOrder] = useState<number>(existing?.sort_order ?? 0)
  const [notes,     setNotes]     = useState(existing?.notes ?? '')
  const [active,    setActive]    = useState(existing?.active ?? true)
  const [notDel,    setNotDel]    = useState(existing?.not_delivering ?? false)
  const initialQty: Record<string, number> = useMemo(() => {
    const o: Record<string, number> = {}
    for (const p of pubs) o[p.short_name] = existing?.quantities?.[p.short_name] ?? 0
    return o
  }, [pubs, existing])
  const [quantities, setQuantities] = useState<Record<string, number>>(initialQty)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function submit() {
    if (!name.trim()) { setErr('Business name required.'); return }
    setBusy(true)
    setErr(null)
    try {
      const body = {
        id:              existing?.id,
        market,
        route_id:        routeId,
        name:            name.trim(),
        address:         address.trim() || null,
        city:            city.trim() || null,
        zip:             zip.trim() || null,
        sort_order:      sortOrder,
        notes:           notes.trim() || null,
        active,
        not_delivering:  notDel,
        quantities,
      }
      const res = await fetch('/api/admin/circulation/stops', {
        method:  existing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.error ?? 'Save failed.')
        return
      }
      onSaved()
    } finally { setBusy(false) }
  }

  async function destroy() {
    if (!existing) return
    if (!confirm(`Delete "${existing.name}"? This cannot be undone.`)) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/circulation/stops?id=${existing.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.error ?? 'Delete failed.')
        return
      }
      onSaved()
    } finally { setBusy(false) }
  }

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="fg">
        <label>Business name *</label>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus />
      </div>
      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="fg">
          <label>Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="fg">
          <label>City</label>
          <input value={city} onChange={e => setCity(e.target.value)} />
        </div>
      </div>
      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="fg">
          <label>ZIP</label>
          <input value={zip} onChange={e => setZip(e.target.value)} maxLength={10} />
        </div>
        <div className="fg">
          <label>Sort order</label>
          <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
        </div>
      </div>
      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: `repeat(${pubs.length}, 1fr)`, gap: 12 }}>
        {pubs.map(p => (
          <div key={p.id} className="fg">
            <label>{p.name} qty</label>
            <input
              type="number"
              min={0}
              value={quantities[p.short_name] ?? 0}
              onChange={e => setQuantities(q => ({ ...q, [p.short_name]: Math.max(0, Number(e.target.value)) }))}
            />
          </div>
        ))}
      </div>
      <div className="fg">
        <label>Driver notes</label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 16, paddingTop: 4 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={active} onChange={e => setActive(e.target.checked)} /> Active
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={notDel} onChange={e => setNotDel(e.target.checked)} /> Currently not delivering
        </label>
      </div>

      {existing && (
        <p className="text-muted text-xs" style={{ marginTop: 8 }}>
          Need to edit advertiser fields, social links, or upload a logo?{' '}
          <Link href={`/admin/circulation/routes/${routeId}`} className="text-blue-600 underline">Open deep editor →</Link>
        </p>
      )}

      {err && <p className="text-sm" style={{ color: 'var(--color-portal-red)', marginTop: 8 }}>{err}</p>}

      <div className="modal-footer flex items-center" style={{ gap: 8, marginTop: 16 }}>
        <button type="button" onClick={submit} disabled={busy} className="btn btn-primary">
          {busy ? 'Saving…' : 'Save stop'}
        </button>
        <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
        {existing && !existing.is_pickup && (
          <button type="button" onClick={destroy} disabled={busy} className="btn btn-red btn-sm" style={{ marginLeft: 'auto' }}>
            Delete
          </button>
        )}
      </div>
    </ModalShell>
  )
}

// ── Modal shell (portal-style overlay + card) ───────────────────────────
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  // Close on ESC.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="portal-app"
        style={{
          background: 'white', borderRadius: 12, padding: 24,
          width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: 'var(--color-portal-text)' }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  )
}
