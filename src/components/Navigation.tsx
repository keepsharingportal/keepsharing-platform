'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BookOpen, Menu, X, ChevronDown } from 'lucide-react'
import { usePathname } from 'next/navigation'

const GUIDES = [
  { label: 'Family Resource Guide',  href: '/family-resource-guide' },
  { label: 'Private School Guide',   href: '/private-school-guide' },
  { label: 'Summer Camp Guide',      href: '/summer-camp-guide' },
  { label: 'Childcare Guide',        href: '/childcare-guide' },
  { label: 'Healthy Kids Guide',     href: '/healthy-kids-guide' },
  { label: 'Summer Fun Guide',       href: '/summer-fun-guide' },
  { label: 'Birthday Party Guide',   href: '/birthday-party-guide' },
  { label: 'After-School Guide',     href: '/afterschool-guide' },
  { label: 'Special Needs Guide',    href: '/special-needs-guide' },
]

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [guidesOpen, setGuidesOpen] = useState(false)
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">
            River Region <span className="text-primary">Parents</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">

          {/* Guides dropdown */}
          <div className="relative" onMouseLeave={() => setGuidesOpen(false)}>
            <button
              onMouseEnter={() => setGuidesOpen(true)}
              onClick={() => setGuidesOpen(o => !o)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Guides <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {guidesOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-card border border-border rounded-2xl shadow-lg p-2 z-50">
                {GUIDES.map(g => (
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
                  <Link href="/local-guides" onClick={() => setGuidesOpen(false)} className="block px-3 py-2 rounded-xl text-sm font-semibold text-primary hover:bg-muted transition-colors">
                    View All Local Guides →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/calendar"
            className={`text-sm font-medium transition-colors ${isActive('/calendar') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Calendar
          </Link>
          <Link
            href="/newcomer-guide/articles"
            className={`text-sm font-medium transition-colors ${isActive('/newcomer-guide/articles') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Articles
          </Link>

          <Button asChild size="sm" className="rounded-full">
            <Link href="/advertise">Partner With Us</Link>
          </Button>
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
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            <button
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground rounded-xl hover:bg-muted"
              onClick={() => setGuidesOpen(o => !o)}
            >
              Local Guides <ChevronDown className={`h-4 w-4 transition-transform ${guidesOpen ? 'rotate-180' : ''}`} />
            </button>
            {guidesOpen && (
              <div className="pl-4 flex flex-col gap-0.5">
                {GUIDES.map(g => (
                  <Link key={g.href} href={g.href} onClick={() => { setMobileOpen(false); setGuidesOpen(false) }}
                    className="block px-3 py-2 text-sm text-muted-foreground hover:text-primary rounded-lg">
                    {g.label}
                  </Link>
                ))}
              </div>
            )}
            {[
              { href: '/calendar',                label: 'Calendar' },
              { href: '/newcomer-guide/articles', label: 'Articles' },
              { href: '/advertise',               label: 'Partner With Us' },
            ].map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-xl">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
