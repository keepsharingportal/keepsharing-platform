'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X, ChevronDown } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { HEADER_GUIDES, HEADER_TOP_LEVEL } from '@/lib/site-nav/items'

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [guidesOpen, setGuidesOpen] = useState(false)
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pathname = usePathname()

  // Pull the set of hidden nav keys from the public read endpoint so
  // editors can flip items on/off in /admin/site/navigation without a
  // deploy. We default to "show everything" while the fetch is in
  // flight — brief flash on first paint is acceptable for menu chrome,
  // and the endpoint is cached for 30s edge-side after the first hit.
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  useEffect(() => {
    let cancelled = false
    fetch('/api/site/nav-visibility')
      .then(r => r.ok ? r.json() : null)
      .then((j: { hidden?: string[] } | null) => {
        if (cancelled || !j?.hidden) return
        setHidden(new Set(j.hidden))
      })
      .catch(() => { /* fail open */ })
    return () => { cancelled = true }
  }, [])

  function visible(key: string): boolean { return !hidden.has(key) }
  const visibleGuides = HEADER_GUIDES.filter(g => visible(g.key))

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60 font-sans">
      <div className="container flex items-center justify-between py-5">

        {/* Wordmark + tagline — font-sans locks to Geist regardless of page context */}
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

          {/* Guides dropdown — hover-bridge fix. Hidden entirely when
              header.guides.dropdown is toggled off, OR when every child
              guide has been hidden (avoid showing an empty dropdown). */}
          {visible('header.guides.dropdown') && visibleGuides.length > 0 && (
            <div
              className="relative"
              onMouseEnter={() => {
                if (closeTimerRef.current) {
                  clearTimeout(closeTimerRef.current)
                  closeTimerRef.current = null
                }
                setGuidesOpen(true)
              }}
              onMouseLeave={() => {
                closeTimerRef.current = setTimeout(() => setGuidesOpen(false), 200)
              }}
            >
              <button
                onClick={() => setGuidesOpen(o => !o)}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-2"
              >
                Guides <ChevronDown className={`h-3.5 w-3.5 transition-transform ${guidesOpen ? 'rotate-180' : ''}`} />
              </button>

              {guidesOpen && (
                <>
                  <div className="absolute top-full left-0 right-0 h-2" />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-card border border-border rounded-2xl shadow-lg p-2 z-50">
                    {visibleGuides.map(g => (
                      <Link
                        key={g.href}
                        href={g.href}
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
          )}

          {visible('header.calendar') && (
            <Link
              href="/calendar"
              className={`text-sm font-medium transition-colors ${isActive('/calendar') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Calendar
            </Link>
          )}
          {visible('header.articles') && (
            <Link
              href="/articles"
              className={`text-sm font-medium transition-colors ${isActive('/articles') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Articles
            </Link>
          )}
          {visible('header.summer-fun') && (
            <Link
              href="/summer-fun-guide"
              className={`text-sm font-medium transition-colors ${isActive('/summer-fun-guide') || isActive('/summer-camp-guide') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Summer Fun
            </Link>
          )}
          {visible('header.school-zone') && (
            <Link
              href="/school-zone"
              className={`text-sm font-medium transition-colors ${isActive('/school-zone') || isActive('/school-bits') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              School Zone
            </Link>
          )}
          {visible('header.mom-knows-best') && (
            <Link
              href="/mom-knows-best"
              className={`text-sm font-medium transition-colors ${isActive('/mom-knows-best') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Mom Knows Best
            </Link>
          )}
          {visible('header.games') && (
            <Link
              href="/games"
              className={`text-sm font-medium transition-colors ${isActive('/games') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Games &amp; Prizes
            </Link>
          )}
          {visible('header.partners') && (
            <Link
              href="/partners"
              className={`text-sm font-medium transition-colors ${isActive('/partners') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Partner With Us
            </Link>
          )}
          {visible('header.get-listed') && (
            <Button asChild size="sm" className="rounded-full">
              <Link href="/partners#strategy-call">Get Listed</Link>
            </Button>
          )}
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
            {visible('header.guides.dropdown') && visibleGuides.length > 0 && (
              <>
                <button
                  className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground rounded-xl hover:bg-muted"
                  onClick={() => setGuidesOpen(o => !o)}
                >
                  Local Guides <ChevronDown className={`h-4 w-4 transition-transform ${guidesOpen ? 'rotate-180' : ''}`} />
                </button>
                {guidesOpen && (
                  <div className="pl-4 flex flex-col gap-0.5">
                    {visibleGuides.map(g => (
                      <Link
                        key={g.href}
                        href={g.href}
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
            {HEADER_TOP_LEVEL
              .filter(item => item.key !== 'header.guides.dropdown' && visible(item.key))
              .map(item => (
                <Link
                  key={item.key}
                  href={item.href}
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