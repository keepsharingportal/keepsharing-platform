'use client'

// NavToggleList — interactive list of every nav item in the site
// catalog, with per-item Show / Hide / Rename / New-tab controls plus
// an "+ Add Custom Item" button per group. Reads the current overrides
// from the admin API on mount, lets the editor mutate them, and writes
// back through /api/admin/site/nav-visibility.
//
// The Header group renders as a nested tree — top-level items first,
// with each dropdown's children indented immediately under it — so
// editors see the same shape they see on the public site. Footer
// columns stay flat.

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye, EyeOff, ExternalLink, RefreshCw, AlertTriangle, Plus, Trash2,
  Edit3, X, Check, ChevronDown,
} from 'lucide-react'
import type { NavGroup, NavItem } from '@/lib/site-nav/items'

interface AdminRow {
  key:               string
  hidden:            boolean
  label_override:    string | null
  href_override:     string | null
  open_in_new_tab:   boolean
  is_custom:         boolean
  parent_key:        string | null
  sort_order:        number | null
}

interface OverrideMap {
  [key: string]: AdminRow
}

interface Props {
  catalog: NavGroup[]
}

export function NavToggleList({ catalog }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [rows,    setRows]    = useState<OverrideMap>({})
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [err,     setErr]     = useState<string | null>(null)

  function reload() {
    setLoading(true)
    fetch('/api/admin/site/nav-visibility', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then((j: { rows?: AdminRow[] } | null) => {
        const map: OverrideMap = {}
        for (const row of j?.rows ?? []) map[row.key] = row
        setRows(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }
  useEffect(() => { reload() }, [])

  async function toggle(key: string, currentlyHidden: boolean) {
    setBusyKey(key); setErr(null)
    try {
      const res = await fetch('/api/admin/site/nav-visibility', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ key, hidden: !currentlyHidden }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j?.error ?? `HTTP ${res.status}`)
        return
      }
      reload()
      startTransition(() => router.refresh())
    } finally {
      setBusyKey(null)
    }
  }

  async function bulkToggle(keys: string[], targetHidden: boolean) {
    setErr(null)
    setBusyKey(`__group__:${keys[0] ?? ''}`)
    try {
      await Promise.all(keys.map(async key => {
        const currentlyHidden = rows[key]?.hidden ?? false
        if (currentlyHidden === targetHidden) return
        await fetch('/api/admin/site/nav-visibility', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ key, hidden: targetHidden }),
        })
      }))
      reload()
      startTransition(() => router.refresh())
    } finally {
      setBusyKey(null)
    }
  }

  async function patch(key: string, updates: Partial<{ labelOverride: string | null; hrefOverride: string | null; openInNewTab: boolean }>) {
    setBusyKey(key); setErr(null)
    try {
      const res = await fetch('/api/admin/site/nav-visibility', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ key, ...updates }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j?.error ?? `HTTP ${res.status}`)
        return
      }
      reload()
      startTransition(() => router.refresh())
    } finally {
      setBusyKey(null)
    }
  }

  async function deleteItem(key: string) {
    setBusyKey(key); setErr(null)
    try {
      const res = await fetch(`/api/admin/site/nav-visibility?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j?.error ?? `HTTP ${res.status}`)
        return
      }
      reload()
      startTransition(() => router.refresh())
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-lg bg-portal-red-lt border border-portal-red/30 px-4 py-3 text-sm font-semibold text-portal-red flex items-center gap-2">
          <AlertTriangle size={14} /> {err}
        </div>
      )}

      {catalog.map(group => (
        <GroupCard
          key={group.groupLabel}
          group={group}
          rows={rows}
          loading={loading}
          busyKey={busyKey}
          customs={Object.values(rows).filter(r => r.is_custom)}
          onToggle={toggle}
          onBulk={bulkToggle}
          onPatch={patch}
          onDelete={deleteItem}
          onReload={reload}
        />
      ))}
    </div>
  )
}

// ── Group card ────────────────────────────────────────────────────────────

interface GroupCardProps {
  group:    NavGroup
  rows:     OverrideMap
  loading:  boolean
  busyKey:  string | null
  customs:  AdminRow[]
  onToggle: (key: string, currentlyHidden: boolean) => Promise<void>
  onBulk:   (keys: string[], targetHidden: boolean) => Promise<void>
  onPatch:  (key: string, updates: Partial<{ labelOverride: string | null; hrefOverride: string | null; openInNewTab: boolean }>) => Promise<void>
  onDelete: (key: string) => Promise<void>
  onReload: () => void
}

function GroupCard({ group, rows, loading, busyKey, customs, onToggle, onBulk, onPatch, onDelete, onReload }: GroupCardProps) {
  const [addingParent, setAddingParent] = useState<string | null>(null)

  // For nested groups, render top-level items first then their children
  // indented underneath. For flat groups, render every item in catalog
  // order.
  const isNested = !!group.nested
  const topLevel = isNested ? group.items.filter(i => !i.parentKey) : group.items
  const childrenByParent = new Map<string, NavItem[]>()
  if (isNested) {
    for (const child of group.items) {
      if (!child.parentKey) continue
      const arr = childrenByParent.get(child.parentKey) ?? []
      arr.push(child)
      childrenByParent.set(child.parentKey, arr)
    }
  }

  // Custom items grouped by parent_key so admins see their additions
  // under the right dropdown.
  const customsByParent = new Map<string | null, AdminRow[]>()
  for (const c of customs) customsByParent.set(c.parent_key, [...(customsByParent.get(c.parent_key) ?? []), c])

  // Bulk toggle counts the catalog items only (custom items have their
  // own delete UX).
  const allKeys     = group.items.map(i => i.key)
  const hiddenCount = allKeys.filter(k => rows[k]?.hidden).length
  const total       = group.items.length
  const allHidden   = hiddenCount === total
  const allVisible  = hiddenCount === 0
  const groupBusy   = busyKey === `__group__:${allKeys[0] ?? ''}`

  return (
    <section className="bg-white rounded-lg border border-portal-border overflow-hidden">
      <header className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-portal-text">
            {group.groupLabel}
            <span className="ml-2 text-xs font-semibold text-portal-muted">
              {total - hiddenCount} of {total} visible
            </span>
          </h2>
          <p className="text-xs text-portal-sub mt-0.5">
            Hidden items disappear from the public site within ~30 seconds.
          </p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onBulk(allKeys, false)}
              disabled={groupBusy || allVisible}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ring-1 bg-portal-green-lt text-portal-green ring-emerald-200 hover:bg-portal-green-lt disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {groupBusy ? <RefreshCw size={11} className="animate-spin" /> : <Eye size={11} />}
              Show all
            </button>
            <button
              type="button"
              onClick={() => onBulk(allKeys, true)}
              disabled={groupBusy || allHidden}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ring-1 bg-portal-red-lt text-portal-red ring-rose-200 hover:bg-portal-red-lt disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {groupBusy ? <RefreshCw size={11} className="animate-spin" /> : <EyeOff size={11} />}
              Hide all
            </button>
          </div>
        )}
      </header>

      <ul className="divide-y divide-portal-border">
        {loading && (
          <li className="px-5 py-6 text-xs text-portal-muted inline-flex items-center gap-2">
            <RefreshCw size={11} className="animate-spin" /> Loading items
          </li>
        )}
        {!loading && topLevel.map(item => (
          <Row
            key={item.key}
            item={item}
            row={rows[item.key]}
            busy={busyKey === item.key}
            indent={0}
            onToggle={onToggle}
            onPatch={onPatch}
            onDelete={onDelete}
          />
        ))}
        {!loading && isNested && topLevel.map(item => {
          // Only show children block if this item has children (catalog or custom).
          const catalogChildren = childrenByParent.get(item.key) ?? []
          const customChildren  = (customsByParent.get(item.key) ?? [])
          if (catalogChildren.length === 0 && customChildren.length === 0 && addingParent !== item.key) return null
          return null  // children render inline below their parent — handled separately
        })}
      </ul>

      {/* For nested groups, render children indented + custom items + add button per parent */}
      {!loading && isNested && (
        <div className="border-t border-portal-border">
          {topLevel.map(parent => {
            const catalogChildren = childrenByParent.get(parent.key) ?? []
            const customChildren  = customsByParent.get(parent.key) ?? []
            if (catalogChildren.length === 0 && customChildren.length === 0) return null
            return (
              <div key={`children-${parent.key}`} className="px-5 py-3 bg-portal-bg/40">
                <p className="text-[10px] uppercase tracking-wide font-bold text-portal-muted mb-2">
                  Children of {rows[parent.key]?.label_override ?? parent.label}
                </p>
                <ul className="space-y-0">
                  {catalogChildren.map(child => (
                    <Row
                      key={child.key}
                      item={child}
                      row={rows[child.key]}
                      busy={busyKey === child.key}
                      indent={1}
                      onToggle={onToggle}
                      onPatch={onPatch}
                      onDelete={onDelete}
                    />
                  ))}
                  {customChildren.map(c => (
                    <CustomRow
                      key={c.key}
                      row={c}
                      busy={busyKey === c.key}
                      onPatch={onPatch}
                      onDelete={onDelete}
                    />
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setAddingParent(parent.key)}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-portal-blue hover:bg-portal-blue-lt"
                >
                  <Plus size={11} /> Add link to {rows[parent.key]?.label_override ?? parent.label}
                </button>
                {addingParent === parent.key && (
                  <AddCustomItemForm
                    parentKey={parent.key}
                    onClose={() => setAddingParent(null)}
                    onAdded={() => { setAddingParent(null); onReload() }}
                  />
                )}
              </div>
            )
          })}

          {/* Top-level custom items (no parent) for the Header group */}
          {(customsByParent.get(null)?.length ?? 0) > 0 && (
            <div className="px-5 py-3 bg-portal-bg/40">
              <p className="text-[10px] uppercase tracking-wide font-bold text-portal-muted mb-2">
                Custom top-level items
              </p>
              <ul className="space-y-0">
                {(customsByParent.get(null) ?? []).map(c => (
                  <CustomRow
                    key={c.key}
                    row={c}
                    busy={busyKey === c.key}
                    onPatch={onPatch}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* For flat groups (footer columns), show custom items + Add button below the catalog list */}
      {!loading && !isNested && (() => {
        // Footer columns use a parent_key like 'footer.explore' to scope
        // custom items to that column. We infer the column from the
        // first catalog item's key prefix.
        const inferredParent = group.items[0]?.key.split('.').slice(0, 2).join('.') ?? null
        const customChildren = customsByParent.get(inferredParent) ?? []
        return (
          <div className="px-5 py-3 bg-portal-bg/40 border-t border-portal-border">
            {customChildren.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wide font-bold text-portal-muted mb-2">
                  Custom items
                </p>
                <ul className="space-y-0 mb-2">
                  {customChildren.map(c => (
                    <CustomRow
                      key={c.key}
                      row={c}
                      busy={busyKey === c.key}
                      onPatch={onPatch}
                      onDelete={onDelete}
                    />
                  ))}
                </ul>
              </>
            )}
            <button
              type="button"
              onClick={() => setAddingParent(inferredParent)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-portal-blue hover:bg-portal-blue-lt"
            >
              <Plus size={11} /> Add link to {group.groupLabel.replace(/^Footer\s*—\s*/i, '')}
            </button>
            {addingParent === inferredParent && (
              <AddCustomItemForm
                parentKey={inferredParent}
                onClose={() => setAddingParent(null)}
                onAdded={() => { setAddingParent(null); onReload() }}
              />
            )}
          </div>
        )
      })()}
    </section>
  )
}

// ── Catalog row ───────────────────────────────────────────────────────────

interface RowProps {
  item:    NavItem
  row?:    AdminRow
  busy:    boolean
  indent:  number
  onToggle: (key: string, currentlyHidden: boolean) => Promise<void>
  onPatch:  (key: string, updates: Partial<{ labelOverride: string | null; hrefOverride: string | null; openInNewTab: boolean }>) => Promise<void>
  onDelete: (key: string) => Promise<void>
}

function Row({ item, row, busy, indent, onToggle, onPatch, onDelete }: RowProps) {
  const isHidden     = row?.hidden ?? false
  const labelDisplay = row?.label_override ?? item.label
  const hrefDisplay  = row?.href_override  ?? item.href
  const openInNewTab = row?.open_in_new_tab ?? false
  const hasOverrides = !!(row?.label_override || row?.href_override || row?.open_in_new_tab)
  const [renaming, setRenaming] = useState(false)
  const [draftLabel, setDraftLabel] = useState(labelDisplay)
  const [draftHref,  setDraftHref]  = useState(hrefDisplay)

  function startRename() {
    setDraftLabel(labelDisplay)
    setDraftHref(hrefDisplay)
    setRenaming(true)
  }
  async function saveRename() {
    const next: { labelOverride?: string | null; hrefOverride?: string | null } = {}
    next.labelOverride = draftLabel.trim() === item.label ? null : draftLabel.trim()
    next.hrefOverride  = draftHref.trim()  === item.href  ? null : draftHref.trim()
    await onPatch(item.key, next)
    setRenaming(false)
  }
  function cancelRename() {
    setRenaming(false)
  }

  return (
    <li
      className="px-5 py-3 flex items-start gap-4"
      style={{ paddingLeft: `${20 + indent * 24}px` }}
    >
      <div className="flex-1 min-w-0">
        {renaming ? (
          <div className="space-y-1.5">
            <input
              value={draftLabel}
              onChange={e => setDraftLabel(e.target.value)}
              placeholder="Label"
              className="w-full px-2 py-1 text-sm rounded-md border border-portal-border focus:outline-none focus:border-portal-blue"
              autoFocus
            />
            <input
              value={draftHref}
              onChange={e => setDraftHref(e.target.value)}
              placeholder="URL"
              className="w-full px-2 py-1 text-xs font-mono rounded-md border border-portal-border focus:outline-none focus:border-portal-blue"
            />
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={saveRename}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Check size={10} /> Save
              </button>
              <button
                type="button"
                onClick={cancelRename}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-portal-sub hover:bg-portal-row-hover"
              >
                <X size={10} /> Cancel
              </button>
              {hasOverrides && (
                <button
                  type="button"
                  onClick={() => onPatch(item.key, { labelOverride: null, hrefOverride: null }).then(() => setRenaming(false))}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-portal-sub hover:bg-portal-row-hover ml-auto"
                  title="Reset to catalog default"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-portal-text truncate">{labelDisplay}</p>
              {hasOverrides && (
                <span className="inline-flex items-center text-[9px] font-bold text-portal-amber bg-portal-amber-lt border border-portal-amber/30 px-1.5 py-0.5 rounded-full">
                  Edited
                </span>
              )}
              {item.external && <ExternalLink size={11} className="text-portal-muted" />}
            </div>
            <p className="text-[11px] text-portal-muted truncate mt-0.5 font-mono">
              {hrefDisplay} <span className="text-portal-sub">· {item.key}</span>
            </p>
          </>
        )}
      </div>

      {!renaming && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onPatch(item.key, { openInNewTab: !openInNewTab })}
            disabled={busy}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ring-1 ${
              openInNewTab
                ? 'bg-sky-50 text-sky-700 ring-sky-200'
                : 'bg-white text-portal-sub ring-gray-200 hover:ring-gray-400'
            }`}
            title={openInNewTab ? 'Opens in new tab — click to disable' : 'Click to open in new tab'}
          >
            <ExternalLink size={10} /> {openInNewTab ? 'New tab' : 'Same tab'}
          </button>
          <button
            type="button"
            onClick={startRename}
            disabled={busy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-white text-portal-text ring-1 ring-gray-200 hover:ring-gray-400"
            title="Rename / change URL"
          >
            <Edit3 size={10} /> Rename
          </button>
          <button
            type="button"
            onClick={() => onToggle(item.key, isHidden)}
            disabled={busy}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ring-1 ${
              isHidden
                ? 'bg-portal-red-lt text-portal-red ring-rose-200 hover:bg-portal-red-lt'
                : 'bg-portal-green-lt text-portal-green ring-emerald-200 hover:bg-portal-green-lt'
            }`}
          >
            {busy ? <RefreshCw size={11} className="animate-spin" /> : isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
            {isHidden ? 'Hidden' : 'Visible'}
          </button>
        </div>
      )}
    </li>
  )
}

// ── Custom item row ───────────────────────────────────────────────────────

interface CustomRowProps {
  row:      AdminRow
  busy:     boolean
  onPatch:  (key: string, updates: Partial<{ labelOverride: string | null; hrefOverride: string | null; openInNewTab: boolean }>) => Promise<void>
  onDelete: (key: string) => Promise<void>
}

function CustomRow({ row, busy, onPatch, onDelete }: CustomRowProps) {
  const [renaming, setRenaming] = useState(false)
  const [draftLabel, setDraftLabel] = useState(row.label_override ?? '')
  const [draftHref,  setDraftHref]  = useState(row.href_override ?? '')

  async function saveRename() {
    await onPatch(row.key, { labelOverride: draftLabel.trim(), hrefOverride: draftHref.trim() })
    setRenaming(false)
  }

  return (
    <li className="px-5 py-3 flex items-start gap-4 bg-portal-amber-lt/30 rounded-md">
      <div className="flex-1 min-w-0">
        {renaming ? (
          <div className="space-y-1.5">
            <input
              value={draftLabel}
              onChange={e => setDraftLabel(e.target.value)}
              className="w-full px-2 py-1 text-sm rounded-md border border-portal-border focus:outline-none focus:border-portal-blue"
              autoFocus
            />
            <input
              value={draftHref}
              onChange={e => setDraftHref(e.target.value)}
              className="w-full px-2 py-1 text-xs font-mono rounded-md border border-portal-border focus:outline-none focus:border-portal-blue"
            />
            <div className="flex items-center gap-2 mt-1">
              <button type="button" onClick={saveRename} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700">
                <Check size={10} /> Save
              </button>
              <button type="button" onClick={() => setRenaming(false)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-portal-sub hover:bg-portal-row-hover">
                <X size={10} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-portal-text truncate">{row.label_override}</p>
              <span className="inline-flex items-center text-[9px] font-bold text-portal-amber bg-portal-amber-lt border border-portal-amber/30 px-1.5 py-0.5 rounded-full">Custom</span>
            </div>
            <p className="text-[11px] text-portal-muted truncate mt-0.5 font-mono">
              {row.href_override}
            </p>
          </>
        )}
      </div>

      {!renaming && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onPatch(row.key, { openInNewTab: !row.open_in_new_tab })}
            disabled={busy}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold ring-1 ${
              row.open_in_new_tab
                ? 'bg-sky-50 text-sky-700 ring-sky-200'
                : 'bg-white text-portal-sub ring-gray-200 hover:ring-gray-400'
            }`}
          >
            <ExternalLink size={10} /> {row.open_in_new_tab ? 'New tab' : 'Same tab'}
          </button>
          <button type="button" onClick={() => setRenaming(true)} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-white text-portal-text ring-1 ring-gray-200 hover:ring-gray-400">
            <Edit3 size={10} /> Edit
          </button>
          <button type="button" onClick={() => onDelete(row.key)} disabled={busy} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-white text-portal-red border border-portal-red/30 hover:bg-portal-red-lt">
            <Trash2 size={10} /> Delete
          </button>
        </div>
      )}
    </li>
  )
}

