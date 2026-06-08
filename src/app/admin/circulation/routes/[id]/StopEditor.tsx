'use client'

// Stop editor for one route.
// - Inline edit any field via "Edit"
// - Up/Down arrows reorder within the route
// - Add a new stop at the bottom
// - Delete with confirm
// - Per-publication quantities edited inline as comma'd "pub:qty" pairs
//   for terse density (e.g. "rrp:25, boom:10")

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X, Check, Trash2, ArrowUp, ArrowDown, Loader2, MapPin, Star } from 'lucide-react'

export interface Stop {
  id:                    string
  market:                string
  route_id:              string
  sort_order:            number
  name:                  string
  address:               string | null
  city:                  string | null
  zip:                   string | null
  notes:                 string | null
  contact_name:          string | null
  contact_phone:         string | null
  contact_email:         string | null
  is_pickup:             boolean
  is_advertiser:         boolean
  is_featured:           boolean
  ad_level:              string
  website:               string | null
  instagram:             string | null
  facebook:              string | null
  tiktok:                string | null
  lat:                   number | null
  lng:                   number | null
  active:                boolean
  not_delivering:        boolean
  not_delivering_note:   string | null
  quantities:            Record<string, number> | null
}

interface Props {
  routeId:      string
  market:       string
  initialStops: Stop[]
}

function quantitiesToText(q: Record<string, number> | null | undefined): string {
  if (!q) return ''
  return Object.entries(q).map(([k, v]) => `${k}:${v}`).join(', ')
}

function quantitiesFromText(s: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const piece of s.split(/[,;]/)) {
    const [k, v] = piece.split(':').map(x => x?.trim())
    if (!k) continue
    const n = parseInt(v ?? '0', 10)
    if (!Number.isNaN(n) && n > 0) out[k.toLowerCase()] = n
  }
  return out
}

