'use client'

// Browser for the public School Bits page. Compact horizontal filter bar
// (area chips + school typeahead inline), masonry layout (CSS columns), and
// a `focus=<id>` URL param that pulls a specific bit to the top of the feed
// when the reader arrives from a card click on FRG / discovery panel.

import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { X, MapPin, Heart, Camera, Expand } from 'lucide-react'
import { AREAS, AREA_LABELS, isValidArea, type Area } from '@/lib/school-news/areas'
import { SchoolBitLightbox } from '@/components/school-zone/SchoolBitLightbox'
import { SchoolBitsLogo } from '@/components/school-zone/SchoolBitsLogo'
import { ShareRow } from '@/components/ShareRow'
import { splitBlurbParagraphs, normalizeUnicodeText } from '@/lib/school-news/text'
import { trackBitView, trackBitClick } from '@/lib/school-bits/track'
import type { PublicSchoolBit, PublicSchool, InlineAd } from './page'

const STORAGE_KEY = 'kp.preferredSchoolId'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

interface SchoolWithCount extends PublicSchool {
  bit_count: number
}

interface Props {
  initialBits:    PublicSchoolBit[]
  schools:        SchoolWithCount[]
  /** Pool of inline ads. 2 are picked per Load More batch (rotation by
   *  page index so subsequent batches show different ads). Empty array
   *  means inline slots are skipped. */
  inlineAds?:     InlineAd[]
  /** Pool of transition ads shown above each batch after the first. */
  transitionAds?: InlineAd[]
}

// Per-page-batch tuning. 12 bits with 2 inline ads = 14 cards in the masonry.
const BITS_PER_BATCH      = 12
const INLINE_ADS_PER_BATCH = 2
// Where the inline ads slot into a batch — interleaved with the bits as
// the masonry flows. Positions are 0-indexed within the batch's 14 cards
// (12 bits + 2 ads). 4 = after bit #4; 9 = after bit #8.
const INLINE_AD_POSITIONS = [4, 9] as const

type AreaFilter = Area | 'all' | 'private'

