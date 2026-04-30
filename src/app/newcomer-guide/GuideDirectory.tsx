'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, SlidersHorizontal, X } from 'lucide-react'
import type { GuideCategory, GuideListing } from '@/components/family-guide/types'
import { FeaturedListing } from '@/components/family-guide/FeaturedListing'
import { EnhancedListing } from '@/components/family-guide/EnhancedListing'
import { FreeListing } from '@/components/family-guide/FreeListing'
import { cn } from '@/lib/utils'

// ── Filter types ──────────────────────────────────────────────────────────────

type CategoryWithGroup = GuideCategory & { parent_group?: string }

const ZIP_OPTIONS = [
  { label: 'All areas', value: '' },
  { label: 'Montgomery', value: 'montgomery' },
  { label: 'Prattville (36066/36067)', value: '36066' },
  { label: 'Wetumpka (36092/36093)', value: '36092' },
  { label: 'Millbrook (36054)', value: '36054' },
  { label: 'Pike Road (36064)', value: '36064' },
  { label: 'Eastchase (36117)', value: '36117' },
]

const MGM_ZIPS = new Set(['36101','36102','36103','36104','36105','36106','36107','36108','36109','36110','36111','36112','36113','36114','36115','36116','36117','36118','36119'])

function matchesZip(l: GuideListing, f: string): boolean {
  if (!f) return true
  if (f === 'montgomery') return !!(l.zip && MGM_ZIPS.has(l.zip))
  return !!(l.zip && l.zip.startsWith(f.slice(0, 5)))
}

function matchesTags(l: GuideListing, tags: string[]): boolean {
  if (!tags.length) return true
  return tags.every(t => (l as GuideListing & { tags?: string[] }).tags?.includes(t))
}

// ── Category accordion ────────────────────────────────────────────────────────

