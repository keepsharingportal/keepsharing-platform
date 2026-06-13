'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export interface LocationRequestRow {
  id:             string
  business_name:  string
  address:        string | null
  contact_name:   string | null
  contact_phone:  string | null
  contact_email:  string | null
  publications:   string | null
  notes:          string | null
  status:         string
  created_at:     string
  reviewed_at:    string | null
}

interface Props { filter: 'pending' | 'all'; rows: LocationRequestRow[] }

export function RequestsClient({ filter, rows }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function act(id: string, action: 'approve' | 'reject' | 'added') {
    setBusy(id)
    try {
      const res = await fetch('/api/admin/circulation/location-requests', {
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
          <h1 className="ph-title">Location requests</h1>
        </div>
        <div className="ph-actions">
          <Link href="/admin/circulation/requests?filter=pending" className={`btn btn-sm ${filter !== 'all' ? 'btn-primary' : 'btn-ghost'}`}>Pending</Link>
          <Link href="/admin/circulation/requests?filter=all"     className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}>All</Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {rows.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p className="text-sub">No location requests yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(r => {
              const sc = r.status === 'approved' ? 'badge-green'
                : r.status === 'added' ? 'badge-rrp'
                : r.status === 'rejected' ? 'badge-red'
                : 'badge-amber'
              return (
                <div key={r.id} className="card">
                  <div className="flex items-center gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                    <strong>{r.business_name}</strong>
                    <span className={`badge ${sc}`}>{r.status[0].toUpperCase() + r.status.slice(1)}</span>
                    <span className="text-muted ml-auto" style={{ fontSize: 12 }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, marginBottom: 10 }}>
                    <div><span className="text-muted">Address:</span> {r.address ?? '—'}</div>
                    <div><span className="text-muted">Contact:</span> {r.contact_name ?? '—'}</div>
                    <div><span className="text-muted">Phone:</span> {r.contact_phone ?? '—'}</div>
                    <div><span className="text-muted">Email:</span> {r.contact_email ?? '—'}</div>
                    <div><span className="text-muted">Publications:</span> {r.publications ?? '—'}</div>
                  </div>
                  {r.notes && (
                    <div className="text-sub text-sm mb-3" style={{ fontStyle: 'italic' }}>&ldquo;{r.notes}&rdquo;</div>
                  )}
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => act(r.id, 'approve')} disabled={busy === r.id} className="btn btn-green btn-sm">Approve</button>
                      <button type="button" onClick={() => act(r.id, 'added')}   disabled={busy === r.id} className="btn btn-blue btn-sm">Added to route</button>
                      <button type="button" onClick={() => act(r.id, 'reject')}  disabled={busy === r.id} className="btn btn-red btn-sm">Reject</button>
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
