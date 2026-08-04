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
  is_featured: boolean; is_advertiser?: boolean;
  ad_level?: string | null; logo_path?: string | null;
  website?: string | null; instagram?: string | null;
  facebook?: string | null; tiktok?: string | null;
  lat?: number | null; lng?: number | null;
  quantities: Record<string, number> | null;
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
                      // Skip pubs this route doesn't actually carry.
                      // Otherwise a Montgomery route with no GPP mags
                      // still renders a 'GPP 0 · 0 bundles' badge.
                      if (t <= 0) return null
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

// ── Stop modal (add + edit) ─────────────────────────────────────────────
// Verbatim field match against admin/routes.php Edit Stop form: business
// name + address + city + zip + sort order + Verify address & map it
// button (single-stop geocode) + per-pub qty + driver notes + contact
// name/phone/email + Ad Level (None/Gold/Platinum) + Advertiser /
// Currently not delivering / Active checkboxes + logo upload + website
// + Instagram + Facebook + TikTok.
function StopModal({ title, routeId, market, pubs, existing, onClose, onSaved }: {
  title: string; routeId: string; market: string; pubs: PubRow[]; existing?: StopRow;
  onClose: () => void; onSaved: () => void
}) {
  const [name,         setName]         = useState(existing?.name ?? '')
  const [address,      setAddress]      = useState(existing?.address ?? '')
  const [city,         setCity]         = useState(existing?.city ?? 'Montgomery')
  const [zip,          setZip]          = useState(existing?.zip ?? '')
  const [sortOrder,    setSortOrder]    = useState<number>(existing?.sort_order ?? 0)
  const [notes,        setNotes]        = useState(existing?.notes ?? '')
  const [active,       setActive]       = useState(existing?.active ?? true)
  const [notDel,       setNotDel]       = useState(existing?.not_delivering ?? false)
  const [contactName,  setContactName]  = useState(existing?.contact_name  ?? '')
  const [contactPhone, setContactPhone] = useState(existing?.contact_phone ?? '')
  const [contactEmail, setContactEmail] = useState(existing?.contact_email ?? '')
  const [adLevel,      setAdLevel]      = useState<string>(existing?.ad_level ?? '')
  const [isAdvertiser, setIsAdvertiser] = useState(existing?.is_advertiser ?? false)
  const [website,      setWebsite]      = useState(existing?.website   ?? '')
  const [instagram,    setInstagram]    = useState(existing?.instagram ?? '')
  const [facebook,     setFacebook]     = useState(existing?.facebook  ?? '')
  const [tiktok,       setTiktok]       = useState(existing?.tiktok    ?? '')
  const [logoPath,     setLogoPath]     = useState<string | null>(existing?.logo_path ?? null)
  const initialQty: Record<string, number> = useMemo(() => {
    const o: Record<string, number> = {}
    for (const p of pubs) o[p.short_name] = existing?.quantities?.[p.short_name] ?? 0
    return o
  }, [pubs, existing])
  const [quantities, setQuantities] = useState<Record<string, number>>(initialQty)
  // Live geo state — initialized from server, updated when "Verify address" runs.
  const [lat, setLat] = useState<number | null>(existing?.lat ?? null)
  const [lng, setLng] = useState<number | null>(existing?.lng ?? null)
  const [verifying,   setVerifying]   = useState(false)
  const [verifyMsg,   setVerifyMsg]   = useState<string | null>(null)
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
        city:            city.trim()    || null,
        zip:             zip.trim()     || null,
        sort_order:      sortOrder,
        notes:           notes.trim()   || null,
        active,
        not_delivering:  notDel,
        contact_name:    contactName.trim()  || null,
        contact_phone:   contactPhone.trim() || null,
        contact_email:   contactEmail.trim() || null,
        // Mirror the PHP source: ad_level !== '' implies is_featured = true.
        ad_level:        adLevel || '',
        is_featured:     adLevel !== '',
        is_advertiser:   isAdvertiser,
        logo_path:       logoPath,
        website:         website.trim()   || null,
        instagram:       instagram.trim() || null,
        facebook:        facebook.trim()  || null,
        tiktok:          tiktok.trim()    || null,
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

  // Verify address — single-stop geocode through the existing batch endpoint
  // (extended to take stop_id). Only available when editing an existing
  // stop (we need an id; for new stops the operator saves first then
  // re-opens to verify).
  async function verifyAddress() {
    if (!existing) { setVerifyMsg('Save the stop first, then verify.'); return }
    if (!address.trim()) { setVerifyMsg('Enter an address first.'); return }
    setVerifying(true)
    setVerifyMsg(null)
    try {
      // Persist current address fields before geocoding so OSM hits the
      // address the editor just typed (not what was on the server).
      await fetch('/api/admin/circulation/stops', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          id: existing.id,
          address: address.trim() || null,
          city:    city.trim()    || null,
          zip:     zip.trim()     || null,
        }),
      })
      const res = await fetch('/api/admin/circulation/geocode', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ market, stop_id: existing.id }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setVerifyMsg(j.message ?? j.error ?? 'Could not locate that address.')
        return
      }
      setLat(j.lat)
      setLng(j.lng)
      setVerifyMsg(null)
    } finally { setVerifying(false) }
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

      {/* Verify address & map status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '8px 10px', borderRadius: 8,
        background: 'var(--color-portal-blue-lt)',
        marginBottom: 14,
      }}>
        <button
          type="button"
          onClick={verifyAddress}
          disabled={verifying || !existing}
          className="btn btn-ghost btn-sm"
        >
          {verifying ? 'Verifying…' : '📍 Verify address & map it'}
        </button>
        {lat != null && lng != null && (
          <span style={{ fontSize: 12, color: 'var(--color-portal-green)' }}>
            ✓ Mapped ({lat.toFixed(4)}, {lng.toFixed(4)})
          </span>
        )}
        {(lat == null || lng == null) && !verifyMsg && (
          <span className="text-muted text-xs">Not yet geocoded.</span>
        )}
        {verifyMsg && (
          <span style={{ fontSize: 12, color: 'var(--color-portal-red)' }}>{verifyMsg}</span>
        )}
      </div>

      {/* Per-publication quantities */}
      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, pubs.length)}, 1fr)`, gap: 12 }}>
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

      <div className="fg">
        <label>Contact name</label>
        <input value={contactName} onChange={e => setContactName(e.target.value)} />
      </div>
      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="fg">
          <label>Contact phone</label>
          <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
        </div>
        <div className="fg">
          <label>Contact email</label>
          <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
        </div>
      </div>

      {/* Ad level + flags */}
      <div style={{ borderTop: '1px solid var(--color-portal-border)', paddingTop: 12, marginTop: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div className="fg">
            <label>Ad level (map display)</label>
            <select value={adLevel} onChange={e => setAdLevel(e.target.value)}>
              <option value="">None — standard stop</option>
              <option value="gold">Gold — larger pin, website link</option>
              <option value="platinum">Platinum — logo, all social links, highlighted card</option>
            </select>
            <div className="hint">Gold = quarter page advertiser · Platinum = full page / premium</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 22 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={isAdvertiser} onChange={e => setIsAdvertiser(e.target.checked)} /> Advertiser (internal tag)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={notDel} onChange={e => setNotDel(e.target.checked)} /> Currently not delivering
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={active} onChange={e => setActive(e.target.checked)} /> Active
            </label>
          </div>
        </div>

        {/* Logo upload — currently surfaces the path field for Gold/Platinum.
            Inline asset upload from this modal is the one piece NOT yet
            ported from the PHP source (PHP wrote to /uploads/logos/); for
            now logo_path is editable as a URL and Supabase Storage upload
            is the next add-on. */}
        <div className="fg">
          <label>Logo URL <span style={{ fontWeight: 400, color: 'var(--color-portal-muted)' }}>(Gold and Platinum advertisers)</span></label>
          <input
            value={logoPath ?? ''}
            onChange={e => setLogoPath(e.target.value || null)}
            placeholder="https:// or /uploads/logos/…"
          />
          <div className="hint">Paste a hosted image URL. Inline upload from this modal is coming next.</div>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg">
            <label>Website</label>
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" />
          </div>
          <div className="fg">
            <label>Instagram</label>
            <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@handle" />
          </div>
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg">
            <label>Facebook</label>
            <input value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="https://facebook.com/page" />
          </div>
          <div className="fg">
            <label>TikTok</label>
            <input value={tiktok} onChange={e => setTiktok(e.target.value)} placeholder="@handle" />
          </div>
        </div>
      </div>

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

      {/* Change history placeholder — currently we don't have a per-stop
          audit log (admin_audit_log records ad placements, not stops).
          Surface as "No recorded changes" so the section exists where the
          source has it, and we can wire to a real log next pass. */}
      {existing && (
        <div style={{ borderTop: '1px solid var(--color-portal-border)', paddingTop: 12, marginTop: 16 }}>
          <div className="text-muted text-xs" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>
            Change history
          </div>
          <p className="text-muted text-sm">No recorded changes for this location yet.</p>
        </div>
      )}
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
