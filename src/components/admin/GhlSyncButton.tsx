'use client'

// GhlSyncButton — fires a manual push of all contacts on an advertiser
// to GoHighLevel. Small button on the advertiser profile so the editor
// can sync on demand without waiting for the next cron / webhook.
//
// Result toast is rendered inline below the button — green for success
// with synced count, amber-on-error with the underlying error message.
// Errors surfaced verbatim because they're almost always env-var or
// PIT-token issues that the editor needs to see and fix.

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'

interface Props {
  advertiserId: string
}

interface SyncResponse {
  ok:           boolean
  contactsSynced: number
  errors:       Array<{ contactId: string; email: string | null; error: string }>
}

export function GhlSyncButton({ advertiserId }: Props) {
  const [busy, setBusy]   = useState(false)
  const [last, setLast]   = useState<SyncResponse | null>(null)

  async function run() {
    if (busy) return
    setBusy(true)
    setLast(null)
    try {
      const res = await fetch(`/api/admin/advertisers/${advertiserId}/ghl-sync`, { method: 'POST' })
      const json = await res.json().catch(() => ({ ok: false, contactsSynced: 0, errors: [{ contactId: '', email: null, error: `HTTP ${res.status}` }] }))
      setLast(json as SyncResponse)
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40"
        title="Push every contact to GoHighLevel with role / tier / lifecycle tags"
      >
        {busy ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
        {busy ? 'Syncing…' : 'Sync to GHL'}
      </button>
      {last && last.ok && (
        <p className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1">
          <CheckCircle2 size={11} /> {last.contactsSynced} contact{last.contactsSynced === 1 ? '' : 's'} synced
        </p>
      )}
      {last && !last.ok && (
        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
          <p className="font-bold inline-flex items-center gap-1 mb-1">
            <AlertTriangle size={11} /> Sync had errors
          </p>
          <ul className="space-y-0.5 list-disc pl-4">
            {last.errors.slice(0, 3).map((e, i) => (
              <li key={i}>{e.email ?? '(no email)'} — {e.error}</li>
            ))}
            {last.errors.length > 3 && <li>…and {last.errors.length - 3} more</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
