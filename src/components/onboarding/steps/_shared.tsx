'use client'

// Shared UI primitives the section-builder steps reuse. Three patterns
// cover most of the wizard:
//   <TextField>             — labeled text input with auto-save on blur
//   <TextareaField>         — labeled textarea with auto-save on blur
//   <BulletListBuilder>     — editable list of strings (chips/rows)
//   <ItemListBuilder>       — editable list of structured items
//                             (caller renders each row's fields)

import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'

// ── Single fields ─────────────────────────────────────────────────────

export function TextField({
  label, value: initial, onCommit, placeholder, type = 'text', hint,
}: {
  label:        string
  value:        string
  onCommit:     (v: string) => void
  placeholder?: string
  type?:        string
  hint?:        string
}) {
  const [value, setValue] = useState(initial)
  useEffect(() => setValue(initial), [initial])
  return (
    <div>
      <label className="block text-[11px] font-bold text-portal-text mb-1">{label}</label>
      {hint && <p className="text-[10px] text-portal-sub mb-1">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={() => { if (value !== initial) onCommit(value) }}
        placeholder={placeholder}
        className="w-full px-2.5 py-2 text-[13px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue"
      />
    </div>
  )
}

export function TextareaField({
  label, value: initial, onCommit, placeholder, hint, rows = 4,
}: {
  label:        string
  value:        string
  onCommit:     (v: string) => void
  placeholder?: string
  hint?:        string
  rows?:        number
}) {
  const [value, setValue] = useState(initial)
  useEffect(() => setValue(initial), [initial])
  return (
    <div>
      <label className="block text-[11px] font-bold text-portal-text mb-1">{label}</label>
      {hint && <p className="text-[10px] text-portal-sub mb-1">{hint}</p>}
      <textarea
        rows={rows}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={() => { if (value !== initial) onCommit(value) }}
        placeholder={placeholder}
        className="w-full px-2.5 py-2 text-[13px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue resize-vertical"
      />
    </div>
  )
}

// ── Bullet list (array of strings) ────────────────────────────────────

export function BulletListBuilder({
  label, items, onCommit, placeholder = 'Add item…', hint,
}: {
  label:        string
  items:        string[]
  onCommit:     (next: string[]) => void
  placeholder?: string
  hint?:        string
}) {
  const [list,   setList]   = useState<string[]>(items)
  const [draft,  setDraft]  = useState('')
  useEffect(() => setList(items), [items])

  function add() {
    const t = draft.trim()
    if (!t) return
    const next = [...list, t]
    setList(next); setDraft(''); onCommit(next)
  }
  function remove(i: number) {
    const next = list.filter((_, ix) => ix !== i)
    setList(next); onCommit(next)
  }
  function update(i: number, v: string) {
    const next = list.map((x, ix) => ix === i ? v : x)
    setList(next)
  }
  function commit(i: number) {
    if (list[i] !== items[i]) onCommit(list)
  }

  return (
    <div>
      <label className="block text-[11px] font-bold text-portal-text mb-1">{label}</label>
      {hint && <p className="text-[10px] text-portal-sub mb-2">{hint}</p>}
      <ul className="space-y-1.5 mb-2">
        {list.map((item, i) => (
          <li key={i} className="flex items-center gap-2 bg-white border border-portal-border rounded px-2 py-1">
            <GripVertical size={12} className="text-portal-muted shrink-0" />
            <input
              type="text"
              value={item}
              onChange={e => update(i, e.target.value)}
              onBlur={() => commit(i)}
              className="flex-1 text-[12px] outline-none bg-transparent"
            />
            <button type="button" onClick={() => remove(i)}
              className="text-portal-red hover:text-portal-text shrink-0">
              <Trash2 size={11} />
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <li className="text-[11px] text-portal-muted italic">Nothing yet — add your first below.</li>
        )}
      </ul>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 px-2.5 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue"
        />
        <button type="button" onClick={add}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white bg-portal-navy rounded hover:opacity-90">
          <Plus size={11} /> Add
        </button>
      </div>
    </div>
  )
}

// ── Item list (array of objects) ──────────────────────────────────────
// Caller provides:
//   - `blank`: factory returning an empty item
//   - `renderRow(item, onChange)`: row UI
//
// The list manages add/remove and calls onCommit whenever the array
// shape changes (add/remove) OR via the caller's onChange flowing
// up through commit().

export function ItemListBuilder<T>({
  label, items, onCommit, hint, blank, renderRow, addLabel = 'Add item',
}: {
  label:        string
  items:        T[]
  onCommit:     (next: T[]) => void
  hint?:        string
  blank:        () => T
  renderRow:    (item: T, onChange: (patch: Partial<T>) => void, commit: () => void) => React.ReactNode
  addLabel?:    string
}) {
  const [list, setList] = useState<T[]>(items)
  useEffect(() => setList(items), [items])

  function add()                { const next = [...list, blank()]; setList(next); onCommit(next) }
  function remove(i: number)    { const next = list.filter((_, ix) => ix !== i); setList(next); onCommit(next) }
  function patch(i: number, p: Partial<T>) { setList(list.map((x, ix) => ix === i ? { ...x, ...p } : x)) }
  function commit()             { onCommit(list) }

  return (
    <div>
      <label className="block text-[11px] font-bold text-portal-text mb-1">{label}</label>
      {hint && <p className="text-[10px] text-portal-sub mb-2">{hint}</p>}
      <div className="space-y-3">
        {list.map((item, i) => (
          <div key={i} className="bg-white border border-portal-border rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                {renderRow(item, p => patch(i, p), commit)}
              </div>
              <button type="button" onClick={() => remove(i)}
                className="text-portal-red hover:text-portal-text shrink-0 mt-1">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-[11px] text-portal-muted italic">Nothing yet.</p>
        )}
      </div>
      <button type="button" onClick={add}
        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-portal-blue border border-portal-blue/30 rounded hover:bg-portal-blue-lt">
        <Plus size={11} /> {addLabel}
      </button>
    </div>
  )
}
