// Single source of truth for what the public-site header + footer
// navigations contain. Every item gets a stable `key` so the
// nav_visibility table can store an "off switch" against it without
// having to seed all items into the DB.
//
// To add a new menu item: append to the right array here. To hide
// one without a code change: toggle it in /admin/site/navigation —
// that writes hidden=true into nav_visibility against this key. To
// rename or add a custom item without a code change: edit it in the
// same admin page (those overrides also live in nav_visibility).

export interface NavItem {
  /** Stable identifier — used as the nav_visibility primary key. */
  key:   string
  label: string
  href:  string
  /** Optional flag for absolute URLs (Instagram etc). */
  external?: boolean
  /** When set, this item is a child of another item (used by the
   *  admin to render a nested tree). The catalog still stores children
   *  in their own arrays; parentKey is the cross-reference. */
  parentKey?: string
}

export interface NavGroup {
  /** Human label for the group in the admin UI (not rendered on the site). */
  groupLabel: string
  items: NavItem[]
  /** Optional — when present, the admin uses parentKey on items to
   *  render a nested tree (parent + indented children) instead of a
   *  flat list. */
  nested?: boolean
}

// ── HEADER ────────────────────────────────────────────────────────────────

export const HEADER_GUIDES: NavItem[] = [
  { key: 'header.guides.family-resource',  label: 'Family Resource Guide', href: '/family-resource-guide', parentKey: 'header.guides.dropdown' },
  { key: 'header.guides.private-school',   label: 'Private School Guide',  href: '/private-school-guide',  parentKey: 'header.guides.dropdown' },
  { key: 'header.guides.summer-camp',      label: 'Summer Camp Guide',     href: '/summer-camp-guide',     parentKey: 'header.guides.dropdown' },
  { key: 'header.guides.childcare',        label: 'Childcare Guide',       href: '/childcare-guide',       parentKey: 'header.guides.dropdown' },
  { key: 'header.guides.healthy-kids',     label: 'Healthy Kids Guide',    href: '/healthy-kids-guide',    parentKey: 'header.guides.dropdown' },
  { key: 'header.guides.summer-fun',       label: 'Summer Fun Guide',      href: '/summer-fun-guide',      parentKey: 'header.guides.dropdown' },
  { key: 'header.guides.birthday-party',   label: 'Birthday Party Guide',  href: '/birthday-party-guide',  parentKey: 'header.guides.dropdown' },
  { key: 'header.guides.afterschool',      label: 'After-School Guide',    href: '/afterschool-guide',     parentKey: 'header.guides.dropdown' },
  { key: 'header.guides.special-needs',    label: 'Special Needs Guide',   href: '/special-needs-guide',   parentKey: 'header.guides.dropdown' },
]

// "Local Spotlights" dropdown — groups the community spotlight columns
// + Mom Knows Best vertical. School Zone was promoted to a top-level
// header entry (it gets too much traffic to bury in a dropdown), so
// it's no longer listed here.
export const HEADER_LOCAL: NavItem[] = [
  { key: 'header.local.mom-knows-best',   label: 'Mom Knows Best',         href: '/mom-knows-best',                parentKey: 'header.local.dropdown' },
  { key: 'header.local.play-ball',        label: 'Play Ball',              href: '/columns/play-ball',             parentKey: 'header.local.dropdown' },
  { key: 'header.local.teacher',          label: 'Teacher of the Month',   href: '/columns/teacher-of-month',      parentKey: 'header.local.dropdown' },
  { key: 'header.local.grands',           label: 'Grands Are The Greatest',href: '/columns/grands-greatest',       parentKey: 'header.local.dropdown' },
  { key: 'header.local.mom-to-mom',       label: 'Mom to Mom',             href: '/columns/mom-to-mom',            parentKey: 'header.local.dropdown' },
]

// "Calendar" dropdown — promoted from a flat link so submitters can
// find the submission form from the top nav without scrolling to the
// footer. Browse Calendar is the primary destination (active families
// looking for what to do); Submit an Event is the secondary path
// (organizers wanting to be listed).
export const HEADER_CALENDAR: NavItem[] = [
  { key: 'header.calendar.browse',  label: 'Browse Calendar',  href: '/calendar',        parentKey: 'header.calendar.dropdown' },
  { key: 'header.calendar.submit',  label: 'Submit an Event',  href: '/calendar/submit', parentKey: 'header.calendar.dropdown' },
]

// Top-level items in the desktop header (right of the "Guides" dropdown).
// Guides + Local each have their own children arrays; toggling the
// .dropdown key hides the entire group.
export const HEADER_TOP_LEVEL: NavItem[] = [
  // Order set by the editor (Jun 2026): Local Spotlights first
  // (community focus), then School Zone (high-traffic education hub
  // promoted from inside Local to its own top-level row), Calendar
  // (what's happening), Games (engagement), Articles (depth), Partner
  // (CTA). Guides + Summer Fun hidden until ready — restore by
  // uncommenting.
  { key: 'header.local.dropdown',    label: 'Local Spotlights', href: '#local'                 },
  { key: 'header.school-zone',       label: 'School Zone',      href: '/school-zone'           },
  { key: 'header.calendar.dropdown', label: 'Calendar',         href: '#calendar'              },
  { key: 'header.games',             label: 'Games & Prizes',   href: '/games'                 },
  // Birthdays is a top-level entry (not tucked under Guides) because
  // the Big Birthday Bash portal is the only "guide" that's ready
  // enough to promote from the top nav during launch.
  { key: 'header.birthdays',         label: 'Birthdays',        href: '/birthday-party-guide'  },
  { key: 'header.articles',        label: 'Articles',         href: '/articles'              },
  { key: 'header.partners',        label: 'Partner With Us',  href: '/partners'              },
  // Hidden during launch — restore when content is ready:
  // { key: 'header.guides.dropdown', label: 'Guides',     href: '#guides'           },
  // { key: 'header.summer-fun',      label: 'Summer Fun', href: '/summer-fun-guide' },
  { key: 'header.get-listed',      label: 'Get Listed',     href: '/partners#strategy-call'  },
]

