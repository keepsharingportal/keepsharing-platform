'use client'

// Reject card for the detail page right column. Collapsed to a small
// red text-link by default — clicking expands a required-note textarea
// + a Reject button. Rejection sends the submission to the dedicated
// Rejected queue filter, captures WHY for future editorial review, and
// can be undone with /reconsider from the rejection banner.
//
// Placed BELOW the primary action card (OutreachComposerPanel or
// NextActionPanel) so the reject path is available but never visually
// competes with the "send the email" CTA.
//
// Only renders for phases where /reject is actually allowed
// (PHASES[phase].allowedNext includes 'rejected') — past that point
// editors should use Archive instead.

import { useState }   from 'react'
import { useRouter }  from 'next/navigation'
import { AlertTriangle, Loader2, X } from 'lucide-react'

interface Props {
  submissionId: string
  /** What's being rejected — shows in the confirm copy. */
  nomineeName:  string
}

export function RejectPanel({ submissionId, nomineeName }: Props) {
  const router  = useRouter()
  const [open,   setOpen]   = useState(false)
  const [reason, setReason] = useState('')
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function submit() {
    const trimmed = reason.trim()
    if (!trimmed) { setError('Add a short reason so the team can revisit later.'); return }
    if (!confirm(`Reject ${nomineeName}?\n\nThis moves the submission to the Rejected queue. You can bring it back later with Reconsider.`)) return

    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/reject`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reason: trimmed }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Reject failed.'); return }
      router.refresh()
    } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <div style={{
        textAlign: 'right',
        marginTop: -4,  // tuck right under the primary action card
      }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: 11, fontWeight: 600,
            color: 'var(--color-portal-red)',
            textDecoration: 'underline', textUnderlineOffset: 2,
          }}
        >
          Reject this nomination
        </button>
      </div>
    )
  }

  return (
    <div className="card" style={{ borderLeft: '3px solid var(--color-portal-red)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="card-title" style={{ color: 'var(--color-portal-red)', margin: 0 }}>
          Reject nomination
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); setReason(''); setError(null) }}
          style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-portal-muted)' }}
          aria-label="Cancel"
        >
          <X size={14} />
        </button>
      </div>

      <p className="text-muted text-xs" style={{ marginBottom: 10, lineHeight: 1.5 }}>
        Goes to the <strong>Rejected</strong> queue with the reason attached. Can be undone later with Reconsider.
      </p>

      {error && (
        <div className="alert alert-error" style={{ fontSize: 11, marginBottom: 8 }}>
          <AlertTriangle size={11} style={{ display: 'inline', verticalAlign: -1 }} /> {error}
        </div>
      )}

      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '.3px',
        color: 'var(--color-portal-sub)', marginBottom: 4,
      }}>
        Why are you rejecting?
      </label>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={4}
        placeholder="e.g. Already featured a similar story in March. Revisit in Q4."
        maxLength={1000}
        style={{
          width: '100%',
          padding: '8px 10px',
          border: '1.5px solid var(--color-portal-border)',
          borderRadius: 6,
          fontSize: 12,
          fontFamily: 'inherit',
          background: 'white',
          outline: 'none',
          resize: 'vertical',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 }}>
        <button
          type="button"
          onClick={() => { setOpen(false); setReason(''); setError(null) }}
          disabled={busy}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: 11, color: 'var(--color-portal-sub)', fontWeight: 500,
            textDecoration: 'underline', textUnderlineOffset: 2,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !reason.trim()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 14px',
            background: 'var(--color-portal-red)', color: 'white',
            border: 'none', borderRadius: 6,
            fontSize: 12, fontWeight: 700,
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy || !reason.trim() ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {busy
            ? <><Loader2 size={12} className="animate-spin" /><span>Rejecting…</span></>
            : <span>Reject nomination</span>}
        </button>
      </div>
    </div>
  )
}
