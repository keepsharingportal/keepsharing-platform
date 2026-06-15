'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Zap, LayoutGrid, Users, FileText, Settings,
  ChevronDown, ChevronRight, LogOut,
  Megaphone, Star, Newspaper, Bot,
  Image as ImageIcon, TrendingUp, Sparkles,
  BookOpen, Heart, Send, Brain,
  GraduationCap, Printer, Map, Package, Calendar,
  Mail, Share2,
  Inbox, Upload, MapPin, Search, ClipboardList,
  BarChart3, Navigation, Building2, UserCheck, Handshake, Plug,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandSwitcher } from '@/components/admin/BrandSwitcher'

// ── NAV item types ─────────────────────────────────────────────────────────

type ChildItem = {
  name:        string
  href:        string
  accent?:     boolean
  /** Renders the link with target=_blank — used for previewing public maps. */
  external?:   boolean
  /** Visible only to super admins (e.g. internal backlogs / dev tooling). */
  superOnly?:  boolean
  /** Visible only to super/admin (hidden from publisher/editor). Used for
   *  cross-brand or infrastructure controls a publisher shouldn't touch. */
  settingsOnly?: boolean
  /**
   * Key matched against the counts payload so we render a red badge.
   * Circulation badges come from /api/admin/circulation/counts;
   * editorial badges (community, school bits, mom insiders) come from
   * /api/admin/sidebar-counts.
   */
  badgeKey?:
    | 'pending_changes' | 'pending_requests' | 'pending_deliveries' | 'pending_route_suggestions'
    | 'community_nominations' | 'school_bits_pending' | 'mom_insiders_pending'
}

// Parent items can also carry a badgeKey so the top-level row gets a
// red number even when the section is collapsed.
type ParentBadgeKey = NonNullable<ChildItem['badgeKey']>

type NavItem =
  | { section: string }
  | { name: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }>; settingsOnly?: boolean; superOnly?: boolean; badgeKey?: ParentBadgeKey }
  | { name: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: ChildItem[]; settingsOnly?: boolean; superOnly?: boolean; badgeKey?: ParentBadgeKey }

// ── Navigation structure ───────────────────────────────────────────────────
// Organized around what the user actually does: write/publish content,
// schedule production, distribute, sell ads, manage relationships, support
// the community, then everything else under Tools.
//
// Cleanup pass (mid-2026):
//   - Removed parent-equals-first-child duplicates (Articles, Events,
//     Ad System, Advertisers, Settings all had a useless first child).
//   - Collapsed DISTRIBUTION's 5 query-param links into one (the
//     destination page already has tabs).
//   - Renamed "Ad System" → "Ads & Sponsors" with cleaner children.
//   - Moved Sponsor Inventory under Advertisers as "Category Ownership".
//   - Moved Print Export from DISTRIBUTION → PRODUCTION (it's a printer
//     handoff, not an output channel).
//   - Moved Bloggers from VERTICALS → CONTENT (it's an author roster).
//   - Hid mock-data ghost pages from the nav (Pipeline, Businesses,
//     Agreements, Ad Proofs, Intelligence, Nominations, Market Health,
//     Outreach Tracker, Help). The page files remain reachable by URL
//     for editors who want them, but they don't take menu real estate
//     until they have real data.

