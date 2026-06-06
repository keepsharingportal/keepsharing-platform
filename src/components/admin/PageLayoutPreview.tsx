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
  placementSlug: string
  /** Surface key from PlacementTypeDef. Drives which mockup to render. */
  surface: string
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

export function PageLayoutPreview({ placementSlug, surface }: Props) {
  const slots = getSlots(surface)

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{surfaceLabel(surface)}</p>

      {slots ? (
        <div className="relative bg-white border border-gray-300 rounded" style={{ aspectRatio: '16 / 11' }}>
          {/* Header chrome — tiny dark bar so the mock reads as a webpage */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gray-900 rounded-t" />
          {/* Slots */}
          {slots.map(s => {
            const active = s.slug === placementSlug
            return (
              <div
                key={s.slug}
                className={`absolute rounded-sm border-2 transition-all ${
                  active
                    ? 'border-primary bg-primary/15 z-10 shadow-lg'
                    : 'border-gray-300 bg-white'
                }`}
                style={{
                  left:   `${s.x}%`,
                  top:    `${s.y}%`,
                  width:  `${s.w}%`,
                  height: `${s.h}%`,
                }}
                title={s.label}
              >
                <span className={`absolute inset-0 flex items-center justify-center text-[8px] leading-tight px-1 text-center ${
                  active ? 'text-primary font-bold' : 'text-gray-400'
                }`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-300 rounded p-6 text-center">
          <p className="text-xs text-gray-500">
            This slot lives on a <strong>{surfaceLabel(surface).toLowerCase()}</strong>.
            Visual preview isn&apos;t mapped for this surface yet — see the &quot;Where it appears&quot; description above.
          </p>
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-2 text-center">
        Approximate layout — actual page composition shifts with content. Highlighted = the slot you&apos;re editing.
      </p>
    </div>
  )
}
