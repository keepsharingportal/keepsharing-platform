'use client'

// Typeahead school picker. Used by:
//   - Admin Quick Add (select WHICH school a news bit is for)
//   - Public submission form (Phase 2)
//
// Behavior:
//   - Filters the schools list as the user types
//   - Sorts: exact > starts-with > contains, secondary by name
//   - Shows area + private/public badge inline
//   - If no match, surfaces a "+ Add 'XYZ' as new school" tile that opens
//     a mini-form. On submit, fuzzy-matches against the existing roster
//     so a near-dupe ("Eastchace") gets nudged toward the real spelling
//     ("Eastchase") before creating a redundant row.
//   - Names entered for new schools are title-cased before POST.

import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Check, RefreshCw, AlertTriangle, Search } from 'lucide-react'
import { AREAS, AREA_LABELS, type Area } from '@/lib/school-news/areas'
import { toTitleCase, findNearDuplicates } from '@/lib/school-news/title-case'

export interface TypeaheadSchool {
  id:         string
  name:       string
  area:       Area
  is_private: boolean
}

interface Props {
  schools:        TypeaheadSchool[]
  value:          string | null                 // selected school_id (or null)
  onChange:       (school: TypeaheadSchool | null) => void
  onSchoolAdded?: (school: TypeaheadSchool) => void  // called when inline-add succeeds
  allowAdd?:      boolean                        // default true; set false on public form
  notListedNote?: React.ReactNode                // shown when allowAdd=false + no match
  placeholder?:   string
  className?:     string
}

export function SchoolTypeahead({
  schools, value, onChange, onSchoolAdded, allowAdd = true, notListedNote,
  placeholder = "Begin typing your school's name…",
  className = '',
}: Props) {
  const [query, setQuery]       = useState('')
  const [open, setOpen]         = useState(false)
  const [addingNew, setAddingNew] = useState(false)
  const containerRef            = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () => value ? schools.find(s => s.id === value) ?? null : null,
    [value, schools],
  )

  // When the user picks a school via the dropdown, mirror its name into
  // the input so they see what they selected; reset to empty if cleared.
  useEffect(() => {
    if (selected && !open) setQuery(selected.name)
  }, [selected, open])

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setAddingNew(false)
      }
    }
    if (open || addingNew) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, addingNew])

  const trimmed = query.trim()
  const matches = useMemo(() => {
    if (!trimmed) return schools.slice(0, 8)
    const lc = trimmed.toLowerCase()
    const scored = schools
      .map(s => {
        const name = s.name.toLowerCase()
        if (name === lc)              return { s, score: 0 }
        if (name.startsWith(lc))      return { s, score: 1 }
        if (name.includes(lc))        return { s, score: 2 }
        return null
      })
      .filter((x): x is { s: TypeaheadSchool; score: number } => x !== null)
      .sort((a, b) => a.score - b.score || a.s.name.localeCompare(b.s.name))
    return scored.slice(0, 8).map(x => x.s)
  }, [schools, trimmed])

  const exactMatch = matches.find(m => m.name.toLowerCase() === trimmed.toLowerCase())

  function pick(s: TypeaheadSchool) {
    onChange(s)
    setQuery(s.name)
    setOpen(false)
    setAddingNew(false)
  }

  function clear() {
    onChange(null)
    setQuery('')
    setOpen(true)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); onChange(null) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:border-portal-blue"
        />
        {selected && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs font-bold"
            aria-label="Clear selection"
          >
            ×
          </button>
        )}
      </div>

      {selected && !open && (
        <p className="text-[11px] text-green-700 font-semibold mt-1 flex items-center gap-1">
          <Check size={11} /> Selected: {selected.name} · {AREA_LABELS[selected.area]}{selected.is_private ? ' · Private' : ''}
        </p>
      )}

      {open && !addingNew && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {matches.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-500">
              No schools match &ldquo;{trimmed}&rdquo;.
            </p>
          ) : (
            <ul>
              {matches.map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => pick(s)}
                    className="w-full text-left px-3 py-2 hover:bg-portal-blue-lt text-sm border-b border-gray-50 last:border-b-0"
                  >
                    <span className="font-semibold text-gray-900">{s.name}</span>
                    <span className="text-[10px] text-gray-500 ml-2">{AREA_LABELS[s.area]}</span>
                    {s.is_private && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 ml-2 px-1.5 py-0.5 rounded">Private</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {trimmed && !exactMatch && allowAdd && (
            <button
              type="button"
              onClick={() => setAddingNew(true)}
              className="w-full text-left px-3 py-2 border-t border-gray-200 bg-portal-amber-lt hover:bg-portal-amber-lt text-sm font-semibold text-amber-900 inline-flex items-center gap-1.5"
            >
              <Plus size={13} /> Add &ldquo;{toTitleCase(trimmed)}&rdquo; as new school
            </button>
          )}
          {trimmed && !exactMatch && !allowAdd && notListedNote && (
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
              {notListedNote}
            </div>
          )}
        </div>
      )}

      {addingNew && (
        <AddSchoolInline
          initialName={trimmed}
          existingSchools={schools}
          onCancel={() => setAddingNew(false)}
          onCreated={(s) => {
            onSchoolAdded?.(s)
            pick(s)
          }}
        />
      )}
    </div>
  )
}

