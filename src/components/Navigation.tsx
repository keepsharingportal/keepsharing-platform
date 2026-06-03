'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X, ChevronDown } from 'lucide-react'
import { usePathname } from 'next/navigation'
import {
  HEADER_GUIDES, HEADER_LOCAL, HEADER_TOP_LEVEL,
  mergeNavItems, type NavItem, type OverrideMap, type NavItemOverride,
} from '@/lib/site-nav/items'

interface ApiOverride {
  hidden?:        boolean
  labelOverride?: string | null
  hrefOverride?:  string | null
  openInNewTab?:  boolean
  isCustom?:      boolean
  parentKey?:     string | null
  sortOrder?:     number | null
}

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [guidesOpen, setGuidesOpen] = useState(false)
  const [localOpen,  setLocalOpen]  = useState(false)
  const guidesCloseTimer = useRef<NodeJS.Timeout | null>(null)
  const localCloseTimer  = useRef<NodeJS.Timeout | null>(null)
  const pathname = usePathname()

  // Pull overrides + custom items from the public endpoint so editors
  // can hide/rename/add menu items without a deploy. Defaults to empty
  // while in-flight (brief flash on first paint is acceptable for menu
  // chrome). Endpoint is cached for 30s edge-side.
  const [overrides, setOverrides] = useState<OverrideMap>(new Map())
  const [customs,   setCustoms]   = useState<NavItem[]>([])
  useEffect(() => {
    let cancelled = false
    fetch('/api/site/nav-visibility')
      .then(r => r.ok ? r.json() : null)
      .then((j: { overrides?: Record<string, ApiOverride>; customs?: NavItem[] } | null) => {
        if (cancelled || !j) return
        const map: OverrideMap = new Map()
        for (const [k, v] of Object.entries(j.overrides ?? {})) {
          const ov: NavItemOverride = {
            hidden:        v.hidden,
            labelOverride: v.labelOverride,
            hrefOverride:  v.hrefOverride,
            openInNewTab:  v.openInNewTab,
            isCustom:      v.isCustom,
            parentKey:     v.parentKey,
            sortOrder:     v.sortOrder,
          }
          map.set(k, ov)
        }
        setOverrides(map)
        setCustoms(j.customs ?? [])
      })
      .catch(() => { /* fail open */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    return () => {
      if (guidesCloseTimer.current) clearTimeout(guidesCloseTimer.current)
      if (localCloseTimer.current)  clearTimeout(localCloseTimer.current)
    }
  }, [])

  // Merge catalog + DB into final render lists per group.
  const topLevel = useMemo(
    () => mergeNavItems(HEADER_TOP_LEVEL, overrides, customs.filter(c => !c.parentKey)),
    [overrides, customs],
  )
  const guides = useMemo(
    () => mergeNavItems(HEADER_GUIDES, overrides, customs.filter(c => c.parentKey === 'header.guides.dropdown')),
    [overrides, customs],
  )
  const local = useMemo(
    () => mergeNavItems(HEADER_LOCAL, overrides, customs.filter(c => c.parentKey === 'header.local.dropdown')),
    [overrides, customs],
  )

  function newTabFor(key: string): boolean {
    return overrides.get(key)?.openInNewTab ?? false
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Helper — render an arbitrary link respecting external + new-tab.
  function linkProps(item: NavItem, key: string) {
    const newTab = newTabFor(key) || item.external
    return newTab
      ? { href: item.href, target: '_blank' as const, rel: 'noopener noreferrer' as const }
      : { href: item.href }
  }

  // Whether each top-level item should render. We DON'T render
  // .dropdown rows in the flat top-level loop — those have their own
  // dedicated dropdown UI above.
  function shouldRenderInFlat(item: NavItem) {
    return item.key !== 'header.guides.dropdown' && item.key !== 'header.local.dropdown'
  }

  // Find a top-level row by key (for the dropdown trigger labels —
  // honors any label override the admin set).
  const guidesItem = topLevel.find(i => i.key === 'header.guides.dropdown')
  const localItem  = topLevel.find(i => i.key === 'header.local.dropdown')

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60 font-sans">
      <div className="container flex items-center justify-between py-5">

        <Link href="/" className="flex flex-col shrink-0 hover:opacity-90 transition-opacity font-sans">
          <span className="text-2xl md:text-3xl font-black tracking-tight leading-none">
            <span className="text-foreground">River Region </span>
            <span className="text-primary">Parents</span>
          </span>
          <span className="text-xs md:text-sm font-medium text-muted-foreground tracking-wide mt-1 hidden sm:block">
            The Go-To Resource for River Region Families
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">

          {/* Render top-level items in catalog order. The .dropdown
              rows get their own custom UI handled inline. */}
          {topLevel.map(item => {
            if (item.key === 'header.guides.dropdown') {
              if (guides.length === 0) return null
              return (
                <div
                  key={item.key}
                  className="relative"
                  onMouseEnter={() => {
                    if (guidesCloseTimer.current) {
                      clearTimeout(guidesCloseTimer.current)
                      guidesCloseTimer.current = null
                    }
                    setGuidesOpen(true)
                  }}
                  onMouseLeave={() => {
                    guidesCloseTimer.current = setTimeout(() => setGuidesOpen(false), 200)
                  }}
                >
                  <button
                    onClick={() => setGuidesOpen(o => !o)}
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-2"
                  >
                    {item.label} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${guidesOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {guidesOpen && (
                    <>
                      <div className="absolute top-full left-0 right-0 h-2" />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-card border border-border rounded-2xl shadow-lg p-2 z-50">
                        {guides.map(g => (
                          <Link
                            key={g.key}
                            {...linkProps(g, g.key)}
                            onClick={() => setGuidesOpen(false)}
                            className="block px-3 py-2 rounded-xl text-sm text-foreground hover:bg-muted hover:text-primary transition-colors"
                          >
                            {g.label}
                          </Link>
                        ))}
                        <div className="border-t border-border mt-1 pt-1">
                          <Link
                            href="/local-guides"
                            onClick={() => setGuidesOpen(false)}
                            className="block px-3 py-2 rounded-xl text-sm font-semibold text-primary hover:bg-muted transition-colors"
                          >
                            View All Local Guides →
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            }
            if (item.key === 'header.local.dropdown') {
              if (local.length === 0) return null
              return (
                <div
                  key={item.key}
                  className="relative"
                  onMouseEnter={() => {
                    if (localCloseTimer.current) {
                      clearTimeout(localCloseTimer.current)
                      localCloseTimer.current = null
                    }
                    setLocalOpen(true)
                  }}
                  onMouseLeave={() => {
                    localCloseTimer.current = setTimeout(() => setLocalOpen(false), 200)
                  }}
                >
                  <button
                    onClick={() => setLocalOpen(o => !o)}
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-2"
                  >
                    {item.label} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${localOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {localOpen && (
                    <>
                      <div className="absolute top-full left-0 right-0 h-2" />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-card border border-border rounded-2xl shadow-lg p-2 z-50">
                        {local.map(l => (
                          <Link
                            key={l.key}
                            {...linkProps(l, l.key)}
                            onClick={() => setLocalOpen(false)}
                            className="block px-3 py-2 rounded-xl text-sm text-foreground hover:bg-muted hover:text-primary transition-colors"
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            }
            if (item.key === 'header.get-listed') {
              return (
                <Button key={item.key} asChild size="sm" className="rounded-full">
                  <Link {...linkProps(item, item.key)}>{item.label}</Link>
                </Button>
              )
            }
            // Plain top-level link
            return (
              <Link
                key={item.key}
                {...linkProps(item, item.key)}
                className={`text-sm font-medium transition-colors ${isActive(item.href) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(o => !o)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="container py-4 flex flex-col gap-1">
            {guidesItem && guides.length > 0 && (
              <>
                <button
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground rounded-xl hover:bg-muted"
                  onClick={() => setGuidesOpen(o => !o)}
                >
                  {guidesItem.label} <ChevronDown className={`h-4 w-4 transition-transform ${guidesOpen ? 'rotate-180' : ''}`} />
                </button>
                {guidesOpen && (
                  <div className="pl-4 flex flex-col gap-0.5">
                    {guides.map(g => (
                      <Link
                        key={g.key}
                        {...linkProps(g, g.key)}
                        onClick={() => { setMobileOpen(false); setGuidesOpen(false) }}
                        className="block px-3 py-2 text-sm text-muted-foreground hover:text-primary rounded-lg"
                      >
                        {g.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
            {localItem && local.length > 0 && (
              <>
                <button
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground rounded-xl hover:bg-muted"
                  onClick={() => setLocalOpen(o => !o)}
                >
                  {localItem.label} <ChevronDown className={`h-4 w-4 transition-transform ${localOpen ? 'rotate-180' : ''}`} />
                </button>
                {localOpen && (
                  <div className="pl-4 flex flex-col gap-0.5">
                    {local.map(l => (
                      <Link
                        key={l.key}
                        {...linkProps(l, l.key)}
                        onClick={() => { setMobileOpen(false); setLocalOpen(false) }}
                        className="block px-3 py-2 text-sm text-muted-foreground hover:text-primary rounded-lg"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
            {topLevel
              .filter(shouldRenderInFlat)
              .map(item => (
                <Link
                  key={item.key}
                  {...linkProps(item, item.key)}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-xl"
                >
                  {item.label}
                </Link>
              ))}
          </div>
        </div>
      )}
    </nav>
  )
}
