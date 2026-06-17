'use client'

import { useState } from 'react'
import { Plus, Loader2, Lock } from 'lucide-react'
import { CrudInput, CrudTextarea, CrudSelect, CrudActiveToggle, CrudDeleteButton, BRAND_OPTIONS } from '@/components/admin/BirthdayCrudHelpers'

interface Printable {
  id: string; brand_slug: string | null; name: string; category: string; description: string | null
  file_url: string; preview_url: string | null; is_premium: boolean; download_count: number
  display_order: number; is_active: boolean
}

const CATEGORIES = [
  { value: 'invitation', label: 'Invitation' },
  { value: 'thank-you',  label: 'Thank-you note' },
  { value: 'tag',        label: 'Tag' },
  { value: 'schedule',   label: 'Schedule' },
  { value: 'banner',     label: 'Banner' },
  { value: 'sign',       label: 'Sign' },
]

export function PrintablesClient({ initial }: { initial: Printable[] }) {
  const [rows, setRows] = useState<Printable[]>(initial)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ name: '', category: 'invitation', description: '', file_url: '', preview_url: '', is_premium: false, brand_slug: '' })

  async function add() {
    if (!draft.name.trim() || !draft.file_url.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/birthday/printables', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name.trim(), category: draft.category, description: draft.description.trim() || null,
          file_url: draft.file_url.trim(), preview_url: draft.preview_url.trim() || null,
          is_premium: draft.is_premium, brand_slug: draft.brand_slug || null,
        }),
      })
      const j = await res.json()
      if (res.ok) {
        setRows([j as Printable, ...rows])
        setDraft({ name: '', category: 'invitation', description: '', file_url: '', preview_url: '', is_premium: false, brand_slug: '' })
      }
    } finally { setBusy(false) }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/birthday/printables/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) setRows(rs => rs.map(r => r.id === id ? { ...r, ...body } as Printable : r))
  }
  async function remove(id: string) {
    if (!confirm('Delete this printable?')) return
    const res = await fetch(`/api/admin/birthday/printables/${id}`, { method: 'DELETE' })
    if (res.ok) setRows(rs => rs.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-portal-border rounded-lg p-4 space-y-3">
        <div className="text-[13px] font-bold text-portal-text">Add printable</div>
        <div className="grid sm:grid-cols-3 gap-2">
          <CrudInput label="Name *" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Super Hero Invites" />
          <CrudSelect label="Category" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} options={CATEGORIES} />
          <CrudSelect label="Brand scope" value={draft.brand_slug} onChange={e => setDraft(d => ({ ...d, brand_slug: e.target.value }))} options={BRAND_OPTIONS} />
        </div>
        <CrudTextarea label="Description" rows={2} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
        <div className="grid sm:grid-cols-2 gap-2">
          <CrudInput type="url" label="File URL *" hint="PDF or PNG asset" value={draft.file_url} onChange={e => setDraft(d => ({ ...d, file_url: e.target.value }))} />
          <CrudInput type="url" label="Preview thumbnail URL" value={draft.preview_url} onChange={e => setDraft(d => ({ ...d, preview_url: e.target.value }))} />
        </div>
        <label className="flex items-center gap-2 text-[12px]">
          <input type="checkbox" checked={draft.is_premium} onChange={e => setDraft(d => ({ ...d, is_premium: e.target.checked }))} />
          <Lock size={11} className="text-amber-500" /> Premium — require email capture before download
        </label>
        <button type="button" onClick={add} disabled={busy || !draft.name.trim() || !draft.file_url.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
        </button>
      </div>

      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-portal-bg border-b border-portal-border">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Name</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Category</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Premium</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Downloads</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-portal-sub">No printables yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-b border-portal-border last:border-b-0 hover:bg-portal-bg">
                <td className="px-3 py-2 text-portal-text font-bold">
                  <a href={r.file_url} target="_blank" rel="noopener" className="hover:text-portal-blue">{r.name}</a>
                </td>
                <td className="px-3 py-2 text-portal-sub text-[10px] uppercase">{r.category}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => patch(r.id, { is_premium: !r.is_premium })}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded ${r.is_premium ? 'bg-amber-100 text-amber-800' : 'bg-portal-bg text-portal-sub'}`}>
                    {r.is_premium && <Lock size={9} />} {r.is_premium ? 'premium' : 'free'}
                  </button>
                </td>
                <td className="px-3 py-2 text-portal-sub">{r.download_count}</td>
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
