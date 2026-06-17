'use client'

import { useState } from 'react'
import { Plus, Loader2, CheckCircle2 } from 'lucide-react'
import { CrudInput, CrudTextarea, CrudSelect, CrudActiveToggle, CrudDeleteButton, BRAND_OPTIONS } from '@/components/admin/BirthdayCrudHelpers'

interface Freebie {
  id:           string
  brand_slug:   string | null
  business:     string
  category:     string
  offer:        string
  details:      string | null
  website:      string | null
  age_limit:    number | null
  is_verified:  boolean
  verified_at:  string | null
  is_active:    boolean
}

const CATEGORIES = [
  { value: 'food',          label: 'Restaurant' },
  { value: 'dessert',       label: 'Dessert / treats' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'retail',        label: 'Store' },
  { value: 'other',         label: 'Other' },
]

export function FreebiesClient({ initial }: { initial: Freebie[] }) {
  const [rows, setRows] = useState<Freebie[]>(initial)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ business: '', category: 'food', offer: '', details: '', website: '', age_limit: '', brand_slug: '' })

  async function add() {
    if (!draft.business.trim() || !draft.offer.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/birthday/freebies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: draft.business.trim(), category: draft.category, offer: draft.offer.trim(),
          details: draft.details.trim() || null, website: draft.website.trim() || null,
          age_limit: draft.age_limit ? Number(draft.age_limit) : null,
          brand_slug: draft.brand_slug || null,
        }),
      })
      const j = await res.json()
      if (res.ok) {
        setRows([j as Freebie, ...rows])
        setDraft({ business: '', category: 'food', offer: '', details: '', website: '', age_limit: '', brand_slug: '' })
      }
    } finally { setBusy(false) }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/birthday/freebies/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) setRows(rs => rs.map(r => r.id === id ? { ...r, ...body } as Freebie : r))
  }
  async function remove(id: string) {
    if (!confirm('Delete this freebie?')) return
    const res = await fetch(`/api/admin/birthday/freebies/${id}`, { method: 'DELETE' })
    if (res.ok) setRows(rs => rs.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-portal-border rounded-lg p-4 space-y-3">
        <div className="text-[13px] font-bold text-portal-text">New freebie</div>
        <div className="grid sm:grid-cols-3 gap-2">
          <CrudInput label="Business *" value={draft.business} onChange={e => setDraft(d => ({ ...d, business: e.target.value }))} placeholder="Bruster's Ice Cream" />
          <CrudSelect label="Category" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} options={CATEGORIES} />
          <CrudSelect label="Brand scope" value={draft.brand_slug} onChange={e => setDraft(d => ({ ...d, brand_slug: e.target.value }))} options={BRAND_OPTIONS} />
        </div>
        <CrudTextarea label="Offer *" hint="Free baby cone for kids under 40 lbs" rows={2} value={draft.offer} onChange={e => setDraft(d => ({ ...d, offer: e.target.value }))} />
        <div className="grid sm:grid-cols-3 gap-2">
          <CrudInput label="Details / fine print" value={draft.details} onChange={e => setDraft(d => ({ ...d, details: e.target.value }))} placeholder="Show ID at register" />
          <CrudInput type="url" label="Website" value={draft.website} onChange={e => setDraft(d => ({ ...d, website: e.target.value }))} placeholder="brusters.com" />
          <CrudInput type="number" label="Age limit" value={draft.age_limit} onChange={e => setDraft(d => ({ ...d, age_limit: e.target.value }))} placeholder="12" />
        </div>
        <button type="button" onClick={add} disabled={busy || !draft.business.trim() || !draft.offer.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
        </button>
      </div>

      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-portal-bg border-b border-portal-border">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Business</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Offer</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Category</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Verified</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-portal-sub">No freebies yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-b border-portal-border last:border-b-0 hover:bg-portal-bg">
                <td className="px-3 py-2 text-portal-text font-bold">{r.business}</td>
                <td className="px-3 py-2 text-portal-sub max-w-md">{r.offer}</td>
                <td className="px-3 py-2 text-portal-sub text-[10px] uppercase">{r.category}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => patch(r.id, { is_verified: !r.is_verified, verified_at: !r.is_verified ? new Date().toISOString() : null })}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded ${r.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-portal-bg text-portal-sub'}`}>
                    {r.is_verified && <CheckCircle2 size={9} />} {r.is_verified ? 'verified' : 'unverified'}
                  </button>
                </td>
                <td className="px-3 py-2"><CrudActiveToggle active={r.is_active} onChange={() => patch(r.id, { is_active: !r.is_active })} /></td>
                <td className="px-3 py-2"><CrudDeleteButton onClick={() => remove(r.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
