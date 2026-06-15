'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCw } from 'lucide-react'

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
      setMsg(`${j.suggestionsAdded ?? j.added ?? 0} new suggestions`)
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
      className="bg-white border border-dashed border-portal-border-2 rounded-lg p-4 hover:bg-portal-bg disabled:opacity-50 text-left"
    >
      <div className="text-[22px] font-black text-portal-text inline-flex items-center gap-2">
        {busy ? <RotateCw size={20} className="animate-spin" /> : '▶'}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">
        {msg ?? 'Run pass now'}
      </div>
    </button>
  )
}
