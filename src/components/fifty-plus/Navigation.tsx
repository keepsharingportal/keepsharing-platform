'use client'

// 50+ template navigation. Renders the navy + amber wordmark, top nav,
// Subscribe Free CTA, and a mobile menu drawer. Mirrors the Navigation.tsx
// the publisher built in their Vite project — the only architectural
// change is next/link replacing react-router-dom <Link>.
//
// Brand chrome (wordmark text, tagline, colors) flows in as props from
// the server boundary that loaded brand-context. The component itself
// is brand-agnostic so future fifty-plus brands (mb50plus, es50plus, …)
// reuse it without forking.

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Search } from 'lucide-react'
import type { BrandChrome } from '@/lib/brands'

interface Props {
  /** Brand chrome — wordmark text + tagline source. */
  chrome:   BrandChrome
  /** Brand display name — fallback for wordmark when chrome.wordmark* unset. */
  displayName: string
}

const NAV_LINKS = [
  { name: 'Home',             path: '/' },
  { name: 'Local Events',     path: '/calendar' },             // reuses parents calendar route
  { name: 'Escape & Explore', path: '/explore' },
  { name: 'Wellness',         path: '/wellness' },
  { name: 'Interactive',      path: '/games' },                // reuses Brain Games suite
  { name: 'Videos',           path: '/videos' },
]

export function FiftyPlusNavigation({ chrome, displayName }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  // Wordmark — three parts: small eyebrow ("RIVER REGION") + big primary
  // ("LOCAL", optional) + big accent in amber ("50+"). Falls back to the
  // brand's displayName split on " — " or whole name when chrome fields
  // are blank, so a partially-configured brand still renders something.
  const eyebrow = chrome.wordmarkEyebrow ?? displayName.split(' ').slice(0, -1).join(' ')
  const primary = chrome.wordmarkPrimary
  const accent  = chrome.wordmarkAccent ?? displayName.split(' ').slice(-1)[0]

  return (
    <header className="sticky top-0 z-50 w-full flex flex-col bg-background/95 backdrop-blur border-b border-border">
      <div className="w-full py-3">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4">

            {/* Wordmark */}
            <Link href="/" className="flex flex-col w-fit" aria-label={`${displayName} home`}>
              {chrome.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={chrome.logoUrl} alt={displayName} className="h-12 w-auto" />
              ) : (
                <>
                  <span className="text-[10px] md:text-xs text-primary font-bold tracking-[0.18em] uppercase leading-none mb-1">
                    {eyebrow}
                  </span>
                  <span className="font-heading font-extrabold tracking-tighter leading-none flex items-baseline gap-1">
                    {primary && (
                      <span className="text-primary text-3xl md:text-4xl">{primary}</span>
                    )}
                    <span className="text-secondary text-3xl md:text-4xl">{accent}</span>
                  </span>
                  {chrome.tagline && (
                    <span className="text-[9px] md:text-[10px] text-primary/80 font-medium tracking-[0.22em] uppercase mt-1">
                      {chrome.tagline}
                    </span>
                  )}
                </>
              )}
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.name}
                  href={link.path}
                  className="text-sm font-semibold text-foreground/80 hover:text-secondary transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Actions — desktop */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/search"
                aria-label="Search"
                className="p-2 rounded-full text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
              >
                <Search className="h-5 w-5" />
              </Link>
              <Link
                href="#newsletter"
                className="inline-flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold px-4 py-2 rounded-full text-sm shadow-sm transition-colors"
              >
                Subscribe Free
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 text-foreground"
              onClick={() => setIsOpen(v => !v)}
              aria-expanded={isOpen}
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {NAV_LINKS.map(link => (
              <Link
                key={link.name}
                href={link.path}
                className="text-base font-semibold text-foreground/85 hover:text-secondary py-2"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-3 border-t border-border flex flex-col gap-3">
              <Link
                href="/search"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-2 text-base font-semibold text-foreground/85 py-1"
              >
                <Search className="h-4 w-4" /> Search
              </Link>
              <Link
                href="#newsletter"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold px-4 py-2.5 rounded-full text-sm w-full"
              >
                Subscribe Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
