// Navy 50+ footer. Pure server component — brand chrome flows in as props
// from the page-level boundary (loadBrandContext + chromeForBrand). Reuses
// the publisher's Vite Footer.tsx layout: two-column nav (Explore + Connect)
// + tagline blurb + bottom legal strip.

import Link from 'next/link'
import type { BrandChrome } from '@/lib/brands'

interface Props {
  chrome:      BrandChrome
  displayName: string
  regionLabel: string
}

export function FiftyPlusFooter({ chrome, displayName, regionLabel }: Props) {
  const eyebrow = chrome.wordmarkEyebrow ?? displayName.split(' ').slice(0, -1).join(' ')
  const accent  = chrome.wordmarkAccent ?? displayName.split(' ').slice(-1)[0]

  return (
    <footer className="bg-primary text-primary-foreground pt-16 pb-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-12 mb-12">

          {/* Brand block — spans 2 cols on desktop */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex flex-col w-fit mb-6" aria-label={`${displayName} home`}>
              {chrome.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={chrome.logoUrl} alt={displayName} className="h-12 w-auto" />
              ) : (
                <>
                  <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-primary-foreground/80 mb-1">
                    {eyebrow}
                  </span>
                  <span className="font-heading text-4xl md:text-5xl font-extrabold tracking-tighter leading-none flex items-baseline gap-1">
                    <span className="text-primary-foreground">{eyebrow ? '' : ''}</span>
                    <span className="text-secondary">{accent}</span>
                  </span>
                  {chrome.tagline && (
                    <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-primary-foreground/85 mt-2">
                      {chrome.tagline}
                    </span>
                  )}
                </>
              )}
            </Link>
            <p className="text-primary-foreground/75 max-w-md font-serif text-base leading-relaxed">
              Celebrating life, connection, and community in the {regionLabel}. Your guide to living well close to home.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-heading font-bold text-lg mb-5 text-primary-foreground">Explore</h4>
            <ul className="space-y-3 text-primary-foreground/80">
              <li><Link href="/calendar"  className="hover:text-secondary transition-colors">Local Events</Link></li>
              <li><Link href="/explore"   className="hover:text-secondary transition-colors">Escape &amp; Explore</Link></li>
              <li><Link href="/wellness"  className="hover:text-secondary transition-colors">Wellness That Works</Link></li>
              <li><Link href="/games"     className="hover:text-secondary transition-colors">Brain Games &amp; Trivia</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-heading font-bold text-lg mb-5 text-primary-foreground">Connect</h4>
            <ul className="space-y-3 text-primary-foreground/80">
              <li><Link href="/about"     className="hover:text-secondary transition-colors">About Us</Link></li>
              <li><Link href="/contact"   className="hover:text-secondary transition-colors">Contact</Link></li>
              <li><Link href="/advertise" className="hover:text-secondary transition-colors">Advertise With Us</Link></li>
              <li><Link href="/videos"    className="hover:text-secondary transition-colors">Video Hub</Link></li>
              {chrome.contactEmail && (
                <li><a href={`mailto:${chrome.contactEmail}`} className="hover:text-secondary transition-colors">{chrome.contactEmail}</a></li>
              )}
            </ul>
          </div>
        </div>

        {/* Legal strip */}
        <div className="border-t border-primary-foreground/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/55">
            © {new Date().getFullYear()} {displayName}. All rights reserved.
          </p>
          <div className="flex gap-5 text-sm text-primary-foreground/55">
            {chrome.socialFacebook && (
              <a href={chrome.socialFacebook} target="_blank" rel="noopener noreferrer" className="hover:text-primary-foreground">Facebook</a>
            )}
            {chrome.socialInstagram && (
              <a href={chrome.socialInstagram} target="_blank" rel="noopener noreferrer" className="hover:text-primary-foreground">Instagram</a>
            )}
            <Link href="/privacy" className="hover:text-primary-foreground">Privacy</Link>
            <Link href="/terms"   className="hover:text-primary-foreground">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
