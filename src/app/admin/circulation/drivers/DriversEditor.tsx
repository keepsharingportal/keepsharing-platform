'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X, Check, Loader2, Trash2, Mail } from 'lucide-react'

export interface Driver {
  user_id:       string
  market:        string
  full_name:     string
  email:         string
  phone:         string | null
  rate_per_stop: number
  can_view_all:  boolean
  notes:         string | null
  active:        boolean
  route_ids:     string[]
}

interface Props {
  market:           string
  initialDrivers:   Driver[]
  availableRoutes:  Array<{ id: string; name: string }>
}

export function DriversEditor({ market, initialDrivers, availableRoutes }: Props) {
  const router = useRouter()
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  function patchLocal(uid: string, f: Partial<Driver>) {
    setDrivers(prev => prev.map(d => d.user_id === uid ? { ...d, ...f } : d))
  }

  return (
    <div className="space-y-3">
      {!addOpen ? (
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90"
        >
          <Plus size={12} /> Add Driver
        </button>
      ) : (
        <AddForm
          market={market}
          routes={availableRoutes}
          onCancel={() => setAddOpen(false)}
          onCreated={(d) => {
            setDrivers(prev => [...prev, d])
            setAddOpen(false)
            router.refresh()
          }}
        />
      )}

      {drivers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-portal-border p-8 text-center bg-white">
          <p className="text-sm text-portal-sub">No drivers yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {drivers.map(d => (
            <li key={d.user_id} className={`rounded-lg border bg-white ${editing === d.user_id ? 'border-portal-border-2 border border-portal-blue/30' : 'border-portal-border'}`}>
              {editing === d.user_id ? (
                <EditRow
                  driver={d}
                  routes={availableRoutes}
                  onCancel={() => setEditing(null)}
                  onSaved={(updated) => {
                    patchLocal(d.user_id, updated)
                    setEditing(null)
                    router.refresh()
                  }}
                  onDeleted={() => {
                    setDrivers(prev => prev.filter(x => x.user_id !== d.user_id))
                    setEditing(null)
                    router.refresh()
                  }}
                />
              ) : (
                <DisplayRow driver={d} routes={availableRoutes} onEdit={() => setEditing(d.user_id)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function routeNames(ids: string[], routes: Array<{ id: string; name: string }>): string {
  const byId = new Map(routes.map(r => [r.id, r.name]))
  return ids.map(id => byId.get(id) ?? '(unknown)').join(', ')
}

// ── Display ──────────────────────────────────────────────────────────────────
function DisplayRow({ driver, routes, onEdit }: { driver: Driver; routes: Array<{ id: string; name: string }>; onEdit: () => void }) {
  return (
    <div className="flex items-start gap-3 p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-portal-text">{driver.full_name}</p>
          {!driver.active && <span className="text-[10px] bg-gray-100 text-portal-sub px-1.5 py-0.5 rounded font-semibold">Inactive</span>}
          {driver.can_view_all && <span className="text-[10px] bg-portal-blue-lt text-portal-blue px-1.5 py-0.5 rounded font-semibold">View all</span>}
        </div>
        <p className="text-xs text-portal-sub mt-0.5 flex items-center gap-1"><Mail size={10} /> {driver.email}</p>
        {driver.phone && <p className="text-xs text-portal-sub">📞 {driver.phone}</p>}
        <p className="text-xs text-portal-text mt-1">
          ${driver.rate_per_stop.toFixed(2)}/stop · {driver.route_ids.length} route{driver.route_ids.length === 1 ? '' : 's'}
        </p>
        {driver.route_ids.length > 0 && (
          <p className="text-[11px] text-portal-sub mt-0.5 truncate">{routeNames(driver.route_ids, routes)}</p>
        )}
      </div>
      <button onClick={onEdit} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-portal-border text-portal-text hover:bg-portal-bg">
        <Pencil size={11} /> Edit
      </button>
    </div>
  )
}

// ── Add ──────────────────────────────────────────────────────────────────────
function AddForm({ market, routes, onCancel, onCreated }: {
  market: string;
  routes: Array<{ id: string; name: string }>;
  onCancel: () => void;
  onCreated: (d: Driver) => void;
}) {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [phone,   setPhone]   = useState('')
  const [rate,    setRate]    = useState('0')
  const [routeIds, setRouteIds] = useState<string[]>([])
  const [viewAll, setViewAll] = useState(false)
  const [notes,   setNotes]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/drivers', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          market,
          full_name:     name.trim(),
          email:         email.trim(),
          phone:         phone.trim() || null,
          rate_per_stop: parseFloat(rate || '0'),
          can_view_all:  viewAll,
          notes:         notes.trim() || null,
          route_ids:     routeIds,
        }),
      })
      const j = await res.json() as { driver?: Omit<Driver, 'route_ids'>; error?: string }
      if (!res.ok || !j.driver) throw new Error(j.error ?? 'Create failed')
      onCreated({ ...j.driver, route_ids: routeIds })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-portal-blue-lt/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-portal-text">New driver</p>
        <button onClick={onCancel} className="text-portal-muted hover:text-portal-sub"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field label="Full name" value={name}  onChange={setName} />
        <Field label="Email"     value={email} onChange={setEmail} />
        <Field label="Phone"     value={phone} onChange={setPhone} />
        <Field label="Rate / stop ($)" value={rate} onChange={setRate} />
      </div>
      <RouteAssign routes={routes} selected={routeIds} setSelected={setRouteIds} />
      <label className="flex items-center gap-2 text-xs text-portal-text">
        <input type="checkbox" checked={viewAll} onChange={e => setViewAll(e.target.checked)} />
        Can view all routes (training / read-only)
      </label>
      <Field label="Notes" value={notes} onChange={setNotes} />
      {err && <p className="text-xs text-portal-red">{err}</p>}
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={busy || !name.trim() || !email.trim()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {busy ? 'Creating…' : 'Create Driver'}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-portal-sub rounded-lg hover:bg-portal-row-hover">Cancel</button>
      </div>
    </div>
  )
}

// ── Edit ─────────────────────────────────────────────────────────────────────
function EditRow({ driver, routes, onCancel, onSaved, onDeleted }: {
  driver: Driver;
  routes: Array<{ id: string; name: string }>;
  onCancel: () => void;
  onSaved: (d: Partial<Driver>) => void;
  onDeleted: () => void;
}) {
  const [name,    setName]    = useState(driver.full_name)
  const [phone,   setPhone]   = useState(driver.phone ?? '')
  const [rate,    setRate]    = useState(driver.rate_per_stop.toString())
  const [routeIds, setRouteIds] = useState<string[]>(driver.route_ids)
  const [viewAll, setViewAll] = useState(driver.can_view_all)
  const [active,  setActive]  = useState(driver.active)
  const [notes,   setNotes]   = useState(driver.notes ?? '')
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      const patchRes = await fetch('/api/admin/circulation/drivers', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          user_id:       driver.user_id,
          full_name:     name.trim(),
          phone:         phone.trim() || null,
          rate_per_stop: parseFloat(rate || '0'),
          can_view_all:  viewAll,
          active,
          notes:         notes.trim() || null,
        }),
      })
      if (!patchRes.ok) throw new Error((await patchRes.json().catch(() => ({}))).error ?? 'Save failed')

      const routeRes = await fetch('/api/admin/circulation/drivers', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: driver.user_id, route_ids: routeIds }),
      })
      if (!routeRes.ok) throw new Error((await routeRes.json().catch(() => ({}))).error ?? 'Route assign failed')

      onSaved({
        full_name:     name.trim(),
        phone:         phone.trim() || null,
        rate_per_stop: parseFloat(rate || '0'),
        can_view_all:  viewAll,
        active,
        notes:         notes.trim() || null,
        route_ids:     routeIds,
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function deleteDriver() {
    if (!confirm(`Delete ${driver.full_name}? Their auth account stays — only their driver record is removed.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/circulation/drivers?user_id=${encodeURIComponent(driver.user_id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      onDeleted()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-portal-text">{driver.full_name} <span className="text-portal-muted font-normal">· {driver.email}</span></p>
        <button onClick={onCancel} className="text-portal-muted hover:text-portal-sub"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field label="Full name" value={name}  onChange={setName} />
        <Field label="Phone"     value={phone} onChange={setPhone} />
        <Field label="Rate / stop ($)" value={rate} onChange={setRate} />
        <Field label="Notes"     value={notes} onChange={setNotes} />
      </div>
      <RouteAssign routes={routes} selected={routeIds} setSelected={setRouteIds} />
      <div className="flex flex-wrap items-center gap-4 text-xs text-portal-text">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          Active
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={viewAll} onChange={e => setViewAll(e.target.checked)} />
          View all routes
        </label>
      </div>
      {err && <p className="text-xs text-portal-red">{err}</p>}
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-portal-sub rounded-lg hover:bg-portal-row-hover">Cancel</button>
        <button onClick={deleteDriver} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-red-200 text-portal-red hover:bg-portal-red-lt ml-auto">
          <Trash2 size={11} /> Delete
        </button>
      </div>
    </div>
  )
}

function RouteAssign({ routes, selected, setSelected }: {
  routes: Array<{ id: string; name: string }>;
  selected: string[];
  setSelected: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    setSelected(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mb-1">Routes</p>
      <div className="flex flex-wrap gap-1.5">
        {routes.length === 0 && <span className="text-xs text-portal-muted italic">No routes available — add some first.</span>}
        {routes.map(r => {
          const on = selected.includes(r.id)
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${on ? 'bg-portal-navy text-white border-blue-600' : 'bg-white border-portal-border text-portal-text hover:border-portal-border-2'}`}
            >
              {r.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-md border border-portal-border-2 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
      />
    </label>
  )
}
