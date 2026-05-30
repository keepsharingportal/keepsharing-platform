'use client'

// ── /admin/section-sponsors ──────────────────────────────────────────────────
// Manage the column_sponsors table — one advertiser "owns" a community
// spotlight column for a date range. Active sponsor renders on the column
// landing page banner + every article in that column (mobile strip under
// hero, desktop sidebar override, footer outro).
//
// Each community spotlight column gets a card showing its CURRENT sponsor
// (if any), with an "Edit" or "Add sponsor" action. A separate "Past &
// upcoming" list shows everything else.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Plus, RefreshCw, Calendar, Edit2, Trash2, AlertTriangle, Check,
} from 'lucide-react'
import { COMMUNITY_SPOTLIGHT_COLUMNS } from '@/lib/articles/nominate-cta'
import { getColumnBrand } from '@/lib/articles/column-brand'

interface Sponsor {
  id:              string
  column_slug:     string
  advertiser_id:   string | null
  sponsor_label:   string
  sponsor_name:    string
  sponsor_message: string | null
  logo_url:        string | null
  cta_label:       string
  cta_url:         string | null
  accent_color:    string | null
  start_date:      string
  end_date:        string
  is_active:       boolean
}

const todayIso = () => new Date().toISOString().slice(0, 10)

function isActive(s: Sponsor): boolean {
  const t = todayIso()
  return s.is_active && s.start_date <= t && s.end_date >= t
}

