'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** "Apply all" action — walks every pending suggestion and inserts
 *  each one's <a> into the source article body. Skipped suggestions
 *  (anchor no longer present after intervening edits) are marked
 *  rejected so the queue stays clean. */
export function ApplyAllButton({ pendingCount }: { pendingCount: number }) {
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState<string | null>(null)
  const router = useRouter()

  async function run() {
    if (pendingCount === 0) return
    const ok = confirm(`Apply all ${pendingCount} pending suggestions? Each will insert its anchor link into the source article. Skipped suggestions will be marked rejected.`)
    if (!ok) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/seo/internal-links?action=apply-all', { method: 'PUT' })
      const j   = await res.json()
      if (!res.ok) throw new Error(j?.error ?? 'Apply-all failed')
      setMsg(`${j.applied} applied · ${j.skipped} skipped (stale)`)
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
      disabled={busy || pendingCount === 0}
      className="stat-card"
      style={{
        border: '1px solid var(--color-portal-green)',
        background: 'var(--color-portal-green-lt, #ecfdf5)',
        cursor: busy || pendingCount === 0 ? 'not-allowed' : 'pointer',
        opacity: pendingCount === 0 ? 0.5 : 1,
      }}
    >
      <div className="stat-num" style={{ color: 'var(--color-portal-green)' }}>
        {busy ? '…' : '⚡'}
      </div>
      <div className="stat-label">{msg ?? `Apply all ${pendingCount}`}</div>
    </button>
  )
}
