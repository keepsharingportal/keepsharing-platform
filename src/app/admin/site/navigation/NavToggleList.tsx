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

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-800 flex items-center gap-2">
          <AlertTriangle size={14} /> {err}
        </div>
      )}

      {catalog.map(group => (
        <section key={group.groupLabel} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <header className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-900">{group.groupLabel}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Hidden items disappear from the public site within ~30 seconds.
            </p>
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
      ))}
    </div>
  )
}