// ── Inline add panel ────────────────────────────────────────────────────────

function AddSchoolInline({
  initialName, existingSchools, onCancel, onCreated,
}: {
  initialName:     string
  existingSchools: TypeaheadSchool[]
  onCancel:        () => void
  onCreated:       (s: TypeaheadSchool) => void
}) {
  const [name, setName]           = useState(() => toTitleCase(initialName))
  const [area, setArea]           = useState<Area>('montgomery')
  const [isPrivate, setIsPrivate] = useState(false)
  const [busy, setBusy]           = useState(false)
  const [err, setErr]             = useState<string | null>(null)

  const dupeMatches = useMemo(() => {
    return findNearDuplicates(name, existingSchools, { maxDistance: 2, limit: 3 })
      .filter(m => m.distance > 0)  // exclude exact match (would have been picked already)
  }, [name, existingSchools])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Name is required'); return }
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/school-news/schools', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), area, is_private: isPrivate }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onCreated({ id: json.school.id, name: name.trim(), area, is_private: isPrivate })
    } finally { setBusy(false) }
  }

  return (
    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border-2 border-amber-300 rounded-lg shadow-lg p-3 space-y-2">
      <p className="text-xs font-bold text-amber-900 inline-flex items-center gap-1.5">
        <Plus size={12} /> Add new school
      </p>

      {dupeMatches.length > 0 && (
        <div className="bg-portal-amber-lt border border-amber-200 rounded px-2 py-1.5 text-[11px] text-amber-900">
          <p className="font-bold flex items-center gap-1 mb-0.5">
            <AlertTriangle size={11} /> Similar school{dupeMatches.length === 1 ? '' : 's'} already in the list — did you mean one of these?
          </p>
          <ul className="space-y-0.5">
            {dupeMatches.map(m => (
              <li key={m.item.id}>
                <button
                  type="button"
                  onClick={() => onCreated(m.item)}
                  className="text-portal-amber hover:text-amber-900 hover:underline font-semibold"
                >
                  Use existing: {m.item.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">School name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={e => setName(toTitleCase(e.target.value))}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded outline-none focus:border-portal-blue"
            autoFocus
          />
          <p className="text-[10px] text-gray-400 mt-0.5">Will be saved title-cased on blur. Acronyms like LAMP / BTW are preserved if typed in caps.</p>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Area</label>
          <select value={area} onChange={e => setArea(e.target.value as Area)} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white">
            {AREAS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Type</label>
          <select value={isPrivate ? 'private' : 'public'} onChange={e => setIsPrivate(e.target.value === 'private')} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white">
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        {err && <p className="col-span-2 text-xs text-portal-red font-semibold">{err}</p>}

        <div className="col-span-2 flex justify-end gap-1.5 pt-1">
          <button type="button" onClick={onCancel} className="px-3 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900">Cancel</button>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-40">
            {busy ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />}
            {busy ? 'Creating…' : 'Create + select'}
          </button>
        </div>
      </form>
      <p className="text-[10px] text-gray-400">
        Adding fills in just the name, area, and type. You can flesh out district / contact email later in the schools manager.
      </p>
    </div>
  )
}
