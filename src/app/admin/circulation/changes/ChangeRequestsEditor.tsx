'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, X, Loader2, AlertTriangle, MapPin } from 'lucide-react'

export interface ChangeRequest {
  id:                   string
  market:               string
  type:                 string  // edit | close | new | qty | move
  field_name:           string | null
  old_value:            string | null
  new_value:            string | null
  notes:                string | null
  status:               string
  created_at:           string
  reviewed_at:          string | null
  stop_id:              string | null
  route_id:             string
  driver_id:            string
  circulation_stops?:   { name: string; address: string | null; city: string | null } | null
  circulation_routes?:  { name: string } | null
  circulation_drivers?: { full_name: string; email: string } | null
}

const TYPE_LABEL: Record<string, string> = {
  edit:  'Edit',
  close: 'Close stop',
  new:   'New stop',
  qty:   'Wrong qty',
  move:  'Move stop',
}
const TYPE_BADGE: Record<string, string> = {
  edit:  'bg-portal-blue-lt text-portal-blue',
  close: 'bg-portal-red-lt text-portal-red',
  new:   'bg-portal-blue-lt text-portal-blue',
  qty:   'bg-portal-amber-lt text-portal-amber',
  move:  'bg-portal-blue-lt text-portal-blue',
}

const STATUSES = ['pending', 'approved', 'rejected']

export function ChangeRequestsEditor({ initial, activeStatus }: { initial: ChangeRequest[]; activeStatus: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [rows,  setRows]  = useState<ChangeRequest[]>(initial)
  const [busy,  setBusy]  = useState<string | null>(null)
  const [err,   setErr]   = useState<string | null>(null)

  function gotoStatus(s: string) {
    const q = new URLSearchParams(params)
    q.set('status', s)
    router.push(`/admin/circulation/changes?${q.toString()}`)
  }

  async function patch(id: string, action: 'approve' | 'reject' | 'apply') {
    setBusy(`${id}-${action}`)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/change-requests', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, action }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? 'Action failed')
      }
      setRows(prev => prev.filter(r => r.id !== id))
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-portal-sub mr-1">Status:</span>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => gotoStatus(s)}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border capitalize ${s === activeStatus ? 'bg-portal-navy text-white border-portal-blue' : 'bg-white border-portal-border text-portal-text hover:border-portal-border-2'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {err && <p className="text-xs text-portal-red">{err}</p>}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-portal-border p-8 text-center bg-white">
          <p className="text-sm text-portal-sub">No {activeStatus} change requests.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => (
            <li key={r.id} className="rounded-lg border border-portal-border bg-white p-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block rounded-full text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${TYPE_BADGE[r.type] ?? 'bg-portal-row-hover text-portal-text'}`}>
                      {TYPE_LABEL[r.type] ?? r.type}
                    </span>
                    <p className="text-sm font-bold text-portal-text truncate">{r.circulation_stops?.name ?? 'New / unknown stop'}</p>
                  </div>
                  <p className="text-[11px] text-portal-sub mt-0.5 truncate">
                    <MapPin size={9} className="inline mb-0.5 mr-0.5" />
                    {r.circulation_routes?.name ?? '(route)'}
                    {r.circulation_stops?.address && <> · {r.circulation_stops.address}</>}
                  </p>
                  <p className="text-[11px] text-portal-text mt-1">
                    From <span className="font-semibold">{r.circulation_drivers?.full_name ?? '(driver)'}</span>
                    {' '} · {new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                  {r.field_name && (
                    <p className="text-[11px] text-portal-text mt-1">
                      <span className="text-portal-sub">Field:</span> <span className="font-semibold">{r.field_name}</span>
                      {r.new_value && <> · <span className="text-portal-sub">Wants:</span> <span className="font-semibold">{r.new_value}</span></>}
                    </p>
                  )}
                  {r.notes && (
                    <p className="text-[11px] text-portal-text mt-1 italic">📝 {r.notes}</p>
                  )}
                </div>

                {r.status === 'pending' && (
                  <div className="shrink-0 flex flex-col gap-1.5">
                    {(r.type === 'edit' || r.type === 'qty' || r.type === 'close') && r.stop_id && (
                      <button
                        onClick={() => patch(r.id, 'apply')}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-portal-green text-white hover:bg-portal-green disabled:opacity-50"
                      >
                        {busy === `${r.id}-apply` ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        Apply
                      </button>
                    )}
                    <button
                      onClick={() => patch(r.id, 'approve')}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-portal-green/30 text-portal-green hover:bg-portal-green-lt disabled:opacity-50"
                    >
                      {busy === `${r.id}-approve` ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Approve only
                    </button>
                    <button
                      onClick={() => patch(r.id, 'reject')}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-portal-red/30 text-portal-red hover:bg-portal-red-lt disabled:opacity-50"
                    >
                      {busy === `${r.id}-reject` ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {r.status !== 'pending' && r.type === 'new' && (
                <p className="mt-2 pt-2 border-t border-portal-border text-[11px] text-portal-sub inline-flex items-center gap-1">
                  <AlertTriangle size={11} /> &ldquo;New stop&rdquo; requests need to be created manually in Routes.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
