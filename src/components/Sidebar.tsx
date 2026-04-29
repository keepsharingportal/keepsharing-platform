'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Zap, LayoutGrid, Users, FileText, Settings,
  ChevronDown, ChevronRight, LogOut, Upload,
  Monitor, Megaphone, HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PUBLICATIONS = [
  { abbrev: 'RRP', name: 'River Region Parents',      market: 'Montgomery',    state: 'AL', color: '#22c55e' },
  { abbrev: 'MBP', name: 'Mobile Bay Parents',        market: 'Mobile',        state: 'AL', color: '#3b82f6' },
  { abbrev: 'AOP', name: 'Auburn Opelika Parents',    market: 'Auburn',        state: 'AL', color: '#f97316' },
  { abbrev: 'ESP', name: 'Eastern Shore Parents',     market: 'Eastern Shore', state: 'AL', color: '#a855f7' },
  { abbrev: 'GPP', name: 'Greater Pensacola Parents', market: 'Pensacola',     state: 'FL', color: '#14b8a6' },
  { abbrev: 'RRB', name: 'River Region Boom',         market: 'Montgomery',    state: 'AL', color: '#eab308' },
]

const NAV = [
  { name: 'Today',      href: '/admin/today',   icon: Zap },
  { name: 'My Markets', href: '/admin/markets', icon: LayoutGrid },
  {
    name: 'Advertisers',
    href: '/admin/advertisers',
    icon: Users,
    children: [
      { name: 'Active Advertisers', href: '/admin/advertisers' },
      { name: 'Layout Sheet',       href: '/admin/advertisers/layout-sheet' },
      { name: 'Pipeline',           href: '/admin/advertisers/pipeline' },
      { name: 'Agreements',         href: '/admin/advertisers/agreements' },
      { name: 'Ad Proofs',          href: '/admin/advertisers/ad-proofs' },
      { name: 'Businesses',         href: '/admin/advertisers/businesses' },
      { name: 'Intelligence',       href: '/admin/advertisers/intelligence', accent: true },
      { name: 'Import Data',        href: '/admin/import', accent: true },
    ],
  },
  {
    name: 'Content',
    href: '/admin/content',
    icon: FileText,
    children: [
      { name: 'Social Queue',      href: '/admin/social' },
      { name: 'School News',       href: '/admin/school-news' },
      { name: 'Nominations',       href: '/admin/nominations' },
      { name: 'Guides',            href: '/admin/guides' },
      { name: 'Geocode Tool',      href: '/admin/guides/geocode',        accent: true },
      { name: 'Summer Import',    href: '/admin/guides/summer-import',  accent: true },
      { name: 'Content Calendar',  href: '/admin/content/calendar',        accent: true },
      { name: 'Editorial Board',   href: '/admin/content/editorial-board', accent: true },
      { name: 'Word Search',       href: '/admin/content/word-search',     accent: true },
      { name: 'Submission Forms',  href: '/admin/content/forms',           accent: true },
      { name: 'Ask the Doctor',    href: '/admin/content/ask-doctor',      accent: true },
      { name: 'Anniversaries',     href: '/admin/content/anniversaries',   accent: true },
      { name: 'New Content',       href: '/admin/content/new',             accent: true },
    ],
  },
  {
    name: 'Ad Server',
    href: '/admin/ad-server',
    icon: Monitor,
    children: [
      { name: 'Ad Manager',   href: '/admin/ad-server' },
      { name: 'Inventory',    href: '/admin/ad-server/inventory' },
      { name: 'Dropbox Scan', href: '/admin/ad-server/scan', accent: true },
    ],
  },
  { name: 'Marketing', href: '/admin/marketing-system', icon: Megaphone },
  { name: 'Settings',  href: '/admin/settings',          icon: Settings },
  { name: 'Help',      href: '/admin/help',              icon: HelpCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const [pubOpen, setPubOpen]         = useState(false)
  const [activePub, setActivePub]     = useState(PUBLICATIONS[0])
  const [expandedNav, setExpandedNav] = useState<string | null>('Advertisers')

  const isActive = (href: string) => {
    if (href === '/admin/advertisers') return pathname === href
    return pathname.startsWith(href)
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
          <div className="text-sm font-bold text-white leading-tight tracking-tight">
            KeepSharing
          </div>
          <div className="text-[9px] font-medium text-white/35 leading-tight">
            Admin Platform
          </div>
        </div>
      </div>

      {/* ── Publication Switcher ─────────────────────────── */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => setPubOpen(!pubOpen)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-white/6"
        >
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
            style={{ backgroundColor: activePub.color + '25', border: `1px solid ${activePub.color}40` }}>
            <span style={{ color: activePub.color }}>{activePub.abbrev.slice(0, 2)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate leading-tight">{activePub.name}</div>
            <div className="text-[10px] text-white/40 truncate">{activePub.market}, {activePub.state}</div>
          </div>
          <ChevronDown size={13} className={cn('shrink-0 text-white/30 transition-transform', pubOpen && 'rotate-180')} />
        </button>

        {pubOpen && (
          <div className="mt-1 rounded-xl overflow-hidden border border-white/10 shadow-2xl"
            style={{ backgroundColor: '#0e0e24' }}>
            {PUBLICATIONS.map((pub) => (
              <button key={pub.abbrev} onClick={() => { setActivePub(pub); setPubOpen(false) }}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-white/5', activePub.abbrev === pub.abbrev && 'bg-white/5')}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pub.color }} />
                <span className="font-semibold text-white/70 w-9 shrink-0">{pub.abbrev}</span>
                <span className="text-white/40 truncate text-[11px]">{pub.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {NAV.map((item) => {
          const parentActive = item.children
            ? pathname.startsWith(item.href) || item.children.some((c) => pathname.startsWith(c.href))
            : pathname === item.href
          const isExpanded = expandedNav === item.name

          return (
            <div key={item.name}>
              {item.children ? (
                <button
                  onClick={() => setExpandedNav(isExpanded ? null : item.name)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors',
                    parentActive ? 'bg-white/10 text-white font-semibold' : 'text-white/55 hover:text-white hover:bg-white/5 font-medium'
                  )}>
                  <item.icon size={15} className="shrink-0" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {isExpanded ? <ChevronDown size={12} className="shrink-0 opacity-40" /> : <ChevronRight size={12} className="shrink-0 opacity-40" />}
                </button>
              ) : (
                <Link href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors',
                    isActive(item.href) ? 'bg-white/10 text-white font-semibold' : 'text-white/55 hover:text-white hover:bg-white/5 font-medium'
                  )}>
                  <item.icon size={15} className="shrink-0" />
                  {item.name}
                </Link>
              )}

              {/* Sub-items — text only (GHL style) */}
              {item.children && isExpanded && (
                <div className="ml-5 mt-0.5 pl-3 border-l border-white/8 space-y-0.5">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href
                    const accent = 'accent' in child && child.accent
                    return (
                      <Link key={child.href} href={child.href}
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors',
                          accent
                            ? childActive ? 'text-amber-400 font-semibold' : 'text-amber-400/60 hover:text-amber-400 hover:bg-white/5'
                            : childActive ? 'text-white font-semibold bg-white/6' : 'text-white/40 hover:text-white hover:bg-white/5'
                        )}>
                        {accent && <Upload size={11} className="shrink-0" />}
                        {child.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
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
