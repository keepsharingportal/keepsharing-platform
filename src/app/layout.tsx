import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Geist, Geist_Mono, Allura, Fraunces } from 'next/font/google'
import Script from 'next/script'
import { ViewTracker } from '@/components/ViewTracker'
import { loadBrandContext } from '@/lib/brand-context'
import { chromeForBrand } from '@/lib/brands'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
// Allura — magazine-style cursive used for column wordmarks (e.g. Grands
// Are the Greatest). Loaded once site-wide via CSS var so any column-brand
// wordmark can reference --font-allura without re-importing.
const allura    = Allura({ variable: '--font-allura', weight: '400', subsets: ['latin'], display: 'swap' })
// Fraunces — editorial serif used for headings on the games surface and
// in select feature/long-form contexts. Loaded once site-wide via CSS
// var so any component can reference --font-fraunces without re-importing.
const fraunces  = Fraunces({ variable: '--font-fraunces', weight: ['600', '700', '900'], subsets: ['latin'], display: 'swap' })

/** Brand-aware site metadata. The default title + description come from
 *  the resolved brand (display name + tagline + audience summary), so a
 *  reader landing on the BOOM domain sees BOOM metadata in their browser
 *  tab + share previews, not RRP boilerplate. The favicon stays the legacy
 *  RRP asset until brand-specific favicons are configured. */
export async function generateMetadata(): Promise<Metadata> {
  const ctx = await loadBrandContext()
  const chrome = chromeForBrand(ctx.brand)
  return {
    title:       `${ctx.market.displayName} — Local Stories & Events`,
    description: chrome.tagline,
    icons: {
      icon: '/images/advertise/rrp-logo.png',
      apple: '/images/advertise/rrp-logo.png',
    },
    openGraph: {
      siteName:    ctx.market.displayName,
      type:        'website',
      url:         ctx.publicOrigin,
      title:       ctx.market.displayName,
      description: chrome.tagline,
    },
  }
}

// Plausible: set NEXT_PUBLIC_PLAUSIBLE_DOMAIN (e.g. "riverregionparents.com")
// in production to enable. Local + preview builds without it just render
// without the script — zero tracking, zero pollution of your stats.
const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${allura.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        {plausibleDomain && (
          <Script
            defer
            strategy="afterInteractive"
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.tagged-events.outbound-links.js"
          />
        )}
      </head>
      <body className="h-full">
        {/* First-party pageview tracking — feeds the auto-trending bar +
            analytics surface. Wrapped in Suspense because it uses
            useSearchParams() (to capture UTMs at the URL) which would
            otherwise opt the whole tree out of static rendering. */}
        <Suspense fallback={null}>
          <ViewTracker />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
