'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RunPassButton() {
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState<string | null>(null)
  const router = useRouter()

  async function run() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/seo/internal-links-run', { method: 'POST' })
      const j   = await res.json()
      if (!res.ok) throw new Error(j?.error ?? 'Failed')
      setMsg(`Pass complete · ${j.suggestionsAdded ?? j.added ?? 0} new suggestions`)
      router.refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="stat-card"
      style={{ border: '1px dashed var(--color-portal-border-2)', cursor: busy ? 'progress' : 'pointer' }}
    >
      <div className="stat-num">{busy ? '…' : '▶'}</div>
      <div className="stat-label">{msg ?? 'Run pass now'}</div>
    </button>
  )
}
