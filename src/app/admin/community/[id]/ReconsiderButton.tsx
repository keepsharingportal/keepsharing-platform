'use client'

// Small client island for the Rejected banner's Reconsider button.
// The banner itself is rendered server-side as part of the detail
// page; we only need a client component for the fetch + router.refresh.

import { useState }   from 'react'
import { useRouter }  from 'next/navigation'
import { Loader2, RotateCcw } from 'lucide-react'

interface Props {
  submissionId: string
}

export function ReconsiderButton({ submissionId }: Props) {
  const router = useRouter()
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reconsider() {
    if (!confirm('Move this submission back to Nominated and re-open it for editorial review?')) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/community-submissions/${submissionId}/reconsider`, { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Reconsider failed.'); return }
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <>
      <button
        type="button"
        onClick={reconsider}
        disabled={busy}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '9px 16px',
          background: 'white',
          color: 'var(--color-portal-red)',
          border: '1.5px solid var(--color-portal-red)',
          borderRadius: 8,
          fontSize: 13, fontWeight: 700,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.7 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {busy
          ? <><Loader2 size={13} className="animate-spin" /><span>Working…</span></>
          : <><RotateCcw size={13} /><span>Reconsider</span></>}
      </button>
      {error && (
        <div className="alert alert-error" style={{ fontSize: 11, marginTop: 6 }}>
          {error}
        </div>
      )}
    </>
  )
}
