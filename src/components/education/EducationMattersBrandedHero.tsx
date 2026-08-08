// ── Education Matters — branded district hero card ────────────────────
//
// Renders in place of a stock fallback photo when an Education Matters
// article has no uploaded hero image. Priority for what fills the
// card, best → last resort:
//
//   1. Superintendent photo (superintendentPhotoUrl prop)
//      → dark district-color panel + supt photo, mirrors the article
//        page's superintendent card design. Personalizes each district's
//        cards so readers recognize Dr. Byrd / Dr. Goodwin / etc.
//
//   2. District logo (district.logoUrl file at /images/districts/*.png)
//      → colored panel + logo card. Used on pages that don't pre-fetch
//        the superintendent photos, or when a superintendent has no
//        headshot uploaded to seo_authors yet.
//
//   3. District name typography (fallback)
//      → shortName in serif on the brand color. Always works — even
//        before the logo file lands in the repo.
//
// Real uploaded article heroes still win — this only fires when the
// article's own hero_image_url is null.

'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { DistrictConfig } from '@/lib/education-matters/districts'

interface Props {
  district:              DistrictConfig
  monthLabel?:           string
  title?:                string
  /** Real photo of this district's superintendent (from seo_authors).
   *  When provided we render the superintendent-photo layout — matches
   *  the article page's hero card visual language. */
  superintendentPhotoUrl?: string | null
  /** Compact = archive/latest-stories grid cards. Reduces padding +
   *  type sizes so the card still reads at 3:2. */
  compact?:              boolean
}

export function EducationMattersBrandedHero({
  district, monthLabel, title, superintendentPhotoUrl, compact,
}: Props) {
  const [logoBroken, setLogoBroken]  = useState(false)
  const [photoBroken, setPhotoBroken] = useState(false)

  const usePhoto = !!superintendentPhotoUrl && !photoBroken
  const useLogo  = !usePhoto && !!district.logoUrl && !logoBroken

  // Photo layout: dark district-color panel on the left, superintendent
  // photo on the right. Same DNA as the article-page superintendent
  // card, scaled down.
  if (usePhoto) {
    return (
      <div className="relative grid h-full w-full grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] overflow-hidden">
        <div
          className={`relative flex flex-col justify-center text-white ${compact ? 'p-3' : 'p-4 md:p-5'}`}
          style={{ background: `linear-gradient(135deg, ${district.accent} 0%, ${darken(district.accent, 0.22)} 100%)` }}
        >
          <p
            className={`font-black uppercase tracking-[0.14em] text-white/85 ${compact ? 'text-[9px]' : 'text-[10px]'}`}
          >
            {district.countyLabel} Supt.
          </p>
          {monthLabel && (
            <p className={`mt-1 font-black uppercase tracking-[0.16em] ${compact ? 'text-[9px]' : 'text-[10px]'}`} style={{ color: '#F4C21B' }}>
              {monthLabel}
            </p>
          )}
          {title && (
            <h3 className={`font-serif font-bold leading-snug ${compact ? 'mt-1.5 text-[13px]' : 'mt-2 text-base md:text-lg'} line-clamp-4`}>
              {title}
            </h3>
          )}
        </div>
        <div className="relative overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={superintendentPhotoUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setPhotoBroken(true)}
          />
        </div>
      </div>
    )
  }

  // Logo layout (or typography fallback): full-bleed brand color panel.
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ backgroundColor: district.accent }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.10) 0%, transparent 55%)' }}
      />

      <div className={`relative flex h-full w-full items-center justify-center ${compact ? 'px-4 py-4' : 'px-6 py-8 md:px-10'}`}>
        <div className={`grid w-full items-center gap-4 ${compact ? '' : 'md:gap-6 md:grid-cols-[auto_1fr]'}`}>
          <div className={`flex items-center justify-center ${compact ? '' : 'md:justify-start'}`}>
            {useLogo ? (
              <div className={`relative ${compact ? 'h-16 w-16' : 'h-24 w-24 md:h-32 md:w-32'}`}>
                <Image
                  src={district.logoUrl}
                  alt={`${district.fullName} logo`}
                  fill
                  className="object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
                  sizes={compact ? '64px' : '128px'}
                  onError={() => setLogoBroken(true)}
                  unoptimized
                  priority
                />
              </div>
            ) : (
              <TypographyLogoFallback shortName={district.shortName} compact={compact} />
            )}
          </div>

          {(monthLabel || title) && (
            <div className={`min-w-0 text-white ${compact ? 'text-center' : 'text-center md:text-left'}`}>
              {monthLabel && (
                <p className={`font-black uppercase tracking-[0.16em] text-white/85 ${compact ? 'text-[10px]' : 'text-xs md:text-sm'}`}>
                  {monthLabel}
                </p>
              )}
              {title && (
                <h3 className={`font-serif font-bold leading-tight text-white ${compact ? 'mt-1 text-lg' : 'mt-2 text-2xl md:text-3xl'} line-clamp-3`}>
                  {title}
                </h3>
              )}
            </div>
          )}
        </div>
      </div>

      {!monthLabel && !title && (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.14em] text-white/80">
          {district.fullName}
        </p>
      )}
    </div>
  )
}

function TypographyLogoFallback({ shortName, compact }: { shortName: string; compact?: boolean }) {
  return (
    <div className="text-white">
      <div
        className={`font-black leading-none tracking-tight ${compact ? 'text-2xl' : 'text-4xl md:text-5xl'}`}
        style={{ fontFamily: 'ui-serif, Georgia, serif' }}
      >
        {shortName}
      </div>
      <div className={`mt-1 font-black uppercase tracking-[0.18em] text-white/80 ${compact ? 'text-[9px]' : 'text-[10px] md:text-[11px]'}`}>
        Schools
      </div>
    </div>
  )
}

// Deterministic hex darken — used to give the photo-layout panel a
// subtle gradient without pulling in a color library. Not perfectly
// accurate colorimetrically, but visually close enough for a 22% dim.
function darken(hex: string, amount: number): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return hex
  const r = Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * (1 - amount)))
  const g = Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * (1 - amount)))
  const b = Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * (1 - amount)))
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}
