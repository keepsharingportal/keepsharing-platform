'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { CrudInput, CrudTextarea, CrudSelect, CrudActiveToggle, CrudDeleteButton, BRAND_OPTIONS } from '@/components/admin/BirthdayCrudHelpers'

interface Buzz {
  id:            string
  brand_slug:    string
  kind:          string
  body:          string
  from_name:     string | null
  image_url:     string | null
  vendor_id:     string | null
  vendor_name:   string | null
  link_url:      string | null
  posted_at:     string
  expires_at:    string | null
  is_active:     boolean
}

interface Vendor { id: string; slug: string; business_name: string }

const KIND_OPTIONS = [
  { value: 'vendor_spotlight', label: 'Vendor spotlight → Featured Pros section' },
  { value: 'milestone',        label: 'Kid birthday celebration → Buzz' },
  { value: 'shoutout',         label: 'Mom party story (win or honest fail) → Buzz' },
  { value: 'tip',              label: 'Mom-to-mom tip → Buzz' },
  { value: 'editor_pick',      label: 'Editor pick / "we spotted this" → Buzz' },
]

// Maps kind → which public section it appears in. Used by the filter chips
// and the "where this will appear" hint under the form.
const KIND_SURFACE: Record<string, 'Featured Pros' | 'Buzz'> = {
  vendor_spotlight: 'Featured Pros',
  milestone:        'Buzz',
  shoutout:         'Buzz',
  tip:              'Buzz',
  editor_pick:      'Buzz',
}

