'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Zap, LayoutGrid, Users, FileText, Settings,
  ChevronDown, ChevronRight, LogOut,
  Megaphone, Star, Newspaper, Bot,
  Image as ImageIcon, TrendingUp, Sparkles,
  BookOpen, Heart, Send, Brain,
  GraduationCap, Printer, Map, Package, Calendar,
  Mail, Share2,
  Inbox, Upload, MapPin, Search, ClipboardList,
  BarChart3, Navigation,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandSwitcher } from '@/components/admin/BrandSwitcher'

// ── NAV item types ─────────────────────────────────────────────────────────

type ChildItem = { name: string; href: string; accent?: boolean }

type NavItem =
  | { section: string }
  | { name: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }>; settingsOnly?: boolean }
  | { name: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: ChildItem[]; settingsOnly?: boolean }

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
  { name: 'Today', href: '/admin/today', icon: Zap },

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
    ],
  },
  { name: 'Mom Knows Best',    href: '/admin/bloggers',    icon: Users         },
  { name: 'School Bits',       href: '/admin/school-news', icon: GraduationCap },
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
  { name: 'Submitted Content', href: '/admin/community',   icon: Heart     },
  { name: 'Media Library',     href: '/admin/assets',      icon: ImageIcon },

  // ── PRODUCTION ──────────────────────────────────────────────────────────
  { section: 'PRODUCTION' },
  { name: 'Issues',              href: '/admin/production/issues',             icon: BookOpen   },
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

  // ── DISTRIBUTION ────────────────────────────────────────────────────────
  // Single entry — the page itself has tabs for Queue / Homepage /
  // Newsletter / Social / Sponsors. Was 5 nav items pointing at one page.
  { section: 'DISTRIBUTION' },
  { name: 'Distribution', href: '/admin/distribution', icon: Send },

  // ── ADS & SPONSORS ──────────────────────────────────────────────────────
  // Slot Map = where every ad spot lives, what it costs, who owns it.
  // All Bookings = raw ad_placements list for power-edit.
  // Section Sponsors = column_sponsors (Play Ball "presented by X").
  { section: 'ADS & SPONSORS' },
  {
    name: 'Ads & Sponsors',
    href: '/admin/ads/map',
    icon: Star,
    children: [
      { name: 'Slot Map',         href: '/admin/ads/map'                  },
      { name: 'All Bookings',     href: '/admin/ads'                      },
      { name: 'Section Sponsors', href: '/admin/section-sponsors', accent: true },
    ],
  },

  // ── ADVERTISERS (CRM) ───────────────────────────────────────────────────
  // The people and the franchise relationships. NOT the slot inventory —
  // that lives under Ads & Sponsors above.
  { section: 'ADVERTISERS' },
  {
    name: 'Advertisers',
    href: '/admin/advertisers',
    icon: Users,
    children: [
      // No "Active Advertisers" child — clicking the parent already goes
      // to the active list. Pipeline / Businesses / Agreements / Ad Proofs
      // are hidden until they're backed by real data.
      { name: 'Category Ownership', href: '/admin/advertisers/sponsor-inventory' },
      { name: 'Onboarding',         href: '/admin/advertisers/onboarding', accent: true },
    ],
  },
  { name: 'Proposals',     href: '/admin/advertisers/proposals', icon: FileText },
  { name: 'Marketing',     href: '/admin/marketing-system',      icon: Megaphone },
  { name: 'Client Reports', href: '/admin/reports',              icon: BarChart3 },
  { name: 'Analytics',     href: '/admin/advertisers/intelligence', icon: TrendingUp },

  // ── COMMUNITY ───────────────────────────────────────────────────────────
  { section: 'COMMUNITY' },
  { name: 'Submissions',       href: '/admin/submissions',      icon: Inbox         },
  { name: 'Listing Inquiries', href: '/admin/inquiries',        icon: Mail          },
  { name: 'Family Favorites',  href: '/admin/family-favorites', icon: Heart         },
  { name: 'Forms',             href: '/admin/content/forms',    icon: ClipboardList },

  // ── TOOLS ───────────────────────────────────────────────────────────────
  { section: 'TOOLS' },
  { name: 'Site Navigation', href: '/admin/site/navigation',  icon: Navigation },
  { name: 'Imports',         href: '/admin/content/imports',  icon: Upload     },
  { name: 'AI Tasks',        href: '/admin/ai-tasks',         icon: Bot        },
  { name: 'Geocode',         href: '/admin/guides/geocode',   icon: MapPin     },
  { name: 'QR Codes',        href: '/admin/content/short-links', icon: Share2  },
  { name: 'Word Search',     href: '/admin/content/word-search', icon: Search  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    settingsOnly: true,
    children: [
      // No "General" child — parent click already goes to /admin/settings.
      { name: 'Admin Users', href: '/admin/settings/users' },
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
  const [role, setRole] = useState<AdminRole | null>(null)

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

          // Group with children
          if ('children' in item) {
            const groupActive = isGroupActive(item)
            const isExpanded  = expandedNav === item.name

            return (
              <div key={item.name}>
                <button
                  onClick={() => setExpandedNav(isExpanded ? null : item.name)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors',
                    groupActive ? 'bg-white/10 text-white font-semibold' : 'text-white/55 hover:text-white hover:bg-white/5 font-medium'
                  )}
                >
                  <item.icon size={15} className="shrink-0" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {isExpanded
                    ? <ChevronDown size={12} className="shrink-0 opacity-40" />
                    : <ChevronRight size={12} className="shrink-0 opacity-40" />}
                </button>

                {isExpanded && (() => {
                  // Pre-parse every child href so we can disambiguate
                  // siblings that share a pathname but differ by query
                  // string (e.g. /admin/events vs /admin/events?new=1
                  // vs /admin/events?tab=pending — previously all three
                  // lit up at once on /admin/events).
                  const parsed = item.children.map(c => {
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
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
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
                          {child.name}
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
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors',
                active ? 'bg-white/10 text-white font-semibold' : 'text-white/55 hover:text-white hover:bg-white/5 font-medium'
              )}
            >
              <item.icon size={15} className="shrink-0" />
              {item.name}
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