export default function SectionSponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [editing,  setEditing]  = useState<Partial<Sponsor> | null>(null)
  const [saving,   setSaving]   = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/section-sponsors')
      const json = await res.json()
      if (!res.ok) { setError(json?.error ?? 'Load failed'); return }
      setSponsors(json.sponsors ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const activeByColumn = useMemo(() => {
    const map = new Map<string, Sponsor>()
    for (const s of sponsors) if (isActive(s)) map.set(s.column_slug, s)
    return map
  }, [sponsors])

  const otherSponsors = sponsors.filter(s => !isActive(s))

  async function save(payload: Partial<Sponsor>) {
    setSaving(true)
    setError(null)
    try {
      const isUpdate = !!payload.id
      const url      = isUpdate ? `/api/admin/section-sponsors?id=${payload.id}` : '/api/admin/section-sponsors'
      const method   = isUpdate ? 'PATCH' : 'POST'
      const body     = { ...payload }
      delete body.id
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json?.error ?? 'Save failed'); return }
      setEditing(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this sponsor record? This cannot be undone.')) return
    const res = await fetch(`/api/admin/section-sponsors?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j?.error ?? 'Delete failed')
      return
    }
    await load()
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-black text-gray-900">Section Sponsors</h1>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mb-8 max-w-2xl">
        Assign one advertiser to a community spotlight column for a date range.
        While active, the sponsor&apos;s branding appears under the hero on mobile,
        in the sidebar on desktop, and in a footer outro on every article in that column,
        plus a banner on the column landing page.
      </p>

      {error && (
        <div className="mb-6 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Per-column active sponsor cards */}
      <section className="mb-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Current sponsors</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {COMMUNITY_SPOTLIGHT_COLUMNS.map(col => {
            const active = activeByColumn.get(col)
            const brand  = getColumnBrand(col)
            return (
              <div key={col} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: brand.primary }}>
                  {brand.label}
                </div>
                <div className="p-4">
                  {active ? (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                          <Check size={10} /> Active
                        </span>
                        <span className="text-[11px] text-gray-500">
                          through {active.end_date}
                        </span>
                      </div>
                      <div className="font-bold text-gray-900">{active.sponsor_name}</div>
                      {active.sponsor_message && (
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{active.sponsor_message}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => setEditing(active)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                        >
                          <Edit2 size={11} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(active.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                        >
                          <Trash2 size={11} /> End sponsorship
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 italic mb-3">No active sponsor.</p>
                      <button
                        type="button"
                        onClick={() => setEditing({
                          column_slug:  col,
                          sponsor_label:'Presented by',
                          cta_label:    'Learn more',
                          start_date:   todayIso(),
                          end_date:     new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                          is_active:    true,
                        })}
                        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md text-white"
                        style={{ backgroundColor: brand.primary }}
                      >
                        <Plus size={11} /> Add sponsor
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Past + upcoming sponsorships */}
      <section className="mb-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Past &amp; upcoming</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500"><RefreshCw size={14} className="animate-spin" /> Loading…</div>
        ) : otherSponsors.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Nothing else.</p>
        ) : (
          <div className="border border-gray-200 rounded-xl bg-white divide-y divide-gray-100">
            {otherSponsors.map(s => {
              const brand = getColumnBrand(s.column_slug)
              return (
                <div key={s.id} className="p-3 flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded shrink-0" style={{ backgroundColor: brand.primary }}>
                    {brand.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">{s.sponsor_name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Calendar size={10} /> {s.start_date} → {s.end_date}
                      {!s.is_active && <span className="text-red-600 font-semibold ml-2">disabled</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditing(s)} className="text-xs font-semibold px-2 py-1 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200">Edit</button>
                    <button onClick={() => remove(s.id)} className="text-xs font-semibold px-2 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200">Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Editor modal */}
      {editing && (
        <SponsorEditor
          initial={editing}
          saving={saving}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ── SponsorEditor ────────────────────────────────────────────────────────────

function SponsorEditor({
  initial, saving, onSave, onClose,
}: {
  initial: Partial<Sponsor>
  saving:  boolean
  onSave:  (payload: Partial<Sponsor>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<Sponsor>>(initial)
  const set = <K extends keyof Sponsor>(k: K, v: Sponsor[K] | null) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-auto">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">{form.id ? 'Edit sponsor' : 'Add sponsor'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-sm">Cancel</button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Column">
            <select
              value={form.column_slug ?? ''}
              onChange={e => set('column_slug', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 bg-white"
              disabled={!!form.id}
            >
              <option value="">— Pick a column —</option>
              {COMMUNITY_SPOTLIGHT_COLUMNS.map(c => (
                <option key={c} value={c}>{getColumnBrand(c).label}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sponsor name (required)">
              <input type="text" value={form.sponsor_name ?? ''} onChange={e => set('sponsor_name', e.target.value)} placeholder="Walmart of River Region" className={inputCls} />
            </Field>
            <Field label="Sponsor label">
              <input type="text" value={form.sponsor_label ?? 'Presented by'} onChange={e => set('sponsor_label', e.target.value)} placeholder="Presented by" className={inputCls} />
            </Field>
          </div>

          <Field label="One-liner (optional)">
            <input type="text" value={form.sponsor_message ?? ''} onChange={e => set('sponsor_message', e.target.value)} placeholder="Bringing local stories to River Region families" className={inputCls} />
          </Field>

          <Field label="Logo URL (optional)">
            <input type="url" value={form.logo_url ?? ''} onChange={e => set('logo_url', e.target.value)} placeholder="https://..." className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA label">
              <input type="text" value={form.cta_label ?? 'Learn more'} onChange={e => set('cta_label', e.target.value)} className={inputCls} />
            </Field>
            <Field label="CTA URL">
              <input type="url" value={form.cta_url ?? ''} onChange={e => set('cta_url', e.target.value)} placeholder="https://..." className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input type="date" value={form.start_date ?? ''} onChange={e => set('start_date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="End date">
              <input type="date" value={form.end_date ?? ''} onChange={e => set('end_date', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Accent color (optional — falls back to column brand)">
            <input type="text" value={form.accent_color ?? ''} onChange={e => set('accent_color', e.target.value)} placeholder="#b91c1c" className={inputCls} />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active ?? true} onChange={e => set('is_active', e.target.checked)} />
            Active (uncheck to disable without deleting)
          </label>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200">Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="text-xs font-bold px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving ? <><RefreshCw size={11} className="animate-spin" /> Saving…</> : <>Save sponsor</>}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-md border border-gray-200 outline-none focus:border-blue-400 bg-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  )
}