export function StopEditor({ routeId, market, initialStops }: Props) {
  const router = useRouter()
  const [stops, setStops]   = useState<Stop[]>(initialStops)
  const [busy,  setBusy]    = useState<string | null>(null)  // stop id or 'reorder'
  const [editing, setEditing] = useState<string | null>(null)
  const [err,   setErr]     = useState<string | null>(null)

  async function reorder(srcIdx: number, destIdx: number) {
    if (destIdx < 0 || destIdx >= stops.length) return
    const next = stops.slice()
    const [m]  = next.splice(srcIdx, 1)
    next.splice(destIdx, 0, m)
    setStops(next)
    setBusy('reorder')
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/stops', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ route_id: routeId, ids: next.map(s => s.id) }),
      })
      if (!res.ok) throw new Error('Reorder failed')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      setStops(stops)  // revert
    } finally {
      setBusy(null)
    }
  }

  async function deleteStop(id: string) {
    if (!confirm('Delete this stop?')) return
    setBusy(id)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/circulation/stops?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setStops(prev => prev.filter(s => s.id !== id))
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  function patchLocal(id: string, fields: Partial<Stop>) {
    setStops(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s))
  }

  async function saveEdit(stop: Stop) {
    setBusy(stop.id)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/stops', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:                  stop.id,
          name:                stop.name,
          address:             stop.address,
          city:                stop.city,
          zip:                 stop.zip,
          notes:               stop.notes,
          contact_name:        stop.contact_name,
          contact_phone:       stop.contact_phone,
          contact_email:       stop.contact_email,
          is_advertiser:       stop.is_advertiser,
          is_featured:         stop.is_featured,
          ad_level:            stop.ad_level,
          website:             stop.website,
          instagram:           stop.instagram,
          facebook:            stop.facebook,
          tiktok:              stop.tiktok,
          lat:                 stop.lat,
          lng:                 stop.lng,
          active:              stop.active,
          not_delivering:      stop.not_delivering,
          not_delivering_note: stop.not_delivering_note,
          quantities:          stop.quantities ?? {},
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? 'Save failed')
      }
      setEditing(null)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function addStop() {
    setBusy('new')
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/stops', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          market,
          route_id:   routeId,
          name:       'New stop',
          sort_order: stops.length,
        }),
      })
      const j = await res.json() as { stop?: Stop; error?: string }
      if (!res.ok || !j.stop) throw new Error(j.error ?? 'Create failed')
      setStops(prev => [...prev, j.stop!])
      setEditing(j.stop.id)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-portal-text">{stops.length} stops</p>
        <button
          onClick={addStop}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {busy === 'new' ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Add Stop
        </button>
      </div>

      {err && <p className="text-xs text-portal-red">{err}</p>}

      <ul className="space-y-2">
        {stops.map((stop, idx) => (
          <li
            key={stop.id}
            className={`rounded-xl border bg-white ${editing === stop.id ? 'border-portal-border-2 ring-1 ring-portal-blue/20' : 'border-portal-border'}`}
          >
            {editing === stop.id ? (
              <EditRow
                stop={stop}
                busy={busy === stop.id}
                onCancel={() => setEditing(null)}
                onSave={() => saveEdit(stop)}
                patch={(fields) => patchLocal(stop.id, fields)}
              />
            ) : (
              <DisplayRow
                stop={stop}
                idx={idx}
                last={idx === stops.length - 1}
                busyReorder={busy === 'reorder'}
                onEdit={() => setEditing(stop.id)}
                onDelete={() => deleteStop(stop.id)}
                onUp={() => reorder(idx, idx - 1)}
                onDown={() => reorder(idx, idx + 1)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Display row ──────────────────────────────────────────────────────────────

function DisplayRow({ stop, idx, last, busyReorder, onEdit, onDelete, onUp, onDown }: {
  stop: Stop; idx: number; last: boolean; busyReorder: boolean;
  onEdit: () => void; onDelete: () => void; onUp: () => void; onDown: () => void;
}) {
  const hasGeo = stop.lat != null && stop.lng != null
  return (
    <div className="flex items-start gap-3 p-3">
      <div className="flex flex-col items-center gap-0.5 text-gray-300 shrink-0">
        <button onClick={onUp}   disabled={idx === 0 || busyReorder} className="disabled:opacity-30 hover:text-portal-sub"><ArrowUp   size={12} /></button>
        <span className="text-[10px] font-bold text-portal-muted tabular-nums">{idx + 1}</span>
        <button onClick={onDown} disabled={last || busyReorder} className="disabled:opacity-30 hover:text-portal-sub"><ArrowDown size={12} /></button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-bold text-portal-text truncate">{stop.name}</p>
          {stop.is_advertiser   && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">Advertiser</span>}
          {stop.ad_level === 'platinum' && <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-0.5"><Star size={9} fill="currentColor" /> Platinum</span>}
          {stop.ad_level === 'gold'     && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-semibold">Gold</span>}
          {stop.not_delivering  && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">Not delivering</span>}
          {!stop.active         && <span className="text-[10px] bg-gray-100 text-portal-sub px-1.5 py-0.5 rounded font-semibold">Inactive</span>}
          {hasGeo               && <span title="Geocoded" className="text-[10px] inline-flex items-center gap-0.5 text-green-700"><MapPin size={9} /></span>}
        </div>
        <p className="text-xs text-portal-sub mt-0.5 truncate">
          {stop.address}{stop.city ? ` · ${stop.city}` : ''}
        </p>
        {stop.quantities && Object.keys(stop.quantities).length > 0 && (
          <p className="text-[11px] text-portal-sub mt-0.5">
            {Object.entries(stop.quantities).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' · ')}
          </p>
        )}
        {stop.notes && (
          <p className="text-[11px] text-portal-sub mt-0.5 italic truncate">{stop.notes}</p>
        )}
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        <button onClick={onEdit} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-portal-border text-portal-text hover:bg-portal-bg">
          <Pencil size={11} /> Edit
        </button>
        <button onClick={onDelete} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-red-200 text-portal-red hover:bg-portal-red-lt">
          <Trash2 size={11} /> Delete
        </button>
      </div>
    </div>
  )
}

// ── Edit row ─────────────────────────────────────────────────────────────────

function EditRow({ stop, busy, onCancel, onSave, patch }: {
  stop: Stop; busy: boolean; onCancel: () => void; onSave: () => void; patch: (f: Partial<Stop>) => void;
}) {
  const qtyText = quantitiesToText(stop.quantities)
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-portal-text">Editing stop</p>
        <button onClick={onCancel} className="text-portal-muted hover:text-portal-sub"><X size={14} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field label="Name"            value={stop.name}          onChange={v => patch({ name: v })} />
        <Field label="Address"         value={stop.address ?? ''} onChange={v => patch({ address: v || null })} />
        <Field label="City"            value={stop.city ?? ''}    onChange={v => patch({ city: v || null })} />
        <Field label="ZIP"             value={stop.zip ?? ''}     onChange={v => patch({ zip: v || null })} />
        <Field label="Contact name"    value={stop.contact_name ?? ''}  onChange={v => patch({ contact_name: v || null })} />
        <Field label="Contact phone"   value={stop.contact_phone ?? ''} onChange={v => patch({ contact_phone: v || null })} />
        <Field label="Contact email"   value={stop.contact_email ?? ''} onChange={v => patch({ contact_email: v || null })} className="md:col-span-2" />
        <Field label="Quantities (pub:qty, comma-sep)" value={qtyText}
          onChange={v => patch({ quantities: quantitiesFromText(v) })} className="md:col-span-2" />
        <Field label="Lat"   value={stop.lat?.toString() ?? ''}   onChange={v => patch({ lat: v ? parseFloat(v) : null })} />
        <Field label="Lng"   value={stop.lng?.toString() ?? ''}   onChange={v => patch({ lng: v ? parseFloat(v) : null })} />
        <Field label="Website"   value={stop.website   ?? ''} onChange={v => patch({ website:   v || null })} />
        <Field label="Instagram" value={stop.instagram ?? ''} onChange={v => patch({ instagram: v || null })} />
        <Field label="Facebook"  value={stop.facebook  ?? ''} onChange={v => patch({ facebook:  v || null })} />
        <Field label="TikTok"    value={stop.tiktok    ?? ''} onChange={v => patch({ tiktok:    v || null })} />
        <FieldArea label="Notes" value={stop.notes ?? ''} onChange={v => patch({ notes: v || null })} className="md:col-span-2" />
      </div>

      <div className="flex flex-wrap gap-3 items-center text-xs text-portal-text">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={stop.active} onChange={e => patch({ active: e.target.checked })} />
          Active
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={stop.is_advertiser} onChange={e => patch({ is_advertiser: e.target.checked })} />
          Advertiser
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={stop.is_featured} onChange={e => patch({ is_featured: e.target.checked })} />
          Featured
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={stop.not_delivering} onChange={e => patch({ not_delivering: e.target.checked })} />
          Not delivering
        </label>
        <label className="flex items-center gap-1.5">
          Ad level:
          <select value={stop.ad_level} onChange={e => patch({ ad_level: e.target.value })} className="border border-portal-border-2 rounded-md px-2 py-1 text-xs">
            <option value="">none</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-portal-sub rounded-lg hover:bg-portal-row-hover">Cancel</button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (s: string) => void; className?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-md border border-portal-border-2 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
      />
    </label>
  )
}

function FieldArea({ label, value, onChange, className }: { label: string; value: string; onChange: (s: string) => void; className?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub">{label}</span>
      <textarea
        value={value}
        rows={2}
        onChange={e => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-md border border-portal-border-2 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30 resize-y"
      />
    </label>
  )
}
