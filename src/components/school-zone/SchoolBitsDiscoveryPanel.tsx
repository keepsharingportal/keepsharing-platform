'use client'

// Magazine-style featured block for /school-zone — the visual centerpiece.
//
// Layout (matches the homepage Mom-to-Mom pattern):
//   8-col MAIN  → big featured bit with full hero image, dark gradient
//                 overlay, colored area badge, headline, blurb, Read CTA
//   4-col SIDE  → "Find Your School" typeahead + area chips + missing-school
//                 CTA, all in one compact card
//   Below       → 3-up supporting bits with colored area badges
//
// State lives in localStorage so a returning visitor lands on their
// personalized view (their picked school becomes the featured bit).
//
// Server-renders an initialBits prop so first paint shows real content,
// not a loading skeleton. Client takes over only when the user interacts.

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MapPin, ArrowRight, Sparkles, X, Megaphone, Search } from 'lucide-react'
import {
  AREA_LABELS, AREA_SHORT_LABELS, AREA_BADGE_CLASS,
  PRIVATE_BADGE_CLASS,
  type Area,
} from '@/lib/school-news/areas'
import { normalizeUnicodeText } from '@/lib/school-news/text'
import { SchoolBitsLogo } from './SchoolBitsLogo'

const STORAGE_KEY_SCHOOL = 'kp.preferredSchoolId'
const STORAGE_KEY_AREA   = 'kp.preferredArea'
const TOTAL_BITS         = 4   // 1 featured + 3 supporting

export interface BitForFeatured {
  id:            string
  school_id:     string | null
  school_name:   string
  title:         string
  blurb:         string
  image_web_url: string | null
  published_at:  string | null
  created_at:    string
}

export interface SchoolForFeatured {
  id:         string
  name:       string
  area:       Area
  is_private: boolean
}

interface Props {
  /** Server-rendered "newest across all schools" so first paint is content, not skeleton. */
  initialBits:    BitForFeatured[]
  /** Active schools roster — powers the typeahead. */
  initialSchools: SchoolForFeatured[]
}

type AreaSelection = Area | 'private' | null

