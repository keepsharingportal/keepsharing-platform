'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, X, Loader2, Trash2, Phone, Mail as MailIcon } from 'lucide-react'

export interface LocationRequest {
  id:            string
  market:        string
  business_name: string
  address:       string | null
  contact_name:  string | null
  contact_phone: string | null
  contact_email: string | null
  publications:  string | null
  notes:         string | null
  status:        string  // pending | approved | rejected | added
  created_at:    string
  reviewed_at:   string | null
}

const STATUSES = ['pending', 'approved', 'added', 'rejected']

export function LocationRequestsEditor({ initial, activeStatus }: { initial: LocationRequest[]; activeStatus: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [rows, setRows] = useState<LocationRequest[]>(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [err,  setErr]  = useState<string | null>(null)

  function gotoStatus(s: string) {
    const q = new URLSearchParams(params)
    q.set('status', s)
    router.push(`/admin/circulation/requests?${q.toString()}`)
  }

  async function patch(id: string, action: 'approve' | 'reject' | 'added') {
    setBusy(`${id}-${action}`)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/location-requests', {
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

  async function del(id: string) {
    if (!confirm('Delete this request? Use this for spam.')) return
    setBusy(`${id}-del`)
    try {
      const res = await fetch(`/api/admin/circulation/location-requests?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
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
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-portal-sub mr-1">Status:</span>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => gotoStatus(s)}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border capitalize ${s === activeStatus ? 'bg-portal-navy text-white border-blue-600' : 'bg-white border-portal-border text-portal-text hover:border-portal-border-2'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {err && <p className="text-xs text-portal-red">{err}</p>}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-portal-border p-8 text-center bg-white">
          <p className="text-sm text-portal-sub">No {activeStatus} requests.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => (
            <li key={r.id} className="rounded-xl border border-portal-border bg-white p-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-portal-text">{r.business_name}</p>
                  {r.address && <p className="text-xs text-portal-sub mt-0.5">{r.address}</p>}
                  <p className="text-[11px] text-portal-sub mt-1">
                    Submitted {new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                  {(r.contact_name || r.contact_phone || r.contact_email) && (
                    <div className="mt-1.5 flex items-center gap-3 flex-wrap text-[11px] text-portal-text">
                      {r.contact_name  && <span className="font-semibold">{r.contact_name}</span>}
                      {r.contact_phone && <span className="inline-flex items-center gap-1"><Phone size={10} /> {r.contact_phone}</span>}
                      {r.contact_email && <span className="inline-flex items-center gap-1"><MailIcon size={10} /> {r.contact_email}</span>}
                    </div>
                  )}
                  {r.notes && <p className="text-[11px] text-portal-text mt-1 italic">📝 {r.notes}</p>}
                </div>

                {r.status === 'pending' && (
                  <div className="shrink-0 flex flex-col gap-1.5">
                    <button
                      onClick={() => patch(r.id, 'added')}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy === `${r.id}-added` ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Added to route
                    </button>
                    <button
                      onClick={() => patch(r.id, 'approve')}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-blue-200 text-portal-blue hover:bg-portal-blue-lt disabled:opacity-50"
                    >
                      {busy === `${r.id}-approve` ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Approve (later)
                    </button>
                    <button
                      onClick={() => patch(r.id, 'reject')}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-red-200 text-portal-red hover:bg-portal-red-lt disabled:opacity-50"
                    >
                      {busy === `${r.id}-reject` ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                      Reject
                    </button>
                    <button
                      onClick={() => del(r.id)}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-portal-muted hover:text-portal-red disabled:opacity-50"
                    >
                      {busy === `${r.id}-del` ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      Spam
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
