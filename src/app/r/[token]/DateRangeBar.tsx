'use client'

// Date-range picker for the public advertiser report. Writes since/until
// to the URL search params, which the server component reads and uses to
// re-aggregate. Preset chips on the left (7d / 30d / 90d / All / Custom)
// plus two calendar inputs that expand when "Custom" is picked.

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

export function DateRangeBar({ since, until }: { since: string; until: string }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // Detect the active preset by matching the current range against shifts
  // off today. Slop of 1 day handles UTC vs local edge cases.
  const today = new Date().toISOString().slice(0, 10)
  const isToday = until === today
  let activePreset: string = 'custom'
  if (isToday) {
    for (const p of PRESETS) {
      if (p.id === 'custom') continue
      const s = shift(p.days).since
      if (s === since) { activePreset = p.id; break }
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
    if (id === 'custom') return  // expand picker but don't navigate yet
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
    <div className="border-b border-slate-200 bg-slate-50 print:hidden">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">Date range</span>
        {PRESETS.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => pickPreset(p.id)}
            className={`text-xs px-2.5 py-1.5 rounded-full font-semibold border transition-colors ${
              activePreset === p.id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
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
              className="text-xs px-2 py-1.5 border border-slate-300 rounded outline-none focus:border-slate-500 bg-white"
            />
            <span className="text-xs text-slate-400">→</span>
            <input
              type="date"
              value={customUntil}
              min={customSince}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setCustomUntil(e.target.value)}
              className="text-xs px-2 py-1.5 border border-slate-300 rounded outline-none focus:border-slate-500 bg-white"
            />
            <button
              type="button"
              onClick={applyCustom}
              className="text-xs px-3 py-1.5 rounded font-semibold bg-slate-900 text-white border border-slate-900 hover:bg-slate-800"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
