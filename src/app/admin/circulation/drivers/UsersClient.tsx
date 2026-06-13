'use client'

// Client component for /admin/circulation/drivers (Users).
// Renders the source's single users table + Add/Edit modal. POSTs go to
// existing /api/admin/circulation/drivers endpoints.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
export interface DriverRow {
  user_id:       string
  full_name:     string
  email:         string
  phone:         string | null
  rate_per_stop: number
  can_view_all:  boolean
  notes:         string | null
  active:        boolean
  route_ids:     string[]
  route_names:   string[]
}

interface RouteLite { id: string; name: string }

interface Props {
  market:   string
  drivers:  DriverRow[]
  routes:   RouteLite[]
}

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

export function UsersClient({ market, drivers, routes }: Props) {
  const router = useRouter()
  const [modal,    setModal]    = useState<null | { kind: 'new' } | { kind: 'edit'; driver: DriverRow }>(null)
  const [busy,     setBusy]     = useState<string | null>(null)

  async function toggleActive(d: DriverRow) {
    setBusy(d.user_id)
    try {
      const res = await fetch('/api/admin/circulation/drivers', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ user_id: d.user_id, active: !d.active }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error ?? 'Update failed.')
        return
      }
      router.refresh()
    } finally { setBusy(null) }
  }

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Users</h1>
        </div>
        <div className="ph-actions">
          <button type="button" onClick={() => setModal({ kind: 'new' })} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add user
          </button>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Routes</th>
                <th>Rate/stop</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-portal-sub)' }}>
                  No users yet. Click <strong>+ Add user</strong> to create one.
                </td></tr>
              )}
              {drivers.map(d => (
                <tr key={d.user_id} style={{ opacity: d.active ? 1 : 0.45 }}>
                  <td>
                    <strong>{d.full_name}</strong>
                    {d.notes && <div className="text-muted text-xs">{d.notes}</div>}
                  </td>
                  <td className="text-sub">{d.email}</td>
                  <td><span className="badge badge-rrp">driver</span></td>
                  <td className="text-sub text-sm">
                    {d.route_names.length > 0
                      ? d.route_names.join(' · ')
                      : <em style={{ color: 'var(--color-portal-muted)' }}>None</em>}
                  </td>
                  <td className="mono">{d.rate_per_stop > 0 ? fmtMoney(d.rate_per_stop) : '-'}</td>
                  <td><span className={`badge ${d.active ? 'badge-green' : 'badge-gray'}`}>{d.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="flex gap-2">
                    <button type="button" onClick={() => setModal({ kind: 'edit', driver: d })} className="btn btn-ghost btn-xs">Edit</button>
                    <button
                      type="button"
                      onClick={() => toggleActive(d)}
                      disabled={busy === d.user_id}
                      className={`btn btn-xs ${d.active ? 'btn-ghost' : 'btn-green'}`}
                    >
                      {d.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <UserModal
          market={market}
          routes={routes}
          existing={modal.kind === 'edit' ? modal.driver : undefined}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); router.refresh() }}
        />
      )}
    </div>
  )
}

// ── User modal (Add + Edit) ────────────────────────────────────────────
function UserModal({ market, routes, existing, onClose, onSaved }: {
  market:    string
  routes:    RouteLite[]
  existing?: DriverRow
  onClose:   () => void
  onSaved:   () => void
}) {
  const [name,        setName]        = useState(existing?.full_name ?? '')
  const [email,       setEmail]       = useState(existing?.email ?? '')
  const [phone,       setPhone]       = useState(existing?.phone ?? '')
  const [rate,        setRate]        = useState<number>(existing?.rate_per_stop ?? 3.25)
  const [canViewAll,  setCanViewAll]  = useState(existing?.can_view_all ?? false)
  const [notes,       setNotes]       = useState(existing?.notes ?? '')
  const [routeIds,    setRouteIds]    = useState<Set<string>>(new Set(existing?.route_ids ?? []))
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  function toggleRoute(id: string) {
    setRouteIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function submit() {
    if (!name.trim() || !email.trim()) { setErr('Name and email required.'); return }
    setBusy(true)
    setErr(null)
    try {
      // Create / update the driver record
      const driverBody = {
        user_id:       existing?.user_id,
        market,
        full_name:     name.trim(),
        email:         email.trim(),
        phone:         phone.trim() || null,
        rate_per_stop: rate,
        can_view_all:  canViewAll,
        notes:         notes.trim() || null,
      }
      const res = await fetch('/api/admin/circulation/drivers', {
        method:  existing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify(driverBody),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error ?? 'Save failed.'); return }
      const userId: string = existing?.user_id ?? (j.driver?.user_id ?? j.user_id ?? '')

      // Sync route assignments
      if (userId) {
        await fetch('/api/admin/circulation/drivers', {
          method:  'PUT',
          headers: { 'content-type': 'application/json' },
          body:    JSON.stringify({ user_id: userId, route_ids: Array.from(routeIds) }),
        })
      }
      onSaved()
    } finally { setBusy(false) }
  }

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
          width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: 'var(--color-portal-text)' }}>
          {existing ? 'Edit user' : 'Add user'}
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg">
            <label>Full name</label>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div className="fg">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!!existing} />
          </div>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg">
            <label>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="334-555-0100" />
          </div>
          <div className="fg">
            <label>Pay per stop ($)</label>
            <input type="number" step={0.25} min={0} value={rate} onChange={e => setRate(Number(e.target.value))} />
          </div>
        </div>

        <div className="fg">
          <label>Assign routes <span style={{ fontWeight: 400, color: 'var(--color-portal-muted)' }}>(check all that apply)</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {routes.map(r => {
              const on = routeIds.has(r.id)
              return (
                <label
                  key={r.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px',
                    border: '1px solid var(--color-portal-border)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13, background: 'white',
                    fontWeight: 400, textTransform: 'none', letterSpacing: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleRoute(r.id)}
                    style={{ width: 'auto', accentColor: 'var(--color-portal-blue)' }}
                  />
                  {r.name}
                </label>
              )
            })}
            {routes.length === 0 && (
              <p className="text-muted text-sm">No active routes yet.</p>
            )}
          </div>
        </div>

        <div className="fg">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={canViewAll}
              onChange={e => setCanViewAll(e.target.checked)}
            />
            Can view all routes (read-only) — for lead drivers or backups
          </label>
        </div>

        <div className="fg">
          <label>Internal notes</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {err && <p className="text-sm" style={{ color: 'var(--color-portal-red)' }}>{err}</p>}

        <div className="modal-footer">
          <button type="button" onClick={submit} disabled={busy} className="btn btn-primary">
            {busy ? 'Saving…' : 'Save user'}
          </button>
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
        </div>
        {!existing && (
          <p className="text-muted text-xs" style={{ marginTop: 12 }}>
            New users receive a magic-link email to set their password on first login. No password is handed out here.
          </p>
        )}
      </div>
    </div>
  )
}
