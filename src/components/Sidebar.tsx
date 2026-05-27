'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Zap, LayoutGrid, Users, FileText, Settings,
  ChevronDown, ChevronRight, LogOut,
  Megaphone, HelpCircle, Activity, Star, Newspaper, Bot,
  Image as ImageIcon, TrendingUp, Sparkles,
  BookOpen, Heart, Send, Brain,
  GraduationCap, Printer, Map, Package, Calendar,
  Home, Mail, Share2, Crown, RefreshCw,
  Inbox, Award, Upload, MapPin, Search, ClipboardList,
  BarChart3,
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
// Designed around the actual publishing workflow:
//   Dashboard → Content (library) → Production (planning) → Distribution (output)
//   Guides + Revenue + Community + Tools as supporting sections.

const NAV: NavItem[] = [
  // ── DASHBOARD ───────────────────────────────────────────────────────────
  { section: 'DASHBOARD' },
  { name: 'Today',         href: '/admin/today',   icon: Zap      },
  { name: 'Market Health', href: '/admin/markets', icon: Activity },

  // ── CONTENT (the central library) ───────────────────────────────────────
  { section: 'CONTENT' },
  {
    name: 'Articles',
    href: '/admin/articles',
    icon: Newspaper,
    children: [
      { name: 'All Articles',   href: '/admin/articles'                          },
      { name: 'New Article',    href: '/admin/articles/new', accent: true        },
      { name: 'Approval Queue', href: '/admin/articles/review'                   },
      { name: 'Drafts',         href: '/admin/articles?filter=draft'             },
      { name: 'Needs Revision', href: '/admin/articles?filter=needs_revision'    },
      { name: 'Columns',        href: '/admin/articles/columns'                  },
      { name: 'Authors',        href: '/admin/articles/authors'                  },
    ],
  },
  { name: 'Media Library',     href: '/admin/assets',      icon: ImageIcon     },
  { name: 'School Bits',       href: '/admin/school-news', icon: GraduationCap },
  {
    name: 'Events',
    href: '/admin/events',
    icon: Calendar,
    children: [
      { name: 'All Events',             href: '/admin/events'                          },
      { name: 'Pending Review',         href: '/admin/events?tab=pending', accent: true },
      { name: 'Community Connections',  href: '/admin/events/organizations'            },
      { name: 'Event Imports (CSV)',    href: '/admin/content/events-import'           },
      { name: 'iCal Sources',           href: '/admin/events/sources'                  },
    ],
  },
  { name: 'Community Content', href: '/admin/community',   icon: Heart         },
  { name: 'Brain Games',       href: '/admin/games',       icon: Brain         },

  // ── PRODUCTION (orchestration between content and channels) ─────────────
  { section: 'PRODUCTION' },
  { name: 'Issues',              href: '/admin/production/issues',             icon: BookOpen   },
  { name: 'Monthly Themes',      href: '/admin/production/themes',             icon: Sparkles   },
  { name: 'Print Planning',      href: '/admin/production/print-planning',     icon: Printer    },
  { name: 'Layout Queue',        href: '/admin/advertisers/layout-sheet',      icon: LayoutGrid },
  { name: 'Market Assignments',  href: '/admin/production/market-assignments', icon: Map        },
  { name: 'Export Packages',     href: '/admin/production/export-packages',    icon: Package    },
  { name: 'Production Calendar', href: '/admin/content/calendar',              icon: Calendar   },

  // ── GUIDES ──────────────────────────────────────────────────────────────
  { section: 'GUIDES' },
  { name: 'Guide Editor',      href: '/admin/guides',                                   icon: BookOpen  },
  { name: 'Guide Sponsors',    href: '/admin/advertisers/sponsor-inventory?type=guide', icon: Crown     },
  { name: 'Guide Imports',     href: '/admin/content/guide-listings-import',            icon: Upload    },
  { name: 'Outreach Tracker',  href: '/admin/guides/outreach',                          icon: RefreshCw },

  // ── VERTICALS — year-round content homes (School Zone, Mom Knows Best, etc.) ─
  { section: 'VERTICALS' },
  { name: 'Vertical Editor',     href: '/admin/verticals',                              icon: LayoutGrid    },
  { name: 'Spotlight Review',    href: '/admin/spotlights/review',                      icon: GraduationCap },
  { name: 'Bloggers',            href: '/admin/bloggers',                               icon: Users         },

  // ── DISTRIBUTION (output channels — content ready to place) ─────────────
  { section: 'DISTRIBUTION' },
  { name: 'Distribution Queue', href: '/admin/distribution?view=queue',      icon: Send    },
  { name: 'Homepage',           href: '/admin/distribution?view=homepage',   icon: Home    },
  { name: 'Newsletter',         href: '/admin/distribution?view=newsletter', icon: Mail    },
  { name: 'Social',             href: '/admin/distribution?view=social',     icon: Share2  },
  { name: 'Print Export',       href: '/admin/distribution/print-export',    icon: Printer },
  { name: 'Sponsor Placements', href: '/admin/distribution?view=sponsors',   icon: Crown   },

  // ── ADVERTISING ──────────────────────────────────────────────────────────
  // Consolidated view: the Ad Map is the visual overview, Advertisers is
  // the people, everything else supports the workflow.
  { section: 'ADVERTISING' },
  {
    name: 'Ad System',
    href: '/admin/ads/map',
    icon: Star,
    children: [
      { name: 'Ad Map',             href: '/admin/ads/map'                                  },
      { name: 'All Placements',     href: '/admin/ads'                                      },
      { name: 'Sponsor Inventory',  href: '/admin/advertisers/sponsor-inventory'             },
    ],
  },
  {
    name: 'Advertisers',
    href: '/admin/advertisers',
    icon: Users,
    children: [
      { name: 'Active Advertisers', href: '/admin/advertisers'                            },
      { name: 'Businesses',         href: '/admin/advertisers/businesses'                 },
      { name: 'Pipeline',           href: '/admin/advertisers/pipeline'                   },
      { name: 'Onboarding',         href: '/admin/advertisers/onboarding', accent: true   },
      { name: 'Agreements',         href: '/admin/advertisers/agreements'                 },
      { name: 'Ad Proofs',          href: '/admin/advertisers/ad-proofs'                  },
    ],
  },
  { name: 'Campaigns',         href: '/admin/marketing-system',              icon: Megaphone   },
  { name: 'Proposals',         href: '/admin/advertisers/proposals',         icon: FileText    },
  { name: 'Client Reports',    href: '/admin/reports',                       icon: BarChart3   },
  { name: 'Analytics',         href: '/admin/advertisers/intelligence',      icon: TrendingUp  },

  // ── COMMUNITY ───────────────────────────────────────────────────────────
  { section: 'COMMUNITY' },
  { name: 'Submissions',      href: '/admin/submissions',           icon: Inbox         },
  { name: 'Listing Inquiries', href: '/admin/inquiries',            icon: Mail          },
  { name: 'Nominations',      href: '/admin/nominations',           icon: Award         },
  { name: 'Family Favorites', href: '/admin/family-favorites',      icon: Heart         },
  { name: 'Forms',            href: '/admin/content/forms',         icon: ClipboardList },

  // ── TOOLS ───────────────────────────────────────────────────────────────
  { section: 'TOOLS' },
  { name: 'Imports',     href: '/admin/content/imports',     icon: Upload     },
  { name: 'Geocode',     href: '/admin/guides/geocode',      icon: MapPin     },
  { name: 'QR Codes',    href: '/admin/content/short-links', icon: Share2      },
  { name: 'Word Search', href: '/admin/content/word-search', icon: Search     },
  { name: 'AI Tasks',    href: '/admin/ai-tasks',            icon: Bot        },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    // The 'Admin Users' child is settings-tier only — the Sidebar renders
    // it but filters it out for publishers/editors below.
    settingsOnly: true,
    children: [
      { name: 'General',       href: '/admin/settings'            },
      { name: 'Admin Users',   href: '/admin/settings/users'      },
    ],
  },
  { name: 'Help',        href: '/admin/help',                icon: HelpCircle },
]

// ── Component ─────────────────────────────────────────────────────────────

type AdminRole = 'super' | 'admin' | 'publisher' | 'editor'

export function Sidebar() {
  const pathname = usePathname()
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

                {isExpanded && (
                  <div className="ml-5 mt-0.5 pl-3 border-l border-white/8 space-y-0.5">
                    {item.children.map((child) => {
                      const childPath   = child.href.split('?')[0]
                      const childActive = pathname === childPath || pathname.startsWith(childPath + '/')
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
                )}
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
