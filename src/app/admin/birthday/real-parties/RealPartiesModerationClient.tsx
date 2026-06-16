'use client'

import { useState } from 'react'
import { Check, X, Trash2, Clock, Loader2 } from 'lucide-react'

interface Party {
  id:              string
  submitter_name:  string | null
  submitter_email: string | null
  child_name:      string | null
  child_age:       number | null
  party_theme:     string | null
  venue:           string | null
  vendor_credits:  string[] | null
  caption:         string
  photo_url:       string
  party_month:     number | null
  party_year:      number | null
  status:          'pending' | 'approved' | 'rejected'
  created_at:      string
  approved_at:     string | null
}

const FILTERS = ['pending', 'approved', 'rejected'] as const

export function RealPartiesModerationClient({ initial }: { initial: Party[] }) {
  const [rows,   setRows]   = useState<Party[]>(initial)
  const [filter, setFilter] = useState<typeof FILTERS[number]>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function mutate(id: string, status: 'approved' | 'rejected') {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/birthday/real-parties/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      })
      if (res.ok) setRows(rs => rs.map(r => r.id === id ? { ...r, status, approved_at: status === 'approved' ? new Date().toISOString() : null } : r))
    } finally { setBusyId(null) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this submission permanently?')) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/birthday/real-parties/${id}`, { method: 'DELETE' })
      if (res.ok) setRows(rs => rs.filter(r => r.id !== id))
    } finally { setBusyId(null) }
  }

  const visible = rows.filter(r => r.status === filter)
  const counts  = { pending: rows.filter(r => r.status === 'pending').length, approved: rows.filter(r => r.status === 'approved').length, rejected: rows.filter(r => r.status === 'rejected').length }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f} type="button" onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[12px] font-bold uppercase rounded-full border ${
              filter === f ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-sub border-portal-border'
            }`}
          >{f} ({counts[f]})</button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="bg-white border border-portal-border rounded-lg p-6 text-center text-portal-sub text-[13px]">
          Nothing in <strong>{filter}</strong> right now.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {visible.map(p => (
          <div key={p.id} className="bg-white border border-portal-border rounded-lg overflow-hidden">
            {p.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo_url} alt={p.party_theme ?? ''} className="w-full aspect-square object-cover bg-portal-bg" />
            )}
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub bg-portal-bg px-1.5 py-0.5 rounded">{p.party_theme ?? '(no theme)'}</span>
                {p.status === 'pending' && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-portal-amber"><Clock size={9} /> pending</span>}
              </div>
              <div className="text-[13px] font-bold text-portal-text">
                {p.child_name ?? 'Unnamed kid'}{p.child_age ? `, age ${p.child_age}` : ''} — {p.venue ?? '(no venue)'}
              </div>
              <p className="text-[12px] text-portal-sub leading-relaxed">{p.caption}</p>
              {p.vendor_credits && p.vendor_credits.length > 0 && (
                <div className="text-[11px] text-portal-muted">Vendors: {p.vendor_credits.join(', ')}</div>
              )}
              <div className="text-[10px] text-portal-muted pt-2 border-t border-portal-border">
                Submitted by {p.submitter_name ?? 'anonymous'} ({p.submitter_email ?? 'no email'}) · {new Date(p.created_at).toLocaleString()}
              </div>
              <div className="flex gap-1.5 pt-1">
                {p.status !== 'approved' && (
                  <button type="button" onClick={() => mutate(p.id, 'approved')} disabled={busyId === p.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-green rounded hover:opacity-90 disabled:opacity-50">
                    {busyId === p.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Approve
                  </button>
                )}
                {p.status !== 'rejected' && (
                  <button type="button" onClick={() => mutate(p.id, 'rejected')} disabled={busyId === p.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-portal-red bg-white border border-portal-red rounded hover:bg-portal-red-lt disabled:opacity-50">
                    <X size={11} /> Reject
                  </button>
                )}
                <button type="button" onClick={() => remove(p.id)} disabled={busyId === p.id}
                  className="inline-flex items-center justify-center w-9 h-9 text-[12px] text-portal-sub bg-white border border-portal-border rounded hover:bg-portal-bg disabled:opacity-50">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
