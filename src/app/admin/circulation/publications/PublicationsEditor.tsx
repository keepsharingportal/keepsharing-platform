'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, Plus } from 'lucide-react'

export interface Publication {
  id:          string
  short_name:  string
  name:        string
  abbrev:      string
  color_hex:   string
  logo_url:    string | null
  print_total: number
  holdback:    number
  active:      boolean
  sort_order:  number
  website:     string | null
  issuu_url:   string | null
}

export function PublicationsEditor({ initial }: { initial: Publication[] }) {
  const router = useRouter()
  const [rows, setRows] = useState<Publication[]>(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [err,  setErr]  = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  function patchLocal(id: string, fields: Partial<Publication>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r))
  }

  async function save(row: Publication) {
    setBusy(row.id)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/publications', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:          row.id,
          name:        row.name,
          abbrev:      row.abbrev,
          color_hex:   row.color_hex,
          print_total: row.print_total,
          holdback:    row.holdback,
          active:      row.active,
          sort_order:  row.sort_order,
          website:     row.website,
          issuu_url:   row.issuu_url,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? 'Save failed')
      }
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      {err && <p className="text-xs text-red-600">{err}</p>}
      <ul className="space-y-2">
        {rows.length === 0 && (
          <li className="text-xs text-gray-500 italic p-3 bg-white rounded-xl border border-dashed border-gray-200">
            No publications — apply migration 116 to seed defaults.
          </li>
        )}
        {rows.map(p => (
          <li key={p.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg shrink-0" style={{ background: p.color_hex }} />
                <div>
                  <p className="text-sm font-bold text-gray-900">{p.name}</p>
                  <p className="text-[11px] text-gray-500">{p.short_name} · {p.abbrev}</p>
                </div>
              </div>
              <button
                onClick={() => save(p)}
                disabled={busy === p.id}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy === p.id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Save
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Field label="Display name" value={p.name} onChange={v => patchLocal(p.id, { name: v })} />
              <Field label="Abbrev"        value={p.abbrev} onChange={v => patchLocal(p.id, { abbrev: v })} />
              <Field label="Brand color"   value={p.color_hex} onChange={v => patchLocal(p.id, { color_hex: v })} />
              <FieldNum label="Print run"  value={p.print_total} onChange={v => patchLocal(p.id, { print_total: v })} />
              <FieldNum label="Holdback"   value={p.holdback}    onChange={v => patchLocal(p.id, { holdback: v })} />
              <FieldNum label="Sort"       value={p.sort_order}  onChange={v => patchLocal(p.id, { sort_order: v })} />
              <Field label="Website"       value={p.website ?? ''}   onChange={v => patchLocal(p.id, { website:   v || null })} className="sm:col-span-2" />
              <Field label="Issuu URL"     value={p.issuu_url ?? ''} onChange={v => patchLocal(p.id, { issuu_url: v || null })} className="sm:col-span-3" />
              <label className="flex items-center gap-1.5 text-xs text-gray-700 sm:col-span-3">
                <input type="checkbox" checked={p.active} onChange={e => patchLocal(p.id, { active: e.target.checked })} />
                Active
              </label>
            </div>
          </li>
        ))}
      </ul>

      {!adding ? (
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-md hover:bg-gray-50">
          <Plus size={12} /> Add publication
        </button>
      ) : (
        <AddPublication onCreated={(pub) => { setRows(prev => [...prev, pub]); setAdding(false); router.refresh() }} onCancel={() => setAdding(false)} />
      )}
    </div>
  )
}

function AddPublication({ onCreated, onCancel }: { onCreated: (p: Publication) => void; onCancel: () => void }) {
  const [short, setShort] = useState('')
  const [name,  setName]  = useState('')
  const [abbrev, setAbbrev] = useState('')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/publications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ short_name: short.trim().toLowerCase(), name: name.trim(), abbrev: abbrev.trim() }),
      })
      const j = await res.json() as { publication?: Publication; error?: string }
      if (!res.ok || !j.publication) throw new Error(j.error ?? 'Create failed')
      onCreated(j.publication)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Field label="Short slug" value={short} onChange={setShort} />
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Abbrev" value={abbrev} onChange={setAbbrev} />
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={busy || !short.trim() || !name.trim() || !abbrev.trim()} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-600 text-white disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          Create
        </button>
        <button onClick={onCancel} className="text-xs text-gray-500">Cancel</button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (s: string) => void; className?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} className="mt-0.5 w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
    </label>
  )
}
function FieldNum({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <input type="number" value={value} onChange={e => onChange(parseInt(e.target.value || '0', 10))} className="mt-0.5 w-full rounded-md border border-gray-300 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
    </label>
  )
}
