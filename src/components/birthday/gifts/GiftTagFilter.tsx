'use client'

// Client-side tag filter for the gift list. Lets a parent narrow to
// 'Under $25', 'Screen-free', 'Experience', etc. without page reloads.
// Keeps reader engagement up — single-page browsing instead of bounce.

import { useState, useMemo } from 'react'
import { Filter, X } from 'lucide-react'
import { TAG_FILTERS, type GiftIdea } from '@/lib/birthday/gift-guides'
import { GiftIdeaCard } from './GiftIdeaCard'
import { GiftPullQuote } from './GiftPullQuote'

interface Props {
  ideas:    GiftIdea[]
  accent:   string
  /** Optional inline content (sponsor slot, pull quote) injected after
   *  the Nth visible card. Skipped when filtering narrows the list. */
  midRow?:  React.ReactNode
  midRowAfter?: number
}

export function GiftTagFilter({ ideas, accent, midRow, midRowAfter = 6 }: Props) {
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!activeTag) return ideas
    const filter = TAG_FILTERS.find(t => t.tag === activeTag)
    if (!filter) return ideas
    return ideas.filter(filter.matches)
  }, [ideas, activeTag])

  // Only inject the mid-row when the list is wide enough to "earn" it.
  const showMidRow = midRow && !activeTag && filtered.length > midRowAfter

  return (
    <section>
      {/* Filter chip bar */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <Filter size={11} /> Filter
        </span>
        <button
          type="button"
          onClick={() => setActiveTag(null)}
          className={`px-3 py-1.5 text-[12px] font-bold rounded-full transition-colors ${
            !activeTag
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
          }`}
        >
          All {ideas.length}
        </button>
        {TAG_FILTERS.map(f => {
          const count = ideas.filter(f.matches).length
          if (count === 0) return null
          const active = activeTag === f.tag
          return (
            <button
              key={f.tag}
              type="button"
              onClick={() => setActiveTag(active ? null : f.tag)}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-full transition-colors ${
                active
                  ? 'text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
              style={active ? { backgroundColor: accent } : undefined}
            >
              {f.label} <span className={`ml-1 ${active ? 'text-white/80' : 'text-slate-400'}`}>({count})</span>
            </button>
          )
        })}
        {activeTag && (
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-900"
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
          <p className="text-sm text-slate-500">No picks match this filter.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((idea, i) => (
            <div key={i} className={showMidRow && i === midRowAfter ? 'sm:col-span-2 lg:col-span-3' : ''}>
              {showMidRow && i === midRowAfter && (
                <div className="mb-4">
                  <GiftPullQuote accent={accent} />
                </div>
              )}
              <GiftIdeaCard idea={idea} accent={accent} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
