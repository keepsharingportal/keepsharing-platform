'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'

interface StopLite {
  id: string; name: string; address: string | null; city: string | null; sort_order: number
}

interface Props {
  suggestionId:   string
  driverName:     string
  routeName:      string
  status:         'pending' | 'approved' | 'declined' | 'rejected'
  note:           string | null
  adminNote:      string | null
  createdAt:      string
  reviewedAt:     string | null
  currentStops:   StopLite[]
  suggestedStops: StopLite[]
}

export function RouteSuggestionClient({
  suggestionId, driverName, routeName, status, note, adminNote,
  createdAt, reviewedAt, currentStops, suggestedStops,
}: Props) {
  const router = useRouter()
  const [adminNoteText, setAdminNoteText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function act(action: 'approve' | 'reject') {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/route-order', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          suggestion_id: suggestionId,
          action,
          admin_note:    action === 'reject' ? (adminNoteText.trim() || null) : null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.error ?? 'Action failed.')
        return
      }
      router.refresh()
    } finally { setBusy(false) }
  }

  // Build map of current-position-by-id for diff highlighting in suggested column.
  const currentIdx = new Map(currentStops.map((s, i) => [s.id, i]))

  const statusBadge = status === 'pending' ? 'badge-amber'
    : status === 'approved' ? 'badge-green'
    : 'badge-red'

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div><h1 className="ph-title">Route order suggestion</h1></div>
        <div className="ph-actions">
          <Link href="/admin/circulation/changes" className="btn btn-ghost btn-sm">
            <ArrowLeft size={14} /> Back to changes
          </Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        <div className="card mb-4">
          <div className="card-header">
            <span className="card-title">{driverName} → {routeName}</span>
            <span className={`badge ${statusBadge}`}>{status[0].toUpperCase() + status.slice(1)}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-portal-sub)', marginTop: 4 }}>
            Submitted {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            {note && <> &nbsp;·&nbsp; <em>&ldquo;{note}&rdquo;</em></>}
          </div>
        </div>

        <div className="grid-2 mb-4">
          {/* Current order */}
          <div className="card">
            <div className="card-title mb-3">Current order</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {currentStops.map((s, i) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  background: '#F8FAFC', fontSize: 13,
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#E2E8F0', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#64748B',
                    flexShrink: 0,
                  }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#1E293B' }}>{s.name}</div>
                    {s.address && <div style={{ fontSize: 11, color: '#94A3B8' }}>{s.address}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested order */}
          <div className="card">
            <div className="card-title mb-3">Suggested by {driverName.split(' ')[0]}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {suggestedStops.map((s, i) => {
                const oldIdx = currentIdx.get(s.id)
                const moved  = oldIdx !== undefined && oldIdx !== i
                return (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8,
                    background: moved ? '#FFFBEB' : '#F8FAFC',
                    border: moved ? '1.5px solid #FCD34D' : 'none',
                    fontSize: 13,
                  }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: moved ? '#D97706' : '#E2E8F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      color: moved ? 'white' : '#64748B',
                      flexShrink: 0,
                    }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{s.name}</div>
                      {s.address && <div style={{ fontSize: 11, color: '#94A3B8' }}>{s.address}</div>}
                    </div>
                    {moved && (
                      <span style={{ fontSize: 10, color: '#92400E', fontWeight: 600, flexShrink: 0 }}>
                        {(oldIdx ?? 0) + 1} → {i + 1}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {err && <p className="text-sm" style={{ color: 'var(--color-portal-red)' }}>{err}</p>}

        {status === 'pending' ? (
          <div className="grid-2">
            <div className="card">
              <div className="card-title mb-2">Approve this order</div>
              <p className="text-sub text-sm mb-3">
                The route will immediately update to the suggested order and the driver will be notified.
              </p>
              <button type="button" onClick={() => act('approve')} disabled={busy} className="btn btn-primary" style={{ width: '100%' }}>
                <Check size={14} /> Approve &amp; apply
              </button>
            </div>
            <div className="card">
              <div className="card-title mb-2">Decline</div>
              <p className="text-sub text-sm mb-2">Send the driver a message explaining your decision (optional).</p>
              <div className="fg">
                <textarea
                  value={adminNoteText}
                  onChange={e => setAdminNoteText(e.target.value)}
                  style={{ height: 80 }}
                  placeholder="e.g. I need to keep this order for now because of another driver covering part of this route…"
                />
              </div>
              <button type="button" onClick={() => act('reject')} disabled={busy} className="btn btn-ghost" style={{ width: '100%' }}>
                Decline &amp; notify driver
              </button>
            </div>
          </div>
        ) : status === 'approved' ? (
          <div className="alert alert-success">
            ✓ Approved and applied {reviewedAt && <>on {new Date(reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>}
          </div>
        ) : (
          <div className="alert alert-error">
            Declined {reviewedAt && <>on {new Date(reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>}
            {adminNote && <>. {adminNote}</>}
          </div>
        )}
      </div>
    </div>
  )
}