export function SchoolBitsDiscoveryPanel({ initialBits, initialSchools }: Props) {
  const [mounted, setMounted] = useState(false)

  const [areaSelected,   setAreaSelected]   = useState<AreaSelection>(null)
  const [schoolSelected, setSchoolSelected] = useState<string | null>(null)
  const [query,          setQuery]          = useState('')

  // Bits state: server gives us a starter array; client may swap on interaction
  const [bits,    setBits]    = useState<BitForFeatured[]>(initialBits)
  const [loading, setLoading] = useState(false)

  // Schools roster is static — server-provided once
  const schools = initialSchools

  // Hydrate localStorage selection on mount, then fetch matching bits
  useEffect(() => {
    setMounted(true)
    try {
      const rememberedSchool = localStorage.getItem(STORAGE_KEY_SCHOOL)
      const rememberedArea   = localStorage.getItem(STORAGE_KEY_AREA)
      if (rememberedSchool)   setSchoolSelected(rememberedSchool)
      else if (rememberedArea) setAreaSelected(rememberedArea as AreaSelection)
    } catch { /* ignore */ }
  }, [])

  // When the selection changes (after mount), re-fetch
  useEffect(() => {
    if (!mounted) return
    // Initial "no selection" state already has the server-rendered bits — skip refetch
    if (!schoolSelected && !areaSelected) {
      setBits(initialBits)
      return
    }
    setLoading(true)
    const url = schoolSelected
      ? `/api/school-bits/by-school?school_id=${encodeURIComponent(schoolSelected)}&limit=${TOTAL_BITS}`
      : `/api/school-bits/by-area?area=${encodeURIComponent(areaSelected!)}&limit=${TOTAL_BITS}`
    fetch(url)
      .then(r => r.ok ? r.json() : { bits: [] })
      .then(json => {
        const list = (json.bits ?? []) as BitForFeatured[]
        if (schoolSelected) {
          const s = schools.find(x => x.id === schoolSelected)
          list.forEach(b => { b.school_id = schoolSelected; b.school_name = s?.name ?? '' })
        }
        setBits(list)
      })
      .catch(() => setBits([]))
      .finally(() => setLoading(false))
  }, [mounted, schoolSelected, areaSelected, schools, initialBits])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function pickArea(area: AreaSelection) {
    setAreaSelected(area)
    setSchoolSelected(null)
    setQuery('')
    try {
      if (area) localStorage.setItem(STORAGE_KEY_AREA, area)
      else      localStorage.removeItem(STORAGE_KEY_AREA)
      localStorage.removeItem(STORAGE_KEY_SCHOOL)
    } catch { /* ignore */ }
  }

  function pickSchool(id: string) {
    setSchoolSelected(id)
    setAreaSelected(null)
    setQuery('')
    try {
      localStorage.setItem(STORAGE_KEY_SCHOOL, id)
      localStorage.removeItem(STORAGE_KEY_AREA)
    } catch { /* ignore */ }
  }

  function clearAll() {
    setSchoolSelected(null)
    setAreaSelected(null)
    setQuery('')
    try {
      localStorage.removeItem(STORAGE_KEY_SCHOOL)
      localStorage.removeItem(STORAGE_KEY_AREA)
    } catch { /* ignore */ }
  }

  const typeaheadMatches = useMemo(() => {
    if (!query.trim()) return []
    const lc = query.trim().toLowerCase()
    return schools.filter(s => s.name.toLowerCase().includes(lc)).slice(0, 6)
  }, [schools, query])

  const selectedSchoolObj = schoolSelected ? schools.find(s => s.id === schoolSelected) ?? null : null
  const selectedAreaLabel = areaSelected === 'private' ? 'Private Schools'
                          : areaSelected               ? AREA_LABELS[areaSelected]
                          : null

  // Which area tab to highlight + which school list to show. Cascades:
  //   1. If user picked a school → that school's area (or 'private' if it is)
  //   2. Else if user picked an area → that area
  //   3. Else default to Montgomery (largest district)
  const activeAreaTab: AreaSelection = selectedSchoolObj
    ? (selectedSchoolObj.is_private ? 'private' : selectedSchoolObj.area)
    : (areaSelected ?? 'montgomery')

  // Deep-link to the full feed with current filter pre-applied
  const seeAllUrl = selectedSchoolObj ? `/school-zone/school-bits?school=${encodeURIComponent(selectedSchoolObj.id)}`
                  : areaSelected      ? `/school-zone/school-bits?area=${encodeURIComponent(areaSelected)}`
                  :                     '/school-zone/school-bits'

  // Quick label helpers for the panel header
  const sectionEyebrow = selectedSchoolObj ? 'Your School'
                       : selectedAreaLabel ? 'Your Area'
                       :                     'Latest Across the River Region'
  const sectionTitle   = selectedSchoolObj ? selectedSchoolObj.name
                       : selectedAreaLabel ?? 'School Bits'

  // Resolve area for a bit (used by the badge component)
  function bitAreaInfo(bit: BitForFeatured): { area: Area | null; isPrivate: boolean } {
    if (!bit.school_id) return { area: null, isPrivate: false }
    const s = schools.find(x => x.id === bit.school_id)
    return { area: s?.area ?? null, isPrivate: s?.is_private ?? false }
  }

  // Split bits: 1 featured + up to 3 supporting
  const [featured, ...supporting] = bits

  return (
    <section>
      {/* ── FEATURED + SIDEBAR (8/4 magazine block) ────────────────────────── */}
      <div className="grid lg:grid-cols-12 gap-4 md:gap-6">

        {/* ── FEATURED (8/12) ─ Hero image with overlay copy ── */}
        <div className="lg:col-span-8">
          {loading ? (
            <FeaturedSkeleton />
          ) : featured ? (
            <FeaturedCard bit={featured} {...bitAreaInfo(featured)} />
          ) : (
            <EmptyFeatured eyebrow={sectionEyebrow} title={sectionTitle} />
          )}
        </div>

        {/* ── SIDEBAR (4/12) — Find Your School ──
             Tabs reveal a scrollable school list for the active area.
             Default = Montgomery (the largest district). Picking a tab
             also filters the featured bit to that area; picking a school
             narrows further. Typeahead stays at top for power users. */}
        <aside className="lg:col-span-4">
          <div className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Heart className="h-4 w-4 fill-current" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {selectedSchoolObj || selectedAreaLabel ? "You're seeing" : 'Personalize'}
                </p>
                <h3 className="text-sm font-black text-foreground leading-tight truncate">
                  {selectedSchoolObj ? selectedSchoolObj.name
                   : selectedAreaLabel ?? 'Find Your School'}
                </h3>
              </div>
              {(selectedSchoolObj || selectedAreaLabel) && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Clear"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {!selectedSchoolObj && (
              <div className="relative mb-3">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Begin typing your school…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background outline-none focus:border-primary"
                />
                {typeaheadMatches.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {typeaheadMatches.map(s => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => pickSchool(s.id)}
                          className="w-full text-left px-3 py-2 hover:bg-muted/60 text-xs border-b border-border/40 last:border-b-0"
                        >
                          <span className="font-semibold text-foreground">{s.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">{AREA_LABELS[s.area]}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Area tabs + scrollable school list — fills the card to the bottom */}
            <AreaSchoolPicker
              schools={schools}
              activeTab={activeAreaTab}
              selectedSchoolId={selectedSchoolObj?.id ?? null}
              onPickArea={pickArea}
              onPickSchool={pickSchool}
            />

            {/* Missing-school CTA — pinned to the bottom */}
            <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                <Megaphone className="h-3 w-3 shrink-0" />
                Don&apos;t see your school?
              </p>
              <Link
                href="/school-bits/submit"
                className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                Submit a bit — we&apos;ll add the school <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* ── SUPPORTING ROW — 3 more recent bits below the featured block ── */}
      {(supporting.length > 0 || loading) && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-base md:text-lg font-bold text-foreground inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {selectedSchoolObj ? `More from ${selectedSchoolObj.name}`
               : selectedAreaLabel ? `More from ${selectedAreaLabel}`
               : 'More School Bits'}
            </h3>
            <Link
              href={seeAllUrl}
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              See all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {loading
              ? [0, 1, 2].map(i => <SupportingCardSkeleton key={i} />)
              : supporting.slice(0, 3).map(b => (
                  <SupportingCard key={b.id} bit={b} {...bitAreaInfo(b)} />
                ))
            }
          </div>

          {/* Prominent CTA below the cards — promotes the latest feed
              because School Bits is one of the highest-engagement
              sections on the site. The small 'See all' inline link
              above stays for users who scan, this one catches
              everyone who reads through the 3 supporting cards. */}
          {!loading && supporting.length > 0 && (
            <div className="mt-6 flex justify-center">
              <Link
                href={seeAllUrl}
                className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-3.5 bg-primary text-primary-foreground rounded-full text-sm md:text-base font-bold hover:bg-primary/90 shadow-sm hover:shadow-md transition-all group"
              >
                <Sparkles className="h-4 w-4" />
                See the Latest School Bits
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ── Featured card (big magazine-cover style) ────────────────────────────────

function FeaturedCard({ bit, area, isPrivate }: { bit: BitForFeatured; area: Area | null; isPrivate: boolean }) {
  const badgeClass = isPrivate ? PRIVATE_BADGE_CLASS : (area ? AREA_BADGE_CLASS[area] : 'bg-gray-700 text-white')
  const badgeLabel = isPrivate ? 'Private' : (area ? AREA_SHORT_LABELS[area] : 'School')
  return (
    <Link
      href={`/school-zone/school-bits?focus=${encodeURIComponent(bit.id)}`}
      className="group block relative overflow-hidden rounded-3xl bg-muted aspect-[16/10] md:aspect-[16/9] shadow-sm hover:shadow-xl transition-shadow"
    >
      {bit.image_web_url ? (
        <Image
          src={bit.image_web_url}
          alt={bit.title}
          fill
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
          priority
        />
      ) : (
        // Fallback: gradient when no image
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/15 to-secondary/20" />
      )}
      {/* Dark gradient for legible overlay text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />

      <div className="absolute top-4 left-4">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${badgeClass} shadow-sm`}>
          <MapPin className="h-2.5 w-2.5" /> {badgeLabel}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/85 mb-1.5">
          {bit.school_name}
        </p>
        <h2 className="text-xl md:text-3xl lg:text-4xl font-black text-white leading-tight mb-2 line-clamp-2 drop-shadow-sm">
          {normalizeUnicodeText(bit.title)}
        </h2>
        <p className="text-sm md:text-base text-white/90 leading-relaxed line-clamp-2 mb-3 max-w-2xl">
          {normalizeUnicodeText(bit.blurb)}
        </p>
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-white text-gray-900 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          Read more <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  )
}

function FeaturedSkeleton() {
  return (
    <div className="relative rounded-3xl bg-muted/60 aspect-[16/10] md:aspect-[16/9] animate-pulse" />
  )
}

function EmptyFeatured({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl aspect-[16/10] md:aspect-[16/9] bg-gradient-to-br from-primary/15 via-card to-secondary/10 border border-border/50 flex items-center justify-center text-center p-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{eyebrow}</p>
        <h2 className="text-xl md:text-2xl font-black text-foreground mb-3">No bits yet for {title}</h2>
        <Link
          href="/school-bits/submit"
          className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Be the first to share <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

// ── Supporting card (3-up below featured) ──────────────────────────────────

function SupportingCard({ bit, area, isPrivate }: { bit: BitForFeatured; area: Area | null; isPrivate: boolean }) {
  const badgeClass = isPrivate ? PRIVATE_BADGE_CLASS : (area ? AREA_BADGE_CLASS[area] : 'bg-gray-700 text-white')
  const badgeLabel = isPrivate ? 'Private' : (area ? AREA_SHORT_LABELS[area] : 'School')
  return (
    <Link
      href={`/school-zone/school-bits?focus=${encodeURIComponent(bit.id)}`}
      className="group flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
    >
      {bit.image_web_url ? (
        <div className="relative w-full bg-muted/40" style={{ aspectRatio: '16 / 10' }}>
          <Image
            src={bit.image_web_url}
            alt={bit.title}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
          <div className="absolute top-2 left-2">
            <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-full ${badgeClass} shadow-sm`}>
              {badgeLabel}
            </span>
          </div>
          {/* SchoolBits wordmark in the top-right of the cover so the
              card visually ties to the rest of the section even when
              the editorial badge is locale-specific. */}
          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded shadow-sm">
            <SchoolBitsLogo size="sm" />
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-primary/15 to-secondary/10 px-3 py-4 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-full ${badgeClass}`}>
            {badgeLabel}
          </span>
          <SchoolBitsLogo size="sm" />
        </div>
      )}
      <div className="flex flex-col flex-1 p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary truncate mb-1">
          {bit.school_name}
        </p>
        <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
          {normalizeUnicodeText(bit.title)}
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {normalizeUnicodeText(bit.blurb)}
        </p>
      </div>
    </Link>
  )
}

function SupportingCardSkeleton() {
  return (
    <div className="flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="w-full bg-muted/60 animate-pulse" style={{ aspectRatio: '16 / 10' }} />
      <div className="p-3.5 space-y-2">
        <div className="h-2 w-1/3 bg-muted/60 rounded animate-pulse" />
        <div className="h-3.5 w-full bg-muted/60 rounded animate-pulse" />
        <div className="h-3 w-4/5 bg-muted/50 rounded animate-pulse" />
      </div>
    </div>
  )
}

// ── Area tabs + scrollable school list ─────────────────────────────────────
// Horizontal area tabs (color-coded), with a scrollable alphabetical school
// list underneath for the active area. Clicking a tab filters bits to that
// area; clicking a school narrows further. Fills the available vertical
// space inside the card so the panel no longer has a giant whitespace gap.

const AREA_TABS: Array<{ key: AreaSelection; label: string; badge: string }> = [
  { key: 'montgomery', label: AREA_SHORT_LABELS.montgomery, badge: AREA_BADGE_CLASS.montgomery },
  { key: 'autauga',    label: AREA_SHORT_LABELS.autauga,    badge: AREA_BADGE_CLASS.autauga    },
  { key: 'elmore',     label: AREA_SHORT_LABELS.elmore,     badge: AREA_BADGE_CLASS.elmore     },
  { key: 'pike-road',  label: AREA_SHORT_LABELS['pike-road'], badge: AREA_BADGE_CLASS['pike-road'] },
  { key: 'private',    label: 'Private',                    badge: PRIVATE_BADGE_CLASS         },
]

function AreaSchoolPicker({
  schools, activeTab, selectedSchoolId, onPickArea, onPickSchool,
}: {
  schools:          SchoolForFeatured[]
  activeTab:        AreaSelection
  selectedSchoolId: string | null
  onPickArea:       (area: AreaSelection) => void
  onPickSchool:     (id: string) => void
}) {
  // Schools for the active tab, alphabetical
  const listForTab = useMemo(() => {
    if (!activeTab) return []
    if (activeTab === 'private') return schools.filter(s => s.is_private)
    return schools.filter(s => !s.is_private && s.area === activeTab)
  }, [schools, activeTab])

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Area tabs */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {AREA_TABS.map(t => {
          const isActive = activeTab === t.key
          return (
            <button
              key={String(t.key)}
              type="button"
              onClick={() => onPickArea(t.key)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-colors ${
                isActive
                  ? `${t.badge} shadow-sm`
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Scrollable school list. min-h-0 + max-h ensures the scroll behavior
          works inside a flex parent without forcing the whole card to scroll. */}
      <div className="flex-1 min-h-0 border border-border/60 rounded-lg bg-background overflow-y-auto max-h-[280px]">
        {listForTab.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground italic">
            No schools listed for this area yet.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {listForTab.map(s => {
              const isSelected = s.id === selectedSchoolId
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onPickSchool(s.id)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/60 transition-colors ${
                      isSelected ? 'bg-primary/10 text-foreground font-bold' : 'text-foreground'
                    }`}
                  >
                    {s.name}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
