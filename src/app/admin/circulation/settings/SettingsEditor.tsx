'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, Plus, AlertCircle } from 'lucide-react'

export interface SettingRow { market: string; key: string; value: string | null }
interface KeyMeta { label: string; help: string; type?: 'email' | 'number' | 'text' | 'select'; options?: string[] }

interface Props {
  market: string
  initial: SettingRow[]
  meta:    Record<string, KeyMeta>
}

export function SettingsEditor({ market, initial, meta }: Props) {
  const router = useRouter()
  const [rows, setRows]   = useState<SettingRow[]>(initial)
  const [busy, setBusy]   = useState<string | null>(null)
  const [err,  setErr]    = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  function patchLocal(key: string, value: string) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, value } : r))
  }

  async function save(row: SettingRow) {
    setBusy(row.key)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ market, key: row.key, value: row.value }),
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

  async function addNew() {
    if (!newKey.trim()) return
    setBusy('__new')
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ market, key: newKey.trim(), value: newVal }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? 'Save failed')
      }
      setRows(prev => [...prev, { market, key: newKey.trim(), value: newVal }])
      setNewKey(''); setNewVal(''); setAdding(false)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  // Keys with friendly metadata first (sorted by meta order), then anything else.
  const knownKeys   = rows.filter(r => meta[r.key]).sort((a, b) => a.key.localeCompare(b.key))
  const unknownKeys = rows.filter(r => !meta[r.key])

  return (
    <div className="space-y-4">
      {err && <p className="text-xs text-portal-red">{err}</p>}

      <div className="rounded-md border border-amber-200 bg-portal-amber-lt p-3 text-xs text-amber-900 flex items-start gap-2">
        <AlertCircle size={14} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Set these before drivers + readers see anything</p>
          <p>
            <code>from_email</code> + <code>from_name</code> drive every outbound email.
            <code className="ml-1">ops_email</code> is who gets the reply-to thread and operational notifications.
          </p>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-bold text-portal-text mb-2">Configured</h2>
        <ul className="space-y-2">
          {knownKeys.length === 0 && (
            <li className="text-xs text-portal-sub italic p-3 bg-white rounded-xl border border-dashed border-portal-border">
              No settings yet — apply migration 114 to seed defaults, then edit here.
            </li>
          )}
          {knownKeys.map(row => {
            const m = meta[row.key]
            return (
              <li key={row.key} className="rounded-xl border border-portal-border bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-portal-text">{m.label}</p>
                    <p className="text-[11px] text-portal-sub mt-0.5">{m.help}</p>
                  </div>
                  <button
                    onClick={() => save(row)}
                    disabled={busy === row.key}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-portal-navy text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {busy === row.key ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                    Save
                  </button>
                </div>
                <div className="mt-2">
                  {m.type === 'select' && m.options ? (
                    <select
                      value={row.value ?? ''}
                      onChange={e => patchLocal(row.key, e.target.value)}
                      className="w-full rounded-md border border-portal-border-2 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
                    >
                      {m.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={m.type === 'number' ? 'number' : m.type === 'email' ? 'email' : 'text'}
                      value={row.value ?? ''}
                      onChange={e => patchLocal(row.key, e.target.value)}
                      className="w-full rounded-md border border-portal-border-2 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {unknownKeys.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-portal-text mb-2">Other</h2>
          <ul className="space-y-2">
            {unknownKeys.map(row => (
              <li key={row.key} className="rounded-xl border border-portal-border bg-white p-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <code className="text-xs font-mono text-portal-text">{row.key}</code>
                  <button
                    onClick={() => save(row)}
                    disabled={busy === row.key}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-portal-navy text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {busy === row.key ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                    Save
                  </button>
                </div>
                <input
                  value={row.value ?? ''}
                  onChange={e => patchLocal(row.key, e.target.value)}
                  className="w-full rounded-md border border-portal-border-2 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-sm font-bold text-portal-text mb-2">Add a setting</h2>
        {!adding ? (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-portal-border rounded-md hover:bg-portal-bg">
            <Plus size={12} /> New setting
          </button>
        ) : (
          <div className="rounded-xl border border-blue-200 bg-portal-blue-lt/40 p-3 space-y-2">
            <input placeholder="key (snake_case)" value={newKey} onChange={e => setNewKey(e.target.value)} className="w-full rounded-md border border-portal-border-2 px-2.5 py-1.5 text-sm" />
            <input placeholder="value" value={newVal} onChange={e => setNewVal(e.target.value)} className="w-full rounded-md border border-portal-border-2 px-2.5 py-1.5 text-sm" />
            <div className="flex items-center gap-2">
              <button onClick={addNew} disabled={busy === '__new' || !newKey.trim()} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-portal-navy text-white disabled:opacity-50">
                {busy === '__new' ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                Add
              </button>
              <button onClick={() => { setAdding(false); setNewKey(''); setNewVal('') }} className="text-xs text-portal-sub">Cancel</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
