// ── Default OG image — Next.js route-conventional ImageResponse ──────────────
//
// Renders the brand wordmark + tagline on a coral background at
// 1200×630 (the canonical Facebook/Twitter/LinkedIn share preview
// size). This is what gets pulled in when a page doesn't override
// its own opengraph-image. The article + games + event pages
// override via metadata.openGraph.images so they can show their own
// hero / signature card instead.
//
// Generated on demand by Next.js Image Generation (via `next/og`).

import { ImageResponse } from 'next/og'
import { loadBrandContext } from '@/lib/brand-context'
import { getBrandSeoConfig } from '@/lib/seo/brand-seo'

export const runtime    = 'nodejs'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt  = 'River Region Parents — Local Stories & Events'

export default async function OG() {
  const ctx = await loadBrandContext()
  const seoCfg = getBrandSeoConfig(ctx.market, ctx.publicOrigin)
  const brandName = ctx.market.displayName
  const brandColor = seoCfg.brandColor
  const tagline    = seoCfg.slogan
  // Split last word out so we can color it coral, matching the
  // wordmark treatment on the live site.
  const lastSpace  = brandName.lastIndexOf(' ')
  const baseWord   = lastSpace > 0 ? brandName.slice(0, lastSpace) + ' ' : brandName
  const accentWord = lastSpace > 0 ? brandName.slice(lastSpace + 1) : ''

  return new ImageResponse(
    (
      <div
        style={{
          display:        'flex',
          flexDirection:  'column',
          width:          '100%',
          height:         '100%',
          background:     'linear-gradient(135deg, #FFFDF8 0%, #FFEEDE 100%)',
          padding:        '80px 100px',
          position:       'relative',
        }}
      >
        {/* Top brand stripe */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 18,
            background: brandColor,
          }}
        />

        {/* Eyebrow pill — area-served label so the share preview tells
            people WHERE we cover, not just what we are. */}
        <div
          style={{
            display:        'inline-flex',
            alignSelf:      'flex-start',
            backgroundColor: brandColor,
            color:          'white',
            fontSize:       22,
            fontWeight:     800,
            letterSpacing:  3,
            textTransform:  'uppercase',
            padding:        '12px 24px',
            borderRadius:   8,
            marginBottom:   40,
          }}
        >
          {seoCfg.areaServedLabel}
        </div>

        {/* Wordmark */}
        <div
          style={{
            display:    'flex',
            fontSize:   118,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
            color:      '#1f2937',
            marginBottom: 36,
          }}
        >
          {baseWord}
          {accentWord && <span style={{ color: brandColor }}>{accentWord}</span>}
        </div>

        {/* Tagline */}
        <div
          style={{
            display:    'flex',
            fontSize:   38,
            fontWeight: 500,
            color:      '#475569',
            lineHeight: 1.3,
            maxWidth:   900,
          }}
        >
          {tagline}
        </div>

        {/* Footer URL */}
        <div
          style={{
            display: 'flex',
            position: 'absolute', bottom: 60, left: 100,
            fontSize: 24, fontWeight: 700, color: '#94A3B8',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {ctx.publicOrigin.replace(/^https?:\/\//, '')}
        </div>
      </div>
    ),
    { ...size },
  )
}
