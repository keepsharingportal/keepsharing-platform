import type { Metadata } from 'next'
import { Geist, Geist_Mono, Allura } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
// Allura — magazine-style cursive used for column wordmarks (e.g. Grands
// Are the Greatest). Loaded once site-wide via CSS var so any column-brand
// wordmark can reference --font-allura without re-importing.
const allura    = Allura({ variable: '--font-allura', weight: '400', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'River Region Parents — Family Guides & Events',
  description: 'Local guides, community events, and family resources for River Region families.',
  icons: {
    icon: '/images/advertise/rrp-logo.png',
    apple: '/images/advertise/rrp-logo.png',
  },
}

// Plausible: set NEXT_PUBLIC_PLAUSIBLE_DOMAIN (e.g. "riverregionparents.com")
// in production to enable. Local + preview builds without it just render
// without the script — zero tracking, zero pollution of your stats.
const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${allura.variable} h-full antialiased`}
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
      <body className="h-full">{children}</body>
    </html>
  )
}
