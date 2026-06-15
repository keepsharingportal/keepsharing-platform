'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Loader2 } from 'lucide-react'

export function RunNowButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState<string | null>(null)

  async function run() {
    if (!confirm('Run weekly audit for all brands now? This costs tokens (~$0.10 per brand).')) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/cron/seo-weekly-audit', { method: 'GET' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg(j.error ?? 'Audit failed.'); return }
      setMsg(`Audit complete. ${j.results.filter((r: { ok: boolean }) => r.ok).length} brands ok.`)
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--color-portal-navy)', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
        Run all brands
      </button>
      {msg && <span style={{ fontSize: 12, color: 'var(--color-portal-sub)' }}>{msg}</span>}
    </div>
  )
}
