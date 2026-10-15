// ── /grid-tool — drawing grid tool, unbranded ───────────────────────────────
//
// A standalone utility for gridding up a reference photo before drawing or
// painting it.
//
// ── No publication chrome, deliberately ─────────────────────────────────────
// This page does NOT use Navigation or PublicFooter, and it avoids the app's
// brand tokens (--primary and friends) in favour of explicit slate. It is not
// one of the magazines' pages and should not wear any of their identity: a
// painting tool under a parenting magazine's masthead reads as a mistake.
//
// It is served from app.keepsharing.com, which rewrites every path to /admin/*
// — see the /grid-tool exemption in proxy.ts, without which this 307s to the
// admin login.
//
// All the work happens in the browser — see components/grid/GridTool.tsx.
// Nothing is uploaded, so there is no endpoint here to abuse and nothing to
// rate-limit.

import type { Metadata, Viewport } from 'next'
import { Grid3x3 } from 'lucide-react'
import { GridTool } from '@/components/grid/GridTool'
import { PwaSetup } from '@/components/grid/PwaSetup'

export const revalidate = 86400

const DESCRIPTION =
  'Put a grid over any photo to draw or paint it. Set your canvas size, choose how many ' +
  'columns and rows, and get the exact measurements to mark on your canvas.'

export const metadata: Metadata = {
  title: 'Grid Tool',
  description: DESCRIPTION,
  // Not indexed: an internal utility on the application host, not a public
  // landing page, and app.keepsharing.com is the CRM backend. Nothing links
  // to it from a brand site.
  robots: { index: false, follow: false },

  // Open Graph is overridden explicitly, not left to inherit.
  //
  // The root layout sets site-wide og tags from the serving brand, so without
  // this the share card for a drawing tool read "River Region Parents — Live
  // Local, Love Local, Parent Local" over River Region's og:image. The page
  // itself carries no branding; pasting the link into a message would have
  // put it back. Explicitly no image, so nothing inherits a masthead.
  openGraph: {
    title:       'Grid Tool',
    description: DESCRIPTION,
    url:         'https://app.keepsharing.com/grid-tool',
    siteName:    'Grid Tool',
    type:        'website',
    images:      [],
  },
  twitter: {
    card:        'summary',
    title:       'Grid Tool',
    description: DESCRIPTION,
    images:      [],
  },
  alternates: { canonical: 'https://app.keepsharing.com/grid-tool' },

  // Installable to a phone's home screen. The manifest is scoped to
  // /grid-tool and is NOT the site-wide one at /manifest.webmanifest —
  // installing this must give you the tool, not a magazine.
  manifest: '/grid-tool/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Grid Tool',
    // Dark status bar text on the light page behind it.
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/grid-tool/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/grid-tool/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/grid-tool/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

// Installed, the tool fills the screen, so the status bar should match the
// header rather than leaving a white strip above a dark bar.
export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  // The canvas is a drag surface; letting the page zoom underneath it turns
  // every attempt to reposition the photo into a pinch-zoom of the whole UI.
  maximumScale: 5,
}

export default function GridToolPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Its own header — a name and nothing else. No publication, no nav. */}
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-4 sm:px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
            <Grid3x3 className="h-4 w-4 text-white" aria-hidden />
          </span>
          <span className="text-base font-bold tracking-tight">Grid Tool</span>
          <span className="ml-auto hidden text-xs text-slate-500 sm:inline">
            Nothing is uploaded — it all runs in your browser
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="mb-7 print:hidden">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Grid a photo to draw or paint
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Tell it your canvas size and how many columns and rows you want. It spreads them
            evenly and gives you the exact measurements to mark along each edge with a ruler.
          </p>
        </div>

        <PwaSetup />

        <GridTool />

        <section className="mt-14 max-w-2xl print:hidden">
          <h2 className="text-lg font-bold">How to use it</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            <li>
              <strong className="text-slate-900">1. Set your canvas size.</strong> Everything
              follows from it — the frame takes your canvas&apos;s shape, so what you see is what
              you will actually be able to paint.
            </li>
            <li>
              <strong className="text-slate-900">2. Drag the photo to crop it.</strong> A 3:2 photo
              will not fit a 16 × 20 canvas, so you decide what stays in rather than having it
              squashed to fit.
            </li>
            <li>
              <strong className="text-slate-900">3. Choose columns and rows.</strong> Four across
              and five down suits most subjects. Fewer, bigger cells are quicker; more, smaller
              cells are more accurate.
            </li>
            <li>
              <strong className="text-slate-900">4. Mark the canvas.</strong> The panel under the
              preview lists where every line falls, in ruler fractions — measure along the top and
              down the side, make your marks, and join them up.
            </li>
            <li>
              <strong className="text-slate-900">5. Copy one cell at a time.</strong> Thicken the
              lines and pick a colour that fights the photo if the reference will sit across the
              room from the easel.
            </li>
          </ol>

          <h2 className="mt-10 text-lg font-bold">Do the cells have to be square?</h2>
          <p className="mt-3 text-sm text-slate-600">
            No. The frame is already your canvas&apos;s shape, so four columns on the photo and
            four columns on the canvas line up whether or not the cells happen to be square. That
            is why you can just ask for the number of rows you want instead of nudging the count
            until the arithmetic works out. There is a{' '}
            <strong className="text-slate-900">keep cells square</strong> toggle if you prefer it.
          </p>

          <h2 className="mt-10 text-lg font-bold">Black &amp; white and value steps</h2>
          <p className="mt-3 text-sm text-slate-600">
            Colour hides value. Black and white shows you how light or dark things really are, and{' '}
            <strong className="text-slate-900">value steps</strong> flattens the photo into a
            handful of tones so the big shapes of light and shadow become obvious. Three or four
            steps is a good place to start for a painting; turn it off once the block-in is done.
          </p>
        </section>
      </main>
    </div>
  )
}
