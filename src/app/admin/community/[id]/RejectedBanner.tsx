'use client'

// Top-of-page red banner shown when phase=rejected. Surfaces the
// reason the prior editor gave + a one-click Reconsider button that
// flips phase back to 'nominated' and re-opens the submission to the
// active workflow. Cleared rejection_reason on reconsider; the
// rejected_at/rejected_by audit trail is preserved (we want to know
// this row was reconsidered, not pretend the rejection never happened).

import { useState }  from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'

interface Props {
  submissionId:    string
  rejectionReason: string | null
  rejectedAt:      string | null
}

export function RejectedBanner({ submissionId, rejectionReason, rejectedAt }: Props) {
  const router = useRouter()
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reconsider() {
    if (!confirm('Move this submission back to Nominated and re-open it for editorial review?')) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/reconsider`, {
        method: 'POST',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Reconsider failed.'); return }
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div
      style={{
        background: 'var(--color-portal-red-lt, #fef2f2)',
        border: '1px solid var(--color-portal-red, #dc2626)',
        borderLeft: '4px solid var(--color-portal-red, #dc2626)',
        borderRadius: 8,
        padding: 14,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <AlertTriangle size={18} color="var(--color-portal-red)" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fw-700" style={{ color: 'var(--color-portal-red)', fontSize: 13, marginBottom: 4 }}>
          Rejected{rejectedAt ? ` ${new Date(rejectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
        </div>
        {rejectionReason ? (
          <div style={{ color: 'var(--color-portal-text)', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {rejectionReason}
          </div>
        ) : (
          <div className="text-muted text-xs" style={{ fontStyle: 'italic' }}>
            No reason was recorded.
          </div>
        )}
        {error && (
          <div className="alert alert-error" style={{ fontSize: 11, marginTop: 8 }}>
            {error}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={reconsider}
        disabled={busy}
        style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          background: 'white',
          color: 'var(--color-portal-red)',
          border: '1.5px solid var(--color-portal-red)',
          borderRadius: 6,
          fontSize: 12, fontWeight: 700,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.7 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {busy
          ? <><Loader2 size={12} className="animate-spin" /><span>Working…</span></>
          : <><RotateCcw size={12} /><span>Reconsider</span></>}
      </button>
    </div>
  )
}
