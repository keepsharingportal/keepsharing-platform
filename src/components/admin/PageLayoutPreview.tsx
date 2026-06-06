// PageLayoutPreview — tiny visual mockup of a page surface, with every
// ad slot drawn as a labeled box. The currently-selected slot pulses
// orange. The rest stay outlined so the editor sees "your ad goes
// HERE relative to those other slots."
//
// Surfaces covered:
//   - homepage  — the public riverregionparents.com home layout
//   - article   — single-column body w/ sticky sidebar
//   - guide     — landing page w/ featured strip + listings
//   - other     — generic "this lives in [section]" message + label
//
// Used on the /admin/ads/[id]/edit page. Keeps the diagram intentionally
// simple — we're communicating LOCATION, not pixel-perfect creative.

interface Props {
  /** When provided, this single slot pulses orange and others stay dim.
   *  Mutually exclusive with `slotStatuses`. */
  placementSlug?: string
  /** Surface key from PlacementTypeDef. Drives which mockup to render. */
  surface: string
  /** Per-slot booking status — used by the /admin/ads page filter view
   *  to show LIVE / PAUSED / SELLABLE across every slot on this page at
   *  the same time. Map key = slot slug, value = status code. */
  slotStatuses?: Record<string, 'live' | 'paused' | 'sellable'>
  /** Click handler — used by the /admin/ads page to filter the list to
   *  the clicked placement_type. */
  onSlotClick?: (slug: string) => void
}

const HOMEPAGE_SLOTS = [
  { slug: 'homepage_inline_ad',          x: 4,  y: 50, w: 60, h: 8,  label: 'Inline (mid-feed)' },
  { slug: 'homepage_sidebar_ad',         x: 70, y: 26, w: 26, h: 26, label: 'Sidebar square'   },
  { slug: 'homepage_business_spotlight', x: 70, y: 56, w: 26, h: 14, label: 'Business Spotlight' },
  { slug: 'homepage_bottom_ad',          x: 4,  y: 78, w: 92, h: 12, label: 'Bottom banner'    },
  { slug: 'homepage_hero_rotator',       x: 4,  y: 6,  w: 92, h: 14, label: 'Hero rotator'     },
]

const ARTICLE_SLOTS = [
  { slug: 'article_header_sponsor',         x: 4,  y: 4,  w: 92, h: 6,  label: 'Header sponsor' },
  { slug: 'article_inline',                 x: 4,  y: 40, w: 60, h: 8,  label: 'Mid-body break' },
  { slug: 'article_inline_recommendation',  x: 4,  y: 56, w: 60, h: 10, label: 'Recommendation' },
  { slug: 'article_sidebar_sticky',         x: 70, y: 16, w: 26, h: 22, label: 'Sticky sidebar' },
  { slug: 'article_sidebar_sponsored',      x: 70, y: 42, w: 26, h: 16, label: 'Sponsored card' },
  { slug: 'article_footer_listings',        x: 4,  y: 82, w: 92, h: 10, label: 'Footer listings' },
]

const GUIDE_SLOTS = [
  { slug: 'guide_featured_strip',     x: 4,  y: 8,  w: 92, h: 10, label: 'Featured strip' },
  { slug: 'guide_inline',             x: 4,  y: 32, w: 60, h: 8,  label: 'In-feed ad'     },
  { slug: 'guide_inline_sponsored',   x: 4,  y: 48, w: 60, h: 10, label: 'Sponsored card' },
  { slug: 'guide_directory_inline_ad',x: 4,  y: 64, w: 60, h: 8,  label: 'Directory card' },
  { slug: 'guide_sidebar_sticky',     x: 70, y: 32, w: 26, h: 26, label: 'Sticky sidebar' },
]

interface Slot {
  slug:  string
  x:     number   // % left
  y:     number   // % top
  w:     number   // % width
  h:     number   // % height
  label: string
}

