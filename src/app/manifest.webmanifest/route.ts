// ── Web App Manifest — brand-aware, PWA-installable ─────────────────────────
//
// Tells the browser this site is a real installable web app. Browsers
// pick up:
//   - name + short_name → "Add to Home Screen" label
//   - icons → home-screen launcher icon
//   - theme_color → matches the URL bar to the brand
//   - start_url → which page the installed app opens to
//
// PWA installability is a subtle engagement signal (Google notices)
// AND it tells our most-loyal readers we treat the site like a real
// product. Each brand domain emits its own manifest with brand
// colors + name.

import { loadBrandContext } from '@/lib/brand-context'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET() {
  const ctx    = await loadBrandContext()
  const seoCfg = getBrandSeoConfig(ctx.market, ctx.publicOrigin)

  const manifest = {
    name:             seoCfg.organizationName,
    short_name:       ctx.market.short ?? seoCfg.organizationName,
    description:      seoCfg.slogan,
    start_url:        '/',
    scope:            '/',
    display:          'standalone',
    background_color: '#ffffff',
    theme_color:      seoCfg.brandColor,
    orientation:      'portrait-primary',
    lang:             'en-US',
    categories:       ['news', 'lifestyle', 'family', 'events'],
    icons: [
      {
        src:   '/images/advertise/rrp-logo.png',
        sizes: '192x192',
        type:  'image/png',
        purpose: 'any',
      },
      {
        src:   '/images/advertise/rrp-logo.png',
        sizes: '512x512',
        type:  'image/png',
        purpose: 'any maskable',
      },
    ],
  }

  return new Response(JSON.stringify(manifest, null, 2), {
    status:  200,
    headers: {
      'Content-Type':  'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600',
    },
  })
}
