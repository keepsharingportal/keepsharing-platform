// ── Education Matters — branded district hero card ────────────────────
//
// Renders in place of a stock fallback photo when an Education Matters
// article has no uploaded hero image. Better than a generic classroom
// photo two districts share:
//
//   - Full-bleed district brand color (from district.accent).
//   - District logo prominent (from /images/districts/<slug>.png).
//     Falls back to the district name in big block letters when the
//     logo file is missing — so this ships and works even before the
//     PNG assets land in the repo.
//   - Optional month + title overlay for the article context.
//
// Priority order for what fills the hero on an EM article:
//   1. Real uploaded hero image (still wins — editor can upload a
//      graduation, ribbon-cutting, classroom photo)
//   2. This branded card (when no photo)
//   3. Stock fallback — removed for EM articles
//
// Sizes to its parent (like Next Image `fill`), so callers set aspect
// ratio and it takes over the whole box.

'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { DistrictConfig } from '@/lib/education-matters/districts'

interface Props {
  district:   DistrictConfig
  monthLabel?: string   // e.g. "Aug 2026" — rendered as eyebrow
  title?:     string    // e.g. "A New Era of Excellence"
  /** Compact = archive cards. Reduces padding + type sizes so the
   *  district identity still reads at 3:2 card size. */
  compact?:   boolean
}

export function EducationMattersBrandedHero({ district, monthLabel, title, compact }: Props) {
  // Track whether the logo file 404s so we can fall back to typography.
  // Server-render optimistic (assume logo exists); flip to typography
  // fallback on the first client error event.
  const [logoBroken, setLogoBroken] = useState(false)

  const showLogo = !!district.logoUrl && !logoBroken

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ backgroundColor: district.accent }}
    >
      {/* Subtle vignette so overlay text always reads against the
          brand color, regardless of the color's inherent lightness. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.10) 0%, transparent 55%)',
        }}
      />

      <div className={`relative flex h-full w-full items-center justify-center ${compact ? 'px-4 py-4' : 'px-6 py-8 md:px-10'}`}>
        <div className={`grid w-full items-center gap-4 ${compact ? '' : 'md:gap-6 md:grid-cols-[auto_1fr]'}`}>
          {/* Logo (or typography fallback) */}
          <div className={`flex items-center justify-center ${compact ? '' : 'md:justify-start'}`}>
            {showLogo ? (
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

          {/* Text: month eyebrow + article title */}
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

      {/* Corner ribbon carrying the district full name — anchors the
          brand even if the compact card had to drop the text block. */}
      {!monthLabel && !title && (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.14em] text-white/80">
          {district.fullName}
        </p>
      )}
    </div>
  )
}

function TypographyLogoFallback({ shortName, compact }: { shortName: string; compact?: boolean }) {
  // Big block letters as brand anchor when the logo PNG is missing.
  // Uses the district's shortName — "Pike Road", "Elmore County", etc.
  // Wraps naturally at narrow widths.
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
