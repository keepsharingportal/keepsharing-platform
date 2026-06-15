'use client'

// Per-row actions: "Redirect" pops a modal to one-click create a 301;
// "Dismiss" marks the row resolved (e.g. it was junk noise we don't
// care about).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, X, Loader2 } from 'lucide-react'

interface Props {
  id:         string
  path:       string
  brandSlug:  string | null
}

export function NotFoundActionsClient({ id, path, brandSlug }: Props) {
  const router = useRouter()
  const [open,   setOpen]   = useState(false)
  const [toPath, setToPath] = useState('/')
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function createAndResolve() {
    if (!toPath.trim()) { setError('To path required.'); return }
    setBusy(true); setError(null)
    try {
      // 1) Create the redirect
      const r1 = await fetch('/api/admin/seo/redirects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fromPath: path, toPath: toPath.trim(), statusCode: 301, brandSlug }),
      })
      const j1 = await r1.json()
      if (!r1.ok) { setError(j1.error ?? 'Create failed.'); return }

      // 2) Mark the 404 row resolved
      await fetch(`/api/admin/seo/404-log?id=${id}`, { method: 'DELETE' })
      router.refresh()
    } finally { setBusy(false) }
  }

  async function dismiss() {
    if (!confirm('Dismiss this 404? It will not be tracked again unless someone hits it.')) return
    setBusy(true)
    try {
      await fetch(`/api/admin/seo/404-log?id=${id}`, { method: 'DELETE' })
      router.refresh()
    } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <div style={{ display: 'inline-flex', gap: 6 }}>
        <button type="button" onClick={() => setOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--color-portal-navy)', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Redirect <ArrowRight size={11} />
        </button>
        <button type="button" onClick={dismiss} disabled={busy}
          style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-portal-sub)' }}
          title="Dismiss without redirecting">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <input
        type="text"
        value={toPath}
        onChange={e => setToPath(e.target.value)}
        placeholder="/new-path"
        autoFocus
        style={{ padding: '4px 8px', border: '1.5px solid var(--color-portal-border)', borderRadius: 4, fontSize: 12, width: 180 }}
      />
      <button type="button" onClick={createAndResolve} disabled={busy}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--color-portal-green)', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap' }}>
        {busy ? <Loader2 size={11} className="animate-spin" /> : null} 301
      </button>
      <button type="button" onClick={() => { setOpen(false); setError(null) }}
        style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-portal-sub)' }}>
        <X size={13} />
      </button>
      {error && <span style={{ fontSize: 11, color: 'var(--color-portal-red)' }}>{error}</span>}
    </div>
  )
}
