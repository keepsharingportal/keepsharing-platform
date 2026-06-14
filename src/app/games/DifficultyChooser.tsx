'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DIFFICULTIES_DISPLAY_ORDER, DIFFICULTY_LABELS, type Difficulty } from '@/lib/games/types'

export function DifficultyChooser({ current }: { current: Difficulty }) {
  const router = useRouter()
  const sp     = useSearchParams()

  function set(d: Difficulty) {
    const params = new URLSearchParams(sp.toString())
    params.set('diff', d)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pick your level</p>
      {/* Three equal tiers in a natural left-to-right ramp: Easy →
          Challenging → Brain Squeezing. The old "kids tile last with
          amber chrome + 🧒 emoji" treatment was removed (Jun 2026) —
          Easy is just a difficulty level, not a separate kid mode. */}
      <div className="inline-flex items-center justify-center gap-1 p-1 bg-muted rounded-2xl mx-auto">
        {DIFFICULTIES_DISPLAY_ORDER.map(d => {
          const isActive = current === d
          return (
            <button
              key={d}
              type="button"
              onClick={() => set(d)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