export function SchoolBitsBrowser({
  initialBits, schools, inlineAds = [], transitionAds = [],
}: Props) {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  // ── URL params drive initial state ────────────────────────────────────────
  //   ?focus=<bit_id> → pull a specific bit to the top + give it the
  //                     primary-color highlight ring so it's immediately
  //                     visible. Reader still has to click to expand.
  //   ?area=<area>    → preselect an area filter (shareable filtered view)
  //   ?school=<id>    → preselect a school filter (shareable filtered view)
  // URL > localStorage > default. Each is shareable.
  const focusedBitId = searchParams?.get('focus') ?? null
  const urlArea      = searchParams?.get('area')  ?? null
  const urlSchool    = searchParams?.get('school') ?? null

  function initialAreaFromUrl(): AreaFilter {
    if (urlArea === 'private') return 'private'
    if (urlArea && isValidArea(urlArea)) return urlArea
    return 'all'
  }

  const [areaFilter,    setAreaFilter]    = useState<AreaFilter>(initialAreaFromUrl)
  const [schoolFilter,  setSchoolFilter]  = useState<string | null>(urlSchool)
  const [schoolQuery,   setSchoolQuery]   = useState('')
  // Lightbox tracks an INDEX into the filtered list (not a bit object) so
  // the modal can step forward/backward through every visible bit without
  // closing. null = closed.
  const [openBitIndex,  setOpenBitIndex]  = useState<number | null>(null)
  // Load More: how many batches of BITS_PER_BATCH are currently visible.
  // Starts at 1 (showing first BITS_PER_BATCH bits + their inline ads).
  // Reset to 1 whenever the filter changes so the reader doesn't carry
  // a deep scroll across a context switch.
  const [batchCount,    setBatchCount]    = useState(1)

  // Remembered school from localStorage — URL takes precedence so a shared
  // ?school link wins over a returning visitor's saved preference.
  useEffect(() => {
    if (urlSchool) return  // URL already initialized it
    try {
      const remembered = localStorage.getItem(STORAGE_KEY)
      if (remembered && schools.some(s => s.id === remembered)) {
        setSchoolFilter(remembered)
      }
    } catch { /* localStorage unavailable */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools])

  useEffect(() => {
    try {
      if (schoolFilter) localStorage.setItem(STORAGE_KEY, schoolFilter)
      else              localStorage.removeItem(STORAGE_KEY)
    } catch { /* ignore */ }
  }, [schoolFilter])

  // Reset Load More to one batch whenever the filter shifts. Reader's
  // expectation: filter → fresh top-of-feed, not "page 4 of the old view."
  useEffect(() => {
    setBatchCount(1)
  }, [areaFilter, schoolFilter])

  // ── Sync filter state → URL ───────────────────────────────────────────────
  // Whenever the user changes an area/school filter, reflect it in the URL
  // (replaceState, no history pollution) so the address bar always represents
  // the current view. That makes the URL shareable — copy the address, paste
  // anywhere, and the destination renders the same filter.
  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')

    if (areaFilter === 'all') params.delete('area')
    else                      params.set('area', areaFilter)

    if (schoolFilter) params.set('school', schoolFilter)
    else              params.delete('school')

    // focus stays as-is — it represents an arrival state, not a current filter
    const next = params.toString()
    const current = searchParams?.toString() ?? ''
    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaFilter, schoolFilter])

  const selectedSchool = schoolFilter ? schools.find(s => s.id === schoolFilter) ?? null : null

  const schoolMatches = useMemo(() => {
    if (!schoolQuery.trim()) return [] as SchoolWithCount[]
    const lc = schoolQuery.trim().toLowerCase()
    return schools.filter(s => s.name.toLowerCase().includes(lc)).slice(0, 8)
  }, [schoolQuery, schools])

  // Filter + focus reorder. Focus runs AFTER filtering so the focused bit
  // still leads even when the reader changes the filter — as long as it
  // matches the new filter. If it doesn't, it drops back to normal order.
  const filtered = useMemo(() => {
    const matched = initialBits.filter(b => {
      if (schoolFilter && b.school_id !== schoolFilter) return false
      if (!schoolFilter && areaFilter !== 'all') {
        const school = schools.find(s => s.id === b.school_id)
        if (!school) return false
        if (areaFilter === 'private') {
          if (!school.is_private) return false
        } else {
          if (school.area !== areaFilter) return false
        }
      }
      return true
    })
    if (focusedBitId) {
      const idx = matched.findIndex(b => b.id === focusedBitId)
      if (idx > 0) {
        const [focused] = matched.splice(idx, 1)
        matched.unshift(focused)
      }
    }
    return matched
  }, [initialBits, schools, areaFilter, schoolFilter, focusedBitId])

  // Note: we used to auto-open the lightbox when ?focus was set in the URL
  // so a shared Facebook link would drop the reader straight onto the bit.
  // That behavior bothered readers navigating from the FRG (they wanted to
  // scan the page, not be forced into a modal). The bit is still pulled
  // to the top of the list and gets a primary-color highlight ring, so
  // it's discoverable — readers click into it when they're ready.

  function clearSchool() {
    setSchoolFilter(null)
    setSchoolQuery('')
  }

  // Single source of truth for the absolute origin — env > window.
  const origin = SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')

  // Per-bit share URL builder — shared between the inline card icons and
  // the lightbox header so a click anywhere produces the same canonical link.
  function buildBitShareUrl(bitId: string): string {
    return `${origin}/school-zone/school-bits?focus=${encodeURIComponent(bitId)}`
  }

  return (
    <div className="space-y-5">
      {/* COMPACT FILTER BAR — single horizontal row, no card chrome. Chips
          on the left, school typeahead on the right. On narrow screens the
          chip row wraps and the typeahead drops below. */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={areaFilter === 'all' && !schoolFilter} onClick={() => { setAreaFilter('all'); clearSchool() }}>
            All schools
          </FilterChip>
          {AREAS.map(a => (
            <FilterChip key={a} active={areaFilter === a && !schoolFilter} onClick={() => { setAreaFilter(a); clearSchool() }}>
              <MapPin className="h-3 w-3" /> {AREA_LABELS[a]}
            </FilterChip>
          ))}
          <FilterChip active={areaFilter === 'private' && !schoolFilter} onClick={() => { setAreaFilter('private'); clearSchool() }}>
            Private schools
          </FilterChip>
        </div>

        {/* Typeahead / selected-school pill — pushed right on wide screens */}
        <div className="ml-auto min-w-[220px] max-w-sm">
          {selectedSchool ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              <Heart className="h-3 w-3 fill-current" />
              {selectedSchool.name}
              <button
                type="button"
                onClick={clearSchool}
                className="ml-1 text-primary-foreground/80 hover:text-primary-foreground"
                aria-label="Clear school filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="search"
                value={schoolQuery}
                onChange={e => setSchoolQuery(e.target.value)}
                placeholder="Find your school…"
                className="w-full px-3 py-1.5 text-sm border border-border rounded-full bg-card outline-none focus:border-primary"
              />
              {schoolMatches.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {schoolMatches.map(s => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => { setSchoolFilter(s.id); setSchoolQuery('') }}
                        className="w-full text-left px-3 py-2 hover:bg-muted/60 text-sm border-b border-border/40 last:border-b-0"
                      >
                        <span className="font-semibold text-foreground">{s.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{AREA_LABELS[s.area]}</span>
                        {s.is_private && <span className="text-[10px] font-bold text-purple-700 ml-2">Private</span>}
                        {s.bit_count > 0 && (
                          <span className="text-[11px] text-muted-foreground ml-2">· {s.bit_count} bit{s.bit_count === 1 ? '' : 's'}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active filter summary — page-level share button removed since
          each bit card now has its own inline share icons. */}
      <p className="text-sm text-muted-foreground">
        Showing <strong className="text-foreground">{filtered.length}</strong> School Bit{filtered.length === 1 ? '' : 's'}
        {selectedSchool && <> at <strong className="text-foreground">{selectedSchool.name}</strong></>}
        {!selectedSchool && areaFilter !== 'all' && (
          <> in <strong className="text-foreground">{areaFilter === 'private' ? 'private schools' : AREA_LABELS[areaFilter as Area]}</strong></>
        )}
      </p>

      {/* CARDS — masonry via CSS columns, broken into batches for Load More.
          Each batch holds BITS_PER_BATCH bits + 2 inline ads. Batches after
          the first show a transition ad above them. */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No School Bits match your filter yet. Try a different area or school.</p>
        </div>
      ) : (
        <>
          {Array.from({ length: batchCount }).map((_, batchIndex) => {
            const batchStart = batchIndex * BITS_PER_BATCH
            const batchBits  = filtered.slice(batchStart, batchStart + BITS_PER_BATCH)
            if (batchBits.length === 0) return null

            // Pick two inline ads for THIS batch. Offset by batchIndex × 2
            // so subsequent batches rotate to the next two in the pool.
            // Wraps when the pool is shorter than the offset.
            const inlinePicks: InlineAd[] = inlineAds.length === 0
              ? []
              : Array.from({ length: INLINE_ADS_PER_BATCH }, (_, i) =>
                  inlineAds[(batchIndex * INLINE_ADS_PER_BATCH + i) % inlineAds.length],
                )

            // Transition ad for batches > 0 — picked the same way from its
            // own pool. (Index by batchIndex - 1 since batch 0 has no
            // transition ad above it.)
            const transitionPick: InlineAd | null = batchIndex === 0 || transitionAds.length === 0
              ? null
              : transitionAds[(batchIndex - 1) % transitionAds.length]

            // Interleave inline ads into the bit list at fixed positions.
            // 'item' is either a bit or an ad. Maps cleanly through the
            // masonry column flow.
            type FeedItem =
              | { kind: 'bit'; bit: PublicSchoolBit; absoluteIndex: number }
              | { kind: 'ad';  ad:  InlineAd; key: string }

            const feed: FeedItem[] = []
            let bitCursor = 0
            for (let pos = 0; pos < batchBits.length + inlinePicks.length; pos++) {
              const adSlot = INLINE_AD_POSITIONS.indexOf(pos as 4 | 9)
              if (adSlot >= 0 && inlinePicks[adSlot]) {
                feed.push({ kind: 'ad', ad: inlinePicks[adSlot], key: `ad-${batchIndex}-${adSlot}` })
              } else if (bitCursor < batchBits.length) {
                const bit = batchBits[bitCursor]
                feed.push({ kind: 'bit', bit, absoluteIndex: batchStart + bitCursor })
                bitCursor++
              }
            }

            return (
              <div key={batchIndex}>
                {transitionPick && (
                  <TransitionAdCard ad={transitionPick} className="mb-5" />
                )}
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
                  {feed.map(item => (
                    <div
                      key={item.kind === 'bit' ? item.bit.id : item.key}
                      className="break-inside-avoid mb-5"
                    >
                      {item.kind === 'bit' ? (
                        <BitCard
                          bit={item.bit}
                          highlight={item.bit.id === focusedBitId}
                          onOpen={() => { trackBitClick(item.bit.id); setOpenBitIndex(item.absoluteIndex) }}
                          shareUrl={buildBitShareUrl(item.bit.id)}
                        />
                      ) : (
                        <InlineAdCard ad={item.ad} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Load More — appears only when more batches remain */}
          {batchCount * BITS_PER_BATCH < filtered.length && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setBatchCount(c => c + 1)}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-full bg-card border border-border hover:border-primary hover:text-primary text-foreground shadow-sm transition-colors"
              >
                Load More School Bits
                <span className="text-xs font-normal text-muted-foreground">
                  ({filtered.length - batchCount * BITS_PER_BATCH} more)
                </span>
              </button>
            </div>
          )}
        </>
      )}

      <SchoolBitLightbox
        bits={filtered}
        index={openBitIndex}
        onClose={() => setOpenBitIndex(null)}
        onIndexChange={setOpenBitIndex}
        buildShareUrl={buildBitShareUrl}
      />
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted text-foreground hover:bg-muted/70'
      }`}
    >
      {children}
    </button>
  )
}

// Line-clamp threshold for the blurb on the card. Anything longer gets a
// fade + "Read more" affordance so the masonry stays tidy and the lightbox
// is the canonical home for the full text.
const BLURB_CLAMP_LINES = 5

function BitCard({ bit, onOpen, highlight = false, shareUrl }: {
  bit: PublicSchoolBit
  onOpen: () => void
  /** Highlight ring + soft badge for the focused bit when the reader arrives via ?focus= */
  highlight?: boolean
  /** Per-bit absolute share URL. When provided, renders the inline share
   *  icons in the card footer. */
  shareUrl?: string
}) {
  const paragraphs = splitBlurbParagraphs(bit.blurb)
  const hasMultiplePhotos = bit.image_count > 1
  // Rough proxy for "long enough that line-clamp is doing something" — we
  // can't measure rendered lines, so use a char threshold that maps to ~5
  // lines at typical card width. Cards under this just don't show "Read more".
  const isLongBlurb = bit.blurb.length > 280
  const normalizedTitle = normalizeUnicodeText(bit.title)

  // Card is a div (not a button) so the nested share-button elements are
  // valid HTML. role + keyboard handler keep it accessible.
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }

  // Fire an "impression" the first time at least half the card is visible.
  // Dedupes per-session inside trackBitView so scroll-past-and-back doesn't
  // double-count. IntersectionObserver disconnect after first fire keeps
  // long-feed pages cheap.
  const cardRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = cardRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          trackBitView(bit.id)
          obs.disconnect()
          break
        }
      }
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [bit.id])

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKey}
      aria-label={`Open full view for ${normalizedTitle}`}
      className={`group cursor-pointer text-left bg-card border rounded-2xl overflow-hidden hover:shadow-md transition-all w-full ${
        highlight
          ? 'border-primary/60 ring-2 ring-primary/30 shadow-md'
          : 'border-border/60 hover:border-primary/30'
      }`}
    >
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <SchoolBitsLogo size="sm" />
        <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
          {bit.school_name}
        </span>
      </div>

      <h3 className="px-4 text-lg font-black text-foreground leading-snug mb-3">{normalizeUnicodeText(bit.title)}</h3>

      {bit.image_web_url && (
        <div className="relative w-full bg-muted/40" style={{ aspectRatio: '16 / 10' }}>
          <Image
            src={bit.image_web_url}
            alt={bit.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
          {/* Expand affordance — always visible top-right so the card reads
              as clickable on mobile (where there's no hover). */}
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-black/55 text-white backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-opacity">
            <Expand className="h-3 w-3" /> Tap to expand
          </span>
          {/* Photo-count badge — only when there are multiple photos.
              Single-photo bits don't need a "View photos" prompt because
              the photo IS the card image. Yellow so the gallery affordance
              pops off the photo at a glance. */}
          {hasMultiplePhotos && (
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-amber-950 shadow-sm">
              <Camera className="h-3 w-3" /> View {bit.image_count} photos
            </span>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Paragraphs — preserves intentional double-newline breaks from the
            source text. Clamped at BLURB_CLAMP_LINES on the whole block so
            masonry stays tidy; the lightbox shows the full thing. */}
        <div
          className="text-sm text-muted-foreground leading-relaxed space-y-3 overflow-hidden"
          style={{
            display:           '-webkit-box',
            WebkitBoxOrient:   'vertical',
            WebkitLineClamp:   BLURB_CLAMP_LINES,
          }}
        >
          {paragraphs.length === 0
            ? <p>{bit.blurb}</p>
            : paragraphs.map((p, i) => <p key={i}>{p}</p>)
          }
        </div>
        {isLongBlurb && (
          <p className="mt-2 text-xs font-bold text-primary inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
            Read more →
          </p>
        )}

        {/* Footer row — date on the left, share icons on the right. Share
             icons stop click propagation so they don't trigger the card's
             onOpen (since the card itself is clickable). */}
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[10px] text-muted-foreground/70">
            {bit.published_at
              ? new Date(bit.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : new Date(bit.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          {shareUrl && (
            <ShareRow
              url={shareUrl}
              title={normalizedTitle}
              text={`${bit.school_name} — on River Region Parents`}
              size="compact"
              tone="tan"
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Inline ad card ─────────────────────────────────────────────────────────
// Card-shaped ad that drops into the masonry flow. Same width as a bit card
// so the columns stay aligned. Clearly labeled "SPONSORED" so the reader
// can distinguish it from editorial content.

function InlineAdCard({ ad }: { ad: InlineAd }) {
  const link    = ad.ad_link    || '#'
  const eyebrow = ad.ad_eyebrow || (ad.advertiser_name ? `Sponsored · ${ad.advertiser_name}` : 'Sponsored')

  const body = (
    <div className="group bg-amber-50/60 border border-amber-200/70 rounded-2xl overflow-hidden hover:border-amber-400 hover:shadow-md transition-all">
      <div className="px-4 pt-3 pb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
          {eyebrow}
        </span>
      </div>
      {ad.ad_headline && (
        <h3 className="px-4 text-lg font-black text-foreground leading-snug mb-3">
          {ad.ad_headline}
        </h3>
      )}
      {ad.ad_image_url && (
        <div className="relative w-full bg-amber-50" style={{ aspectRatio: '16 / 10' }}>
          <Image
            src={ad.ad_image_url}
            alt={ad.ad_headline ?? 'Sponsored content'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="p-4">
        {ad.ad_description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {ad.ad_description}
          </p>
        )}
        {ad.ad_cta_label && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 group-hover:gap-1.5 transition-all">
            {ad.ad_cta_label} →
          </span>
        )}
      </div>
    </div>
  )

  return ad.ad_link ? <Link href={link} className="block">{body}</Link> : body
}

// ── Transition ad ──────────────────────────────────────────────────────────
// Full-width banner shown ABOVE each new batch after Load More. Reads as
// an editorial divider with sponsor content embedded — gets eye attention
// because the reader just crossed a threshold.

function TransitionAdCard({ ad, className = '' }: { ad: InlineAd; className?: string }) {
  const link    = ad.ad_link    || '#'
  const eyebrow = ad.ad_eyebrow || (ad.advertiser_name ? `Sponsored · ${ad.advertiser_name}` : 'Sponsored')

  const body = (
    <div className={`group bg-gradient-to-r from-amber-50 via-amber-50/70 to-card border border-amber-200/70 rounded-2xl p-5 md:p-6 hover:border-amber-400 hover:shadow-md transition-all flex flex-col sm:flex-row items-center gap-5 ${className}`}>
      {ad.ad_image_url && (
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-background border border-amber-200/60 shadow-sm">
          <Image
            src={ad.ad_image_url}
            alt={ad.ad_headline ?? 'Sponsored content'}
            fill
            sizes="112px"
            className="object-cover group-hover:scale-105 transition-transform"
            unoptimized
          />
        </div>
      )}
      <div className="flex-1 min-w-0 text-center sm:text-left">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">
          {eyebrow}
        </p>
        {ad.ad_headline && (
          <h3 className="font-bold text-base md:text-lg text-foreground leading-tight mb-1 group-hover:text-amber-900 transition-colors">
            {ad.ad_headline}
          </h3>
        )}
        {ad.ad_description && (
          <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
            {ad.ad_description}
          </p>
        )}
      </div>
      {ad.ad_cta_label && (
        <span className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 text-amber-950 rounded-full text-sm font-bold group-hover:bg-amber-500 transition-colors shadow-sm">
          {ad.ad_cta_label} →
        </span>
      )}
    </div>
  )

  return ad.ad_link ? <Link href={link} className="block">{body}</Link> : body
}
