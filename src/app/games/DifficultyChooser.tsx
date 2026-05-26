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
      {/* Wraps to two rows on small screens so the kids tile stacks underneath
          the two adult tiers naturally. */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-1 bg-muted rounded-2xl max-w-md mx-auto">
        {DIFFICULTIES_DISPLAY_ORDER.map(d => {
          const isKids = d === 'easy'
          const isActive = current === d
          const base = 'px-4 py-2 rounded-full text-sm font-semibold transition-colors inline-flex items-center gap-1.5'
          let cls: string
          if (isActive) {
            cls = isKids
              ? 'bg-amber-400 text-amber-950 shadow-sm'
              : 'bg-primary text-primary-foreground shadow-sm'
          } else {
            cls = isKids
              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              : 'text-muted-foreground hover:text-foreground'
          }
          return (
            <button
              key={d}
              type="button"
              onClick={() => set(d)}
              className={`${base} ${cls}`}
            >
              {isKids && <span aria-hidden="true">🧒</span>}
              {DIFFICULTY_LABELS[d]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