// ── Add custom item form ──────────────────────────────────────────────────

interface AddFormProps {
  parentKey: string | null
  onClose:   () => void
  onAdded:   () => void
}

function AddCustomItemForm({ parentKey, onClose, onAdded }: AddFormProps) {
  const [label, setLabel] = useState('')
  const [href,  setHref]  = useState('')
  const [openInNewTab, setOpenInNewTab] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!label.trim() || !href.trim()) {
      setErr('Both label and URL are required.')
      return
    }
    setSubmitting(true); setErr(null)
    try {
      const res = await fetch('/api/admin/site/nav-visibility', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ label: label.trim(), href: href.trim(), parentKey, openInNewTab }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j?.error ?? `HTTP ${res.status}`)
        return
      }
      onAdded()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-portal-amber-lt/40 px-3 py-3 space-y-2">
      <p className="text-[10px] uppercase tracking-wide font-bold text-portal-amber">Add a custom link</p>
      {err && <p className="text-xs text-portal-red">{err}</p>}
      <div className="space-y-1.5">
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Label (e.g. Print Edition)"
          className="w-full px-2.5 py-1.5 text-sm rounded-md border border-portal-border focus:outline-none focus:border-portal-blue bg-white"
        />
        <input
          value={href}
          onChange={e => setHref(e.target.value)}
          placeholder="URL (e.g. https://issuu.com/... or /custom-page)"
          className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-portal-border focus:outline-none focus:border-portal-blue bg-white"
        />
        <label className="flex items-center gap-2 text-xs text-portal-text">
          <input
            type="checkbox"
            checked={openInNewTab}
            onChange={e => setOpenInNewTab(e.target.checked)}
            className="rounded"
          />
          Open in new tab
        </label>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-portal-navy text-white hover:bg-portal-navy/90 disabled:opacity-50"
        >
          {submitting ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />}
          Add link
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold text-portal-text hover:bg-portal-row-hover"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
