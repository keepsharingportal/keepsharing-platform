'use client'

import { useState } from 'react'
import { Plus, Loader2, Trash2 } from 'lucide-react'
import { CrudInput, CrudTextarea, CrudSelect, CrudActiveToggle, CrudDeleteButton, BRAND_OPTIONS } from '@/components/admin/BirthdayCrudHelpers'

interface Pick { role: string; note: string }
interface Tier {
  id:           string
  brand_slug:   string | null
  tier_key:     string
  name:         string
  price_ceiling: number
  guest_count:  string
  pitch:        string
  picks:        Pick[]
  hero_image_url: string | null
  display_order: number
  is_active:    boolean
}

const TIER_KEYS = [
  { value: 'backyard',    label: 'Backyard ($150 range)' },
  { value: 'sweet-spot',  label: 'Sweet Spot ($400 range)' },
  { value: 'showstopper', label: 'Showstopper ($1000+ range)' },
]

export function BudgetTiersClient({ initial }: { initial: Tier[] }) {
  const [rows, setRows] = useState<Tier[]>(initial)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Tier | null>(null)
  const [draft, setDraft] = useState({
    brand_slug: '', tier_key: 'backyard', name: '', price_ceiling: '150', guest_count: '', pitch: '',
  })

  async function add() {
    if (!draft.name.trim() || !draft.guest_count.trim() || !draft.pitch.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/birthday/budget-tiers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier_key: draft.tier_key, name: draft.name.trim(),
          price_ceiling: Number(draft.price_ceiling), guest_count: draft.guest_count.trim(),
          pitch: draft.pitch.trim(), picks: [], brand_slug: draft.brand_slug || null,
        }),
      })
      const j = await res.json()
      if (res.ok) {
        setRows([j as Tier, ...rows])
        setDraft({ brand_slug: '', tier_key: 'backyard', name: '', price_ceiling: '150', guest_count: '', pitch: '' })
      }
    } finally { setBusy(false) }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/birthday/budget-tiers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) setRows(rs => rs.map(r => r.id === id ? { ...r, ...body } as Tier : r))
  }
  async function remove(id: string) {
    if (!confirm('Delete this tier?')) return
    const res = await fetch(`/api/admin/birthday/budget-tiers/${id}`, { method: 'DELETE' })
    if (res.ok) setRows(rs => rs.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-portal-border rounded-lg p-4 space-y-3">
        <div className="text-[13px] font-bold text-portal-text">New budget tier</div>
        <div className="grid sm:grid-cols-4 gap-2">
          <CrudSelect label="Tier key" value={draft.tier_key} onChange={e => setDraft(d => ({ ...d, tier_key: e.target.value }))} options={TIER_KEYS} />
          <CrudInput label="Display name" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="The Backyard Birthday" />
          <CrudInput type="number" label="Price ceiling ($)" value={draft.price_ceiling} onChange={e => setDraft(d => ({ ...d, price_ceiling: e.target.value }))} />
          <CrudSelect label="Brand" value={draft.brand_slug} onChange={e => setDraft(d => ({ ...d, brand_slug: e.target.value }))} options={BRAND_OPTIONS} />
        </div>
        <CrudInput label="Guest count" value={draft.guest_count} onChange={e => setDraft(d => ({ ...d, guest_count: e.target.value }))} placeholder="8-10 kids" />
        <CrudTextarea label="Pitch" rows={2} value={draft.pitch} onChange={e => setDraft(d => ({ ...d, pitch: e.target.value }))} placeholder="You + your backyard + a few smart picks. Stress-free, budget-light, surprisingly memorable." />
        <button type="button" onClick={add} disabled={busy || !draft.name.trim() || !draft.guest_count.trim() || !draft.pitch.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add tier
        </button>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="bg-white border border-portal-border rounded-lg p-6 text-center text-portal-sub text-[13px]">
            Defaults render until you add tiers.
          </div>
        )}
        {rows.map(r => (
          <div key={r.id} className="bg-white border border-portal-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-portal-sub">{r.tier_key} · ${r.price_ceiling} · {r.guest_count}</div>
                <h3 className="text-[15px] font-bold text-portal-text">{r.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <CrudActiveToggle active={r.is_active} onChange={() => patch(r.id, { is_active: !r.is_active })} />
                <button type="button" onClick={() => setEditing(r)} className="text-[11px] font-bold text-portal-blue hover:underline">Edit picks ({r.picks?.length ?? 0})</button>
                <CrudDeleteButton onClick={() => remove(r.id)} />
              </div>
            </div>
            <p className="text-[12px] text-portal-sub leading-relaxed">{r.pitch}</p>
            {r.picks && r.picks.length > 0 && (
              <div className="mt-2 grid sm:grid-cols-2 gap-1 text-[11px]">
                {r.picks.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-bold text-portal-text w-16 shrink-0">{p.role}</span>
                    <span className="text-portal-sub">{p.note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <PicksEditor tier={editing} onSave={picks => { patch(editing.id, { picks }); setEditing(null) }} onCancel={() => setEditing(null)} />
      )}
    </div>
  )
}

function PicksEditor({ tier, onSave, onCancel }: { tier: Tier; onSave: (picks: Pick[]) => void; onCancel: () => void }) {
  const [picks, setPicks] = useState<Pick[]>(tier.picks ?? [])

  function update(i: number, field: 'role' | 'note', value: string) {
    setPicks(ps => ps.map((p, j) => j === i ? { ...p, [field]: value } : p))
  }
  function add() {
    setPicks(ps => [...ps, { role: '', note: '' }])
  }
  function removePick(i: number) {
    setPicks(ps => ps.filter((_, j) => j !== i))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-portal-border">
          <h2 className="text-[16px] font-bold text-portal-text">Edit picks — {tier.name}</h2>
          <p className="text-[11px] text-portal-sub">One pick per role (Venue / Cake / Decor / etc).</p>
        </div>
        <div className="p-5 space-y-2">
          {picks.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <input type="text" placeholder="Role (Venue)" value={p.role} onChange={e => update(i, 'role', e.target.value)}
                className="w-32 px-2 py-1.5 text-[12px] border border-portal-border-2 rounded shrink-0" />
              <input type="text" placeholder="Note (Brendle for tables, Cakeology for cake)" value={p.note} onChange={e => update(i, 'note', e.target.value)}
                className="flex-1 px-2 py-1.5 text-[12px] border border-portal-border-2 rounded" />
              <button type="button" onClick={() => removePick(i)} className="text-portal-red hover:text-portal-text"><Trash2 size={12} /></button>
            </div>
          ))}
          <button type="button" onClick={add} className="text-[11px] font-bold text-portal-blue inline-flex items-center gap-0.5"><Plus size={11} />Add pick</button>
        </div>
        <div className="px-5 py-3 border-t border-portal-border flex items-center gap-2 justify-end">
          <button type="button" onClick={onCancel} className="text-[12px] font-bold text-portal-sub">Cancel</button>
          <button type="button" onClick={() => onSave(picks.filter(p => p.role.trim() && p.note.trim()))}
            className="px-4 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90">Save picks</button>
        </div>
      </div>
    </div>
  )
}
