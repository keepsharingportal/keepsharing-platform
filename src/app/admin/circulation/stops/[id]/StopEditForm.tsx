'use client'

// Editable stop details for the /admin/circulation/stops/[id] page.
// Fields: name, address, city, zip, notes (driver-facing), per-pub
// quantities, active flag, and pause (not_delivering) toggle with a
// reason. Saves via PATCH /api/admin/circulation/stops.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  stopId:  string
  initial: {
    name:                string
    address:             string | null
    city:                string | null
    zip:                 string | null
    notes:               string | null
    quantities:          Record<string, number> | null
    not_delivering:      boolean
    not_delivering_note: string | null
    active:              boolean
  }
}

export function StopEditForm({ stopId, initial }: Props) {
  const router = useRouter()
  const [name,       setName]       = useState(initial.name ?? '')
  const [address,    setAddress]    = useState(initial.address ?? '')
  const [city,       setCity]       = useState(initial.city ?? '')
  const [zip,        setZip]        = useState(initial.zip ?? '')
  const [notes,      setNotes]      = useState(initial.notes ?? '')
  const [quantities, setQuantities] = useState<Record<string, number>>(initial.quantities ?? {})
  const [notDelivering,   setNotDelivering]   = useState(initial.not_delivering)
  const [pauseReason,     setPauseReason]     = useState(initial.not_delivering_note ?? '')
  const [active,          setActive]          = useState(initial.active)
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState<string | null>(null)

  const pubKeys = Object.keys(quantities).length > 0
    ? Object.keys(quantities).sort()
    : ['rrp', 'boom']

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/circulation/stops', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          id:                  stopId,
          name:                name.trim() || null,
          address:             address.trim() || null,
          city:                city.trim() || null,
          zip:                 zip.trim() || null,
          notes:               notes.trim() || null,
          quantities:          Object.fromEntries(Object.entries(quantities).filter(([, v]) => v > 0)),
          not_delivering:      notDelivering,
          not_delivering_note: notDelivering ? (pauseReason.trim() || 'Paused by admin') : null,
          active,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg(`Failed: ${j.error ?? 'unknown error'}`); return }
      setMsg('Saved.')
      router.refresh()
      setTimeout(() => setMsg(null), 2500)
    } finally { setBusy(false) }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="fg">
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="fg">
          <label>Zip</label>
          <input value={zip} onChange={e => setZip(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="fg">
          <label>Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="fg">
          <label>City</label>
          <input value={city} onChange={e => setCity(e.target.value)} />
        </div>
      </div>

      <div className="fg" style={{ marginBottom: 12 }}>
        <label>Copies per publication</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          {pubKeys.map(pub => (
            <label key={pub} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1E293B' }}>
              <span style={{ fontWeight: 700, fontFamily: '"DM Mono", ui-monospace, monospace' }}>{pub.toUpperCase()}</span>
              <input
                type="number" min={0} inputMode="numeric"
                value={quantities[pub] || ''}
                onChange={e => setQuantities({ ...quantities, [pub]: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                style={{ width: 80, padding: '6px 10px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14 }}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="fg" style={{ marginBottom: 12 }}>
        <label>Stop notes (shown to driver)</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Ask for Bob at the counter" />
      </div>

      {/* Pause + deactivate */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 260px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
            <input type="checkbox" checked={notDelivering} onChange={e => setNotDelivering(e.target.checked)} style={{ width: 'auto' }} />
            Paused (not delivering this month)
          </label>
          {notDelivering && (
            <input
              value={pauseReason}
              onChange={e => setPauseReason(e.target.value)}
              placeholder="Reason (shown on paused pill)"
              style={{ fontSize: 12, padding: '6px 10px' }}
            />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 260px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} style={{ width: 'auto' }} />
            Active (uncheck to fully deactivate)
          </label>
          {!active && (
            <div style={{ fontSize: 11, color: '#B45309' }}>
              Deactivated stops disappear from every driver route and the public map.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={save} disabled={busy} className="btn btn-primary btn-sm">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        {msg && (
          <span style={{ fontSize: 12, color: msg.startsWith('Failed') ? '#DC2626' : '#16A34A', fontWeight: 600 }}>{msg}</span>
        )}
      </div>
    </div>
  )
}
