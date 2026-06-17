'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { CrudInput, CrudTextarea, CrudSelect, CrudActiveToggle, CrudDeleteButton, BRAND_OPTIONS } from '@/components/admin/BirthdayCrudHelpers'

interface Theme {
  id:           string
  brand_slug:   string | null
  name:         string
  blurb:        string
  image_url:    string | null
  min_age:      number
  max_age:      number
  is_indoor:    boolean
  is_outdoor:   boolean
  budget_tier:  string | null
  display_order: number
  is_active:    boolean
}

export function ThemesClient({ initial }: { initial: Theme[] }) {
  const [rows, setRows] = useState<Theme[]>(initial)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ name: '', blurb: '', image_url: '', min_age: '3', max_age: '10', is_indoor: true, is_outdoor: true, brand_slug: '' })

  async function add() {
    if (!draft.name.trim() || !draft.blurb.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/birthday/themes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name.trim(), blurb: draft.blurb.trim(),
          image_url: draft.image_url.trim() || null,
          min_age: Number(draft.min_age), max_age: Number(draft.max_age),
          is_indoor: draft.is_indoor, is_outdoor: draft.is_outdoor,
          brand_slug: draft.brand_slug || null,
        }),
      })
      const j = await res.json()
      if (res.ok) {
        setRows([j as Theme, ...rows])
        setDraft({ name: '', blurb: '', image_url: '', min_age: '3', max_age: '10', is_indoor: true, is_outdoor: true, brand_slug: '' })
      }
    } finally { setBusy(false) }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/birthday/themes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) setRows(rs => rs.map(r => r.id === id ? { ...r, ...body } as Theme : r))
  }
  async function remove(id: string) {
    if (!confirm('Delete this theme?')) return
    const res = await fetch(`/api/admin/birthday/themes/${id}`, { method: 'DELETE' })
    if (res.ok) setRows(rs => rs.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-portal-border rounded-lg p-4 space-y-3">
        <div className="text-[13px] font-bold text-portal-text">New theme</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <CrudInput label="Name *" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Dinosaur Dig" />
          <CrudSelect label="Brand scope" value={draft.brand_slug} onChange={e => setDraft(d => ({ ...d, brand_slug: e.target.value }))} options={BRAND_OPTIONS} />
        </div>
        <CrudTextarea label="Blurb *" rows={2} value={draft.blurb} onChange={e => setDraft(d => ({ ...d, blurb: e.target.value }))} placeholder="Fossils, footprints, and roaring fun." />
        <CrudInput type="url" label="Image URL" value={draft.image_url} onChange={e => setDraft(d => ({ ...d, image_url: e.target.value }))} />
        <div className="grid sm:grid-cols-4 gap-2">
          <CrudInput type="number" label="Min age" value={draft.min_age} onChange={e => setDraft(d => ({ ...d, min_age: e.target.value }))} />
          <CrudInput type="number" label="Max age" value={draft.max_age} onChange={e => setDraft(d => ({ ...d, max_age: e.target.value }))} />
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={draft.is_indoor} onChange={e => setDraft(d => ({ ...d, is_indoor: e.target.checked }))} /> Indoor</label>
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={draft.is_outdoor} onChange={e => setDraft(d => ({ ...d, is_outdoor: e.target.checked }))} /> Outdoor</label>
        </div>
        <button type="button" onClick={add} disabled={busy || !draft.name.trim() || !draft.blurb.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add theme
        </button>
      </div>

      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-portal-bg border-b border-portal-border">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Name</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Ages</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Where</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-portal-sub">Defaults render until you customize.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-b border-portal-border last:border-b-0 hover:bg-portal-bg">
                <td className="px-3 py-2 text-portal-text font-bold">{r.name}</td>
                <td className="px-3 py-2 text-portal-sub">{r.min_age}–{r.max_age}</td>
                <td className="px-3 py-2 text-portal-sub">{[r.is_indoor && 'Indoor', r.is_outdoor && 'Outdoor'].filter(Boolean).join(' · ')}</td>
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
