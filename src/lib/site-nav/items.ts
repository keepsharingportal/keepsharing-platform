// Single source of truth for what the public-site header + footer
// navigations contain. Every item gets a stable `key` so the
// nav_visibility table can store an "off switch" against it without
// having to seed all items into the DB.
//
// To add a new menu item: append to the right array here. To hide
// one without a code change: toggle it in /admin/site/navigation —
// that writes hidden=true into nav_visibility against this key.

export interface NavItem {
  /** Stable identifier — used as the nav_visibility primary key. */
  key:   string
  label: string
  href:  string
  /** Optional flag for absolute URLs (Instagram etc). */
  external?: boolean
}

export interface NavGroup {
  /** Human label for the group in the admin UI (not rendered on the site). */
  groupLabel: string
  items: NavItem[]
}

// ── HEADER ────────────────────────────────────────────────────────────────

export const HEADER_GUIDES: NavItem[] = [
  { key: 'header.guides.family-resource',  label: 'Family Resource Guide', href: '/family-resource-guide' },
  { key: 'header.guides.private-school',   label: 'Private School Guide',  href: '/private-school-guide'  },
  { key: 'header.guides.summer-camp',      label: 'Summer Camp Guide',     href: '/summer-camp-guide'     },
  { key: 'header.guides.childcare',        label: 'Childcare Guide',       href: '/childcare-guide'       },
  { key: 'header.guides.healthy-kids',     label: 'Healthy Kids Guide',    href: '/healthy-kids-guide'    },
  { key: 'header.guides.summer-fun',       label: 'Summer Fun Guide',      href: '/summer-fun-guide'      },
  { key: 'header.guides.birthday-party',   label: 'Birthday Party Guide',  href: '/birthday-party-guide'  },
  { key: 'header.guides.afterschool',      label: 'After-School Guide',    href: '/afterschool-guide'     },
  { key: 'header.guides.special-needs',    label: 'Special Needs Guide',   href: '/special-needs-guide'   },
]

// Top-level items in the desktop header (right of the "Guides" dropdown).
// The "Guides" dropdown itself toggles via header.guides.dropdown — when
// hidden, the whole dropdown disappears.
export const HEADER_TOP_LEVEL: NavItem[] = [
  { key: 'header.guides.dropdown', label: 'Guides',         href: '#guides'                  },
  { key: 'header.calendar',        label: 'Calendar',       href: '/calendar'                },
  { key: 'header.articles',        label: 'Articles',       href: '/articles'                },
  { key: 'header.summer-fun',      label: 'Summer Fun',     href: '/summer-fun-guide'        },
  { key: 'header.school-zone',     label: 'School Zone',    href: '/school-zone'             },
  { key: 'header.mom-knows-best',  label: 'Mom Knows Best', href: '/mom-knows-best'          },
  { key: 'header.games',           label: 'Games & Prizes', href: '/games'                   },
  { key: 'header.partners',        label: 'Partner With Us',href: '/partners'                },
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
//    its toggle list. Add a new group here when you add a new array
//    above so the admin sees it without further wiring.
export const NAV_CATALOG: NavGroup[] = [
  { groupLabel: 'Header — Top level',     items: HEADER_TOP_LEVEL },
  { groupLabel: 'Header — Guides menu',   items: HEADER_GUIDES    },
  { groupLabel: 'Footer — Explore column',items: FOOTER_EXPLORE   },
  { groupLabel: 'Footer — Connect column',items: FOOTER_CONNECT   },
  { groupLabel: 'Footer — Legal links',   items: FOOTER_LEGAL     },
]

/** Filter helper used by the render-side components. */
export function visibleOnly(items: NavItem[], hiddenKeys: Set<string>): NavItem[] {
  return items.filter(i => !hiddenKeys.has(i.key))
}
