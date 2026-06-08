'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, X, Check, Trash2, Loader2 } from 'lucide-react'

export interface Resource {
  id:          string
  market:      string
  name:        string
  category:    string | null
  description: string | null
  address:     string | null
  city:        string | null
  phone:       string | null
  website:     string | null
  email:       string | null
  lat:         number | null
  lng:         number | null
  logo_url:    string | null
  photo_url:   string | null
  active:      boolean
  sort_order:  number
}

const CATEGORIES = ['Health', 'Education', 'Family', 'Community', 'Recreation', 'Government', 'Other']

export function ResourcesEditor({ market, initial }: { market: string; initial: Resource[] }) {
  const router = useRouter()
  const [rows, setRows] = useState<Resource[]>(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  function patchLocal(id: string, fields: Partial<Resource>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r))
  }

  async function save(r: Resource) {
    setBusy(r.id)
    try {
      const res = await fetch('/api/admin/circulation/resources', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id: r.id, name: r.name, category: r.category, description: r.description,
          address: r.address, city: r.city, phone: r.phone, website: r.website,
          email: r.email, lat: r.lat, lng: r.lng, active: r.active, sort_order: r.sort_order,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        alert(j.error ?? 'Save failed')
      } else {
        setEditing(null)
        router.refresh()
      }
    } finally { setBusy(null) }
  }

  async function del(r: Resource) {
    if (!confirm(`Delete ${r.name}?`)) return
    setBusy(r.id)
    try {
      const res = await fetch(`/api/admin/circulation/resources?id=${encodeURIComponent(r.id)}`, { method: 'DELETE' })
      if (!res.ok) alert('Delete failed')
      else {
        setRows(prev => prev.filter(x => x.id !== r.id))
        router.refresh()
      }
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-3">
      {!adding ? (
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90">
          <Plus size={12} /> Add resource
        </button>
      ) : (
        <AddResource market={market} onCreated={r => { setRows(prev => [...prev, r]); setAdding(false); router.refresh() }} onCancel={() => setAdding(false)} />
      )}

      <ul className="space-y-2">
        {rows.length === 0 && !adding && (
          <li className="text-xs text-gray-500 italic p-3 bg-white rounded-xl border border-dashed border-gray-200">
            No resources yet.
          </li>
        )}
        {rows.map(r => (
          <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-3">
            {editing === r.id ? (
              <div className="space-y-2">
                <Field label="Name" value={r.name} onChange={v => patchLocal(r.id, { name: v })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FieldSelect label="Category" value={r.category ?? ''} options={['', ...CATEGORIES]} onChange={v => patchLocal(r.id, { category: v || null })} />
                  <FieldNum label="Sort order" value={r.sort_order} onChange={v => patchLocal(r.id, { sort_order: v })} />
                </div>
                <Field label="Description" value={r.description ?? ''} onChange={v => patchLocal(r.id, { description: v || null })} />
                <Field label="Address" value={r.address ?? ''} onChange={v => patchLocal(r.id, { address: v || null })} />
                <div className="grid grid-cols-3 gap-2">
                  <Field label="City"  value={r.city ?? ''}  onChange={v => patchLocal(r.id, { city: v || null })} />
                  <FieldNum label="Lat" value={r.lat ?? 0}   onChange={v => patchLocal(r.id, { lat: v || null })} />
                  <FieldNum label="Lng" value={r.lng ?? 0}   onChange={v => patchLocal(r.id, { lng: v || null })} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Phone"   value={r.phone ?? ''}   onChange={v => patchLocal(r.id, { phone:   v || null })} />
                  <Field label="Email"   value={r.email ?? ''}   onChange={v => patchLocal(r.id, { email:   v || null })} />
                  <Field label="Website" value={r.website ?? ''} onChange={v => patchLocal(r.id, { website: v || null })} />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-gray-700">
                  <input type="checkbox" checked={r.active} onChange={e => patchLocal(r.id, { active: e.target.checked })} />
                  Active (visible on the public map)
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={() => save(r)} disabled={busy === r.id} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-portal-navy text-white disabled:opacity-50">
                    {busy === r.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    Save
                  </button>
                  <button onClick={() => setEditing(null)} className="text-xs text-gray-500">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {r.name}
                    {!r.active && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Inactive</span>}
                    {r.category && <span className="ml-2 text-[10px] bg-portal-blue-lt text-portal-blue px-1.5 py-0.5 rounded">{r.category}</span>}
                  </p>
                  {r.description && <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{r.description}</p>}
                  {r.address && <p className="text-[11px] text-gray-500 mt-0.5">{r.address}{r.city ? `, ${r.city}` : ''}</p>}
                  {(r.phone || r.email || r.website) && (
                    <p className="text-[11px] text-gray-700 mt-1">
                      {r.phone && <span className="mr-2">📞 {r.phone}</span>}
                      {r.website && <a href={r.website} target="_blank" rel="noopener" className="text-portal-blue hover:underline mr-2">{r.website}</a>}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col gap-1">
                  <button onClick={() => setEditing(r.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50">
                    <Pencil size={11} /> Edit
                  </button>
                  <button onClick={() => del(r)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-red-200 text-red-600 hover:bg-red-50">
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function AddResource({ market, onCreated, onCancel }: { market: string; onCreated: (r: Resource) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/resources', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ market, name, category: category || null }),
      })
      const j = await res.json() as { resource?: Resource; error?: string }
      if (!res.ok || !j.resource) throw new Error(j.error ?? 'Create failed')
      onCreated(j.resource)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-portal-blue-lt/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">New resource</p>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label="Name" value={name} onChange={setName} />
        <FieldSelect label="Category" value={category} options={['', ...CATEGORIES]} onChange={setCategory} />
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={busy || !name.trim()} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-portal-navy text-white disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          Create
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (s: string) => void; className?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} className="mt-0.5 w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30" />
    </label>
  )
}
function FieldNum({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <input type="number" step="any" value={value} onChange={e => onChange(parseFloat(e.target.value || '0'))} className="mt-0.5 w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30" />
    </label>
  )
}
function FieldSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (s: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="mt-0.5 w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30">
        {options.map(o => <option key={o} value={o}>{o || '— none —'}</option>)}
      </select>
    </label>
  )
}
