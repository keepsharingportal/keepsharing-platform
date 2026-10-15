// ── /grid — drawing grid tool ───────────────────────────────────────────────
//
// A standalone utility for gridding up a reference photo before drawing or
// painting it. Not magazine content: it carries the site chrome so it doesn't
// look orphaned, but it is kept out of the brand sitemaps (see the /grid entry
// in sitemap.ts) because a painting tool has no business ranking as a
// parenting-magazine page on six brand domains.
//
// All the work happens in the browser — see components/grid/GridTool.tsx.

import type { Metadata } from 'next'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { GridTool } from '@/components/grid/GridTool'

export const revalidate = 86400

export async function generateMetadata(): Promise<Metadata> {
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  const meta = await buildPageMetadata({
    title:       'Drawing Grid Tool',
    description:
      'Put a grid over any photo to draw or paint it. Set your real canvas size, choose the ' +
      'square size, adjust thickness and colour, and download or print. Works on phone and ' +
      'desktop; your photo never leaves your device.',
    path:        '/grid',
    type:        'website',
    // One tool, one home. Without this the canonical follows the serving
    // brand, so the same tool claims six canonical URLs — and the bare
    // keepsharing.com host resolves to River Region, so even the platform
    // domain pointed at riverregionparents.com/grid. It is not River
    // Region's page; it is the platform's.
    publicOrigin: 'https://keepsharing.com',
    keywords:    ['drawing grid tool', 'grid method drawing', 'photo grid for artists', 'canvas grid maker'],
  })

  // buildPageMetadata appends the serving brand to the tab title, which is
  // right for magazine pages and wrong here. The bare keepsharing.com host
  // resolves to River Region, so this page announced itself as "Drawing Grid
  // Tool — River Region Parents" on a domain that is not River Region. A tool
  // is not published BY a brand, so it keeps its own name. Everything else
  // the helper builds — canonical URL, Open Graph, the editor overrides — is
  // kept.
  return { ...meta, title: 'Drawing Grid Tool' }
}

export default function GridPage() {
  // SoftwareApplication rather than Article: it is a tool, and this is the
  // shape search engines use for one. Free, in-browser, no sign-up — all
  // three are true and all three are what someone is filtering for.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Drawing Grid Tool',
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Any (web browser)',
    description:
      'Overlay a grid on a reference photo sized to your canvas, with adjustable line ' +
      'thickness and colour, black-and-white and value-posterise modes, and PNG or print output.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-8 print:hidden">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Drawing Grid Tool</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Grid up a reference photo to draw or paint it. Tell it the size of your canvas, pick
            how many squares you want, and it works out the grid to pencil onto the canvas. Your
            photo is never uploaded — everything happens in your browser.
          </p>
        </header>

        <GridTool />

        {/* Short, genuinely useful, and the thing most people get wrong the
            first time they grid a photo. */}
        <section className="mt-14 max-w-2xl print:hidden">
          <h2 className="text-xl font-bold">How to use it</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">1. Set your canvas size first.</strong> Everything
              follows from it. The frame takes your canvas&apos;s shape, so what you see is what you
              will actually be able to paint.
            </li>
            <li>
              <strong className="text-foreground">2. Drag the photo to crop it.</strong> A 3:2 photo
              will not fit a 16 × 20 canvas, so you decide what stays in rather than having it
              squashed to fit.
            </li>
            <li>
              <strong className="text-foreground">3. Choose your squares.</strong> Fewer, bigger
              squares are quicker; more, smaller squares are more accurate. Around 8 across suits
              most subjects. The tool suggests sizes that divide your canvas evenly, so you are not
              left with a half-square along one edge.
            </li>
            <li>
              <strong className="text-foreground">4. Make the lines readable.</strong> If the
              reference will sit across the room from the easel, thicken the lines and pick a colour
              that fights the photo — red on a landscape, cyan on a portrait.
            </li>
            <li>
              <strong className="text-foreground">5. Draw the matching grid on the canvas.</strong>{' '}
              The panel under the preview tells you exactly how many squares and what size. Then
              copy one square at a time.
            </li>
          </ol>

          <h2 className="mt-10 text-xl font-bold">Black &amp; white and value steps</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Colour hides value. Switching to black and white shows you how light or dark things
            really are, and <strong className="text-foreground">value steps</strong> flattens the
            photo into a handful of tones so the big shapes of light and shadow become obvious.
            Three or four steps is a good place to start for a painting; turn it off once the
            block-in is done.
          </p>
        </section>
      </main>

      <PublicFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