function CategoryAccordion({
  category, zipFilter, patientsOnly, pediatricsOnly, featuredOnly, activeTags,
}: {
  category: GuideCategory
  zipFilter: string
  patientsOnly: boolean
  pediatricsOnly: boolean
  featuredOnly: boolean
  activeTags: string[]
}) {
  const [open, setOpen] = useState(false)

  const listings = useMemo(() => {
    let l = (category.listings ?? []).filter(x => !(x as GuideListing & { needs_research?: boolean }).needs_research)
    if (zipFilter)      l = l.filter(x => matchesZip(x, zipFilter))
    if (patientsOnly)   l = l.filter(x => x.accepting_new_patients === true)
    if (pediatricsOnly) l = l.filter(x => (x as GuideListing & { serves_pediatrics?: string }).serves_pediatrics === 'YES')
    if (featuredOnly)   l = l.filter(x => x.listing_tier === 'featured')
    if (activeTags.length) l = l.filter(x => matchesTags(x, activeTags))
    return l
  }, [category.listings, zipFilter, patientsOnly, pediatricsOnly, featuredOnly, activeTags])

  if (!listings.length) return null

  const featured = listings.filter(l => l.listing_tier === 'featured')
  const enhanced = listings.filter(l => l.listing_tier === 'enhanced')
  const free     = listings.filter(l => l.listing_tier === 'free')
  const group    = (category as CategoryWithGroup).parent_group

  return (
    <div id={category.slug} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-gray-900">{category.name}</span>
          {group && <span className="text-xs text-gray-400 shrink-0">— {group}</span>}
          <span className="text-xs text-gray-400 shrink-0">
            · {listings.length} listing{listings.length !== 1 ? 's' : ''}
            {featured.length > 0 && ` · ${featured.length} featured`}
          </span>
        </div>
        {open ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
          {category.description && <p className="text-xs text-gray-500 mb-4">{category.description}</p>}
          {featured.map(l => <FeaturedListing key={l.id} listing={l} />)}
          {enhanced.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {enhanced.map(l => <EnhancedListing key={l.id} listing={l} />)}
            </div>
          )}
          {free.length > 0 && <div className="space-y-1">{free.map(l => <FreeListing key={l.id} listing={l} />)}</div>}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function GuideDirectory({ categories }: { categories: CategoryWithGroup[] }) {
  const [groupFilter, setGroupFilter]       = useState('')
  const [catFilter, setCatFilter]           = useState('')
  const [zipFilter, setZipFilter]           = useState('')
  const [patientsOnly, setPatientsOnly]     = useState(false)
  const [pediatricsOnly, setPediatricsOnly] = useState(false)
  const [featuredOnly, setFeaturedOnly]     = useState(false)
  const [activeTags, setActiveTags]         = useState<string[]>([])
  const [filtersOpen, setFiltersOpen]       = useState(false)

  // Unique groups
  const groups = useMemo(() => {
    const seen = new Set<string>()
    return categories
      .map(c => c.parent_group ?? 'Other')
      .filter(g => { if (seen.has(g)) return false; seen.add(g); return true })
  }, [categories])

  // Categories for selected group
  const groupCats = useMemo(() =>
    groupFilter ? categories.filter(c => (c.parent_group ?? '') === groupFilter) : [],
    [categories, groupFilter]
  )

  // Available tags across all categories
  const allTags = useMemo(() => {
    const seen = new Set<string>()
    for (const cat of categories) {
      for (const l of cat.listings ?? []) {
        for (const t of (l as GuideListing & { tags?: string[] }).tags ?? []) seen.add(t)
      }
    }
    return [...seen].sort()
  }, [categories])

  const filteredCats = useMemo(() => {
    let c = categories
    if (groupFilter) c = c.filter(x => (x.parent_group ?? '') === groupFilter)
    if (catFilter)   c = c.filter(x => x.slug === catFilter)
    return c
  }, [categories, groupFilter, catFilter])

  const activeFilterCount = [groupFilter, catFilter, zipFilter, patientsOnly, pediatricsOnly, featuredOnly, activeTags.length > 0].filter(Boolean).length

  const clearAll = () => {
    setGroupFilter(''); setCatFilter(''); setZipFilter('')
    setPatientsOnly(false); setPediatricsOnly(false); setFeaturedOnly(false); setActiveTags([])
  }

  const toggleTag = (t: string) =>
    setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const sel = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:border-[#7d4535] focus:ring-1 focus:ring-[#7d453540]'

  return (
    <div className="space-y-4">

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full flex items-center gap-2 px-4 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal size={15} className="text-gray-400" />
          Filter directory
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: '#7d4535' }}>
              {activeFilterCount}
            </span>
          )}
          <ChevronDown size={14} className={cn('ml-auto text-gray-400 transition-transform', filtersOpen && 'rotate-180')} />
        </button>

        {filtersOpen && (
          <div className="px-4 pb-5 border-t border-gray-100 pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

              {/* Group */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Section / Group</label>
                <select value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setCatFilter('') }} className={sel}>
                  <option value="">All sections</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={sel}>
                  <option value="">All categories</option>
                  {(groupFilter ? groupCats : categories).map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Zip */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Area / Zip code</label>
                <select value={zipFilter} onChange={e => setZipFilter(e.target.value)} className={sel}>
                  {ZIP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Toggle row */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Accepting new patients', active: patientsOnly, toggle: () => setPatientsOnly(!patientsOnly) },
                { label: 'Serves pediatrics', active: pediatricsOnly, toggle: () => setPediatricsOnly(!pediatricsOnly) },
                { label: 'Featured listings only', active: featuredOnly, toggle: () => setFeaturedOnly(!featuredOnly) },
              ].map(({ label, active, toggle }) => (
                <button key={label} onClick={toggle}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    active ? 'text-white border-[#7d4535]' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                  )}
                  style={active ? { backgroundColor: '#7d4535' } : undefined}>
                  <span className={cn('w-3 h-3 rounded-full border shrink-0', active ? 'bg-white border-white' : 'border-gray-400')} />
                  {label}
                </button>
              ))}
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(t => {
                    const on = activeTags.includes(t)
                    return (
                      <button key={t} onClick={() => toggleTag(t)}
                        className={cn('px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                          on ? 'text-white border-[#7d4535]' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                        )}
                        style={on ? { backgroundColor: '#7d4535' } : undefined}>
                        {t.replace(/-/g, ' ')}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-gray-400">Active:</span>
          {groupFilter && <Chip label={groupFilter} onRemove={() => { setGroupFilter(''); setCatFilter('') }} />}
          {catFilter && <Chip label={catFilter} onRemove={() => setCatFilter('')} />}
          {zipFilter && <Chip label={ZIP_OPTIONS.find(o => o.value === zipFilter)?.label ?? zipFilter} onRemove={() => setZipFilter('')} />}
          {patientsOnly && <Chip label="New patients" onRemove={() => setPatientsOnly(false)} />}
          {pediatricsOnly && <Chip label="Serves pediatrics" onRemove={() => setPediatricsOnly(false)} />}
          {featuredOnly && <Chip label="Featured only" onRemove={() => setFeaturedOnly(false)} />}
          {activeTags.map(t => <Chip key={t} label={t.replace(/-/g,' ')} onRemove={() => toggleTag(t)} />)}
          <button onClick={clearAll} className="ml-1 text-gray-400 hover:text-gray-700 font-medium underline">Clear all</button>
        </div>
      )}

      {/* Accordions */}
      <div className="space-y-2">
        {filteredCats.map(cat => (
          <CategoryAccordion
            key={cat.id}
            category={cat}
            zipFilter={zipFilter}
            patientsOnly={patientsOnly}
            pediatricsOnly={pediatricsOnly}
            featuredOnly={featuredOnly}
            activeTags={activeTags}
          />
        ))}
        {filteredCats.length === 0 && (
          <div className="text-center py-12 text-sm text-gray-400">No categories match those filters.</div>
        )}
      </div>
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#7d4535]/10 text-[#7d4535] font-semibold">
      {label}
      <button onClick={onRemove} className="hover:text-[#5f3227]"><X size={10} /></button>
    </span>
  )
}
