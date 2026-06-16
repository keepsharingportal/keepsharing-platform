'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'

interface VideoRow {
  id:          string
  brand_slug:  string | null
  title:       string
  description: string | null
  video_url:   string
  thumbnail:   string | null
  category:    string | null
  is_active:   boolean
  times_used:  number
}

const BRANDS = ['', 'rrp', 'rr50plus', 'aop', 'mbp', 'esp', 'gpp']
const CATS   = ['', 'recipe', 'tutorial', 'tip', 'inspiration', 'kids', 'parent', 'event']

export function CuratedVideosClient({ initial }: { initial: VideoRow[] }) {
  const [rows, setRows] = useState<VideoRow[]>(initial)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ title: '', description: '', video_url: '', thumbnail: '', brand_slug: '', category: '' })

  async function add() {
    if (!draft.title.trim() || !draft.video_url.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/social/pool/videos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       draft.title.trim(),
          description: draft.description.trim() || null,
          video_url:   draft.video_url.trim(),
          thumbnail:   draft.thumbnail.trim() || null,
          brand_slug:  draft.brand_slug || null,
          category:    draft.category || null,
        }),
      })
      const j = await res.json()
      if (res.ok) {
        setRows([j as VideoRow, ...rows])
        setDraft({ title: '', description: '', video_url: '', thumbnail: '', brand_slug: '', category: '' })
      }
    } finally { setBusy(false) }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/social/pool/videos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) setRows(rs => rs.map(r => r.id === id ? { ...r, is_active: !current } : r))
  }
  async function remove(id: string) {
    if (!confirm('Delete this video?')) return
    const res = await fetch(`/api/admin/social/pool/videos/${id}`, { method: 'DELETE' })
    if (res.ok) setRows(rs => rs.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-portal-border rounded-lg p-4 space-y-2">
        <div className="text-[13px] font-bold text-portal-text">Add a video</div>
        <input type="text" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
          placeholder="Title" className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white" />
        <textarea rows={2} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
          placeholder="Short description (the strategist uses this to write the caption)"
          className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white resize-vertical" />
        <input type="url" value={draft.video_url} onChange={e => setDraft(d => ({ ...d, video_url: e.target.value }))}
          placeholder="YouTube / Vimeo URL" className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white" />
        <div className="grid sm:grid-cols-3 gap-2">
          <input type="url" value={draft.thumbnail} onChange={e => setDraft(d => ({ ...d, thumbnail: e.target.value }))}
            placeholder="Thumbnail URL (optional)" className="px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white" />
          <select value={draft.brand_slug} onChange={e => setDraft(d => ({ ...d, brand_slug: e.target.value }))}
            className="px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white"
          ><option value="">All brands</option>{BRANDS.slice(1).map(b => <option key={b} value={b}>{b}</option>)}</select>
          <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
            className="px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white"
          ><option value="">No category</option>{CATS.slice(1).map(c => <option key={c} value={c}>{c}</option>)}</select>
        </div>
        <button type="button" onClick={add} disabled={busy || !draft.title.trim() || !draft.video_url.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
        </button>
      </div>
      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-portal-bg border-b border-portal-border">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Title</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Category</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Brand</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Used</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-portal-sub">No videos yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-b border-portal-border last:border-b-0 hover:bg-portal-bg">
                <td className="px-3 py-2 text-portal-text"><a href={r.video_url} target="_blank" rel="noopener" className="hover:underline">{r.title}</a></td>
                <td className="px-3 py-2 text-portal-sub">{r.category ?? '—'}</td>
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