const NAV: NavItem[] = [
  // ── DASHBOARD ───────────────────────────────────────────────────────────
  { section: 'DASHBOARD' },
  {
    name: 'Today',
    href: '/admin/today',
    icon: Zap,
    children: [
      // Master Backlog is internal/dev tooling — phase notes, integration
      // stubs, things the publisher doesn't need to see. Super-only.
      { name: 'Master Backlog', href: '/admin/today/master-backlog', superOnly: true },
    ],
  },

  // ── CONTENT ─────────────────────────────────────────────────────────────
  { section: 'CONTENT' },
  {
    name: 'Articles',
    href: '/admin/articles',
    icon: Newspaper,
    children: [
      // "All Articles" is a redundant link in shape (same href as the
      // parent), but editors expect to see it explicitly — without it
      // the parent's behaviour-on-click ("opens the full list") isn't
      // discoverable. So we keep this one alias on purpose.
      //
      // Filter children (Drafts / Needs Revision / by-column) live as
      // in-page dropdowns on /admin/articles, not as menu entries.
      { name: 'All Articles',    href: '/admin/articles'                       },
      { name: 'New Article',     href: '/admin/articles/new', accent: true     },
      { name: 'Approval Queue',  href: '/admin/articles/review'                },
      { name: 'Trash',           href: '/admin/articles/trash'                 },
      { name: 'Column Branding', href: '/admin/column-branding',  accent: true },
      { name: 'Authors',         href: '/admin/articles/authors'               },
      { name: 'Contributors',    href: '/admin/contributors'                   },
      { name: 'Editorial Calendar', href: '/admin/editorial-calendar'           },
      { name: 'Distribution Log',   href: '/admin/distribution-log'              },
    ],
  },
  { name: 'Mom Knows Best',    href: '/admin/bloggers',    icon: Users         },
  {
    name: 'Directory',
    href: '/admin/directory',
    icon: Building2,
    children: [
      { name: 'Listings',     href: '/admin/directory'                },
      { name: 'New listing',  href: '/admin/directory/new'             },
      { name: 'Categories',   href: '/admin/directory/categories'      },
      { name: 'Suggestions',  href: '/admin/directory/suggestions'     },
    ],
  },
  {
    name: 'School Bits',
    href: '/admin/school-news',
    icon: GraduationCap,
    badgeKey: 'school_bits_pending',
    children: [
      { name: 'Active List',          href: '/admin/school-news' },
      { name: 'Submitted School Bits', href: '/admin/school-news?status=pending', badgeKey: 'school_bits_pending' },
    ],
  },
  {
    name: 'Events',
    href: '/admin/events',
    icon: Calendar,
    children: [
      // Same shape as Articles — "All Events" is explicit so the
      // entry point is clickable from the menu even though clicking
      // the parent would also open the list.
      { name: 'All Events',             href: '/admin/events'                            },
      { name: 'New Event',              href: '/admin/events?new=1',          accent: true },
      { name: 'Pending Review',         href: '/admin/events?tab=pending'                },
      { name: 'Community Connections',  href: '/admin/events/organizations'              },
      { name: 'Event Imports (CSV)',    href: '/admin/content/events-import'             },
      { name: 'iCal Sources',           href: '/admin/events/sources'                    },
    ],
  },
  { name: 'Brain Games',       href: '/admin/games',       icon: Brain     },
  { name: 'Weekly Polls',      href: '/admin/polls',       icon: BarChart3 },
  { name: '50+ Hero Slots',    href: '/admin/homepage/hero', icon: Sparkles },
  // ONE entry for community submissions. The detail page handles the
  // entire intake → outreach → interview → draft → approve →
  // pool → schedule → publish flow in one view (Phase 3+ rebuild).
  // Pool is a separate page because monthly scheduling has a
  // different mental model than per-submission editing.
  {
    name: 'Community Submissions',
    href: '/admin/community',
    icon: Heart,
    badgeKey: 'community_nominations',
  },
  { name: 'Pending Pool',       href: '/admin/pending',  icon: Heart },
  { name: 'Editorial Pipeline', href: '/admin/editorial', icon: Heart },
  { name: 'Media Library',     href: '/admin/assets',      icon: ImageIcon },
  { name: 'Trending Bar',      href: '/admin/trending',    icon: TrendingUp },
  { name: 'Social Queue',      href: '/admin/social-queue', icon: Share2 },

  // ── PRODUCTION ──────────────────────────────────────────────────────────
  { section: 'PRODUCTION' },
  { name: 'Issues',              href: '/admin/production/issues',             icon: BookOpen   },
  { name: 'Digital Issues',      href: '/admin/production/issues/digital',     icon: BookOpen   },
  { name: 'Print Layout',        href: '/admin/print-layout',                  icon: Printer    },
  { name: 'Monthly Themes',      href: '/admin/production/themes',             icon: Sparkles   },
  { name: 'Print Planning',      href: '/admin/production/print-planning',     icon: Printer    },
  { name: 'Layout Queue',        href: '/admin/advertisers/layout-sheet',      icon: LayoutGrid },
  { name: 'Market Assignments',  href: '/admin/production/market-assignments', icon: Map        },
  { name: 'Export Packages',     href: '/admin/production/export-packages',    icon: Package    },
  { name: 'Print Export',        href: '/admin/distribution/print-export',     icon: Printer    },
  { name: 'Production Calendar', href: '/admin/content/calendar',              icon: Calendar   },

  // ── GUIDES ──────────────────────────────────────────────────────────────
  { section: 'GUIDES' },
  { name: 'Guide Editor',  href: '/admin/guides',                        icon: BookOpen },
  { name: 'Guide Imports', href: '/admin/content/guide-listings-import', icon: Upload   },

  // ── VERTICALS ───────────────────────────────────────────────────────────
  { section: 'VERTICALS' },
  { name: 'Vertical Editor',  href: '/admin/verticals',         icon: LayoutGrid    },
  { name: 'Spotlight Review', href: '/admin/spotlights/review', icon: GraduationCap },

  // ── CONTENT ─────────────────────────────────────────────────────────────
  // Single entry — the page itself has tabs for Today (morning standup) /
  // Queue / Homepage / Newsletter / Social / Guides / Sponsors / Health.
  // Renamed from "Distribution" to "Content Deployment" once the page
  // earned it (Phase A-D rebuild Jun 2026): real pipeline funnel, AI
  // section filler, brand-voice subject lines, sponsor bulk-categorizer,
  // social caption drafter, newsletter draft save. Now THE landing page
  // for editors every morning.
  { section: 'CONTENT' },
  { name: 'Content Deployment', href: '/admin/distribution', icon: Send },

  // ── DISTRIBUTION ROUTES (physical magazine delivery) ──────────────────
  // Ported from the standalone PHP "Distribution Portal" that ran at
  // drivers.keepsharing.com. Manages physical magazine delivery: routes,
  // stops with GPS, drivers, monthly delivery cycles, public Leaflet maps.
  // Distinct from "Distribution" above (content distribution: homepage,
  // newsletter, social).
  { section: 'DISTRIBUTION ROUTES' },
  {
    name: 'Distribution Portal',
    href: '/admin/circulation',
    icon: Navigation,
    // Order + naming intentionally mirrors the legacy PHP portal at
    // drivers.keepsharing.com so existing users have zero retraining.
    children: [
      { name: 'Dashboard',         href: '/admin/circulation'                            },
      { name: 'Live Progress',     href: '/admin/circulation/progress'                   },
      { name: 'Routes & Stops',    href: '/admin/circulation/routes'                     },
      { name: 'Import Stops',      href: '/admin/circulation/import'                     },
      { name: 'Geocode Stops',     href: '/admin/circulation/geocode'                    },
      { name: 'Route Order',       href: '/admin/circulation/route-order'                },
      { name: 'Users',             href: '/admin/circulation/drivers'                    },
      { name: 'Deliveries',        href: '/admin/circulation/deliveries', badgeKey: 'pending_deliveries' },
      { name: 'Changes',           href: '/admin/circulation/changes',    badgeKey: 'pending_changes'    },
      { name: 'Route Suggestions', href: '/admin/circulation/route-suggestions', badgeKey: 'pending_route_suggestions' },
      { name: 'Publications',      href: '/admin/circulation/publications'               },
      { name: 'Resources',         href: '/admin/circulation/resources'                  },
      { name: 'Location Requests', href: '/admin/circulation/requests',   badgeKey: 'pending_requests'   },
      { name: 'RRP Public Map',    href: '/distribution/rrp/map',         external: true },
      { name: 'RR 50+ Public Map', href: '/distribution/rr50plus/map',    external: true },
      { name: 'Email Center',      href: '/admin/circulation/emails'                     },
      { name: 'Settings',          href: '/admin/circulation/settings'                   },
    ],
  },

  // ── ADS & SPONSORS ──────────────────────────────────────────────────────
  // All Bookings = the full inventory grid (every slot, ON/OFF toggle,
  //                booking-level edit). This is the day-to-day landing
  //                page for ad ops, so parent click navigates here.
  // Slot Map     = pricing + revenue view of the catalog.
  // Renewal Reminders = upcoming expirations.
  { section: 'ADS & SPONSORS' },
  {
    name: 'Ads & Sponsors',
    href: '/admin/ads',
    icon: Star,
    children: [
      { name: 'All Bookings',      href: '/admin/ads'         },
      { name: 'Slot Map',          href: '/admin/ads/map'     },
      { name: 'Renewal Reminders', href: '/admin/ads/renewals'},
      // Section Sponsors removed — migration 122 collapsed them into
      // ad_placements. They now surface in All Bookings.
    ],
  },

  // ── CRM ─────────────────────────────────────────────────────────────────
  // The relationship system. Businesses (advertiser_accounts) is the
  // top-level entity — every other CRM record (contacts, proposals,
  // pipeline stages, ad placements) attaches to a business. Slot
  // inventory itself lives under Ads & Sponsors above, not here.
  { section: 'CRM' },
  {
    name: 'Businesses',
    href: '/admin/advertisers',
    icon: Building2,
    children: [
      { name: 'All profiles', href: '/admin/businesses'             },
      { name: 'Pipeline',     href: '/admin/advertisers/pipeline'   },
      { name: 'Duplicates',   href: '/admin/advertisers/duplicates' },
    ],
  },
  { name: 'Contacts',       href: '/admin/contacts',              icon: UserCheck },
  { name: 'Proposals',      href: '/admin/advertisers/proposals', icon: FileText  },
  { name: 'Onboarding',     href: '/admin/advertisers/onboarding',icon: Sparkles  },
  { name: 'Partner Ops',    href: '/admin/advertisers/partner-ops', icon: Handshake },
  { name: 'Client Reports', href: '/admin/reports',               icon: BarChart3 },
  { name: 'Analytics',      href: '/admin/advertisers/intelligence', icon: TrendingUp },

  // ── MARKETING ───────────────────────────────────────────────────────────
  // Promotion / campaigns / outreach — not relationship management.
  { section: 'MARKETING' },
  { name: 'Marketing System', href: '/admin/marketing-system', icon: Megaphone },

  // ── COMMUNITY ───────────────────────────────────────────────────────────
  { section: 'COMMUNITY' },
  { name: 'Submissions',       href: '/admin/submissions',      icon: Inbox         },
  { name: 'Listing Inquiries', href: '/admin/inquiries',        icon: Mail          },
  { name: 'Family Favorites',  href: '/admin/family-favorites', icon: Heart         },
  { name: 'Forms',             href: '/admin/content/forms',    icon: ClipboardList },

  // ── SEO ─────────────────────────────────────────────────────────────────
  { section: 'SEO' },
  {
    name: 'SEO Command Center',
    href: '/admin/seo',
    icon: TrendingUp,
    children: [
      { name: 'Brand Profile',          href: '/admin/seo/brand-profile'  },
      { name: 'Topical Authority',      href: '/admin/seo/clusters'       },
      { name: 'Author Profiles',        href: '/admin/seo/authors',        settingsOnly: true },
      { name: 'Alt-text Audit',         href: '/admin/seo/alt-text'       },
      { name: 'Query Briefs',           href: '/admin/seo/query-briefs'   },
      { name: 'CTR Optimizer',          href: '/admin/seo/ctr-optimizer'  },
      { name: 'Weekly Audit Reports',   href: '/admin/seo/audit-reports'  },
      { name: 'Redirects',              href: '/admin/seo/redirects',      settingsOnly: true },
      { name: '404 Monitor',            href: '/admin/seo/404-log',        settingsOnly: true },
      { name: 'Internal Link Queue',    href: '/admin/seo/internal-links', settingsOnly: true },
      { name: 'Schema Validator',       href: '/admin/seo/schema-validator', settingsOnly: true },
      { name: 'Page Metadata',          href: '/admin/seo/page-metadata',    settingsOnly: true },
      { name: 'Bulk SEO Edit',          href: '/admin/seo/bulk',           settingsOnly: true },
      { name: 'Route Coverage Audit',   href: '/admin/seo-health',         settingsOnly: true },
    ],
  },

  // ── TOOLS ───────────────────────────────────────────────────────────────
  { section: 'TOOLS' },
  { name: 'Site Navigation', href: '/admin/site/navigation',  icon: Navigation },
  { name: 'Imports',         href: '/admin/content/imports',  icon: Upload     },
  { name: 'AI Tasks',        href: '/admin/ai-tasks',         icon: Bot        },
  { name: 'Geocode',         href: '/admin/guides/geocode',   icon: MapPin     },
  { name: 'QR Codes / Links', href: '/admin/content/short-links', icon: Share2  },
  { name: 'Word Search',     href: '/admin/content/word-search', icon: Search  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    settingsOnly: true,
    children: [
      { name: 'Overview',           href: '/admin/analytics'             },
      { name: 'Audience',           href: '/admin/analytics/audience'    },
      { name: 'Acquisition',        href: '/admin/analytics/acquisition' },
      { name: 'Content',            href: '/admin/analytics/content'     },
      { name: 'Landings',           href: '/admin/analytics/landings'    },
      { name: 'Conversion',         href: '/admin/analytics/conversion'  },
      { name: 'Real-time',          href: '/admin/analytics/realtime'    },
      { name: 'School Engagement',  href: '/admin/school-news/schools/report' },
    ],
  },
  { name: 'Integrations',    href: '/admin/integrations',     icon: Plug,      settingsOnly: true },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    settingsOnly: true,
    children: [
      // No "General" child — parent click already goes to /admin/settings.
      { name: 'Users',            href: '/admin/settings/users' },
      { name: 'Audit Log',        href: '/admin/settings/audit-log' },
      { name: 'My Security (2FA)', href: '/admin/settings/security' },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────

type AdminRole = 'super' | 'admin' | 'publisher' | 'editor'

export function Sidebar() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  // Normalized current query so we can compare against child hrefs that
  // carry query params (e.g. /admin/events?new=1 vs ?tab=pending).
  const currentQuery = searchParams?.toString() ?? ''
  const [expandedNav, setExpandedNav] = useState<string | null>('Articles')

  // Auto-expand the parent group whose route matches the current pathname.
  // Without this, navigating into /admin/ads/anything left "Articles"
  // expanded and "Ads & Sponsors" collapsed even though the user was
  // clearly inside it — making it hard to see which sub-section was active.
  // Re-runs whenever the URL changes.
  useEffect(() => {
    for (const item of NAV) {
      if ('children' in item) {
        const onParentRoute = pathname === item.href || pathname.startsWith(item.href + '/')
        const onChildRoute  = item.children.some(c => {
          const childPath = c.href.split('?')[0]
          return pathname === childPath || pathname.startsWith(childPath + '/')
        })
        if (onParentRoute || onChildRoute) {
          setExpandedNav(item.name)
          return
        }
      }
    }
  }, [pathname])

  // Auto-scroll the active nav element into view on URL change. Helps
  // when the editor lands on a deep route and the relevant section is
  // below the visible scroll area on first paint. block:'nearest' so
  // we don't ratchet a fully-visible item up/down for no reason.
  //
  // Critical: only fire on pathname change, NOT on expandedNav change.
  // Otherwise clicking a collapsed section to expand it would re-scroll
  // to whatever the OLD active item was, undoing the editor's manual
  // scroll to the section they just clicked.
  const activeNavRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    // Defer to next frame so the expanded group's children have rendered.
    const id = requestAnimationFrame(() => {
      activeNavRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [pathname])
  const [role, setRole] = useState<AdminRole | null>(null)
  // Pending counts surfaced as red badges next to nav children with a
  // badgeKey. Refreshed every 60s + on window focus so admins see new
  // submissions without reloading.
  const [counts, setCounts] = useState<Record<string, number>>({})

  // Pull the current admin's role so settings-tier nav entries hide for
  // publishers/editors. Cheap call, runs once per session.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (!cancelled && j?.role) setRole(j.role as AdminRole) })
      .catch(() => {/* sidebar still renders without settings filtering */})
    return () => { cancelled = true }
  }, [])

  // Pending counts for sidebar badges. Two endpoints: circulation (drivers,
  // change requests, etc.) and editorial (community nominations, school
  // bits, mom insiders). Merged into one counts map keyed by badgeKey
  // string so the render only has to do counts[child.badgeKey].
  useEffect(() => {
    let cancelled = false
    function pull() {
      Promise.all([
        fetch('/api/admin/circulation/counts', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/admin/sidebar-counts',     { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]).then(([circ, ed]) => {
        if (cancelled) return
        setCounts({ ...(circ ?? {}), ...(ed ?? {}) })
      })
    }
    pull()
    const id = setInterval(pull, 60_000)
    const onFocus = () => pull()
    window.addEventListener('focus', onFocus)
    return () => { cancelled = true; clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [])

  const isSettingsTier = role === 'super' || role === 'admin'

  function isActive(href: string) {
    const path = href.split('?')[0]
    if (path === '/admin/advertisers') return pathname === path
    return pathname === path || pathname.startsWith(path + '/')
  }

  function isGroupActive(item: { href: string; children?: ChildItem[] }) {
    if (!item.children) return isActive(item.href)
    return pathname.startsWith(item.href) ||
      item.children.some(c => pathname.startsWith(c.href.split('?')[0] + '/') || pathname === c.href.split('?')[0])
  }

  return (
    <aside
      className="flex flex-col w-60 shrink-0 h-full overflow-hidden no-print"
      style={{ backgroundColor: 'var(--color-sidebar)' }}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/8">
        <div className="flex items-end gap-[3px] h-7 shrink-0">
          <span className="w-[5px] rounded-t-sm" style={{ height: '45%', backgroundColor: '#d4a843' }} />
          <span className="w-[5px] rounded-t-sm" style={{ height: '75%', backgroundColor: '#d4a843' }} />
          <span className="w-[5px] rounded-t-sm" style={{ height: '100%', backgroundColor: '#d4a843' }} />
          <span className="w-[5px] rounded-t-sm" style={{ height: '65%', backgroundColor: '#d4a843' }} />
          <span className="w-[5px] rounded-t-sm" style={{ height: '40%', backgroundColor: 'rgba(212,168,67,0.55)' }} />
        </div>
        <div>
          <div className="text-sm font-bold text-white leading-tight tracking-tight">KeepSharing</div>
          <div className="text-[9px] font-medium text-white/35 leading-tight">Publishing Platform</div>
        </div>
      </div>

      {/* ── BRAND SWITCHER ───────────────────────────────────────────────────
          Driven by /api/admin/me + /api/admin/active-market. Hides itself
          for single-market publishers so they never see chrome they can't
          use. Super-admin sees an extra "All brands" entry. */}
      <BrandSwitcher />

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {NAV.map((item, idx) => {
          // Section divider
          if ('section' in item) {
            return (
              <div key={`section-${idx}`} className="px-2.5 pt-5 pb-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {item.section}
                </span>
              </div>
            )
          }

          // settingsOnly entries hide entirely for publisher/editor. We
          // wait until role is known before rendering to avoid a flash of
          // settings links the user can't actually use.
          if ('settingsOnly' in item && item.settingsOnly && !isSettingsTier) {
            return null
          }
          // superOnly entries hide for everyone but super-admin. Used for
          // internal/dev tooling that even cross-brand Admins shouldn't see.
          if ('superOnly' in item && item.superOnly && role !== 'super') {
            return null
          }

          // Group with children
          if ('children' in item) {
            const groupActive = isGroupActive(item)
            const isExpanded  = expandedNav === item.name
            // Show a red badge on the parent row using either the parent's
            // explicit badgeKey or the sum of all child badges. That way
            // a collapsed section still tells the editor "something needs
            // attention in here."
            const parentBadge = item.badgeKey
              ? counts[item.badgeKey] ?? 0
              : item.children.reduce((sum, c) => sum + (c.badgeKey ? counts[c.badgeKey] ?? 0 : 0), 0)

            // Whether any expanded child matches the current pathname.
            // When the parent route itself is active (e.g. /admin/advertisers
            // exactly) and no child matches, we want the ref on the parent
            // button so the auto-scroll has something to anchor on. Without
            // this, navigating to a parent route after expanding it leaves
            // activeNavRef pointing at the previously-active item and the
            // sidebar jumps back to that.
            const anyChildOnPath = isExpanded && item.children.some(c => {
              const childPath = c.href.split('?')[0]
              return pathname === childPath || pathname.startsWith(childPath + '/')
            })

            return (
              <div key={item.name}>
                <Link
                  // Hold the ref when this group is the active route AND
                  // either (a) it's collapsed (no children visible), or
                  // (b) it's expanded but no child route matches.
                  ref={groupActive && (!isExpanded || !anyChildOnPath)
                        ? (el => { activeNavRef.current = el })
                        : undefined}
                  href={item.href}
                  // Clicking the parent navigates AND expands. Never
                  // collapses on parent click — to collapse, expand a
                  // different parent (only one expanded at a time).
                  // Keeps the editor on a predictable "click → land
                  // on the first child" flow.
                  onClick={() => setExpandedNav(item.name)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors',
                    groupActive ? 'bg-white/10 text-white font-semibold' : 'text-white/55 hover:text-white hover:bg-white/5 font-medium'
                  )}
                >
                  <item.icon size={15} className="shrink-0" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {parentBadge > 0 && (
                    <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {parentBadge > 99 ? '99+' : parentBadge}
                    </span>
                  )}
                  {isExpanded
                    ? <ChevronDown size={12} className="shrink-0 opacity-40" />
                    : <ChevronRight size={12} className="shrink-0 opacity-40" />}
                </Link>

                {isExpanded && (() => {
                  // Pre-parse every child href so we can disambiguate
                  // siblings that share a pathname but differ by query
                  // string (e.g. /admin/events vs /admin/events?new=1
                  // vs /admin/events?tab=pending — previously all three
                  // lit up at once on /admin/events).
                  // superOnly children are filtered here so non-super
                  // admins don't even see them in expanded state.
                  // settingsOnly hides cross-brand / infrastructure
                  // controls from publisher and editor.
                  const visibleChildren = item.children.filter(c =>
                    !(c.superOnly && role !== 'super')
                    && !(c.settingsOnly && !isSettingsTier)
                  )
                  const parsed = visibleChildren.map(c => {
                    const u = new URL(c.href, 'http://x')
                    return { child: c, path: u.pathname, query: u.searchParams.toString() }
                  })
                  // Which sibling queries exist at the current pathname?
                  // Used by the bare-path child to know if a more
                  // specific sibling owns the current URL.
                  const sameOnPathnameQueries = new Set(
                    parsed
                      .filter(p => p.path === pathname && p.query !== '')
                      .map(p => p.query),
                  )
                  return (
                  <div className="ml-5 mt-0.5 pl-3 border-l border-white/8 space-y-0.5">
                    {parsed.map(({ child, path: childPath, query: childQuery }) => {
                      let childActive = false
                      if (pathname === childPath) {
                        if (childQuery === '') {
                          // Bare-path sibling. Wins only when the current
                          // query doesn't match a sibling that wants it.
                          childActive = !sameOnPathnameQueries.has(currentQuery)
                        } else {
                          // Query-string sibling. Exact match required.
                          childActive = currentQuery === childQuery
                        }
                      } else if (pathname.startsWith(childPath + '/')) {
                        // Deeper-path child (e.g. /admin/events/sources).
                        childActive = true
                      }
                      const accent      = child.accent === true
                      const badgeCount  = child.badgeKey ? counts[child.badgeKey] ?? 0 : 0
                      const linkProps   = child.external
                        ? { target: '_blank', rel: 'noopener noreferrer' as const }
                        : {}
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          {...linkProps}
                          // Set the scroll target on the active child so the
                          // expanded group reveals what we're inside of.
                          ref={childActive ? (el => { activeNavRef.current = el }) : undefined}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors',
                            accent
                              ? childActive
                                ? 'text-amber-400 font-semibold'
                                : 'text-amber-400/60 hover:text-amber-400 hover:bg-white/5'
                              : childActive
                                ? 'text-white font-semibold bg-white/6'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                          )}
                        >
                          <span className="flex-1 truncate">{child.name}</span>
                          {child.external && <span className="text-white/30 text-[10px] shrink-0">↗</span>}
                          {badgeCount > 0 && (
                            <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                  )
                })()}
              </div>
            )
          }

          // Single link
          const active = isActive(item.href)
          const parentBadge = item.badgeKey ? counts[item.badgeKey] ?? 0 : 0
          return (
            <Link
              key={item.name}
              href={item.href}
              ref={active ? (el => { activeNavRef.current = el }) : undefined}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors',
                active ? 'bg-white/10 text-white font-semibold' : 'text-white/55 hover:text-white hover:bg-white/5 font-medium'
              )}
            >
              <item.icon size={15} className="shrink-0" />
              <span className="flex-1 truncate">{item.name}</span>
              {parentBadge > 0 && (
                <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {parentBadge > 99 ? '99+' : parentBadge}
                </span>
              )}
            </Link>
          )
        })}

        {/* Phase 1 status — subtle system link at bottom of nav */}
        <div className="pt-4">
          <Link
            href="/admin/phase1-status"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors text-white/20 hover:text-white/50 hover:bg-white/5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500/60 shrink-0" />
            Phase 1 Status
          </Link>
        </div>
      </nav>

      {/* ── User ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-t border-white/8">
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">JW</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white truncate">Jason Watson</div>
          <div className="text-[10px] text-white/35">Super Admin</div>
        </div>
        <button className="text-white/25 hover:text-white/60 transition-colors"><LogOut size={13} /></button>
      </div>
    </aside>
  )
}
