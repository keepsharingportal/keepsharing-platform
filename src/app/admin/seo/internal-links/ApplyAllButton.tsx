'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2 } from 'lucide-react'

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
      setMsg(`${j.applied} applied · ${j.skipped} skipped`)
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
      className={`bg-portal-green-lt border border-portal-green rounded-lg p-4 text-left disabled:opacity-50 ${pendingCount === 0 ? 'cursor-not-allowed' : 'hover:opacity-80'}`}
    >
      <div className="text-[22px] font-black text-portal-green inline-flex items-center gap-2">
        {busy ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">
        {msg ?? `Apply all ${pendingCount}`}
      </div>
    </button>
  )
}