export function BuzzClient({ initial, vendors }: { initial: Buzz[]; vendors: Vendor[] }) {
  const [rows, setRows] = useState<Buzz[]>(initial)
  const [busy, setBusy] = useState(false)
  const [surfaceFilter, setSurfaceFilter] = useState<'all' | 'Featured Pros' | 'Buzz'>('all')
  const [draft, setDraft] = useState({
    brand_slug:  'rrp',
    kind:        'vendor_spotlight',
    body:        '',
    from_name:   '',
    image_url:   '',
    vendor_id:   '',
    vendor_name: '',
    link_url:    '',
    expires_at:  '',
  })

  async function add() {
    if (!draft.body.trim()) return
    setBusy(true)
    try {
      const vendor_name = draft.vendor_id ? vendors.find(v => v.id === draft.vendor_id)?.business_name ?? null : draft.vendor_name.trim() || null
      const res = await fetch('/api/admin/birthday/buzz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_slug:  draft.brand_slug || 'rrp',
          kind:        draft.kind,
          body:        draft.body.trim(),
          from_name:   draft.from_name.trim() || null,
          image_url:   draft.image_url.trim() || null,
          vendor_id:   draft.vendor_id || null,
          vendor_name,
          link_url:    draft.link_url.trim() || null,
          expires_at:  draft.expires_at || null,
        }),
      })
      const j = await res.json()
      if (res.ok) {
        setRows([j as Buzz, ...rows])
        setDraft({ brand_slug: 'rrp', kind: 'vendor_spotlight', body: '', from_name: '', image_url: '', vendor_id: '', vendor_name: '', link_url: '', expires_at: '' })
      }
    } finally { setBusy(false) }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/birthday/buzz/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) setRows(rs => rs.map(r => r.id === id ? { ...r, is_active: !current } : r))
  }
  async function remove(id: string) {
    if (!confirm('Delete this buzz entry?')) return
    const res = await fetch(`/api/admin/birthday/buzz/${id}`, { method: 'DELETE' })
    if (res.ok) setRows(rs => rs.filter(r => r.id !== id))
  }

  const visibleRows = surfaceFilter === 'all'
    ? rows
    : rows.filter(r => KIND_SURFACE[r.kind] === surfaceFilter)
  const featuredProsCount = rows.filter(r => KIND_SURFACE[r.kind] === 'Featured Pros').length
  const communityCount    = rows.filter(r => KIND_SURFACE[r.kind] === 'Buzz').length

  return (
    <div className="space-y-4">
      {/* Where-it-goes guide. Without this the kind dropdown is mysterious. */}
      <div className="bg-portal-blue-lt rounded-lg p-3 text-[11px] text-portal-text leading-relaxed">
        <strong className="text-portal-text">Two public sections feed from this table:</strong>
        <ul className="mt-1 space-y-0.5">
          <li>
            <span className="font-bold text-[#ff7a59]">Featured Birthday Pros</span> (paid editorial spotlights — magazine
            hero + 4 supporting layout). Picks up entries where Kind = <code>vendor_spotlight</code>. Top 5 by posted date win the slots; #1 becomes the Editor&apos;s Pick hero.
          </li>
          <li>
            <span className="font-bold text-portal-sub">Birthday Buzz</span> (community chatter — no paid placements).
            Picks up every other kind: kid celebrations (<code>milestone</code>), mom party stories (<code>shoutout</code>), mom-to-mom tips (<code>tip</code>), editor picks (<code>editor_pick</code>).
          </li>
        </ul>
      </div>

      {/* Surface filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { v: 'all',           l: `All (${rows.length})` },
          { v: 'Featured Pros', l: `Featured Pros (${featuredProsCount})` },
          { v: 'Buzz',          l: `Community Buzz (${communityCount})` },
        ] as const).map(opt => (
          <button key={opt.v} type="button" onClick={() => setSurfaceFilter(opt.v as typeof surfaceFilter)}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase rounded-full border ${
              surfaceFilter === opt.v ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-sub border-portal-border'
            }`}
          >{opt.l}</button>
        ))}
      </div>

      <div className="bg-white border border-portal-border rounded-lg p-4 space-y-3">
        <div className="text-[13px] font-bold text-portal-text">New entry</div>
        {draft.kind && (
          <div className="text-[11px] text-portal-sub">
            Will appear in: <strong className="text-portal-text">{KIND_SURFACE[draft.kind] ?? '—'}</strong>
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-2">
          <CrudSelect label="Kind" value={draft.kind} onChange={e => setDraft(d => ({ ...d, kind: e.target.value }))} options={KIND_OPTIONS} />
          <CrudSelect label="Vendor (for vendor_spotlight)" hint="Links the slide to the business profile page."
            value={draft.vendor_id} onChange={e => setDraft(d => ({ ...d, vendor_id: e.target.value }))}
            options={[{ value: '', label: '— None —' }, ...vendors.map(v => ({ value: v.id, label: v.business_name }))]} />
          <CrudSelect label="Brand" value={draft.brand_slug} onChange={e => setDraft(d => ({ ...d, brand_slug: e.target.value }))} options={BRAND_OPTIONS.filter(b => b.value)} />
        </div>
        <CrudTextarea label="Body *" hint="2-3 sentences. First sentence becomes the headline; rest is the pitch."
          rows={3} value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
          placeholder="Custom Cakes by Sarah turns 5! Award-winning custom cakes for the most important birthdays in the River Region." />
        <div className="grid sm:grid-cols-3 gap-2">
          <CrudInput type="url" label="Image URL *" hint="Wide image works best (~3:2)."
            value={draft.image_url} onChange={e => setDraft(d => ({ ...d, image_url: e.target.value }))} placeholder="https://…" />
          <CrudInput type="text" label="Attribution (optional)" hint="Shown as 'From Sarah, Pike Road'"
            value={draft.from_name} onChange={e => setDraft(d => ({ ...d, from_name: e.target.value }))} />
          <CrudInput type="url" label="External link (if no vendor picked)"
            value={draft.link_url} onChange={e => setDraft(d => ({ ...d, link_url: e.target.value }))} placeholder="https://…" />
        </div>
        <CrudInput type="date" label="Expires (optional)" hint="Falls off the carousel automatically after this date."
          value={draft.expires_at} onChange={e => setDraft(d => ({ ...d, expires_at: e.target.value }))} />
        <button type="button" onClick={add} disabled={busy || !draft.body.trim() || !draft.image_url.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add to Buzz
        </button>
      </div>

      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-portal-bg border-b border-portal-border">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub w-20">Image</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Body</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Vendor / kind</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Posted</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-portal-sub">{surfaceFilter === 'all' ? 'Nothing buzzing yet.' : `Nothing in ${surfaceFilter} yet.`}</td></tr>}
            {visibleRows.map(r => (
              <tr key={r.id} className="border-b border-portal-border last:border-b-0 hover:bg-portal-bg">
                <td className="px-3 py-2">
                  {r.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt="" className="w-16 h-12 object-cover rounded bg-portal-bg" />
                  )}
                </td>
                <td className="px-3 py-2 text-portal-text max-w-md">{r.body}</td>
                <td className="px-3 py-2 text-portal-sub">
                  <div className="font-bold text-portal-text">{r.vendor_name ?? '—'}</div>
                  <div className="text-[10px] uppercase text-portal-sub">{r.kind}</div>
                </td>
                <td className="px-3 py-2 text-portal-sub text-[11px]">{new Date(r.posted_at).toLocaleDateString()}</td>
                <td className="px-3 py-2"><CrudActiveToggle active={r.is_active} onChange={() => toggleActive(r.id, r.is_active)} /></td>
                <td className="px-3 py-2"><CrudDeleteButton onClick={() => remove(r.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
