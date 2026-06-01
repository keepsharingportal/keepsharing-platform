'use client'

// NavToggleList — interactive list of every nav item in the site
// catalog, with a per-item Show / Hide toggle. Reads the current
// hidden-keys set from the API on mount, lets the editor flip them,
// and writes back through /api/admin/site/nav-visibility.
//
// "Hide" is the soft option — flipping it back to On restores the item
// immediately. We don't expose a hard "delete from catalog" action
// because the catalog lives in code and editing it requires a deploy;
// hiding is the right primitive for the launch-week use case.

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye, EyeOff, ExternalLink, RefreshCw, AlertTriangle,
} from 'lucide-react'
import type { NavGroup } from '@/lib/site-nav/items'

interface Props {
  catalog: NavGroup[]
}

export function NavToggleList({ catalog }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [hidden,  setHidden]  = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [err,     setErr]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/site/nav-visibility', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then((j: { hidden?: Array<{ key: string }> } | null) => {
        const set = new Set<string>()
        for (const row of j?.hidden ?? []) set.add(row.key)
        setHidden(set)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function toggle(key: string, currentlyHidden: boolean) {
    setBusyKey(key)
    setErr(null)
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
      setHidden(prev => {
        const next = new Set(prev)
        if (currentlyHidden) next.delete(key)
        else next.add(key)
        return next
      })
      startTransition(() => router.refresh())
    } finally {
      setBusyKey(null)
    }
  }

  // Bulk-toggle every item in a group. Useful for the "9 guides, 7 of
  // them aren't ready yet" case — one click instead of nine. Fires the
  // toggles concurrently and waits for them all.
  async function bulkToggle(keys: string[], targetHidden: boolean) {
    setErr(null)
    const groupBusy = `__group__:${keys.join(',')}`
    setBusyKey(groupBusy)
    try {
      const results = await Promise.all(
        keys.map(async key => {
          // Skip ones that are already in the target state — saves a
          // round-trip per item and avoids unnecessary updated_at churn.
          const currentlyHidden = hidden.has(key)
          if (currentlyHidden === targetHidden) return { ok: true }
          const res = await fetch('/api/admin/site/nav-visibility', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ key, hidden: targetHidden }),
          })
          return { ok: res.ok, key }
        }),
      )
      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) {
        setErr(`${failed.length} item${failed.length === 1 ? '' : 's'} failed to update.`)
      }
      setHidden(prev => {
        const next = new Set(prev)
        if (targetHidden) keys.forEach(k => next.add(k))
        else keys.forEach(k => next.delete(k))
        return next
      })
      startTransition(() => router.refresh())
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-800 flex items-center gap-2">
          <AlertTriangle size={14} /> {err}
        </div>
      )}

      {catalog.map(group => {
        const groupKeys      = group.items.map(i => i.key)
        const hiddenInGroup  = groupKeys.filter(k => hidden.has(k)).length
        const total          = group.items.length
        const allHidden      = hiddenInGroup === total
        const allVisible     = hiddenInGroup === 0
        const groupBusyKey   = `__group__:${groupKeys.join(',')}`
        const groupBusy      = busyKey === groupBusyKey
        return (
        <section key={group.groupLabel} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-gray-900">
                {group.groupLabel}
                <span className="ml-2 text-xs font-semibold text-gray-400">
                  {total - hiddenInGroup} of {total} visible
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Hidden items disappear from the public site within ~30 seconds.
              </p>
            </div>
            {!loading && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => bulkToggle(groupKeys, false)}
                  disabled={groupBusy || allVisible}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {groupBusy ? <RefreshCw size={11} className="animate-spin" /> : <Eye size={11} />}
                  Show all
                </button>
                <button
                  type="button"
                  onClick={() => bulkToggle(groupKeys, true)}
                  disabled={groupBusy || allHidden}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ring-1 bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {groupBusy ? <RefreshCw size={11} className="animate-spin" /> : <EyeOff size={11} />}
                  Hide all
                </button>
              </div>
            )}
          </header>
          <ul className="divide-y divide-gray-100">
            {group.items.map(item => {
              const isHidden  = hidden.has(item.key)
              const isBusy    = busyKey === item.key
              return (
                <li key={item.key} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.label}</p>
                      {item.external && <ExternalLink size={11} className="text-gray-400" />}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5 font-mono">
                      {item.href} · <span className="text-gray-500">{item.key}</span>
                    </p>
                  </div>
                  {loading ? (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <RefreshCw size={11} className="animate-spin" /> Loading
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(item.key, isHidden)}
                      disabled={isBusy}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ring-1 transition disabled:opacity-50 ${
                        isHidden
                          ? 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {isBusy
                        ? <RefreshCw size={11} className="animate-spin" />
                        : isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                      {isHidden ? 'Hidden' : 'Visible'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
        )
      })}
    </div>
  )
}