// ── FOOTER ────────────────────────────────────────────────────────────────

export const FOOTER_EXPLORE: NavItem[] = [
  { key: 'footer.explore.school-zone',  label: 'School Zone',           href: '/school-zone'           },
  { key: 'footer.explore.frg',          label: 'Family Resource Guide', href: '/family-resource-guide' },
  { key: 'footer.explore.summer-fun',   label: 'Summer Fun Guide',      href: '/summer-fun-guide'      },
  { key: 'footer.explore.calendar',     label: 'Event Calendar',        href: '/calendar'              },
  { key: 'footer.explore.articles',     label: 'Articles',              href: '/articles'              },
  { key: 'footer.explore.local-guides', label: 'All Local Guides',      href: '/local-guides'          },
]

export const FOOTER_CONNECT: NavItem[] = [
  { key: 'footer.connect.advertise',     label: 'Advertise with Us',    href: '/advertise'             },
  { key: 'footer.connect.nominate',      label: 'Nominate Someone',     href: '/nominate'              },
  { key: 'footer.connect.submit-event',  label: 'Submit an Event',      href: '/calendar/submit'       },
  { key: 'footer.connect.mom-to-mom',    label: 'Mom to Mom Column',    href: '/columns/mom-to-mom'    },
  { key: 'footer.connect.instagram',     label: 'Instagram',            href: 'https://instagram.com/riverregionparents', external: true },
]

export const FOOTER_LEGAL: NavItem[] = [
  { key: 'footer.legal.privacy', label: 'Privacy Policy',     href: '/privacy' },
  { key: 'footer.legal.terms',   label: 'Terms of Service',   href: '/terms'   },
]

// ── Admin catalog — the shape /admin/site/navigation reads to draw
//    its toggle list. Header section uses nested=true so the admin
//    indents Guides children + Local children under their parent
//    dropdown row. Footer columns stay flat.
export const NAV_CATALOG: NavGroup[] = [
  {
    groupLabel: 'Header',
    nested:     true,
    items:      [
      ...HEADER_TOP_LEVEL,
      ...HEADER_GUIDES,
      ...HEADER_LOCAL,
      ...HEADER_CALENDAR,
    ],
  },
  { groupLabel: 'Footer — Explore column', items: FOOTER_EXPLORE },
  { groupLabel: 'Footer — Connect column', items: FOOTER_CONNECT },
  { groupLabel: 'Footer — Legal links',    items: FOOTER_LEGAL    },
]

// ── Overrides ────────────────────────────────────────────────────────────
// The DB layer (nav_visibility) stores per-item flags + overrides + a
// list of custom items added by admins. These types describe the merged
// shape the renderers consume.

export interface NavItemOverride {
  hidden?:          boolean
  labelOverride?:   string | null
  hrefOverride?:    string | null
  openInNewTab?:    boolean
  /** For custom items (is_custom=true), these may be set so we know
   *  where in the catalog the item should appear. */
  isCustom?:        boolean
  parentKey?:       string | null
  sortOrder?:       number | null
}

export type OverrideMap = Map<string, NavItemOverride>

/** Apply DB overrides to a single catalog item. Returns the merged
 *  shape or null if the item is hidden. */
export function applyOverride(item: NavItem, override?: NavItemOverride): NavItem | null {
  if (!override) return item
  if (override.hidden) return null
  return {
    ...item,
    label: override.labelOverride ?? item.label,
    href:  override.hrefOverride  ?? item.href,
  }
}

/** Filter helper used by the render-side components. Hidden keys
 *  come from the overrides map (Set still works for the legacy call). */
export function visibleOnly(items: NavItem[], hiddenKeys: Set<string>): NavItem[] {
  return items.filter(i => !hiddenKeys.has(i.key))
}

/** Merge a list of catalog items with DB overrides + custom items.
 *  Returns the final rendered list in sort order. Custom items get
 *  spliced into the right position via sortOrder (lower first); ties
 *  fall back to catalog order. */
export function mergeNavItems(
  catalog:  NavItem[],
  overrides: OverrideMap,
  customs:  NavItem[],
): NavItem[] {
  const out: Array<NavItem & { _sortOrder: number }> = []

  catalog.forEach((item, i) => {
    const ov     = overrides.get(item.key)
    const merged = applyOverride(item, ov)
    if (!merged) return
    out.push({ ...merged, _sortOrder: ov?.sortOrder ?? i * 1000 })
  })

  customs.forEach(item => {
    const ov = overrides.get(item.key)
    if (ov?.hidden) return
    const merged = applyOverride(item, ov)
    if (!merged) return
    // Default custom item sort: append at end (high number)
    out.push({ ...merged, _sortOrder: ov?.sortOrder ?? 999_999 })
  })

  out.sort((a, b) => a._sortOrder - b._sortOrder)
  return out.map(({ _sortOrder, ...rest }) => rest)
}
