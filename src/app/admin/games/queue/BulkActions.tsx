'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, X, RefreshCw } from 'lucide-react'

interface Props {
  // Either approve everything pending (omit filter), or a specific group
  filter?:  { game_type?: string; difficulty?: string }
  count:    number
  label?:   string                  // button label override (e.g., "Approve all 105")
  variant?: 'primary' | 'inline'    // visual style
  showReject?: boolean              // also render a reject button alongside
}

export function BulkActions({ filter, count, label, variant = 'inline', showReject }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [err,  setErr]  = useState<string | null>(null)

  async function run(action: 'approve' | 'reject') {
    if (busy || count === 0) return
    if (action === 'reject' && !confirm(`Reject ${count} pending item${count === 1 ? '' : 's'}?`)) return
    setBusy(action); setErr(null)
    try {
      const res = await fetch('/api/admin/games/proposals/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, filter: filter ?? {} }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      router.refresh()
    } finally { setBusy(null) }
  }

  if (count === 0) return null

  const approveBtn = variant === 'primary'
    ? 'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40'
    : 'inline-flex items-center gap-1 text-xs font-bold bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700 disabled:opacity-40'

  const rejectBtn = 'inline-flex items-center gap-1 text-xs font-semibold border border-portal-border text-portal-sub rounded-lg px-3 py-1.5 hover:bg-portal-bg disabled:opacity-40'

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => run('approve')} disabled={busy !== null} className={approveBtn}>
        {busy === 'approve' ? <RefreshCw size={13} className="animate-spin" /> : <CheckCheck size={13} />}
        {label ?? `Approve all ${count}`}
      </button>
      {showReject && (
        <button type="button" onClick={() => run('reject')} disabled={busy !== null} className={rejectBtn}>
          {busy === 'reject' ? <RefreshCw size={12} className="animate-spin" /> : <X size={12} />}
          Reject all
        </button>
      )}
      {err && <span className="text-xs text-portal-red font-semibold">{err}</span>}
    </div>
  )
}
