'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2 } from 'lucide-react'

interface Props {
  id:          string
  sourceId:    string
  targetId:    string
  anchorText:  string
  targetPath:  string
}

export function LinkActionsClient({ id, sourceId, targetId, anchorText, targetPath }: Props) {
  const router = useRouter()
  const [busy,  setBusy]  = useState<'accept' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function act(action: 'accept' | 'reject') {
    setBusy(action); setError(null)
    try {
      const res = await fetch(`/api/admin/seo/internal-links?id=${id}`, {
        method:  action === 'accept' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    action === 'accept' ? JSON.stringify({ sourceId, targetId, anchorText, targetPath }) : undefined,
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? `${action} failed.`); return }
      router.refresh()
    } finally { setBusy(null) }
  }

  return (
    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <button type="button" onClick={() => act('accept')} disabled={!!busy}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--color-portal-green)', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}>
        {busy === 'accept' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Insert link
      </button>
      <button type="button" onClick={() => act('reject')} disabled={!!busy}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'white', color: 'var(--color-portal-sub)', border: '1px solid var(--color-portal-border)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}>
        {busy === 'reject' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Reject
      </button>
      {error && <span style={{ fontSize: 11, color: 'var(--color-portal-red)' }}>{error}</span>}
    </div>
  )
}
