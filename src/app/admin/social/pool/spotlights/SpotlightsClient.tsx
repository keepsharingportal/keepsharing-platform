'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'

interface SpotlightRow {
  id:            string
  brand_slug:    string | null
  spotlight_type: string
  name:          string
  blurb:         string
  image_url:     string | null
  link_url:      string | null
  tone_hint:     string | null
  is_active:     boolean
  times_used:    number
}

const TYPES  = ['business', 'person', 'student', 'volunteer', 'school', 'event']
const BRANDS = ['', 'rrp', 'rr50plus', 'aop', 'mbp', 'esp', 'gpp']
const TONES  = ['', 'tender', 'celebratory', 'inspiring', 'supportive', 'practical']

export function SpotlightsClient({ initial }: { initial: SpotlightRow[] }) {
  const [rows, setRows] = useState<SpotlightRow[]>(initial)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ spotlight_type: 'person', name: '', blurb: '', image_url: '', link_url: '', brand_slug: '', tone_hint: '' })

  async function add() {
    if (!draft.name.trim() || !draft.blurb.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/social/pool/spotlights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotlight_type: draft.spotlight_type,
          name:           draft.name.trim(),
          blurb:          draft.blurb.trim(),
          image_url:      draft.image_url.trim() || null,
          link_url:       draft.link_url.trim()  || null,
          brand_slug:     draft.brand_slug || null,
          tone_hint:      draft.tone_hint || null,
        }),
      })
      const j = await res.json()
      if (res.ok) {
        setRows([j as SpotlightRow, ...rows])
        setDraft({ spotlight_type: 'person', name: '', blurb: '', image_url: '', link_url: '', brand_slug: '', tone_hint: '' })
      }
    } finally { setBusy(false) }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/social/pool/spotlights/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) setRows(rs => rs.map(r => r.id === id ? { ...r, is_active: !current } : r))
  }
  async function remove(id: string) {
    if (!confirm('Delete this spotlight?')) return
    const res = await fetch(`/api/admin/social/pool/spotlights/${id}`, { method: 'DELETE' })
    if (res.ok) setRows(rs => rs.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-portal-border rounded-lg p-4 space-y-2">
        <div className="text-[13px] font-bold text-portal-text">Add a spotlight</div>
        <div className="grid sm:grid-cols-3 gap-2">
          <select value={draft.spotlight_type} onChange={e => setDraft(d => ({ ...d, spotlight_type: e.target.value }))}
            className="px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white"
          >{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <select value={draft.brand_slug} onChange={e => setDraft(d => ({ ...d, brand_slug: e.target.value }))}
            className="px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white"
          ><option value="">All brands</option>{BRANDS.slice(1).map(b => <option key={b} value={b}>{b}</option>)}</select>
          <select value={draft.tone_hint} onChange={e => setDraft(d => ({ ...d, tone_hint: e.target.value }))}
            className="px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white"
          ><option value="">Auto-tone</option>{TONES.slice(1).map(t => <option key={t} value={t}>{t}</option>)}</select>
        </div>
        <input type="text" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          placeholder="Name" className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white" />
        <textarea rows={3} value={draft.blurb} onChange={e => setDraft(d => ({ ...d, blurb: e.target.value }))}
          placeholder="2-3 sentence blurb the strategist uses to seed the caption"
          className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white resize-vertical" />
        <div className="grid sm:grid-cols-2 gap-2">
          <input type="url" value={draft.image_url} onChange={e => setDraft(d => ({ ...d, image_url: e.target.value }))}
            placeholder="Image URL" className="px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white" />
          <input type="url" value={draft.link_url} onChange={e => setDraft(d => ({ ...d, link_url: e.target.value }))}
            placeholder="Link URL (optional)" className="px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white" />
        </div>
        <button type="button" onClick={add} disabled={busy || !draft.name.trim() || !draft.blurb.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
        </button>
      </div>
      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-portal-bg border-b border-portal-border">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Type</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Name</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Blurb</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Brand</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Used</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-portal-sub">No spotlights yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-b border-portal-border last:border-b-0 hover:bg-portal-bg">
                <td className="px-3 py-2 text-portal-sub uppercase font-bold text-[10px]">{r.spotlight_type}</td>
                <td className="px-3 py-2 text-portal-text font-bold">{r.name}</td>
                <td className="px-3 py-2 text-portal-sub max-w-md truncate">{r.blurb}</td>
                <td className="px-3 py-2 text-portal-sub">{r.brand_slug ?? 'all'}</td>
                <td className="px-3 py-2 text-portal-sub">{r.times_used}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => toggleActive(r.id, r.is_active)}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${r.is_active ? 'bg-portal-green-lt text-portal-green' : 'bg-portal-bg text-portal-sub'}`}
                  >{r.is_active ? 'active' : 'paused'}</button>
                </td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => remove(r.id)} className="text-portal-red hover:text-portal-text"><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
