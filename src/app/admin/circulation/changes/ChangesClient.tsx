'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, X, Edit3, PauseCircle, Trash2, ChevronDown } from 'lucide-react'

export interface StopDetail {
  id:                  string
  name:                string
  address:             string | null
  city:                string | null
  zip:                 string | null
  notes:               string | null
  quantities:          Record<string, number> | null
  active:              boolean
  not_delivering:      boolean
  not_delivering_note: string | null
}

export interface ChangeRequestRow {
  id:           string
  type:         string
  status:       string
  stop_id:      string | null
  route_id:     string | null
  driver_id:    string | null
  field_name:   string | null
  old_value:    string | null
  new_value:    string | null
  notes:        string | null
  admin_note:   string | null
  created_at:   string
  reviewed_at:  string | null
  stop_name:    string | null
  stop_details: StopDetail | null
  route_name:   string
  driver_name:  string
}

interface Props { filter: 'pending' | 'all' | 'history'; rows: ChangeRequestRow[]; loadErr?: string | null }

export function ChangesClient({ filter, rows, loadErr }: Props) {
  const router = useRouter()
  const [busy, setBusy]           = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function reject(id: string) {
    const note = window.prompt('Reason for rejecting (optional, shown to driver):', '')
    if (note === null) return
    setBusy(id)
    try {
      const res = await fetch('/api/admin/circulation/change-requests', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ id, action: 'reject', admin_note: note || null }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error ?? 'Action failed.')
        return
      }
      router.refresh()
    } finally { setBusy(null) }
  }

  async function applyEdit(id: string, updates: Record<string, unknown>, adminNote?: string) {
    setBusy(id)
    try {
      const res = await fetch('/api/admin/circulation/change-requests', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ id, action: 'apply', updates, admin_note: adminNote ?? null }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error ?? 'Save failed.')
        return
      }
      setExpandedId(null)
      router.refresh()
    } finally { setBusy(null) }
  }

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Change requests</h1>
        </div>
        <div className="ph-actions">
          <Link href="/admin/circulation/changes?filter=pending" className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-ghost'}`}>Pending</Link>
          <Link href="/admin/circulation/changes?filter=all"     className={`btn btn-sm ${filter === 'all'     ? 'btn-primary' : 'btn-ghost'}`}>All</Link>
          <Link href="/admin/circulation/changes?filter=history" className={`btn btn-sm ${filter === 'history' ? 'btn-primary' : 'btn-ghost'}`}>History</Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {loadErr && (
          <div className="alert alert-red mb-4" style={{ background: '#FEE2E2', border: '1px solid #DC2626', color: '#7F1D1D', padding: 14, borderRadius: 8, marginBottom: 16 }}>
            <strong>Load error:</strong> {loadErr}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p className="text-sub">No {filter === 'pending' ? 'pending ' : filter === 'history' ? 'reviewed ' : ''}change requests.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(r => {
              const typeCls = r.type === 'close' ? 'badge-red' : r.type === 'new' ? 'badge-green' : 'badge-amber'
              const stCls   = r.status === 'approved' ? 'badge-green' : r.status === 'rejected' ? 'badge-red' : 'badge-amber'
              const isExpanded = expandedId === r.id
              return (
                <div key={r.id} className="card">
                  <div className="flex items-center gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                    <span className={`badge ${typeCls}`}>{prettyType(r.type)}</span>
                    <span className={`badge ${stCls}`}>{r.status[0].toUpperCase() + r.status.slice(1)}</span>
                    <span className="text-sub text-sm">{r.driver_name} · {r.route_name}</span>
                    <span className="text-muted ml-auto" style={{ fontSize: 12 }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="fw-600 mb-2">{r.stop_name ?? 'New location'}</div>
                  {r.notes && (
                    <div className="text-sub text-sm mb-3" style={{
                      fontStyle: 'italic', background: '#F8FAFC',
                      padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid #1A5FA8',
                    }}>
                      &ldquo;{r.notes}&rdquo;
                    </div>
                  )}

                  {r.status === 'pending' ? (
                    <>
                      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          disabled={busy === r.id}
                          className="btn btn-primary btn-sm"
                        >
                          <Edit3 size={12} /> {isExpanded ? 'Cancel review' : 'Review & edit'}
                          <ChevronDown size={12} style={{ transform: isExpanded ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(r.id)}
                          disabled={busy === r.id}
                          className="btn btn-red btn-sm"
                        >
                          <X size={12} /> Reject
                        </button>
                      </div>

                      {isExpanded && (
                        <ReviewPanel
                          row={r}
                          busy={busy === r.id}
                          onApply={(updates, adminNote) => applyEdit(r.id, updates, adminNote)}
                          onCancel={() => setExpandedId(null)}
                        />
                      )}
                    </>
                  ) : (
                    <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                      {r.status === 'approved' ? '✓ Approved' : r.status === 'rejected' ? '✕ Rejected' : 'Reviewed'}
                      {r.reviewed_at && (
                        <> · {new Date(r.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</>
                      )}
                      {r.admin_note && (
                        <div style={{ marginTop: 4, color: 'var(--color-portal-sub)', fontStyle: 'italic' }}>
                          Admin note: &ldquo;{r.admin_note}&rdquo;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Review panel ─────────────────────────────────────────────────────────
// Expands under the card when admin clicks Review. Pre-fills with the
// stop's current values; admin edits, then picks an action.
function ReviewPanel({
  row, busy, onApply, onCancel,
}: {
  row: ChangeRequestRow
  busy: boolean
  onApply: (updates: Record<string, unknown>, adminNote?: string) => void
  onCancel: () => void
}) {
  const s = row.stop_details
  const [name,          setName]          = useState(s?.name ?? '')
  const [address,       setAddress]       = useState(s?.address ?? '')
  const [city,          setCity]           = useState(s?.city ?? '')
  const [zip,           setZip]            = useState(s?.zip ?? '')
  const [notes,         setNotes]          = useState(s?.notes ?? '')
  const [quantities,    setQuantities]     = useState<Record<string, number>>(s?.quantities ?? {})
  const [pauseReason,   setPauseReason]    = useState('Closed for the season')
  const [adminNote,     setAdminNote]      = useState('')

  const pubKeys = Object.keys(quantities).length > 0
    ? Object.keys(quantities).sort()
    : ['rrp', 'boom'] // reasonable default if no quantities on file

  function saveEdits() {
    const updates: Record<string, unknown> = {
      name:       name.trim() || null,
      address:    address.trim() || null,
      city:       city.trim() || null,
      zip:        zip.trim() || null,
      notes:      notes.trim() || null,
      quantities: Object.fromEntries(Object.entries(quantities).filter(([, v]) => v > 0)),
    }
    onApply(updates, adminNote.trim() || undefined)
  }

  function markNotDelivering() {
    if (!window.confirm('Pause deliveries to this stop? It will stay on the map but drivers won\'t stop there.')) return
    onApply({ not_delivering: true, not_delivering_note: pauseReason.trim() || 'Closed by driver request' }, adminNote.trim() || undefined)
  }

  function deletePermanently() {
    if (!window.confirm('Deactivate this stop entirely? It will disappear from every driver route and the public map. (You can restore later in Routes & Stops.)')) return
    onApply({ active: false, not_delivering: true, not_delivering_note: 'Deactivated by admin' }, adminNote.trim() || undefined)
  }

  if (!s) {
    // "new" type — no existing stop. Fall back to a compact panel
    // pointing the admin at the add-stop flow.
    return (
      <div style={{ marginTop: 12, padding: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, lineHeight: 1.5 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>New stop request.</strong> The driver flagged a location that isn&apos;t on any route yet.
        </div>
        <div className="text-sub mb-3">
          Go to <Link href="/admin/circulation/routes" style={{ color: 'var(--color-portal-blue)', textDecoration: 'underline' }}>Routes &amp; Stops</Link> and add the stop, then come back here and click Approve.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => onApply({}, adminNote.trim() || 'Approved — stop was added manually')}
            disabled={busy}
            className="btn btn-green btn-sm"
          >
            <Check size={12} /> Approve (marked as handled)
          </button>
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      marginTop: 12, padding: 14,
      background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B', marginBottom: 10 }}>
        Edit this stop
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
        <div className="fg">
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="fg">
          <label>Zip</label>
          <input value={zip} onChange={e => setZip(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
        <div className="fg">
          <label>Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="fg">
          <label>City</label>
          <input value={city} onChange={e => setCity(e.target.value)} />
        </div>
      </div>

      <div className="fg" style={{ marginBottom: 8 }}>
        <label>Copies per publication</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          {pubKeys.map(pub => (
            <label key={pub} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1E293B' }}>
              <span style={{ fontWeight: 700, fontFamily: '"DM Mono", ui-monospace, monospace' }}>{pub.toUpperCase()}</span>
              <input
                type="number" min={0} inputMode="numeric"
                value={quantities[pub] ?? 0}
                onChange={e => setQuantities({ ...quantities, [pub]: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                style={{ width: 70, padding: '6px 8px' }}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="fg" style={{ marginBottom: 12 }}>
        <label>Stop notes (for driver)</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Ask for Bob at the counter" />
      </div>

      <div className="fg" style={{ marginBottom: 12 }}>
        <label>Admin note <span style={{ fontWeight: 400, color: 'var(--color-portal-muted)' }}>(shown to driver in confirmation)</span></label>
        <input value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="e.g. Cut the drop from 25 to 10 per driver's request" />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={saveEdits} disabled={busy} className="btn btn-green btn-sm">
          <Check size={12} /> Save changes &amp; approve
        </button>
        <button type="button" onClick={markNotDelivering} disabled={busy} className="btn btn-amber btn-sm" title="Keep on the map, but drivers skip">
          <PauseCircle size={12} /> Pause this stop
        </button>
        <button type="button" onClick={deletePermanently} disabled={busy} className="btn btn-red btn-sm" title="Fully remove from routes and public map">
          <Trash2 size={12} /> Deactivate stop
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>
      </div>

      {(s.not_delivering || !s.active) && (
        <p style={{ marginTop: 10, fontSize: 11, color: '#92400E' }}>
          Current state: {s.not_delivering ? 'paused (not delivering)' : ''}{s.not_delivering && !s.active ? ' + ' : ''}{!s.active ? 'deactivated' : ''}
          {s.not_delivering_note && ` — "${s.not_delivering_note}"`}
        </p>
      )}

      {/* Pause reason input — surfaced only when the admin's about to click Pause */}
      <input
        value={pauseReason}
        onChange={e => setPauseReason(e.target.value)}
        placeholder="Reason for pause"
        style={{ marginTop: 8, fontSize: 12, padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: 6, background: 'white', width: '100%' }}
      />
    </div>
  )
}

function prettyType(t: string): string {
  return ({
    close: 'Closed',
    edit:  'Edit',
    qty:   'Quantity',
    new:   'New stop',
    move:  'Move',
  } as Record<string, string>)[t] ?? t
}
