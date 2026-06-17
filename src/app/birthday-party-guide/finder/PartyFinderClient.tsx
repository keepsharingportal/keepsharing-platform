'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { MapPin, Phone, Star, Filter, X, Search } from 'lucide-react'

interface Row {
  id:           string
  category:     string
  listing_tier: string
  slug:         string
  business_name: string
  card_hook:    string | null
  hero:         string | null
  neighborhood: string | null
  city:         string | null
  phone:        string | null
  website:      string | null
  tier:         string | null   // birthday_tier
  ages:         [number, number] | null
  venue_kind:   string[] | null
  is_local:     boolean
  is_woman:     boolean
}

export function PartyFinderClient({ rows, categories, neighborhoods }: {
  rows: Row[]
  categories: string[]
  neighborhoods: string[]
}) {
  const [search,        setSearch]        = useState('')
  const [selectedCats,  setSelectedCats]  = useState<Set<string>>(new Set())
  const [selectedAge,   setSelectedAge]   = useState<number | null>(null)
  const [selectedKind,  setSelectedKind]  = useState<'all' | 'indoor' | 'outdoor'>('all')
  const [selectedHood,  setSelectedHood]  = useState<string>('')
  const [showFilters,   setShowFilters]   = useState(false)

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (search && !`${r.business_name} ${r.card_hook ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
      if (selectedCats.size > 0 && !selectedCats.has(r.category)) return false
      if (selectedAge !== null && r.ages && (selectedAge < r.ages[0] || selectedAge > r.ages[1])) return false
      if (selectedKind !== 'all' && r.venue_kind && !r.venue_kind.includes(selectedKind) && !r.venue_kind.includes('both')) return false
      if (selectedHood && r.neighborhood !== selectedHood) return false
      return true
    }).sort((a, b) => {
      // Sponsored tier first
      const rank = (r: Row) => r.tier === 'presenting' ? 0 : r.tier === 'sponsored_category' ? 1 : r.tier === 'featured' ? 2 : 3
      return rank(a) - rank(b)
    })
  }, [rows, search, selectedCats, selectedAge, selectedKind, selectedHood])

  function toggleCat(c: string) {
    setSelectedCats(prev => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else             next.add(c)
      return next
    })
  }
  function clearAll() {
    setSearch(''); setSelectedCats(new Set()); setSelectedAge(null); setSelectedKind('all'); setSelectedHood('')
  }
  const activeFilterCount = (search ? 1 : 0) + selectedCats.size + (selectedAge !== null ? 1 : 0) + (selectedKind !== 'all' ? 1 : 0) + (selectedHood ? 1 : 0)

  return (
    <div className="grid lg:grid-cols-4 gap-6">

      {/* Filter sidebar */}
      <aside className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-700">Filters</h3>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearAll} className="text-[11px] font-bold text-[#ff7a59] hover:underline">Clear all</button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Vendor name or keyword"
              className="w-full pl-8 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-[#ff7a59]"
            />
          </div>

          {/* Age */}
          <Group label="Kid's age">
            <div className="grid grid-cols-3 gap-1">
              {[2, 4, 6, 8, 10, 12].map(age => (
                <button key={age} type="button" onClick={() => setSelectedAge(selectedAge === age ? null : age)}
                  className={`px-2 py-1.5 text-[11px] font-bold rounded ${
                    selectedAge === age ? 'bg-[#ff7a59] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}>{age}</button>
              ))}
            </div>
          </Group>

          {/* Indoor/Outdoor */}
          <Group label="Venue type">
            <div className="flex gap-1">
              {(['all', 'indoor', 'outdoor'] as const).map(k => (
                <button key={k} type="button" onClick={() => setSelectedKind(k)}
                  className={`flex-1 px-2 py-1.5 text-[11px] font-bold capitalize rounded ${
                    selectedKind === k ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}>{k}</button>
              ))}
            </div>
          </Group>

          {/* Neighborhood */}
          {neighborhoods.length > 0 && (
            <Group label="Neighborhood">
              <select value={selectedHood} onChange={e => setSelectedHood(e.target.value)}
                className="w-full px-2 py-1.5 text-[12px] border border-slate-200 rounded bg-white">
                <option value="">Any</option>
                {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </Group>
          )}

          {/* Categories */}
          <Group label="Categories">
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {categories.map(c => (
                <label key={c} className="flex items-center gap-2 cursor-pointer text-[12px]">
                  <input type="checkbox" checked={selectedCats.has(c)} onChange={() => toggleCat(c)} />
                  <span className="text-slate-700">{c.replace(/^Places to Party - /, '')}</span>
                </label>
              ))}
            </div>
          </Group>
        </div>
      </aside>

      {/* Results */}
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] text-slate-600">
            <strong className="text-slate-900">{filtered.length}</strong> {filtered.length === 1 ? 'match' : 'matches'}
            {activeFilterCount > 0 && ` · ${activeFilterCount} ${activeFilterCount === 1 ? 'filter' : 'filters'} active`}
          </p>
          <button type="button" onClick={() => setShowFilters(s => !s)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-slate-700 bg-white border border-slate-200 rounded">
            {showFilters ? <X size={11} /> : <Filter size={11} />}
            {showFilters ? 'Hide' : 'Filters'} {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
            <Search size={28} className="text-slate-300 mx-auto mb-2" />
            <h3 className="text-[15px] font-bold text-slate-900">No matches</h3>
            <p className="text-[12px] text-slate-600 mt-1">Try removing a filter — or call us, we know everybody in town.</p>
            <button type="button" onClick={clearAll} className="mt-3 text-[12px] font-bold text-[#ff7a59] hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map(r => (
              <Link
                key={r.id}
                href={`/birthday-party-guide/business/${r.slug}`}
                className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
              >
                <div className="aspect-[16/10] bg-slate-100 overflow-hidden relative">
                  {r.hero ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.hero} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#fff0eb] to-[#ffd9cc]" />
                  )}
                  {r.tier && r.tier !== 'standard' && (
                    <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white bg-amber-500 rounded">
                      <Star size={9} /> Featured
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#ff7a59]">{r.category.replace(/^Places to Party - /, '')}</div>
                  <h3 className="text-[15px] font-bold text-slate-900 mt-0.5 group-hover:text-[#ff7a59] leading-snug">{r.business_name}</h3>
                  {r.card_hook && <p className="text-[12px] text-slate-600 mt-1.5 leading-relaxed line-clamp-2">{r.card_hook}</p>}
                  <div className="mt-auto pt-3 flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                    {r.neighborhood && <span className="inline-flex items-center gap-1"><MapPin size={10} />{r.neighborhood}</span>}
                    {r.phone && <span className="inline-flex items-center gap-1"><Phone size={10} />{r.phone}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</div>
      {children}
    </div>
  )
}
