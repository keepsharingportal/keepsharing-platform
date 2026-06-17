'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { CrudInput, CrudTextarea, CrudSelect, CrudActiveToggle, CrudDeleteButton, BRAND_OPTIONS } from '@/components/admin/BirthdayCrudHelpers'

interface Tip {
  id: string; brand_slug: string | null; tip: string; mom_name: string; topic: string | null; is_active: boolean
}

const TOPICS = [
  { value: '',          label: 'Any topic' },
  { value: 'budget',    label: 'Budget' },
  { value: 'venue',     label: 'Venue' },
  { value: 'guest-list', label: 'Guest list' },
  { value: 'food',      label: 'Food / cake' },
  { value: 'goody-bags', label: 'Goody bags' },
  { value: 'theme',     label: 'Theme' },
]

export function MomTipsClient({ initial }: { initial: Tip[] }) {
  const [rows, setRows] = useState<Tip[]>(initial)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ tip: '', mom_name: '', topic: '', brand_slug: '' })

  async function add() {
    if (!draft.tip.trim() || !draft.mom_name.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/birthday/mom-tips', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tip: draft.tip.trim(), mom_name: draft.mom_name.trim(), topic: draft.topic || null, brand_slug: draft.brand_slug || null }),
      })
      const j = await res.json()
      if (res.ok) {
        setRows([j as Tip, ...rows])
        setDraft({ tip: '', mom_name: '', topic: '', brand_slug: '' })
      }
    } finally { setBusy(false) }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/birthday/mom-tips/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) setRows(rs => rs.map(r => r.id === id ? { ...r, ...body } as Tip : r))
  }
  async function remove(id: string) {
    if (!confirm('Delete this tip?')) return
    const res = await fetch(`/api/admin/birthday/mom-tips/${id}`, { method: 'DELETE' })
    if (res.ok) setRows(rs => rs.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-portal-border rounded-lg p-4 space-y-3">
        <div className="text-[13px] font-bold text-portal-text">New tip</div>
        <CrudTextarea label="Tip *" hint="The quoted advice. Keep it under 200 chars." rows={3} value={draft.tip} onChange={e => setDraft(d => ({ ...d, tip: e.target.value }))} />
        <div className="grid sm:grid-cols-3 gap-2">
          <CrudInput label="Attribution *" hint="Sarah, Pike Road mom of 3" value={draft.mom_name} onChange={e => setDraft(d => ({ ...d, mom_name: e.target.value }))} />
          <CrudSelect label="Topic" value={draft.topic} onChange={e => setDraft(d => ({ ...d, topic: e.target.value }))} options={TOPICS} />
          <CrudSelect label="Brand scope" value={draft.brand_slug} onChange={e => setDraft(d => ({ ...d, brand_slug: e.target.value }))} options={BRAND_OPTIONS} />
        </div>
        <button type="button" onClick={add} disabled={busy || !draft.tip.trim() || !draft.mom_name.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
        </button>
      </div>

      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-portal-bg border-b border-portal-border">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Tip</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">From</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Topic</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-portal-sub">Defaults render until you add tips.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-b border-portal-border last:border-b-0 hover:bg-portal-bg">
                <td className="px-3 py-2 text-portal-text max-w-md">{r.tip}</td>
                <td className="px-3 py-2 text-portal-sub">{r.mom_name}</td>
                <td className="px-3 py-2 text-portal-sub text-[10px] uppercase">{r.topic ?? '—'}</td>
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
