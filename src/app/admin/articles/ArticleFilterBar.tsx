'use client'

// ArticleFilterBar — replaces the horizontal tab strip with a search
// box and four compact dropdowns: Status · Section · Issue Month · Sort.
// Combined filters are supported (e.g. Status=Drafts + Section=Mom Knows
// Best + Month=May 2026). Each dropdown writes its dimension to the URL;
// changing one preserves the others and resets pagination to page 1.

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { Search, X, RefreshCw } from 'lucide-react'

export interface FilterOption {
  value: string
  label: string
  count?: number
}

interface Props {
  initialQuery:   string
  statusValue:    string
  sectionValue:   string
  monthValue:     string
  sortValue:      string
  totalResults:   number

  statusOptions:  FilterOption[]
  sectionOptions: FilterOption[]
  monthOptions:   FilterOption[]
  sortOptions:    FilterOption[]
}

export function ArticleFilterBar({
  initialQuery, statusValue, sectionValue, monthValue, sortValue, totalResults,
  statusOptions, sectionOptions, monthOptions, sortOptions,
}: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const [q, setQ] = useState(initialQuery)

  // Push URL when filter changes; resets page to 1.
  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (!v) params.delete(k)
      else    params.set(k, v)
    }
    params.delete('page')
    params.delete('filter') // legacy single-key — kill it on any change
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `/admin/articles?${qs}` : '/admin/articles', { scroll: false })
    })
  }

  // Debounce the search input — write q to URL 350ms after the last keystroke.
  useEffect(() => {
    if (q === initialQuery) return
    const t = setTimeout(() => pushParams({ q: q.trim() || null }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const hasAnyFilter = !!initialQuery || statusValue !== 'all' || sectionValue !== 'all' || monthValue !== 'all' || sortValue !== 'newest'

  function clearAll() {
    setQ('')
    startTransition(() => router.push('/admin/articles', { scroll: false }))
  }

  const sel = 'h-9 px-3 pr-8 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 cursor-pointer appearance-none bg-no-repeat bg-right'
  const selBg = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%239ca3af'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`, backgroundPosition: 'right 6px center', backgroundSize: '16px' }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by title, slug, or author..."
            className="w-full h-9 pl-8 pr-8 text-xs text-gray-800 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 placeholder:text-gray-400"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-700"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status */}
        <select
          value={statusValue}
          onChange={e => pushParams({ status: e.target.value === 'all' ? null : e.target.value })}
          className={sel}
          style={selBg}
          aria-label="Filter by status"
        >
          {statusOptions.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}{o.count != null && o.value !== 'all' ? ` (${o.count})` : ''}
            </option>
          ))}
        </select>

        {/* Section */}
        <select
          value={sectionValue}
          onChange={e => pushParams({ section: e.target.value === 'all' ? null : e.target.value })}
          className={sel}
          style={selBg}
          aria-label="Filter by section"
        >
          {sectionOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Month */}
        <select
          value={monthValue}
          onChange={e => pushParams({ month: e.target.value === 'all' ? null : e.target.value })}
          className={sel}
          style={selBg}
          aria-label="Filter by issue month"
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortValue}
          onChange={e => pushParams({ sort: e.target.value === 'newest' ? null : e.target.value })}
          className={sel}
          style={selBg}
          aria-label="Sort articles"
        >
          {sortOptions.map(o => (
            <option key={o.value} value={o.value}>Sort: {o.label}</option>
          ))}
        </select>

        {/* Clear */}
        {hasAnyFilter && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 px-2.5 h-9 text-[11px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X size={11} /> Clear
          </button>
        )}

        {/* Pending spinner */}
        {pending && (
          <RefreshCw size={12} className="text-gray-400 animate-spin" aria-label="Updating" />
        )}
      </div>

      <p className="text-[11px] text-gray-400 px-1">
        {totalResults === 0 ? 'No articles match.' : `${totalResults.toLocaleString()} article${totalResults === 1 ? '' : 's'} match.`}
        {hasAnyFilter && totalResults === 0 && (
          <button onClick={clearAll} className="ml-1 text-portal-blue hover:underline font-semibold">
            Clear filters →
          </button>
        )}
      </p>
    </div>
  )
}
