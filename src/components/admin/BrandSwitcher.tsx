'use client'

// BrandSwitcher — dropdown rendered at the top of the admin sidebar so a
// publisher with access to multiple brands can flip between them. Super-
// admins get an additional "All brands" entry that aggregates across every
// market.
//
// Fetches /api/admin/me once on mount and caches it in component state.
// Switching brands POSTs to /api/admin/active-market (sets the cookie) and
// then refreshes the route so server components re-read the new active
// market from getAdminContext(). One source of truth for what the user is
// viewing — the cookie — and one place that decides what they can see — the
// admin_users row.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Globe, RefreshCw } from 'lucide-react'

interface MarketChoice {
  slug:        string
  short:       string
  displayName: string
}

interface AdminMe {
  email:          string
  fullName:       string | null
  role:           'super' | 'publisher' | 'editor'
  allowedMarkets: MarketChoice[]
  activeMarket:   string
  viewingAll:     boolean
}

const ALL_SLUG = 'all'

export function BrandSwitcher() {
  const router = useRouter()
  const [me, setMe]     = useState<AdminMe | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (!cancelled && j) setMe(j as AdminMe) })
      .catch(() => { /* ignore — sidebar will just hide the switcher */ })
    return () => { cancelled = true }
  }, [])

  async function switchTo(slug: string) {
    if (busy || !me || slug === activeSlug) { setOpen(false); return }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/active-market', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ market: slug }),
      })
      if (res.ok) {
        const j = await res.json()
        setMe(curr => curr ? { ...curr, activeMarket: j.activeMarket, viewingAll: j.activeMarket === ALL_SLUG && curr.role === 'super' } : curr)
        router.refresh()
      }
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  // Don't render anything until we have context — avoids a flash of fake
  // chrome on first paint.
  if (!me) return null
  // Single-market users don't need a switcher.
  if (me.role !== 'super' && me.allowedMarkets.length <= 1) return null

  const activeSlug = me.activeMarket
  const isAll      = me.role === 'super' && activeSlug === ALL_SLUG
  const activeLabel = isAll
    ? 'All brands'
    : me.allowedMarkets.find(m => m.slug === activeSlug)?.displayName ?? activeSlug

  return (
    <div className="relative px-3 pt-3 pb-2">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isAll ? (
            <Globe size={14} className="text-white/60 shrink-0" />
          ) : (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/10 text-[10px] font-bold text-white shrink-0">
              {me.allowedMarkets.find(m => m.slug === activeSlug)?.short ?? activeSlug.toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold leading-none mb-0.5">
              {me.role === 'super' ? 'Viewing' : 'Brand'}
            </p>
            <p className="text-xs font-semibold text-white truncate">
              {activeLabel}
            </p>
          </div>
        </div>
        {busy ? (
          <RefreshCw size={12} className="text-white/60 animate-spin shrink-0" />
        ) : (
          <ChevronDown size={12} className="text-white/40 shrink-0" />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
            aria-hidden
          />
          <div className="absolute left-3 right-3 top-full z-40 mt-1 rounded-lg bg-[#0f1729] border border-white/10 shadow-xl py-1 overflow-hidden">
            {me.role === 'super' && (
              <button
                type="button"
                onClick={() => switchTo(ALL_SLUG)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5"
              >
                <span className="inline-flex items-center gap-2">
                  <Globe size={12} className="text-white/60" />
                  All brands
                </span>
                {isAll && <Check size={12} className="text-emerald-400" />}
              </button>
            )}
            {me.allowedMarkets.map(m => {
              const isActive = !isAll && m.slug === activeSlug
              return (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => switchTo(m.slug)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-white hover:bg-white/5"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/10 text-[9px] font-bold shrink-0">
                      {m.short}
                    </span>
                    <span className="truncate font-semibold">{m.displayName}</span>
                  </span>
                  {isActive && <Check size={12} className="text-emerald-400 shrink-0" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
