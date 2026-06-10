'use client'

// Admin date-range picker — same UX pattern as the public advertiser
// report's DateRangeBar but styled in Portal tokens. Writes since/until
// to URL search params so server components re-render with new data.

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

const PRESETS = [
  { id: '7d',    label: '7 days',  days: 7   },
  { id: '30d',   label: '30 days', days: 30  },
  { id: '90d',   label: '90 days', days: 90  },
  { id: 'all',   label: 'All time', days: 365 * 5 },
  { id: 'custom', label: 'Custom', days: 0   },
] as const

function shift(days: number): { since: string; until: string } {
  const until = new Date()
  const since = new Date(until); since.setUTCDate(since.getUTCDate() - (days - 1))
  return {
    since: since.toISOString().slice(0, 10),
    until: until.toISOString().slice(0, 10),
  }
}

export function AdminDateRangeBar({ since, until }: { since: string; until: string }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const today = new Date().toISOString().slice(0, 10)
  const isToday = until === today
  let activePreset: string = 'custom'
  if (isToday) {
    for (const p of PRESETS) {
      if (p.id === 'custom') continue
      if (shift(p.days).since === since) { activePreset = p.id; break }
    }
  }

  const [customSince, setCustomSince] = useState(since)
  const [customUntil, setCustomUntil] = useState(until)

  function pushRange(s: string, u: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('since', s)
    params.set('until', u)
    startTransition(() => {
      router.push(`?${params.toString()}`, { scroll: false })
    })
  }

  function pickPreset(id: string) {
    if (id === 'custom') return
    const p = PRESETS.find(x => x.id === id)
    if (!p) return
    const r = shift(p.days)
    pushRange(r.since, r.until)
  }

  function applyCustom() {
    if (!customSince || !customUntil) return
    pushRange(customSince, customUntil)
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg px-4 py-2.5 flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-bold uppercase tracking-wider text-portal-muted mr-1">Date range</span>
      {PRESETS.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => pickPreset(p.id)}
          className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-colors ${
            activePreset === p.id
              ? 'bg-portal-navy text-white border-portal-navy'
              : 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
          }`}
        >
          {p.label}
        </button>
      ))}
      {activePreset === 'custom' && (
        <div className="ml-2 inline-flex items-center gap-1.5">
          <input
            type="date"
            value={customSince}
            max={customUntil}
            onChange={e => setCustomSince(e.target.value)}
            className="text-xs px-2 py-1 border border-portal-border rounded outline-none focus:border-portal-blue bg-white"
          />
          <span className="text-xs text-portal-muted">→</span>
          <input
            type="date"
            value={customUntil}
            min={customSince}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => setCustomUntil(e.target.value)}
            className="text-xs px-2 py-1 border border-portal-border rounded outline-none focus:border-portal-blue bg-white"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="text-xs px-3 py-1 rounded font-semibold bg-portal-navy text-white border border-portal-navy hover:bg-portal-navy/90"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
