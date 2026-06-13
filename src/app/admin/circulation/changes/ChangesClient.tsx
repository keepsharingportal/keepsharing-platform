'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'

export interface ChangeRequestRow {
  id:          string
  type:        string
  status:      string
  stop_id:     string | null
  route_id:    string | null
  driver_id:   string | null
  field_name:  string | null
  old_value:   string | null
  new_value:   string | null
  notes:       string | null
  admin_note:  string | null
  created_at:  string
  reviewed_at: string | null
  stop_name:   string | null
  route_name:  string
  driver_name: string
}

interface Props { filter: 'pending' | 'all'; rows: ChangeRequestRow[] }

export function ChangesClient({ filter, rows }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function act(id: string, action: 'approve' | 'reject') {
    setBusy(id)
    try {
      const res = await fetch('/api/admin/circulation/change-requests', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ id, action }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error ?? 'Action failed.')
        return
      }
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
          <Link href="/admin/circulation/changes?filter=pending" className={`btn btn-sm ${filter !== 'all' ? 'btn-primary' : 'btn-ghost'}`}>Pending</Link>
          <Link href="/admin/circulation/changes?filter=all"     className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}>All</Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {rows.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p className="text-sub">No {filter !== 'all' ? 'pending ' : ''}change requests.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(r => {
              const typeCls = r.type === 'close' ? 'badge-red' : r.type === 'new' ? 'badge-green' : 'badge-amber'
              const stCls   = r.status === 'approved' ? 'badge-green' : r.status === 'rejected' ? 'badge-red' : 'badge-amber'
              return (
                <div key={r.id} className="card">
                  <div className="flex items-center gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                    <span className={`badge ${typeCls}`}>{r.type[0].toUpperCase() + r.type.slice(1)}</span>
                    <span className={`badge ${stCls}`}>{r.status[0].toUpperCase() + r.status.slice(1)}</span>
                    <span className="text-sub text-sm">{r.driver_name} · {r.route_name}</span>
                    <span className="text-muted ml-auto" style={{ fontSize: 12 }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="fw-600 mb-2">{r.stop_name ?? 'New location'}</div>
                  {r.type === 'edit' && r.field_name && (
                    <div style={{
                      background: 'var(--color-portal-bg)', borderRadius: 6,
                      padding: '10px 14px', fontSize: 13, marginBottom: 10,
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
                    }}>
                      <div>
                        <div className="text-muted text-xs mb-1">Field</div>
                        <strong>{r.field_name}</strong>
                      </div>
                      <div>
                        <div className="text-muted text-xs mb-1">Was</div>
                        <span style={{ color: 'var(--color-portal-red)' }}>{r.old_value ?? '—'}</span>
                      </div>
                      <div>
                        <div className="text-muted text-xs mb-1">Now</div>
                        <span style={{ color: 'var(--color-portal-green)', fontWeight: 600 }}>{r.new_value ?? '—'}</span>
                      </div>
                    </div>
                  )}
                  {r.notes && (
                    <div className="text-sub text-sm mb-3" style={{ fontStyle: 'italic' }}>&ldquo;{r.notes}&rdquo;</div>
                  )}
                  {r.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => act(r.id, 'approve')} disabled={busy === r.id} className="btn btn-green btn-sm">
                        <Check size={12} /> Approve &amp; apply
                      </button>
                      <button type="button" onClick={() => act(r.id, 'reject')} disabled={busy === r.id} className="btn btn-red btn-sm">
                        <X size={12} /> Reject
                      </button>
                    </div>
                  ) : (
                    <div className="text-muted text-xs">
                      Reviewed {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
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