function getSlots(surface: string): Slot[] | null {
  switch (surface) {
    case 'homepage':    return HOMEPAGE_SLOTS
    case 'articles':    return ARTICLE_SLOTS
    case 'guides':      return GUIDE_SLOTS
    default:            return null
  }
}

function surfaceLabel(surface: string): string {
  return ({
    homepage:      'Homepage layout',
    articles:      'Article page layout',
    guides:        'Guide page layout',
    'school-bits': 'School Bits page',
    verticals:     'Vertical section page',
    calendar:      'Calendar page',
    newsletter:    'Weekly email',
    site:          'Site footer',
  } as Record<string, string>)[surface] ?? surface
}

export function PageLayoutPreview({ placementSlug, surface, slotStatuses, onSlotClick }: Props) {
  const slots = getSlots(surface)
  const multiMode = !!slotStatuses

  // Colors for the multi-status mode. Tuned so the eye reads the page
  // structure first and then the status as a secondary visual layer.
  function multiClasses(status: 'live' | 'paused' | 'sellable' | undefined): string {
    if (status === 'live')     return 'border-green-600 bg-green-100'
    if (status === 'paused')   return 'border-gray-400 bg-gray-100'
    if (status === 'sellable') return 'border-amber-400 bg-amber-50'
    return 'border-gray-300 bg-white'
  }
  function multiLabelClass(status: 'live' | 'paused' | 'sellable' | undefined): string {
    if (status === 'live')     return 'text-green-800 font-bold'
    if (status === 'paused')   return 'text-gray-600'
    if (status === 'sellable') return 'text-amber-700 font-semibold'
    return 'text-gray-400'
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{surfaceLabel(surface)}</p>
        {multiMode && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-600" /> Live</span>
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Paused</span>
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Sellable</span>
          </div>
        )}
      </div>

      {slots ? (
        <div className="relative bg-white border border-gray-300 rounded" style={{ aspectRatio: '16 / 11' }}>
          {/* Header chrome — tiny dark bar so the mock reads as a webpage */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gray-900 rounded-t" />
          {slots.map(s => {
            const isSingleActive = !multiMode && s.slug === placementSlug
            const status         = slotStatuses?.[s.slug]
            const baseClasses    = multiMode
              ? multiClasses(status)
              : isSingleActive
                ? 'border-primary bg-primary/15 z-10 shadow-lg'
                : 'border-gray-300 bg-white'
            const labelClass = multiMode
              ? multiLabelClass(status)
              : isSingleActive
                ? 'text-primary font-bold'
                : 'text-gray-400'
            const clickable = onSlotClick && multiMode
            return (
              <div
                key={s.slug}
                onClick={clickable ? () => onSlotClick!(s.slug) : undefined}
                className={`absolute rounded-sm border-2 transition-all ${baseClasses} ${clickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''}`}
                style={{
                  left:   `${s.x}%`,
                  top:    `${s.y}%`,
                  width:  `${s.w}%`,
                  height: `${s.h}%`,
                }}
                title={s.label}
              >
                <span className={`absolute inset-0 flex items-center justify-center text-[8px] leading-tight px-1 text-center ${labelClass}`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-300 rounded p-6 text-center">
          <p className="text-xs text-gray-500">
            This page&apos;s layout isn&apos;t mapped yet — see the slot list below for the {SURFACE_COUNT(surface)} placements registered for {surfaceLabel(surface).toLowerCase()}.
          </p>
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-2 text-center">
        {multiMode
          ? 'Click any slot to filter the booking list. Approximate layout — actual composition shifts with content.'
          : 'Approximate layout — actual page composition shifts with content. Highlighted = the slot you’re editing.'}
      </p>
    </div>
  )
}

import { PLACEMENT_TYPES } from '@/lib/ads/placement-types'
function SURFACE_COUNT(surface: string): number {
  return PLACEMENT_TYPES.filter(p => p.surface === surface).length
}
