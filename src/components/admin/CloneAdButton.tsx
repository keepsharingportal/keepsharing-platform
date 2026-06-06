'use client'

// CloneAdButton — small client wrapper for the Clone & Run action.
// Lives alongside server-rendered ad lists (e.g. /admin/advertisers/[id]).
// POSTs to /api/admin/ads/clone, redirects to the new ad's edit page on
// success, surfaces the error inline on failure.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy } from 'lucide-react'

export function CloneAdButton({ id, variant = 'inline' }: { id: string; variant?: 'inline' | 'pill' }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function run() {
    if (busy) return
    setBusy(true)
    try {
      const res  = await fetch('/api/admin/ads/clone', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.id) {
        router.push(`/admin/ads/${json.id}/edit`)
      } else {
        window.alert(json?.error ?? `Clone failed: HTTP ${res.status}`)
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (variant === 'pill') {
    return (
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50"
        title="Copy this ad's creative into a new booking with fresh stats and new dates"
      >
        <Copy size={10} /> {busy ? 'Cloning…' : 'Clone & Run'}
      </button>
    )
  }
  return (
    <button
      onClick={run}
      disabled={busy}
      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline disabled:opacity-50"
      title="Copy this ad's creative into a new booking with fresh stats and new dates"
    >
      <Copy size={10} /> {busy ? 'Cloning…' : 'Clone & Run'}
    </button>
  )
}
