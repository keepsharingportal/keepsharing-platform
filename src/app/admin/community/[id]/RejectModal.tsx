'use client'

// Reject confirmation modal. Required reason textarea + red Reject
// button. Same visual vocabulary as EmailComposerModal so the
// detail-page right column has a consistent modal pattern across both
// destructive (reject) and primary (send email) actions.

import { useEffect, useState } from 'react'
import { X, Loader2, AlertTriangle } from 'lucide-react'

interface Props {
  open:        boolean
  onClose:     () => void
  nomineeName: string
  /** Called when the editor confirms. Throws on API failure so the
   *  modal can surface the error inline. */
  onConfirm:   (reason: string) => Promise<void>
}

export function RejectModal({ open, onClose, nomineeName, onConfirm }: Props) {
  const [reason, setReason] = useState('')
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    if (open) { setReason(''); setError(null) }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  async function handleConfirm() {
    const trimmed = reason.trim()
    if (!trimmed) { setError('Add a short reason so the team can revisit later.'); return }
    setBusy(true); setError(null)
    try {
      await onConfirm(trimmed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reject nomination"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.35)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >

        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-portal-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-portal-text)' }}>
            Reject nomination
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            style={{
              background: 'none', border: 'none',
              padding: 4, cursor: 'pointer',
              color: 'var(--color-portal-sub)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <p style={{ color: 'var(--color-portal-sub)', fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
            Rejecting <strong style={{ color: 'var(--color-portal-text)' }}>{nomineeName}</strong> moves the submission to the
            Rejected queue. You can bring it back later with Reconsider — the reason you write here is preserved either way.
          </p>

          {error && (
            <div className="alert alert-error" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <AlertTriangle size={12} /> {error}
            </div>
          )}

          <label style={{
            display: 'block',
            fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.5px',
            color: 'var(--color-portal-sub)',
            marginBottom: 4,
          }}>
            Why are you rejecting?
          </label>
          <textarea
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="e.g. Already featured a similar story in March. Revisit in Q4."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1.5px solid var(--color-portal-border)',
              borderRadius: 6,
              fontSize: 13,
              fontFamily: 'inherit',
              background: 'white',
              outline: 'none',
              color: 'var(--color-portal-text)',
              resize: 'vertical',
              lineHeight: 1.5,
            }}
          />
        </div>

        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--color-portal-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8,
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '9px 14px',
              background: 'white',
              color: 'var(--color-portal-sub)',
              border: '1px solid var(--color-portal-border)',
              borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !reason.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px',
              background: 'var(--color-portal-red)',
              color: 'white',
              border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 700,
              cursor: busy || !reason.trim() ? 'not-allowed' : 'pointer',
              opacity: busy || !reason.trim() ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {busy
              ? <><Loader2 size={14} className="animate-spin" /><span>Rejecting…</span></>
              : <span>Reject nomination</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
