'use client'

// DirectoryCleanupBanner — a one-shot cleanup tool surfaced on the
// Businesses list when the editor is viewing 'Directory only'. Click
// → preview cascade counts → confirm → delete. Listings get their
// advertiser_account_id nulled (NOT deleted) so the guide directory
// stays intact; only the dead CRM rows go away.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, AlertTriangle, Loader2, X, Trash2,
} from 'lucide-react'

interface Preview {
  totalDirectoryOnly: number
  eligible:           number
  skipped:            number
  listingsToUnlink:   number
}

export function DirectoryCleanupBanner({ directoryCount }: { directoryCount: number }) {
  const router = useRouter()
  const [busy, startTransition]   = useTransition()
  const [open, setOpen]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [committing, setCommitting] = useState(false)
  const [preview, setPreview]     = useState<Preview | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<{ deleted: number; unlinked: number } | null>(null)

  async function fetchPreview() {
    setOpen(true)
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/admin/advertisers/cleanup-directory-only', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ preview: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`)
        return
      }
      setPreview(json as Preview)
    } finally {
      setLoading(false)
    }
  }

  async function commit() {
    if (!preview || preview.eligible === 0) return
    setCommitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/advertisers/cleanup-directory-only', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ preview: false }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`)
        return
      }
      setSuccess({ deleted: json.deleted ?? 0, unlinked: json.listingsToUnlink ?? 0 })
      setPreview(null)
      startTransition(() => router.refresh())
    } finally {
      setCommitting(false)
    }
  }

  if (directoryCount === 0) return null

  return (
    <>
      <div className="bg-sky-50 border-b border-sky-200 px-6 py-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 text-sm text-sky-900">
          <Sparkles size={14} className="text-sky-600 shrink-0" />
          <span>
            <span className="font-bold">{directoryCount}</span> directory-only rows in the CRM.
            <span className="text-sky-700"> Clean them up — guide listings keep their data and stay live, only the orphan advertiser_accounts go away.</span>
          </span>
        </div>
        <button
          type="button"
          onClick={fetchPreview}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-sky-700 text-white rounded-full hover:bg-sky-800 whitespace-nowrap"
        >
          <Sparkles size={12} /> Preview cleanup
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={() => !committing && setOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-lg shadow-md w-full max-w-md p-5 my-12 space-y-4">
            <header className="flex items-center justify-between">
              <h3 className="text-base font-bold text-portal-text inline-flex items-center gap-2">
                <Sparkles size={16} className="text-sky-600" />
                Directory-only cleanup
              </h3>
              <button onClick={() => !committing && setOpen(false)} className="text-portal-muted hover:text-portal-text">
                <X size={14} />
              </button>
            </header>

            {loading && (
              <div className="text-sm text-portal-sub inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Counting…
              </div>
            )}

            {error && (
              <div className="bg-portal-red-lt border border-portal-red/30 rounded-lg p-3 text-sm text-portal-red inline-flex items-center gap-2">
                <AlertTriangle size={13} /> {error}
              </div>
            )}

            {success && (
              <div className="bg-portal-green-lt border border-emerald-200 rounded-lg p-3 text-sm text-portal-green space-y-1">
                <p className="font-bold">Cleanup complete.</p>
                <p>
                  Deleted <b>{success.deleted}</b> directory-only advertiser{success.deleted === 1 ? '' : 's'};
                  unlinked <b>{success.unlinked}</b> guide listing{success.unlinked === 1 ? '' : 's'} (listings stay
                  in their guide with their inline data intact).
                </p>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setSuccess(null) }}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-700 text-white rounded-full hover:bg-emerald-800"
                >
                  Done
                </button>
              </div>
            )}

            {preview && !success && (
              <>
                <p className="text-sm text-portal-text">
                  Found <b>{preview.totalDirectoryOnly}</b> directory-only advertiser row{preview.totalDirectoryOnly === 1 ? '' : 's'}.
                  Of those:
                </p>
                <div className="bg-portal-bg rounded-xl p-3 text-sm space-y-1">
                  <Line label="Eligible to delete"        value={preview.eligible}        emphasis />
                  <Line label="Skipped (has activity)"    value={preview.skipped}        />
                  <Line label="Guide listings to unlink"  value={preview.listingsToUnlink} />
                </div>

                {preview.skipped > 0 && (
                  <p className="text-[11px] text-portal-sub leading-snug">
                    Skipped rows have at least one ad placement, print booking, or proposal attached.
                    Those keep their <code className="px-1 bg-gray-100 rounded">kind</code> as
                    directory-only but get left alone — usually a sign migration 133 should have
                    promoted them. You can re-classify them manually if you want.
                  </p>
                )}

                <p className="text-[11px] text-portal-sub leading-snug">
                  What happens on commit: linked guide_listings get their{' '}
                  <code className="px-1 bg-gray-100 rounded">advertiser_account_id</code> set to NULL
                  (listing stays live with its inline data from migration 134), then the
                  directory-only advertiser_accounts rows are deleted.
                </p>

                <div className="flex items-center gap-2 pt-2 border-t border-portal-border">
                  <button
                    type="button"
                    onClick={commit}
                    disabled={committing || preview.eligible === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-rose-600 text-white rounded-full hover:bg-rose-700 disabled:opacity-40"
                  >
                    {committing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {committing ? 'Deleting…' : `Delete ${preview.eligible}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => !committing && setOpen(false)}
                    disabled={committing}
                    className="px-3 py-2 text-sm text-portal-sub hover:text-portal-text"
                  >
                    Cancel
                  </button>
                  {busy && <span className="text-xs text-portal-muted">Refreshing…</span>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Line({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${emphasis ? 'text-portal-text font-semibold' : value === 0 ? 'text-portal-muted' : 'text-portal-text'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
