'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload, RefreshCw, Trash2, Edit2, Check, X, Search, Filter, AlertTriangle } from 'lucide-react'
import { AREAS, AREA_LABELS, GRADE_BANDS, GRADE_BAND_LABELS, type Area } from '@/lib/school-news/areas'
import { toTitleCase, findNearDuplicates } from '@/lib/school-news/title-case'
import type { SchoolRow } from './page'

interface Props {
  initialSchools: SchoolRow[]
}

const CSV_TEMPLATE = `name,area,is_private,district,grade_band,contact_email,facebook_url,city,address
Eastchase Elementary,montgomery,no,Montgomery Public Schools,elementary,principal@eastchase.org,,Montgomery,
Pike Road Elementary,pike-road,no,Pike Road Schools,elementary,,,Pike Road,
Montgomery Academy,montgomery,yes,,k12,admissions@montgomeryacademy.org,,Montgomery,
Prattville Christian Academy,autauga,yes,,k12,principal@prattvillechristian.org,,Prattville,`

export function SchoolsManagerClient({ initialSchools }: Props) {
  const router = useRouter()
  const [schools, setSchools] = useState<SchoolRow[]>(initialSchools)
  const [search, setSearch]   = useState('')
  const [areaFilter, setAreaFilter] = useState<Area | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'public' | 'private'>('all')
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active')

  const [showAdd, setShowAdd] = useState(false)
  const [showCsv, setShowCsv] = useState(false)

  const filtered = useMemo(() => {
    const lc = search.trim().toLowerCase()
    return schools.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter)            return false
      if (areaFilter   !== 'all' && s.area   !== areaFilter)              return false
      if (typeFilter === 'public'  && s.is_private)                        return false
      if (typeFilter === 'private' && !s.is_private)                       return false
      if (lc && !s.name.toLowerCase().includes(lc)
            && !(s.city?.toLowerCase().includes(lc) ?? false)
            && !(s.district?.toLowerCase().includes(lc) ?? false))         return false
      return true
    })
  }, [schools, search, areaFilter, typeFilter, statusFilter])

  return (
    <>
      {/* Toolbar */}
      <section className="bg-white border border-portal-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-portal-bg flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-portal-muted" />
            <h2 className="text-sm font-bold text-portal-text">Schools list</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setShowCsv(true); setShowAdd(false) }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-100 text-portal-text rounded-lg hover:bg-gray-200"
            >
              <Upload size={12} /> Bulk import CSV
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(true); setShowCsv(false) }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90"
            >
              <Plus size={12} /> Add school
            </button>
          </div>
        </div>

        {showAdd && (
          <AddSchoolForm
            existingSchools={schools}
            onCancel={() => setShowAdd(false)}
            onCreated={(s) => { setSchools(prev => [...prev, s].sort((a, b) => a.name.localeCompare(b.name))); setShowAdd(false); router.refresh() }}
          />
        )}

        {showCsv && (
          <BulkImportForm
            onCancel={() => setShowCsv(false)}
            onDone={() => { setShowCsv(false); router.refresh() }}
          />
        )}

        {/* Filters */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-portal-muted" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, city, or district…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-portal-border rounded-lg outline-none focus:border-portal-blue"
            />
          </div>
          <select value={areaFilter} onChange={e => setAreaFilter(e.target.value as Area | 'all')}
            className="text-sm px-3 py-1.5 border border-portal-border rounded-lg bg-white">
            <option value="all">All areas</option>
            {AREAS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | 'public' | 'private')}
            className="text-sm px-3 py-1.5 border border-portal-border rounded-lg bg-white">
            <option value="all">Public + private</option>
            <option value="public">Public only</option>
            <option value="private">Private only</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'active' | 'archived' | 'all')}
            className="text-sm px-3 py-1.5 border border-portal-border rounded-lg bg-white">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-portal-bg text-[11px] font-bold uppercase tracking-wider text-portal-sub">
                <th className="text-left px-4 py-2">School</th>
                <th className="text-left px-4 py-2">Area</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">District</th>
                <th className="text-left px-4 py-2">Contact</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-10 text-portal-muted text-sm">
                  {schools.length === 0
                    ? 'No schools yet. Use "Add school" to add them individually or "Bulk import CSV" to seed all River Region schools at once.'
                    : 'No schools match the current filters.'}
                </td></tr>
              ) : filtered.map(s => (
                <SchoolTableRow
                  key={s.id}
                  school={s}
                  onUpdated={(next) => {
                    setSchools(prev => prev.map(x => x.id === next.id ? { ...x, ...next } : x))
                    router.refresh()
                  }}
                  onArchived={() => {
                    setSchools(prev => prev.map(x => x.id === s.id ? { ...x, status: 'archived' } : x))
                    router.refresh()
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

// ── Add school form ─────────────────────────────────────────────────────────

function AddSchoolForm({
  existingSchools, onCancel, onCreated,
}: {
  existingSchools: SchoolRow[]
  onCancel: () => void
  onCreated: (s: SchoolRow) => void
}) {
  const [form, setForm] = useState({
    name: '', area: 'montgomery' as Area, is_private: false,
    district: '', grade_band: '', contact_email: '', facebook_url: '', city: '', address: '',
  })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm(f => ({ ...f, [k]: v })) }

  // Fuzzy-match against active schools — catches "Eastchace" → "Eastchase"
  // before the user creates a duplicate row.
  const nearMatches = useMemo(() => {
    if (!form.name.trim()) return []
    const active = existingSchools.filter(s => s.status === 'active')
    return findNearDuplicates(form.name, active, { maxDistance: 2, limit: 3 })
  }, [form.name, existingSchools])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const cleanedName = toTitleCase(form.name)
      const res = await fetch('/api/admin/school-news/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, name: cleanedName }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onCreated({
        id:            json.school.id,
        name:          cleanedName,
        area:          form.area,
        is_private:    form.is_private,
        district:      form.district || null,
        grade_band:    form.grade_band || null,
        contact_email: form.contact_email || null,
        facebook_url:  form.facebook_url || null,
        city:          form.city || null,
        address:       form.address || null,
        status:        'active',
        created_at:    new Date().toISOString(),
      })
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="p-5 bg-portal-blue-lt border-b border-portal-blue/20 space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <FormField label="School name *">
        <input
          required
          value={form.name}
          onChange={e => set('name', e.target.value)}
          onBlur={e => set('name', toTitleCase(e.target.value))}
          placeholder="Begin typing your school's name…"
          className={inputCls}
        />
        <p className="text-[10px] text-portal-muted mt-0.5">Auto-titled on blur. Acronyms (LAMP, BTW, MPS) kept as typed in caps.</p>
      </FormField>
      <FormField label="Area *">
        <select value={form.area} onChange={e => set('area', e.target.value as Area)} className={inputCls}>
          {AREAS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
        </select>
      </FormField>
      <FormField label="Type">
        <select value={form.is_private ? 'private' : 'public'} onChange={e => set('is_private', e.target.value === 'private')} className={inputCls}>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </FormField>
      <FormField label="District">
        <input value={form.district} onChange={e => set('district', e.target.value)} placeholder="e.g., Montgomery Public Schools" className={inputCls} />
      </FormField>
      <FormField label="Grade band">
        <select value={form.grade_band} onChange={e => set('grade_band', e.target.value)} className={inputCls}>
          <option value="">—</option>
          {GRADE_BANDS.map(g => <option key={g} value={g}>{GRADE_BAND_LABELS[g]}</option>)}
        </select>
      </FormField>
      <FormField label="Contact email">
        <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="principal@school.org" className={inputCls} />
      </FormField>
      <FormField label="Facebook URL">
        <input type="url" value={form.facebook_url} onChange={e => set('facebook_url', e.target.value)} placeholder="https://facebook.com/…" className={inputCls} />
      </FormField>
      <FormField label="City">
        <input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} />
      </FormField>
      <FormField label="Address">
        <input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} />
      </FormField>
      </div>

      {nearMatches.length > 0 && (
        <div className="bg-portal-amber-lt border border-amber-300 rounded-lg p-3 text-xs text-amber-900">
          <p className="font-bold flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} /> Similar school name{nearMatches.length === 1 ? '' : 's'} already in your list — possible duplicate?
          </p>
          <ul className="space-y-0.5 ml-5 list-disc">
            {nearMatches.map(m => (
              <li key={m.item.id}>
                <span className="font-semibold">{m.item.name}</span>
                <span className="text-portal-amber"> · {AREA_LABELS[m.item.area]}{m.item.is_private ? ' · Private' : ''}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-portal-amber mt-1">Click Cancel and use the existing one, or proceed if this is genuinely a different school.</p>
        </div>
      )}

      {err && <p className="text-xs text-portal-red font-semibold">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-portal-sub hover:text-portal-text">Cancel</button>
        <button type="submit" disabled={busy || !form.name.trim()} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90 disabled:opacity-40">
          {busy ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
          {busy ? 'Saving…' : 'Add school'}
        </button>
      </div>
    </form>
  )
}

// ── Bulk CSV import ─────────────────────────────────────────────────────────

function BulkImportForm({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const [csv, setCsv]   = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string; skipped?: { line: number; reason: string }[] } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setResult(null)
    try {
      const res = await fetch('/api/admin/school-news/schools/bulk-import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setResult({ ok: false, msg: json?.error ?? `HTTP ${res.status}`, skipped: json?.skipped }); return }
      setResult({ ok: true, msg: `Upserted ${json.upserted} school${json.upserted === 1 ? '' : 's'}.`, skipped: json?.skipped })
      setCsv('')
      setTimeout(onDone, 1500)
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="p-5 bg-portal-amber-lt border-b border-amber-100 space-y-3">
      <div>
        <p className="text-sm font-bold text-amber-900 mb-1">Bulk import schools from CSV</p>
        <p className="text-xs text-portal-amber leading-relaxed">
          Required columns: <code className="bg-portal-amber-lt px-1 rounded">name</code>, <code className="bg-portal-amber-lt px-1 rounded">area</code> (montgomery / autauga / elmore / pike-road).
          Optional: <code className="bg-portal-amber-lt px-1 rounded">is_private</code> (yes/no), <code className="bg-portal-amber-lt px-1 rounded">district</code>, <code className="bg-portal-amber-lt px-1 rounded">grade_band</code>, <code className="bg-portal-amber-lt px-1 rounded">contact_email</code>, <code className="bg-portal-amber-lt px-1 rounded">facebook_url</code>, <code className="bg-portal-amber-lt px-1 rounded">city</code>, <code className="bg-portal-amber-lt px-1 rounded">address</code>.
          Existing schools (matched by name) get UPDATED.
        </p>
      </div>
      <textarea
        value={csv}
        onChange={e => setCsv(e.target.value)}
        placeholder={CSV_TEMPLATE}
        rows={10}
        className="w-full font-mono text-xs px-3 py-2 border border-amber-200 bg-white rounded-lg outline-none focus:border-amber-400"
      />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setCsv(CSV_TEMPLATE)}
          className="text-xs font-semibold text-portal-amber hover:text-amber-900"
        >
          Paste template
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-portal-sub hover:text-portal-text">Cancel</button>
          <button type="submit" disabled={busy || !csv.trim()} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40">
            {busy ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
            {busy ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${result.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-portal-red-lt border border-portal-red/30 text-portal-red'}`}>
          <p>{result.msg}</p>
          {result.skipped && result.skipped.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer">Skipped {result.skipped.length} row{result.skipped.length === 1 ? '' : 's'}</summary>
              <ul className="mt-1 space-y-0.5">
                {result.skipped.map((s, i) => <li key={i}>Line {s.line}: {s.reason}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </form>
  )
}

// ── Per-row component (display + inline edit + archive) ─────────────────────

function SchoolTableRow({
  school, onUpdated, onArchived,
}: {
  school: SchoolRow
  onUpdated: (next: Partial<SchoolRow> & { id: string }) => void
  onArchived: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [form, setForm]       = useState({
    name:          school.name,
    area:          school.area,
    is_private:    school.is_private,
    district:      school.district ?? '',
    grade_band:    school.grade_band ?? '',
    contact_email: school.contact_email ?? '',
  })

  async function save() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/school-news/schools/${school.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          form.name,
          area:          form.area,
          is_private:    form.is_private,
          district:      form.district || null,
          grade_band:    form.grade_band || null,
          contact_email: form.contact_email || null,
        }),
      })
      if (!res.ok) { alert((await res.json()).error ?? 'Save failed'); return }
      onUpdated({ id: school.id, ...form, district: form.district || null, grade_band: form.grade_band || null, contact_email: form.contact_email || null })
      setEditing(false)
    } finally { setBusy(false) }
  }

  async function archive() {
    if (!confirm(`Archive "${school.name}"? Existing news bits keep their snapshot.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/school-news/schools/${school.id}`, { method: 'DELETE' })
      if (!res.ok) { alert((await res.json()).error ?? 'Archive failed'); return }
      onArchived()
    } finally { setBusy(false) }
  }

  if (editing) {
    return (
      <tr className="border-t border-gray-100 bg-portal-blue-lt/40">
        <td className="px-4 py-2"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></td>
        <td className="px-4 py-2">
          <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value as Area }))} className={inputCls}>
            {AREAS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
          </select>
        </td>
        <td className="px-4 py-2">
          <select value={form.is_private ? 'private' : 'public'} onChange={e => setForm(f => ({ ...f, is_private: e.target.value === 'private' }))} className={inputCls}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </td>
        <td className="px-4 py-2"><input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} className={inputCls} /></td>
        <td className="px-4 py-2"><input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} className={inputCls} /></td>
        <td className="px-4 py-2 text-right">
          <div className="inline-flex gap-1">
            <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-1 text-xs font-bold bg-green-600 text-white rounded-lg px-2.5 py-1 hover:bg-green-700 disabled:opacity-40">
              {busy ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-1 text-xs border border-portal-border text-portal-sub rounded-lg px-2.5 py-1 hover:bg-portal-bg">
              <X size={12} /> Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`border-t border-gray-100 ${school.status === 'archived' ? 'opacity-50' : ''}`}>
      <td className="px-4 py-2.5">
        <p className="font-semibold text-portal-text">{school.name}</p>
        {school.city && <p className="text-xs text-portal-muted">{school.city}</p>}
      </td>
      <td className="px-4 py-2.5 text-xs text-portal-sub">{AREA_LABELS[school.area]}</td>
      <td className="px-4 py-2.5 text-xs">
        <span className={`px-2 py-0.5 rounded-full font-bold ${school.is_private ? 'bg-purple-50 text-purple-700' : 'bg-portal-blue-lt text-portal-blue'}`}>
          {school.is_private ? 'Private' : 'Public'}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-portal-sub">{school.district ?? '—'}</td>
      <td className="px-4 py-2.5 text-xs text-portal-sub truncate max-w-[200px]">{school.contact_email ?? '—'}</td>
      <td className="px-4 py-2.5 text-right">
        <div className="inline-flex gap-1">
          {school.status === 'active' && (
            <>
              <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs text-portal-sub border border-portal-border rounded-lg px-2.5 py-1 hover:bg-portal-bg">
                <Edit2 size={11} /> Edit
              </button>
              <button type="button" onClick={archive} disabled={busy} className="inline-flex items-center gap-1 text-xs text-rose-600 border border-portal-red/30 rounded-lg px-2.5 py-1 hover:bg-portal-red-lt disabled:opacity-40">
                <Trash2 size={11} /> Archive
              </button>
            </>
          )}
          {school.status === 'archived' && (
            <span className="text-xs text-portal-muted">archived</span>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Small helpers ───────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-1.5 text-sm border border-portal-border rounded-lg outline-none focus:border-portal-blue bg-white'

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-portal-sub mb-1">{label}</label>
      {children}
    </div>
  )
}
